import type { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  projectFormSchema,
  projectVendorFormSchema,
} from "@/lib/validation";
import { createAuditLog } from "@/server/services/audit-service";

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
    const vendor = await tx.vendor.upsert({
      where: {
        vendorId: input.vendorId,
      },
      update: {
        vendorName: input.vendorName,
        vendorEmail: input.vendorEmail,
      },
      create: {
        vendorId: input.vendorId,
        vendorName: input.vendorName,
        vendorEmail: input.vendorEmail,
      },
    });

    const projectVendor = await tx.projectVendor.create({
      data: {
        projectId: input.projectId,
        vendorId: vendor.id,
        poNumber: input.poNumber,
        contractNumber: input.contractNumber,
      },
    });

    await createAuditLog(tx, {
      action: "CREATED",
      entityType: "ProjectVendor",
      entityId: projectVendor.id,
      projectId: input.projectId,
      userId,
      details: {
        vendorId: vendor.vendorId,
        poNumber: input.poNumber,
        contractNumber: input.contractNumber,
      },
    });

    return projectVendor;
  });
}
