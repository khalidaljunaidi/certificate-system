import { z } from "zod";

const requiredString = (field: string) =>
  z.string().trim().min(1, `${field} is required`);

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: requiredString("Password"),
});

export const projectFormSchema = z.object({
  projectCode: requiredString("Project code"),
  projectName: requiredString("Project name"),
  projectLocation: requiredString("Project location"),
  clientName: requiredString("Client name"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]),
});

export const projectVendorFormSchema = z.object({
  projectId: requiredString("Project"),
  vendorName: requiredString("Vendor name"),
  vendorEmail: z.email("Enter a valid vendor email"),
  vendorId: requiredString("Vendor ID"),
  poNumber: z.string().trim().optional(),
  contractNumber: z.string().trim().optional(),
});

export const certificateDraftSchema = z.object({
  projectId: requiredString("Project"),
  projectVendorId: requiredString("Project vendor"),
  vendorId: requiredString("Vendor"),
  issueDate: z.coerce.date(),
  poNumber: requiredString("PO number"),
  contractNumber: z.string().trim().optional(),
  completionDate: z.coerce.date(),
  totalAmount: z.coerce.number().positive("Total amount must be greater than zero"),
  executedScopeSummary: requiredString("Executed scope summary").max(
    900,
    "Executed scope summary must stay within the certificate layout limit",
  ),
  clientName: requiredString("Client name"),
  clientTitle: requiredString("Client title"),
  approverName: requiredString("Approver name"),
  approverTitle: requiredString("Approver title"),
  pmEmail: z.email("Enter a valid PM email"),
});

export const submitForPmApprovalSchema = z.object({
  certificateId: requiredString("Certificate"),
});

export const issueCertificateSchema = z.object({
  certificateId: requiredString("Certificate"),
});

export const duplicateCertificateSchema = z.object({
  certificateId: requiredString("Certificate"),
});

export const reopenCertificateSchema = z.object({
  certificateId: requiredString("Certificate"),
});

export const archiveCertificateSchema = z.object({
  certificateId: requiredString("Certificate"),
});

export const revokeCertificateSchema = z.object({
  certificateId: requiredString("Certificate"),
  revokedReason: requiredString("Revocation reason").max(
    300,
    "Revocation reason should stay concise",
  ),
});

export const pmApprovalSchema = z.object({
  token: requiredString("Token"),
  pmName: requiredString("Full name"),
  pmTitle: requiredString("Title"),
  approvalNotes: z.string().trim().optional(),
});

export const pmRejectionSchema = z.object({
  token: requiredString("Token"),
  pmName: requiredString("Full name"),
  pmTitle: requiredString("Title"),
  approvalNotes: requiredString("Rejection notes"),
});

export const emailTestSchema = z.object({
  recipientEmail: z.email("Enter a valid recipient email"),
  template: z.enum([
    "PM_APPROVAL_REQUEST",
    "PROCUREMENT_NOTIFICATION",
    "CERTIFICATE_ISSUED",
    "CERTIFICATE_REOPENED",
  ]),
});

export const changePasswordSchema = z
  .object({
    currentPassword: requiredString("Current password"),
    newPassword: z
      .string()
      .min(10, "New password must be at least 10 characters long")
      .regex(/[A-Z]/, "New password must include at least one uppercase letter")
      .regex(/[a-z]/, "New password must include at least one lowercase letter")
      .regex(/[0-9]/, "New password must include at least one number"),
    confirmPassword: requiredString("Confirm password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "New password and confirmation must match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });
