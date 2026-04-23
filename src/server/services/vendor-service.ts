import type { VendorEvaluationSubmission } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { z } from "zod";

import { HEAD_OF_PROJECTS_EMAIL } from "@/lib/constants";
import { buildVendorEvaluationUrl } from "@/lib/utils";
import {
  calculateVendorScorecardTotal,
  gradeFromVendorScore,
  sanitizeVendorScorecardEntries,
} from "@/lib/vendor-scorecard";
import {
  createVendorEvaluationCycleSchema,
  finalizeVendorEvaluationSchema,
  vendorCategorySchema,
  vendorMasterSchema,
  vendorEvaluationSubmissionSchema,
  vendorGovernanceSchema,
  vendorSubcategorySchema,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/server/services/audit-service";
import { sendVendorEvaluationRequestEmail } from "@/server/services/email-service";
import { createWorkflowNotification } from "@/server/services/notification-service";
import {
  createVendorEvaluationRequestToken,
  hashToken,
  invalidateOutstandingVendorEvaluationTokens,
} from "@/server/services/token-service";

function hasRequiredExternalSubmissions(
  submissions: Array<Pick<VendorEvaluationSubmission, "evaluatorRole">>,
) {
  const roles = new Set(submissions.map((submission) => submission.evaluatorRole));

  return roles.has("PROJECT_MANAGER") && roles.has("HEAD_OF_PROJECTS");
}

async function assertValidVendorGovernanceInput(
  tx: Prisma.TransactionClient,
  values:
    | z.infer<typeof vendorGovernanceSchema>
    | z.infer<typeof vendorMasterSchema>,
) {
  if (!values.subcategoryId) {
    return values.categoryId ?? null;
  }

  const subcategory = await tx.vendorSubcategory.findUnique({
    where: {
      id: values.subcategoryId,
    },
    select: {
      categoryId: true,
    },
  });

  if (!subcategory) {
    throw new Error("The selected vendor subcategory was not found.");
  }

  if (values.categoryId && values.categoryId !== subcategory.categoryId) {
    throw new Error("The selected subcategory does not belong to this category.");
  }

  return subcategory.categoryId;
}

function parseScorecardPayload(input: {
  criteriaSnapshot: string;
  totalScorePercent: number;
}) {
  const scorecardEntries = sanitizeVendorScorecardEntries(
    JSON.parse(input.criteriaSnapshot),
  );
  const totalScorePercent = calculateVendorScorecardTotal(scorecardEntries);

  if (Math.abs(input.totalScorePercent - totalScorePercent) > 0.01) {
    throw new Error("The evaluation scorecard could not be verified.");
  }

  return {
    scorecardEntries,
    totalScorePercent,
    derivedGrade: gradeFromVendorScore(totalScorePercent),
  };
}

export async function saveVendorMaster(
  userId: string,
  values: z.infer<typeof vendorMasterSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const currentVendor = values.vendorRecordId
      ? await tx.vendor.findUnique({
          where: {
            id: values.vendorRecordId,
          },
          select: {
            id: true,
            vendorId: true,
            vendorName: true,
            vendorEmail: true,
            vendorPhone: true,
            status: true,
            classification: true,
            notes: true,
            categoryId: true,
            subcategoryId: true,
          },
        })
      : null;

    if (values.vendorRecordId && !currentVendor) {
      throw new Error("Vendor not found.");
    }

    const conflictingVendor = await tx.vendor.findUnique({
      where: {
        vendorId: values.vendorId,
      },
      select: {
        id: true,
      },
    });

    if (
      conflictingVendor &&
      conflictingVendor.id !== currentVendor?.id
    ) {
      throw new Error("This vendor ID is already assigned to another vendor.");
    }

    const categoryId = await assertValidVendorGovernanceInput(tx, values);
    const vendorPayload = {
      vendorName: values.vendorName,
      vendorEmail: values.vendorEmail.toLowerCase(),
      vendorId: values.vendorId,
      vendorPhone: values.vendorPhone?.trim() || null,
      status: values.status,
      classification: values.classification?.trim() || null,
      notes: values.notes?.trim() || null,
      categoryId,
      subcategoryId: values.subcategoryId ?? null,
    };

    const vendor = currentVendor
      ? await tx.vendor.update({
          where: {
            id: currentVendor.id,
          },
          data: vendorPayload,
        })
      : await tx.vendor.create({
          data: vendorPayload,
        });

    await createAuditLog(tx, {
      action: currentVendor ? "UPDATED" : "CREATED",
      entityType: "Vendor",
      entityId: vendor.id,
      userId,
      details: currentVendor
        ? {
            previousVendorId: currentVendor.vendorId,
            nextVendorId: vendor.vendorId,
            previousStatus: currentVendor.status,
            nextStatus: vendor.status,
            previousCategoryId: currentVendor.categoryId,
            nextCategoryId: vendor.categoryId,
            previousSubcategoryId: currentVendor.subcategoryId,
            nextSubcategoryId: vendor.subcategoryId,
          }
        : {
            vendorId: vendor.vendorId,
            status: vendor.status,
          },
    });

    return vendor;
  });
}

export async function updateVendorGovernance(
  userId: string,
  values: z.infer<typeof vendorGovernanceSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.findUnique({
      where: {
        id: values.vendorId,
      },
      select: {
        id: true,
        categoryId: true,
        subcategoryId: true,
      },
    });

    if (!vendor) {
      throw new Error("Vendor not found.");
    }

    const categoryId = await assertValidVendorGovernanceInput(tx, values);
    const subcategoryId = values.subcategoryId ?? null;

    const updated = await tx.vendor.update({
      where: {
        id: vendor.id,
      },
      data: {
        categoryId,
        subcategoryId,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "Vendor",
      entityId: updated.id,
      userId,
      details: {
        previousCategoryId: vendor.categoryId,
        nextCategoryId: updated.categoryId,
        previousSubcategoryId: vendor.subcategoryId,
        nextSubcategoryId: updated.subcategoryId,
      },
    });

    return updated;
  });
}

export async function createVendorCategory(
  userId: string,
  values: z.infer<typeof vendorCategorySchema>,
) {
  return prisma.$transaction(async (tx) => {
    try {
      const category = await tx.vendorCategory.create({
        data: {
          name: values.name,
          externalKey: values.externalKey?.trim() || null,
        },
      });

      await createAuditLog(tx, {
        action: "CREATED",
        entityType: "VendorCategory",
        entityId: category.id,
        userId,
        details: {
          vendorId: values.vendorId,
          categoryName: category.name,
          externalKey: category.externalKey,
        },
      });

      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error("This vendor category already exists.");
      }

      throw error;
    }
  });
}

export async function createVendorSubcategory(
  userId: string,
  values: z.infer<typeof vendorSubcategorySchema>,
) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.vendorCategory.findUnique({
      where: {
        id: values.categoryId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw new Error("Vendor category not found.");
    }

    try {
      const subcategory = await tx.vendorSubcategory.create({
        data: {
          categoryId: category.id,
          name: values.name,
          externalKey: values.externalKey?.trim() || null,
        },
      });

      await createAuditLog(tx, {
        action: "CREATED",
        entityType: "VendorSubcategory",
        entityId: subcategory.id,
        userId,
        details: {
          vendorId: values.vendorId,
          categoryId: category.id,
          categoryName: category.name,
          subcategoryName: subcategory.name,
          externalKey: subcategory.externalKey,
        },
      });

      return subcategory;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error(
          "This subcategory already exists for the selected category.",
        );
      }

      throw error;
    }
  });
}

export async function createVendorEvaluationCycle(input: {
  userId: string;
  values: z.infer<typeof createVendorEvaluationCycleSchema>;
}) {
  const payload = await prisma.$transaction(async (tx) => {
    const [vendor, sourceProject, existingCycle] = await Promise.all([
      tx.vendor.findUnique({
        where: {
          id: input.values.vendorId,
        },
        select: {
          id: true,
          vendorName: true,
          vendorId: true,
          projectLinks: {
            where: {
              projectId: input.values.sourceProjectId,
            },
            select: {
              id: true,
            },
          },
        },
      }),
      tx.project.findUnique({
        where: {
          id: input.values.sourceProjectId,
        },
        select: {
          id: true,
          projectName: true,
          projectCode: true,
          isArchived: true,
        },
      }),
      tx.vendorEvaluationCycle.findUnique({
        where: {
          vendorId_year: {
            vendorId: input.values.vendorId,
            year: input.values.year,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!vendor) {
      throw new Error("Vendor not found.");
    }

    if (!sourceProject || sourceProject.isArchived) {
      throw new Error("The selected source project is not available.");
    }

    if (vendor.projectLinks.length === 0) {
      throw new Error(
        "Choose a project that already has this vendor linked through a PO or contract assignment.",
      );
    }

    if (existingCycle) {
      throw new Error(
        `A vendor evaluation already exists for ${input.values.year}.`,
      );
    }

    const cycle = await tx.vendorEvaluationCycle.create({
      data: {
        vendorId: vendor.id,
        sourceProjectId: sourceProject.id,
        year: input.values.year,
        projectManagerEmail: input.values.projectManagerEmail.trim().toLowerCase(),
        headOfProjectsEmail: HEAD_OF_PROJECTS_EMAIL,
        createdByUserId: input.userId,
      },
    });

    const [projectManagerToken, headOfProjectsToken] = await Promise.all([
      createVendorEvaluationRequestToken(
        tx,
        cycle.id,
        "PROJECT_MANAGER",
        cycle.projectManagerEmail,
      ),
      createVendorEvaluationRequestToken(
        tx,
        cycle.id,
        "HEAD_OF_PROJECTS",
        cycle.headOfProjectsEmail,
      ),
    ]);

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "VendorEvaluationCycle",
      entityId: cycle.id,
      projectId: sourceProject.id,
      userId: input.userId,
      details: {
        vendorId: vendor.id,
        vendorCode: vendor.vendorId,
        year: cycle.year,
        projectManagerEmail: cycle.projectManagerEmail,
        headOfProjectsEmail: cycle.headOfProjectsEmail,
      },
    });

    await createWorkflowNotification(tx, {
      type: "VENDOR_EVALUATION_REQUESTED",
      title: "Vendor evaluation requested",
      message: `${vendor.vendorName} evaluation cycle for ${cycle.year} was opened from ${sourceProject.projectName}.`,
      projectId: sourceProject.id,
      vendorId: vendor.id,
    });

    return {
      cycle,
      vendorName: vendor.vendorName,
      vendorCode: vendor.vendorId,
      sourceProjectName: sourceProject.projectName,
      sourceProjectCode: sourceProject.projectCode,
      projectManagerToken,
      headOfProjectsToken,
    };
  });

  await Promise.all([
    sendVendorEvaluationRequestEmail({
      to: payload.cycle.projectManagerEmail,
      evaluatorRole: "PROJECT_MANAGER",
      vendorName: payload.vendorName,
      vendorCode: payload.vendorCode,
      projectName: payload.sourceProjectName,
      projectCode: payload.sourceProjectCode,
      year: payload.cycle.year,
      evaluationUrl: buildVendorEvaluationUrl(payload.projectManagerToken.rawToken),
    }),
    sendVendorEvaluationRequestEmail({
      to: payload.cycle.headOfProjectsEmail,
      evaluatorRole: "HEAD_OF_PROJECTS",
      vendorName: payload.vendorName,
      vendorCode: payload.vendorCode,
      projectName: payload.sourceProjectName,
      projectCode: payload.sourceProjectCode,
      year: payload.cycle.year,
      evaluationUrl: buildVendorEvaluationUrl(payload.headOfProjectsToken.rawToken),
    }),
  ]);

  return payload.cycle;
}

export async function submitVendorEvaluationByToken(input: {
  values: z.infer<typeof vendorEvaluationSubmissionSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const requestToken = await tx.vendorEvaluationRequestToken.findUnique({
      where: {
        tokenHash: hashToken(input.values.token),
      },
      include: {
        cycle: {
          include: {
            vendor: true,
            sourceProject: true,
            submissions: true,
          },
        },
      },
    });

    if (!requestToken) {
      throw new Error("This evaluation link is invalid.");
    }

    if (
      requestToken.usedAt ||
      requestToken.invalidatedAt ||
      requestToken.expiresAt < new Date()
    ) {
      throw new Error("This evaluation link has expired or was already used.");
    }

    if (requestToken.cycle.status === "COMPLETED") {
      throw new Error("This evaluation cycle has already been completed.");
    }

    const existingSubmission = requestToken.cycle.submissions.find(
      (submission) => submission.evaluatorRole === requestToken.evaluatorRole,
    );

    if (existingSubmission) {
      throw new Error("This evaluation has already been submitted.");
    }

    const scorecard = parseScorecardPayload({
      criteriaSnapshot: input.values.criteriaSnapshot,
      totalScorePercent: input.values.totalScorePercent,
    });
    const submittedAt = new Date();
    const submission = await tx.vendorEvaluationSubmission.create({
      data: {
        cycleId: requestToken.cycle.id,
        evaluatorRole: requestToken.evaluatorRole,
        grade: scorecard.derivedGrade,
        summary: input.values.summary,
        strengths: input.values.strengths,
        concerns: input.values.concerns,
        totalScorePercent: new Prisma.Decimal(scorecard.totalScorePercent),
        criteriaSnapshot: scorecard.scorecardEntries,
        recommendation: input.values.recommendation,
        correctiveActions: input.values.correctiveActions,
        evaluatorName: input.values.evaluatorName,
        evaluatorEmail: requestToken.email,
        submittedAt,
      },
    });

    await tx.vendorEvaluationRequestToken.update({
      where: {
        id: requestToken.id,
      },
      data: {
        usedAt: submittedAt,
      },
    });

    await invalidateOutstandingVendorEvaluationTokens(
      tx,
      requestToken.cycle.id,
      requestToken.evaluatorRole,
    );

    const updatedSubmissions = [
      ...requestToken.cycle.submissions,
      {
        evaluatorRole: requestToken.evaluatorRole,
      } as Pick<VendorEvaluationSubmission, "evaluatorRole">,
    ];
    const readyForProcurement = hasRequiredExternalSubmissions(updatedSubmissions);
    const nextStatus = readyForProcurement
      ? "READY_FOR_PROCUREMENT"
      : requestToken.cycle.status;

    await tx.vendorEvaluationCycle.update({
      where: {
        id: requestToken.cycle.id,
      },
      data: {
        status: nextStatus,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "VendorEvaluationSubmission",
      entityId: submission.id,
      projectId: requestToken.cycle.sourceProjectId,
      details: {
        cycleId: requestToken.cycle.id,
        evaluatorRole: requestToken.evaluatorRole,
        evaluatorEmail: requestToken.email,
        grade: scorecard.derivedGrade,
        totalScorePercent: scorecard.totalScorePercent,
        readyForProcurement,
      },
    });

    if (
      readyForProcurement &&
      requestToken.cycle.status !== "READY_FOR_PROCUREMENT"
    ) {
      await createWorkflowNotification(tx, {
        type: "VENDOR_EVALUATION_READY_FOR_PROCUREMENT",
        title: "Vendor evaluation ready for Procurement",
        message: `${requestToken.cycle.vendor.vendorName} evaluation for ${requestToken.cycle.year} is ready for Procurement finalization.`,
        projectId: requestToken.cycle.sourceProjectId,
        vendorId: requestToken.cycle.vendorId,
      });
    }
  });
}

export async function finalizeVendorEvaluationCycle(input: {
  userId: string;
  userName: string;
  userEmail: string;
  values: z.infer<typeof finalizeVendorEvaluationSchema>;
}) {
  return prisma.$transaction(async (tx) => {
    const cycle = await tx.vendorEvaluationCycle.findUnique({
      where: {
        id: input.values.cycleId,
      },
      include: {
        vendor: true,
        sourceProject: true,
        submissions: true,
      },
    });

    if (!cycle) {
      throw new Error("Vendor evaluation cycle not found.");
    }

    if (cycle.status === "COMPLETED") {
      throw new Error("This vendor evaluation has already been finalized.");
    }

    if (!hasRequiredExternalSubmissions(cycle.submissions)) {
      throw new Error(
        "Procurement can finalize the evaluation only after the Project Manager and Head of Projects have both submitted.",
      );
    }

    if (
      cycle.submissions.some(
        (submission) => submission.evaluatorRole === "PROCUREMENT",
      )
    ) {
      throw new Error("The Procurement evaluation has already been submitted.");
    }

    const finalizedAt = new Date();
    const scorecard = parseScorecardPayload({
      criteriaSnapshot: input.values.criteriaSnapshot,
      totalScorePercent: input.values.totalScorePercent,
    });

    await tx.vendorEvaluationSubmission.create({
      data: {
        cycleId: cycle.id,
        evaluatorRole: "PROCUREMENT",
        grade: scorecard.derivedGrade,
        summary: input.values.summary,
        strengths: input.values.strengths,
        concerns: input.values.concerns,
        totalScorePercent: new Prisma.Decimal(scorecard.totalScorePercent),
        criteriaSnapshot: scorecard.scorecardEntries,
        recommendation: input.values.recommendation,
        correctiveActions: input.values.correctiveActions,
        submittedByUserId: input.userId,
        evaluatorName: input.userName,
        evaluatorEmail: input.userEmail.toLowerCase(),
        submittedAt: finalizedAt,
      },
    });

    const updated = await tx.vendorEvaluationCycle.update({
      where: {
        id: cycle.id,
      },
      data: {
        status: "COMPLETED",
        finalGrade: scorecard.derivedGrade,
        finalScorePercent: new Prisma.Decimal(scorecard.totalScorePercent),
        procurementFinalizedByUserId: input.userId,
        finalizedAt,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "VendorEvaluationCycle",
      entityId: updated.id,
      projectId: updated.sourceProjectId,
      userId: input.userId,
      details: {
        finalGrade: updated.finalGrade,
        finalScorePercent: scorecard.totalScorePercent,
        finalizedAt: finalizedAt.toISOString(),
      },
    });

    await createWorkflowNotification(tx, {
      type: "VENDOR_EVALUATION_COMPLETED",
      title: "Vendor evaluation completed",
      message: `${cycle.vendor.vendorName} evaluation for ${cycle.year} was finalized by Procurement.`,
      projectId: cycle.sourceProjectId,
      vendorId: cycle.vendorId,
    });

    return updated;
  });
}
