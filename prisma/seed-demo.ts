import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Pool } from "pg";

import { NOTIFICATION_EMAIL_GROUP_DEFINITIONS } from "../src/lib/constants";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL before running `npm run db:seed:demo`.");
}

const pool = new Pool({
  connectionString,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const TEMPORARY_PASSWORD = "12345678";

const seededUsers = [
  {
    id: "user-abdulmajeed-al-hussien",
    name: "Abdulmajeed Al Hussien",
    email: "abdulmajeed@thegatheringksa.com",
    title: "Procurement Lead",
    role: "PROCUREMENT_LEAD" as UserRole,
    approverTitle: "Procurement Lead",
  },
  {
    id: "user-samia-houry",
    name: "Samia Houry",
    email: "samia@thegatheringksa.com",
    title: "Procurement Specialist",
    role: "PROCUREMENT_SPECIALIST" as UserRole,
    approverTitle: "Procurement Specialist",
  },
  {
    id: "user-khalid-al-junaidi",
    name: "Khalid Al Junaidi",
    email: "khaledeljenidy@thegatheringksa.com",
    title: "Procurement Director",
    role: "PROCUREMENT_DIRECTOR" as UserRole,
    approverTitle: "Procurement Director",
  },
] as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function upsertProcurementUsers(passwordHash: string) {
  const results = await Promise.all(
    seededUsers.map((user) =>
      prisma.user.upsert({
        where: {
          id: user.id,
        },
        update: {
          name: user.name,
          email: normalizeEmail(user.email),
          passwordHash,
          title: user.title,
          role: user.role,
          locale: "EN",
          isActive: true,
          passwordChanged: false,
          passwordUpdatedAt: null,
        },
        create: {
          id: user.id,
          name: user.name,
          email: normalizeEmail(user.email),
          passwordHash,
          title: user.title,
          role: user.role,
          locale: "EN",
          isActive: true,
          passwordChanged: false,
        },
      }),
    ),
  );

  return {
    abdulmajeed: results[0],
    samia: results[1],
    khalid: results[2],
  };
}

async function upsertNotificationEmailGroups() {
  await Promise.all(
    NOTIFICATION_EMAIL_GROUP_DEFINITIONS.map((group) =>
      prisma.workflowEmailGroup.upsert({
        where: {
          key: group.value,
        },
        update: {
          name: group.label,
          description: group.description,
        },
        create: {
          key: group.value,
          name: group.label,
          description: group.description,
        },
      }),
    ),
  );

  console.info("[seed:notification-groups] Notification groups upserted", {
    groups: NOTIFICATION_EMAIL_GROUP_DEFINITIONS.map((group) => group.label),
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(TEMPORARY_PASSWORD, 12);
  const users = await upsertProcurementUsers(passwordHash);
  await upsertNotificationEmailGroups();

  const riyadhActivation = await prisma.project.upsert({
    where: {
      projectCode: "TG-RYD-2401",
    },
    update: {
      projectName: "Riyadh Activation Campus",
      projectLocation: "Riyadh, KSA",
      clientName: "The Gathering KSA",
      startDate: new Date("2025-10-01"),
      endDate: new Date("2026-06-30"),
      status: "ACTIVE",
    },
    create: {
      id: "project-tg-ryd-2401",
      projectCode: "TG-RYD-2401",
      projectName: "Riyadh Activation Campus",
      projectLocation: "Riyadh, KSA",
      clientName: "The Gathering KSA",
      startDate: new Date("2025-10-01"),
      endDate: new Date("2026-06-30"),
      status: "ACTIVE",
    },
  });

  const boulevardExpansion = await prisma.project.upsert({
    where: {
      projectCode: "TG-JED-2408",
    },
    update: {
      projectName: "Boulevard Experience Expansion",
      projectLocation: "Jeddah, KSA",
      clientName: "The Gathering KSA",
      startDate: new Date("2025-07-15"),
      endDate: new Date("2026-03-31"),
      status: "COMPLETED",
    },
    create: {
      id: "project-tg-jed-2408",
      projectCode: "TG-JED-2408",
      projectName: "Boulevard Experience Expansion",
      projectLocation: "Jeddah, KSA",
      clientName: "The Gathering KSA",
      startDate: new Date("2025-07-15"),
      endDate: new Date("2026-03-31"),
      status: "COMPLETED",
    },
  });

  const heritageShowcase = await prisma.project.upsert({
    where: {
      projectCode: "TG-ALU-2502",
    },
    update: {
      projectName: "Heritage Village Showcase",
      projectLocation: "AlUla, KSA",
      clientName: "The Gathering KSA",
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-12-20"),
      status: "PLANNED",
    },
    create: {
      id: "project-tg-alu-2502",
      projectCode: "TG-ALU-2502",
      projectName: "Heritage Village Showcase",
      projectLocation: "AlUla, KSA",
      clientName: "The Gathering KSA",
      startDate: new Date("2026-01-05"),
      endDate: new Date("2026-12-20"),
      status: "PLANNED",
    },
  });

  const najdStructures = await prisma.vendor.upsert({
    where: {
      vendorId: "VEND-NAJD-001",
    },
    update: {
      vendorName: "Najd Event Structures Co.",
      vendorEmail: "pm@najdstructures.sa",
    },
    create: {
      id: "vendor-najd-001",
      vendorName: "Najd Event Structures Co.",
      vendorEmail: "pm@najdstructures.sa",
      vendorId: "VEND-NAJD-001",
    },
  });

  const desertLight = await prisma.vendor.upsert({
    where: {
      vendorId: "VEND-DLAV-002",
    },
    update: {
      vendorName: "Desert Light AV Solutions",
      vendorEmail: "operations@desertlight.sa",
    },
    create: {
      id: "vendor-dlav-002",
      vendorName: "Desert Light AV Solutions",
      vendorEmail: "operations@desertlight.sa",
      vendorId: "VEND-DLAV-002",
    },
  });

  const atlasSite = await prisma.vendor.upsert({
    where: {
      vendorId: "VEND-ATLAS-003",
    },
    update: {
      vendorName: "Atlas Site Services",
      vendorEmail: "delivery@atlassite.sa",
    },
    create: {
      id: "vendor-atlas-003",
      vendorName: "Atlas Site Services",
      vendorEmail: "delivery@atlassite.sa",
      vendorId: "VEND-ATLAS-003",
    },
  });

  const riyadhNajd = await prisma.projectVendor.upsert({
    where: {
      id: "project-vendor-ryd-najd",
    },
    update: {
      poNumber: "PO-RYD-1008",
      contractNumber: "CNT-RYD-2031",
      isActive: true,
    },
    create: {
      id: "project-vendor-ryd-najd",
      projectId: riyadhActivation.id,
      vendorId: najdStructures.id,
      poNumber: "PO-RYD-1008",
      contractNumber: "CNT-RYD-2031",
      isActive: true,
    },
  });

  const riyadhDesert = await prisma.projectVendor.upsert({
    where: {
      id: "project-vendor-ryd-desert",
    },
    update: {
      poNumber: "PO-RYD-1014",
      contractNumber: "CNT-RYD-2032",
      isActive: true,
    },
    create: {
      id: "project-vendor-ryd-desert",
      projectId: riyadhActivation.id,
      vendorId: desertLight.id,
      poNumber: "PO-RYD-1014",
      contractNumber: "CNT-RYD-2032",
      isActive: true,
    },
  });

  const jeddahDesert = await prisma.projectVendor.upsert({
    where: {
      id: "project-vendor-jed-desert",
    },
    update: {
      poNumber: "PO-JED-8871",
      contractNumber: "CNT-JED-1882",
      isActive: true,
    },
    create: {
      id: "project-vendor-jed-desert",
      projectId: boulevardExpansion.id,
      vendorId: desertLight.id,
      poNumber: "PO-JED-8871",
      contractNumber: "CNT-JED-1882",
      isActive: true,
    },
  });

  const jeddahAtlas = await prisma.projectVendor.upsert({
    where: {
      id: "project-vendor-jed-atlas",
    },
    update: {
      poNumber: "PO-JED-8890",
      contractNumber: "CNT-JED-1915",
      isActive: true,
    },
    create: {
      id: "project-vendor-jed-atlas",
      projectId: boulevardExpansion.id,
      vendorId: atlasSite.id,
      poNumber: "PO-JED-8890",
      contractNumber: "CNT-JED-1915",
      isActive: true,
    },
  });

  const alulaNajd = await prisma.projectVendor.upsert({
    where: {
      id: "project-vendor-alu-najd",
    },
    update: {
      poNumber: "PO-ALU-4410",
      contractNumber: "CNT-ALU-9002",
      isActive: true,
    },
    create: {
      id: "project-vendor-alu-najd",
      projectId: heritageShowcase.id,
      vendorId: najdStructures.id,
      poNumber: "PO-ALU-4410",
      contractNumber: "CNT-ALU-9002",
      isActive: true,
    },
  });

  const issuedCertificate = await prisma.certificate.upsert({
    where: {
      certificateCode: "TGCC-TG-JED-2408-001",
    },
    update: {
      projectId: boulevardExpansion.id,
      vendorId: desertLight.id,
      projectVendorId: jeddahDesert.id,
      issueDate: new Date("2026-03-28"),
      poNumber: "PO-JED-8871",
      contractNumber: "CNT-JED-1882",
      completionDate: new Date("2026-03-20"),
      totalAmount: new Prisma.Decimal("2450000.00"),
      executedScopeSummary:
        "Supply, installation, commissioning, and managed operation of the AV environment for the expansion zones and public circulation areas.",
      clientName: "Eng. Faisal Al-Salem",
      clientTitle: "Client Representative",
      approverName: users.abdulmajeed.name,
      approverTitle: "Procurement Lead",
      pmName: "Khaled Al-Mutairi",
      pmEmail: "khaled.almutairi@thegatheringksa.com",
      pmTitle: "Project Manager",
      pmApprovedAt: new Date("2026-03-25T08:30:00Z"),
      approvalNotes: "All package milestones were delivered and closed successfully.",
      status: "ISSUED",
      createdById: users.abdulmajeed.id,
      issuedAt: new Date("2026-03-28T09:15:00Z"),
      pdfUrl: "/api/certificates/demo-issued/pdf",
      pdfStoragePath: "certificates/demo-issued.pdf",
      revokedAt: null,
      revokedReason: null,
    },
    create: {
      id: "certificate-issued-jed-001",
      certificateCode: "TGCC-TG-JED-2408-001",
      projectId: boulevardExpansion.id,
      vendorId: desertLight.id,
      projectVendorId: jeddahDesert.id,
      issueDate: new Date("2026-03-28"),
      poNumber: "PO-JED-8871",
      contractNumber: "CNT-JED-1882",
      completionDate: new Date("2026-03-20"),
      totalAmount: new Prisma.Decimal("2450000.00"),
      executedScopeSummary:
        "Supply, installation, commissioning, and managed operation of the AV environment for the expansion zones and public circulation areas.",
      clientName: "Eng. Faisal Al-Salem",
      clientTitle: "Client Representative",
      approverName: users.abdulmajeed.name,
      approverTitle: "Procurement Lead",
      pmName: "Khaled Al-Mutairi",
      pmEmail: "khaled.almutairi@thegatheringksa.com",
      pmTitle: "Project Manager",
      pmApprovedAt: new Date("2026-03-25T08:30:00Z"),
      approvalNotes: "All package milestones were delivered and closed successfully.",
      status: "ISSUED",
      createdById: users.abdulmajeed.id,
      issuedAt: new Date("2026-03-28T09:15:00Z"),
      pdfUrl: "/api/certificates/demo-issued/pdf",
      pdfStoragePath: "certificates/demo-issued.pdf",
    },
  });

  const pendingCertificate = await prisma.certificate.upsert({
    where: {
      certificateCode: "TGCC-TG-RYD-2401-001",
    },
    update: {
      projectId: riyadhActivation.id,
      vendorId: najdStructures.id,
      projectVendorId: riyadhNajd.id,
      issueDate: new Date("2026-04-10"),
      poNumber: "PO-RYD-1008",
      contractNumber: "CNT-RYD-2031",
      completionDate: new Date("2026-04-07"),
      totalAmount: new Prisma.Decimal("1865000.00"),
      executedScopeSummary:
        "Construction of temporary event structures, back-of-house support areas, and demobilization of site assets.",
      clientName: "Sara Al-Ghamdi",
      clientTitle: "Client Director",
      approverName: users.samia.name,
      approverTitle: "Procurement Specialist",
      pmEmail: "mohammed.alsaeed@thegatheringksa.com",
      pmName: null,
      pmTitle: null,
      pmApprovedAt: null,
      approvalNotes: null,
      status: "PENDING_PM_APPROVAL",
      createdById: users.samia.id,
      issuedAt: null,
      pdfUrl: null,
      pdfStoragePath: null,
      revokedAt: null,
      revokedReason: null,
    },
    create: {
      id: "certificate-pending-ryd-001",
      certificateCode: "TGCC-TG-RYD-2401-001",
      projectId: riyadhActivation.id,
      vendorId: najdStructures.id,
      projectVendorId: riyadhNajd.id,
      issueDate: new Date("2026-04-10"),
      poNumber: "PO-RYD-1008",
      contractNumber: "CNT-RYD-2031",
      completionDate: new Date("2026-04-07"),
      totalAmount: new Prisma.Decimal("1865000.00"),
      executedScopeSummary:
        "Construction of temporary event structures, back-of-house support areas, and demobilization of site assets.",
      clientName: "Sara Al-Ghamdi",
      clientTitle: "Client Director",
      approverName: users.samia.name,
      approverTitle: "Procurement Specialist",
      pmEmail: "mohammed.alsaeed@thegatheringksa.com",
      status: "PENDING_PM_APPROVAL",
      createdById: users.samia.id,
    },
  });

  const rejectedCertificate = await prisma.certificate.upsert({
    where: {
      certificateCode: "TGCC-TG-RYD-2401-002",
    },
    update: {
      projectId: riyadhActivation.id,
      vendorId: desertLight.id,
      projectVendorId: riyadhDesert.id,
      issueDate: new Date("2026-04-14"),
      poNumber: "PO-RYD-1014",
      contractNumber: "CNT-RYD-2032",
      completionDate: new Date("2026-04-12"),
      totalAmount: new Prisma.Decimal("975000.00"),
      executedScopeSummary:
        "Delivery, tuning, and site support of lighting and show control infrastructure for the activation zone.",
      clientName: "Hassan Al-Humaidi",
      clientTitle: "Client Lead",
      approverName: users.khalid.name,
      approverTitle: "Procurement Director",
      pmEmail: "lina.ghazi@thegatheringksa.com",
      pmName: "Lina Ghazi",
      pmTitle: "Project Manager",
      pmApprovedAt: null,
      approvalNotes: "Pending punch-list completion at the north access point.",
      status: "PM_REJECTED",
      createdById: users.khalid.id,
      issuedAt: null,
      pdfUrl: null,
      pdfStoragePath: null,
      revokedAt: null,
      revokedReason: null,
    },
    create: {
      id: "certificate-rejected-ryd-002",
      certificateCode: "TGCC-TG-RYD-2401-002",
      projectId: riyadhActivation.id,
      vendorId: desertLight.id,
      projectVendorId: riyadhDesert.id,
      issueDate: new Date("2026-04-14"),
      poNumber: "PO-RYD-1014",
      contractNumber: "CNT-RYD-2032",
      completionDate: new Date("2026-04-12"),
      totalAmount: new Prisma.Decimal("975000.00"),
      executedScopeSummary:
        "Delivery, tuning, and site support of lighting and show control infrastructure for the activation zone.",
      clientName: "Hassan Al-Humaidi",
      clientTitle: "Client Lead",
      approverName: users.khalid.name,
      approverTitle: "Procurement Director",
      pmEmail: "lina.ghazi@thegatheringksa.com",
      pmName: "Lina Ghazi",
      pmTitle: "Project Manager",
      approvalNotes: "Pending punch-list completion at the north access point.",
      status: "PM_REJECTED",
      createdById: users.khalid.id,
    },
  });

  const revokedCertificate = await prisma.certificate.upsert({
    where: {
      certificateCode: "TGCC-TG-JED-2408-002",
    },
    update: {
      projectId: boulevardExpansion.id,
      vendorId: atlasSite.id,
      projectVendorId: jeddahAtlas.id,
      issueDate: new Date("2026-03-22"),
      poNumber: "PO-JED-8890",
      contractNumber: "CNT-JED-1915",
      completionDate: new Date("2026-03-18"),
      totalAmount: new Prisma.Decimal("635000.00"),
      executedScopeSummary:
        "Temporary logistics compound setup, maintenance, and reinstatement works.",
      clientName: "Eng. Faisal Al-Salem",
      clientTitle: "Client Representative",
      approverName: users.abdulmajeed.name,
      approverTitle: "Procurement Lead",
      pmName: "Salem Al-Yami",
      pmEmail: "salem.alyami@thegatheringksa.com",
      pmTitle: "Project Manager",
      pmApprovedAt: new Date("2026-03-19T11:00:00Z"),
      approvalNotes: null,
      status: "REVOKED",
      createdById: users.abdulmajeed.id,
      issuedAt: new Date("2026-03-22T09:30:00Z"),
      pdfUrl: "/api/certificates/demo-revoked/pdf",
      pdfStoragePath: "certificates/demo-revoked.pdf",
      revokedAt: new Date("2026-03-30T10:45:00Z"),
      revokedReason: "Commercial addendum required before final acceptance.",
    },
    create: {
      id: "certificate-revoked-jed-002",
      certificateCode: "TGCC-TG-JED-2408-002",
      projectId: boulevardExpansion.id,
      vendorId: atlasSite.id,
      projectVendorId: jeddahAtlas.id,
      issueDate: new Date("2026-03-22"),
      poNumber: "PO-JED-8890",
      contractNumber: "CNT-JED-1915",
      completionDate: new Date("2026-03-18"),
      totalAmount: new Prisma.Decimal("635000.00"),
      executedScopeSummary:
        "Temporary logistics compound setup, maintenance, and reinstatement works.",
      clientName: "Eng. Faisal Al-Salem",
      clientTitle: "Client Representative",
      approverName: users.abdulmajeed.name,
      approverTitle: "Procurement Lead",
      pmName: "Salem Al-Yami",
      pmEmail: "salem.alyami@thegatheringksa.com",
      pmTitle: "Project Manager",
      pmApprovedAt: new Date("2026-03-19T11:00:00Z"),
      status: "REVOKED",
      createdById: users.abdulmajeed.id,
      issuedAt: new Date("2026-03-22T09:30:00Z"),
      revokedAt: new Date("2026-03-30T10:45:00Z"),
      revokedReason: "Commercial addendum required before final acceptance.",
      pdfUrl: "/api/certificates/demo-revoked/pdf",
      pdfStoragePath: "certificates/demo-revoked.pdf",
    },
  });

  const draftCertificate = await prisma.certificate.upsert({
    where: {
      certificateCode: "TGCC-TG-ALU-2502-001",
    },
    update: {
      projectId: heritageShowcase.id,
      vendorId: najdStructures.id,
      projectVendorId: alulaNajd.id,
      issueDate: new Date("2026-05-05"),
      poNumber: "PO-ALU-4410",
      contractNumber: "CNT-ALU-9002",
      completionDate: new Date("2026-05-01"),
      totalAmount: new Prisma.Decimal("1200000.00"),
      executedScopeSummary:
        "Foundation package for the heritage showcase platforms and public viewing decks.",
      clientName: "Mona Al-Anzi",
      clientTitle: "Client Delivery Lead",
      approverName: users.abdulmajeed.name,
      approverTitle: "Procurement Lead",
      pmEmail: "adel.alfahad@thegatheringksa.com",
      pmName: null,
      pmTitle: null,
      pmApprovedAt: null,
      approvalNotes: null,
      status: "DRAFT",
      createdById: users.abdulmajeed.id,
      issuedAt: null,
      pdfUrl: null,
      pdfStoragePath: null,
      revokedAt: null,
      revokedReason: null,
    },
    create: {
      id: "certificate-draft-alu-001",
      certificateCode: "TGCC-TG-ALU-2502-001",
      projectId: heritageShowcase.id,
      vendorId: najdStructures.id,
      projectVendorId: alulaNajd.id,
      issueDate: new Date("2026-05-05"),
      poNumber: "PO-ALU-4410",
      contractNumber: "CNT-ALU-9002",
      completionDate: new Date("2026-05-01"),
      totalAmount: new Prisma.Decimal("1200000.00"),
      executedScopeSummary:
        "Foundation package for the heritage showcase platforms and public viewing decks.",
      clientName: "Mona Al-Anzi",
      clientTitle: "Client Delivery Lead",
      approverName: users.abdulmajeed.name,
      approverTitle: "Procurement Lead",
      pmEmail: "adel.alfahad@thegatheringksa.com",
      status: "DRAFT",
      createdById: users.abdulmajeed.id,
    },
  });

  await prisma.approvalToken.upsert({
    where: {
      tokenHash: crypto
        .createHash("sha256")
        .update("demo-pm-approval-token")
        .digest("hex"),
    },
    update: {
      certificateId: pendingCertificate.id,
      expiresAt: new Date("2026-04-26T08:00:00Z"),
      usedAt: null,
      invalidatedAt: null,
    },
    create: {
      id: "approval-token-demo-pm-001",
      certificateId: pendingCertificate.id,
      tokenHash: crypto
        .createHash("sha256")
        .update("demo-pm-approval-token")
        .digest("hex"),
      expiresAt: new Date("2026-04-26T08:00:00Z"),
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification-issued-boulevard" },
    update: {
      userId: users.abdulmajeed.id,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate issued for Boulevard Experience Expansion",
      message:
        "Desert Light AV Solutions received an issued completion certificate under Boulevard Experience Expansion.",
      relatedProjectId: boulevardExpansion.id,
      relatedCertificateId: issuedCertificate.id,
      read: false,
      readAt: null,
    },
    create: {
      id: "notification-issued-boulevard",
      userId: users.abdulmajeed.id,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate issued for Boulevard Experience Expansion",
      message:
        "Desert Light AV Solutions received an issued completion certificate under Boulevard Experience Expansion.",
      relatedProjectId: boulevardExpansion.id,
      relatedCertificateId: issuedCertificate.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification-pm-approval-requested" },
    update: {
      userId: users.samia.id,
      type: "SENT_FOR_PM_APPROVAL",
      title: "PM approval requested",
      message:
        "Najd Event Structures Co. certificate was sent to Mohammed Al-Saeed for PM approval.",
      relatedProjectId: riyadhActivation.id,
      relatedCertificateId: pendingCertificate.id,
      read: false,
      readAt: null,
    },
    create: {
      id: "notification-pm-approval-requested",
      userId: users.samia.id,
      type: "SENT_FOR_PM_APPROVAL",
      title: "PM approval requested",
      message:
        "Najd Event Structures Co. certificate was sent to Mohammed Al-Saeed for PM approval.",
      relatedProjectId: riyadhActivation.id,
      relatedCertificateId: pendingCertificate.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification-pm-rejected" },
    update: {
      userId: users.khalid.id,
      type: "PM_REJECTED",
      title: "PM rejected certificate",
      message:
        "The Riyadh Activation Campus certificate for Desert Light AV Solutions was returned with notes.",
      relatedProjectId: riyadhActivation.id,
      relatedCertificateId: rejectedCertificate.id,
      read: false,
      readAt: null,
    },
    create: {
      id: "notification-pm-rejected",
      userId: users.khalid.id,
      type: "PM_REJECTED",
      title: "PM rejected certificate",
      message:
        "The Riyadh Activation Campus certificate for Desert Light AV Solutions was returned with notes.",
      relatedProjectId: riyadhActivation.id,
      relatedCertificateId: rejectedCertificate.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification-certificate-revoked" },
    update: {
      userId: users.abdulmajeed.id,
      type: "CERTIFICATE_REVOKED",
      title: "Certificate revoked",
      message:
        "Atlas Site Services certificate for Boulevard Experience Expansion was revoked and locked from reuse.",
      relatedProjectId: boulevardExpansion.id,
      relatedCertificateId: revokedCertificate.id,
      read: false,
      readAt: null,
    },
    create: {
      id: "notification-certificate-revoked",
      userId: users.abdulmajeed.id,
      type: "CERTIFICATE_REVOKED",
      title: "Certificate revoked",
      message:
        "Atlas Site Services certificate for Boulevard Experience Expansion was revoked and locked from reuse.",
      relatedProjectId: boulevardExpansion.id,
      relatedCertificateId: revokedCertificate.id,
    },
  });

  await prisma.notification.upsert({
    where: { id: "notification-draft-created" },
    update: {
      userId: users.samia.id,
      type: "CERTIFICATE_CREATED",
      title: "Draft certificate created",
      message:
        "A draft completion certificate was created for Najd Event Structures Co. under Heritage Village Showcase.",
      relatedProjectId: heritageShowcase.id,
      relatedCertificateId: draftCertificate.id,
      read: false,
      readAt: null,
    },
    create: {
      id: "notification-draft-created",
      userId: users.samia.id,
      type: "CERTIFICATE_CREATED",
      title: "Draft certificate created",
      message:
        "A draft completion certificate was created for Najd Event Structures Co. under Heritage Village Showcase.",
      relatedProjectId: heritageShowcase.id,
      relatedCertificateId: draftCertificate.id,
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "audit-certificate-created-draft" },
    update: {
      action: "CREATED",
      entityType: "Certificate",
      entityId: draftCertificate.id,
      projectId: heritageShowcase.id,
      certificateId: draftCertificate.id,
      userId: users.abdulmajeed.id,
      details: { certificateCode: draftCertificate.certificateCode },
    },
    create: {
      id: "audit-certificate-created-draft",
      action: "CREATED",
      entityType: "Certificate",
      entityId: draftCertificate.id,
      projectId: heritageShowcase.id,
      certificateId: draftCertificate.id,
      userId: users.abdulmajeed.id,
      details: { certificateCode: draftCertificate.certificateCode },
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "audit-sent-for-pm-approval" },
    update: {
      action: "SENT_FOR_PM_APPROVAL",
      entityType: "Certificate",
      entityId: pendingCertificate.id,
      projectId: riyadhActivation.id,
      certificateId: pendingCertificate.id,
      userId: users.samia.id,
      details: { pmEmail: pendingCertificate.pmEmail },
    },
    create: {
      id: "audit-sent-for-pm-approval",
      action: "SENT_FOR_PM_APPROVAL",
      entityType: "Certificate",
      entityId: pendingCertificate.id,
      projectId: riyadhActivation.id,
      certificateId: pendingCertificate.id,
      userId: users.samia.id,
      details: { pmEmail: pendingCertificate.pmEmail },
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "audit-pm-rejected" },
    update: {
      action: "PM_REJECTED",
      entityType: "Certificate",
      entityId: rejectedCertificate.id,
      projectId: riyadhActivation.id,
      certificateId: rejectedCertificate.id,
      userId: null,
      details: { notes: rejectedCertificate.approvalNotes },
    },
    create: {
      id: "audit-pm-rejected",
      action: "PM_REJECTED",
      entityType: "Certificate",
      entityId: rejectedCertificate.id,
      projectId: riyadhActivation.id,
      certificateId: rejectedCertificate.id,
      details: { notes: rejectedCertificate.approvalNotes },
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "audit-issued-certificate" },
    update: {
      action: "ISSUED",
      entityType: "Certificate",
      entityId: issuedCertificate.id,
      projectId: boulevardExpansion.id,
      certificateId: issuedCertificate.id,
      userId: users.abdulmajeed.id,
      details: { issuedAt: issuedCertificate.issuedAt?.toISOString() },
    },
    create: {
      id: "audit-issued-certificate",
      action: "ISSUED",
      entityType: "Certificate",
      entityId: issuedCertificate.id,
      projectId: boulevardExpansion.id,
      certificateId: issuedCertificate.id,
      userId: users.abdulmajeed.id,
      details: { issuedAt: issuedCertificate.issuedAt?.toISOString() },
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "audit-revoked-certificate" },
    update: {
      action: "REVOKED",
      entityType: "Certificate",
      entityId: revokedCertificate.id,
      projectId: boulevardExpansion.id,
      certificateId: revokedCertificate.id,
      userId: users.abdulmajeed.id,
      details: { revokedReason: revokedCertificate.revokedReason },
    },
    create: {
      id: "audit-revoked-certificate",
      action: "REVOKED",
      entityType: "Certificate",
      entityId: revokedCertificate.id,
      projectId: boulevardExpansion.id,
      certificateId: revokedCertificate.id,
      userId: users.abdulmajeed.id,
      details: { revokedReason: revokedCertificate.revokedReason },
    },
  });

  console.info("[seed:demo] Procurement users upserted", {
    users: seededUsers.map((user) => normalizeEmail(user.email)),
  });
  console.info("[seed:demo] Demo workspace upserted", {
    reminder: "Users must update their password after first login.",
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
