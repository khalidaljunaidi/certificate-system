import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  projectFormSchema,
  projectVendorFormSchema,
  updateProjectVendorAssignmentSchema,
  updateProjectStatusSchema,
} from "@/lib/validation";
import { createAuditLog } from "@/server/services/audit-service";
import { syncProjectVendorPaymentAmount } from "@/server/services/payment-amount-sync-service";

export async function createProject(
  userId: string,
  input: z.infer<typeof projectFormSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        projectCode: input.projectCode,
        projectName: input.projectName,
        projectLocation: input.projectLocation,
        clientName: input.clientName,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
      },
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "Project",
      entityId: project.id,
      projectId: project.id,
      userId,
      details: {
        projectCode: project.projectCode,
      },
    });

    return project;
  });
}

export async function addVendorToProject(
  userId: string,
  input: z.infer<typeof projectVendorFormSchema>,
) {
  return prisma.$transaction(async (tx) => {
    if (!input.existingVendorRecordId && input.vendorId) {
      const duplicateVendor = await tx.vendor.findUnique({
        where: {
          vendorId: input.vendorId,
        },
        select: {
          id: true,
        },
      });

      if (duplicateVendor) {
        throw new Error(
          "This vendor already exists in the master registry. Please select it from the vendor picker.",
        );
      }
    }

    const vendor = input.existingVendorRecordId
      ? await tx.vendor.findUnique({
          where: {
            id: input.existingVendorRecordId,
          },
        })
      : await tx.vendor.create({
          data: {
            vendorId: input.vendorId!,
            vendorName: input.vendorName!,
            vendorEmail: input.vendorEmail!,
            vendorPhone: input.vendorPhone || null,
            status: "ACTIVE",
          },
        });

    if (!vendor) {
      throw new Error("Choose a valid vendor from the registry.");
    }

    const projectVendor = await tx.projectVendor.create({
      data: {
        projectId: input.projectId,
        vendorId: vendor.id,
        poNumber: input.poNumber,
        contractNumber: input.contractNumber,
        poAmount: input.poAmount ?? null,
      },
    });

    await syncProjectVendorPaymentAmount(tx, {
      projectVendorId: projectVendor.id,
      userId,
      reason: "PO_CONTRACT_CREATED",
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "ProjectVendor",
      entityId: projectVendor.id,
      projectId: input.projectId,
      userId,
      details: {
        vendorRecordId: vendor.id,
        vendorId: vendor.vendorId,
        poNumber: input.poNumber,
        contractNumber: input.contractNumber,
        poAmount: input.poAmount ?? null,
      },
    });

    return projectVendor;
  });
}

export async function updateProjectVendorAssignment(
  userId: string,
  input: z.infer<typeof updateProjectVendorAssignmentSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const projectVendor = await tx.projectVendor.findUnique({
      where: {
        id: input.projectVendorId,
      },
      select: {
        id: true,
        projectId: true,
        poNumber: true,
        contractNumber: true,
        poAmount: true,
        vendor: {
          select: {
            id: true,
            vendorId: true,
            vendorName: true,
          },
        },
      },
    });

    if (!projectVendor || projectVendor.projectId !== input.projectId) {
      throw new Error("Project vendor assignment not found.");
    }

    const updated = await tx.projectVendor.update({
      where: {
        id: projectVendor.id,
      },
      data: {
        poNumber: input.poNumber?.trim() || null,
        contractNumber: input.contractNumber?.trim() || null,
        poAmount: input.poAmount ?? null,
      },
    });

    await syncProjectVendorPaymentAmount(tx, {
      projectVendorId: updated.id,
      userId,
      reason: "PO_CONTRACT_UPDATED",
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "ProjectVendor",
      entityId: updated.id,
      projectId: updated.projectId,
      userId,
      details: {
        vendorRecordId: projectVendor.vendor.id,
        vendorId: projectVendor.vendor.vendorId,
        vendorName: projectVendor.vendor.vendorName,
        previousPoNumber: projectVendor.poNumber,
        nextPoNumber: updated.poNumber,
        previousContractNumber: projectVendor.contractNumber,
        nextContractNumber: updated.contractNumber,
        previousPoAmount: projectVendor.poAmount,
        nextPoAmount: updated.poAmount,
      },
    });

    return updated;
  });
}

export async function updateProjectStatus(
  userId: string,
  input: z.infer<typeof updateProjectStatusSchema>,
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: {
        id: input.projectId,
      },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.status === input.status) {
      return project;
    }

    const updated = await tx.project.update({
      where: {
        id: input.projectId,
      },
      data: {
        status: input.status,
      },
    });

    await createAuditLog(tx, {
      action: "UPDATED",
      entityType: "Project",
      entityId: updated.id,
      projectId: updated.id,
      userId,
      details: {
        previousStatus: project.status,
        nextStatus: updated.status,
      },
    });

    return updated;
  });
}
