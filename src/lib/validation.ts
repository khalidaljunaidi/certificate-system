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
  existingVendorRecordId: z.string().trim().optional(),
  vendorName: z.string().trim().optional(),
  vendorEmail: z.email("Enter a valid vendor email").optional(),
  vendorId: z.string().trim().optional(),
  vendorPhone: z.string().trim().optional(),
  poNumber: z.string().trim().optional(),
  contractNumber: z.string().trim().optional(),
  poAmount: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive("PO amount must be greater than zero").optional(),
  ),
}).superRefine((values, context) => {
  if (values.existingVendorRecordId) {
    return;
  }

  if (!values.vendorName) {
    context.addIssue({
      code: "custom",
      path: ["vendorName"],
      message: "Vendor name is required.",
    });
  }

  if (!values.vendorEmail) {
    context.addIssue({
      code: "custom",
      path: ["vendorEmail"],
      message: "Vendor email is required.",
    });
  }

  if (!values.vendorId) {
    context.addIssue({
      code: "custom",
      path: ["vendorId"],
      message: "Vendor ID is required.",
    });
  }
});

export const updateProjectStatusSchema = z.object({
  projectId: requiredString("Project"),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]),
});

export const updateProjectVendorAssignmentSchema = z.object({
  projectId: requiredString("Project"),
  projectVendorId: requiredString("Project vendor assignment"),
  poNumber: z.string().trim().optional(),
  contractNumber: z.string().trim().optional(),
  poAmount: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().nonnegative("PO amount must be zero or greater").optional(),
  ),
});

export const vendorGovernanceSchema = z
  .object({
    vendorId: requiredString("Vendor"),
    categoryId: z.string().trim().optional(),
    subcategoryId: z.string().trim().optional(),
    subcategoryIds: z.array(z.string().trim()).default([]),
  })
  .refine(
    (values) =>
      (!values.subcategoryId && values.subcategoryIds.length === 0) ||
      Boolean(values.categoryId),
    {
      message: "Choose a category before selecting a subcategory.",
      path: ["subcategoryIds"],
    },
  );

export const vendorCategorySchema = z.object({
  vendorId: requiredString("Vendor"),
  name: requiredString("Category name").max(
    120,
    "Category name must stay concise",
  ),
  externalKey: z.string().trim().max(120).optional(),
});

export const vendorSubcategorySchema = z.object({
  vendorId: requiredString("Vendor"),
  categoryId: requiredString("Category"),
  name: requiredString("Subcategory name").max(
    120,
    "Subcategory name must stay concise",
  ),
  externalKey: z.string().trim().max(120).optional(),
});

export const vendorMasterSchema = z
  .object({
    vendorRecordId: z.string().trim().optional(),
    vendorName: requiredString("Vendor name"),
    vendorEmail: z.email("Enter a valid vendor email"),
    vendorId: requiredString("Vendor ID"),
    vendorPhone: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    classification: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    categoryId: z.string().trim().optional(),
    subcategoryId: z.string().trim().optional(),
    subcategoryIds: z.array(z.string().trim()).default([]),
  })
  .refine((values) => {
    return (
      (!values.subcategoryId && values.subcategoryIds.length === 0) ||
      Boolean(values.categoryId)
    );
  }, {
    message: "Choose a category before selecting a subcategory.",
    path: ["subcategoryIds"],
  });

const vendorRegistrationCoverageScopeSchema = z.enum([
  "SPECIFIC_CITIES",
  "ALL_COUNTRY",
  "GCC",
  "MENA",
  "EU",
  "GLOBAL",
]);

const vendorRegistrationReferenceSchema = z.object({
  name: requiredString("Reference name").max(120),
  companyName: requiredString("Reference company name").max(120),
  email: z.email("Enter a valid reference email"),
  phone: requiredString("Reference phone").max(40),
  title: requiredString("Reference title").max(120),
});

export const vendorRegistrationSubmissionSchema = z
  .object({
    companyName: requiredString("Company name").max(200),
    legalName: requiredString("Legal name").max(200),
    companyEmail: z.email("Enter a valid company email"),
    companyPhone: requiredString("Company phone").max(40),
    website: requiredString("Website").max(200),
    crNumber: requiredString("CR number").max(120),
    vatNumber: requiredString("VAT number").max(120),
    countryCode: requiredString("Country"),
    coverageScope: vendorRegistrationCoverageScopeSchema,
    cityIds: z.array(z.string().trim()).min(1, "Select at least one city"),
    categoryId: requiredString("Main category"),
    subcategoryIds: z.array(z.string().trim()).min(1, "Select at least one subcategory"),
    addressLine1: requiredString("Address line 1").max(240),
    addressLine2: requiredString("Address line 2").max(240),
    district: requiredString("District").max(120),
    region: requiredString("Region").max(120),
    postalCode: requiredString("Postal code").max(40),
    poBox: requiredString("P.O. Box").max(60),
    businessDescription: requiredString("Business description").max(1200),
    servicesOverview: requiredString("Products / services").max(1200),
    yearsInBusiness: z.coerce.number().int().min(0).max(200),
    employeeCount: z.coerce.number().int().min(1).max(100000),
    reference1: vendorRegistrationReferenceSchema,
    reference2: vendorRegistrationReferenceSchema,
    reference3: vendorRegistrationReferenceSchema,
    bankName: requiredString("Bank name").max(120),
    accountName: requiredString("Account name").max(160),
    iban: requiredString("IBAN").max(64),
    swiftCode: requiredString("SWIFT code").max(24),
    bankAccountNumber: requiredString("Bank account number").max(64),
    additionalInformation: z.string().trim().max(2000).optional(),
    declarationName: requiredString("Declaration name").max(160),
    declarationTitle: requiredString("Declaration title").max(160),
    declarationAccepted: z.literal("on"),
  })
  .refine((values) => values.coverageScope !== "SPECIFIC_CITIES" || values.cityIds.length > 0, {
    message: "Select at least one city for a specific city coverage selection.",
    path: ["cityIds"],
  });

export const vendorRegistrationReviewSchema = z
  .object({
    requestId: requiredString("Vendor registration request"),
    decision: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().trim().max(1200).optional(),
  })
  .refine((values) => values.decision !== "REJECT" || Boolean(values.rejectionReason), {
    message: "A rejection reason is required when rejecting a registration.",
    path: ["rejectionReason"],
  });

export const supplierInvitationSchema = z.object({
  supplierCompanyName: z.string().trim().max(200).optional(),
  supplierContactEmail: z.email("Enter a valid supplier email"),
  supplierContactName: z.string().trim().max(200).optional(),
  suggestedCategoryId: z.string().trim().optional(),
  internalNote: z.string().trim().max(2000).optional(),
  customMessage: z.string().trim().max(4000).optional(),
});

export const projectVendorPaymentInstallmentSchema = z.object({
  projectId: requiredString("Project"),
  projectVendorId: requiredString("Project vendor"),
  installmentId: z.string().trim().optional(),
  workflowIntent: z.enum([
    "CREATE_PLAN",
    "EDIT_PLAN",
    "ADD_INVOICE",
    "REVIEW_INVOICE",
    "SCHEDULE_PAYMENT",
    "MARK_PAID",
  ]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  dueDate: z.coerce.date(),
  condition: requiredString("Payment condition").max(500),
  invoiceNumber: z.string().trim().max(120).optional(),
  invoiceDate: z.coerce.date().optional(),
  invoiceAmount: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().positive("Invoice amount must be greater than zero").optional(),
  ),
  invoiceReceivedDate: z.coerce.date().optional(),
  taxInvoiceValidated: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  invoiceStatus: z
    .enum(["MISSING", "RECEIVED", "VALIDATED", "REJECTED", "APPROVED_FOR_PAYMENT"])
    .optional(),
  invoiceExistsInOdoo: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      return value === "on" || value === true || value === "true";
    },
    z.boolean().optional(),
  ),
  odooInvoiceReference: z.string().trim().max(120).optional(),
  odooInvoiceUploadedAt: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.date().optional(),
  ),
  odooInvoiceNotes: z.string().trim().max(2000).optional(),
  financeReviewNotes: z.string().trim().max(2000).optional(),
  scheduledPaymentDate: z.coerce.date().optional(),
  paymentDate: z.coerce.date().optional(),
  notes: z.string().trim().max(1200).optional(),
}).superRefine((values, context) => {
  if (values.workflowIntent === "ADD_INVOICE") {
    if (!values.invoiceNumber) {
      context.addIssue({
        code: "custom",
        path: ["invoiceNumber"],
        message: "Invoice number is required.",
      });
    }

    if (!values.invoiceDate) {
      context.addIssue({
        code: "custom",
        path: ["invoiceDate"],
        message: "Invoice date is required.",
      });
    }

    if (!values.invoiceAmount) {
      context.addIssue({
        code: "custom",
        path: ["invoiceAmount"],
        message: "Invoice amount is required.",
      });
    }

    if (!values.invoiceReceivedDate) {
      context.addIssue({
        code: "custom",
        path: ["invoiceReceivedDate"],
        message: "Invoice received date is required.",
      });
    }
  }

  if (values.workflowIntent === "REVIEW_INVOICE") {
    if (!values.invoiceStatus || values.invoiceStatus === "MISSING") {
      context.addIssue({
        code: "custom",
        path: ["invoiceStatus"],
        message: "Select a finance review decision.",
      });
    }
  }

  if (values.workflowIntent === "SCHEDULE_PAYMENT" && !values.scheduledPaymentDate) {
    context.addIssue({
      code: "custom",
      path: ["scheduledPaymentDate"],
      message: "Scheduled payment date is required.",
    });
  }

  if (values.workflowIntent === "MARK_PAID" && !values.paymentDate) {
    context.addIssue({
      code: "custom",
      path: ["paymentDate"],
      message: "Payment date is required when marking an installment as paid.",
    });
  }
});

export const paymentRecordGovernanceSchema = z.object({
  projectVendorId: requiredString("Payment record"),
  financeOwnerUserId: z.string().trim().optional(),
  paymentNotes: z.string().trim().max(4000).optional(),
  paymentWorkflowOverrideStatus: z
    .enum(["ON_HOLD", "DISPUTED"])
    .optional()
    .or(z.literal("")),
  paymentWorkflowOverrideReason: z.string().trim().max(2000).optional(),
}).refine(
  (values) =>
    !values.paymentWorkflowOverrideStatus ||
    Boolean(values.paymentWorkflowOverrideReason),
  {
    message: "An override reason is required when placing a record on hold or dispute.",
    path: ["paymentWorkflowOverrideReason"],
  },
);

export const paymentRecordCloseSchema = z.object({
  projectVendorId: requiredString("Payment record"),
  closeAction: z.enum(["CLOSE", "REOPEN"]),
  overrideClosure: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  closeReason: z.string().trim().max(2000).optional(),
}).refine(
  (values) =>
    values.closeAction !== "CLOSE" ||
    !values.overrideClosure ||
    Boolean(values.closeReason),
  {
    message: "An override reason is required before forcing payment closure.",
    path: ["closeReason"],
  },
).refine(
  (values) => values.closeAction !== "REOPEN" || Boolean(values.closeReason),
  {
    message: "A reopening note is required before reopening the payment record.",
    path: ["closeReason"],
  },
);

export const workflowEmailSettingSchema = z.object({
  event: z.enum([
    "PM_APPROVAL_REQUEST",
    "PM_DECISION_NOTIFICATION",
    "VENDOR_EVALUATION_REQUEST",
    "FINAL_CERTIFICATE_ISSUED",
    "CERTIFICATE_REOPENED",
    "ANNUAL_EVALUATION_REMINDER",
    "TASK_ASSIGNED",
    "TASK_DUE_SOON",
    "TASK_OVERDUE",
    "TASK_COMPLETED",
    "SYSTEM_ALERT",
    "PERFORMANCE_REVIEW_FINALIZED",
  ]),
  enabled: z.boolean(),
  includeDefaultTo: z.boolean(),
  includeDefaultCc: z.boolean(),
  toEmails: z.array(z.email("Enter valid email addresses for To recipients")),
  ccEmails: z.array(z.email("Enter valid email addresses for CC recipients")),
});

export const workflowEmailGroupMemberSchema = z.object({
  intent: z.enum(["create", "update", "deactivate", "activate"]),
  groupId: requiredString("Notification group"),
  memberId: z.string().trim().optional(),
  name: requiredString("Member name").max(
    120,
    "Member name must stay concise",
  ),
  email: z.string().trim().email("Enter a valid member email address").max(
    320,
    "Member email must stay concise",
  ),
});

export const operationalTaskSchema = z.object({
  taskId: z.string().trim().optional(),
  title: requiredString("Task title").max(140, "Task title must stay concise"),
  description: requiredString("Task description").max(
    2000,
    "Task description must stay concise",
  ),
  type: z.enum(["VENDOR", "PROCUREMENT", "FINANCE", "OPERATIONS", "CUSTOM"]),
  assignedToUserId: requiredString("Assigned user"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "WAITING",
    "BLOCKED",
    "COMPLETED",
    "OVERDUE",
  ]),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  linkedProjectId: z.string().trim().optional(),
  linkedVendorId: z.string().trim().optional(),
  linkedProjectVendorId: z.string().trim().optional(),
  linkedCertificateId: z.string().trim().optional(),
  monthlyCycleId: z.string().trim().optional(),
  requiresChecklistCompletion: z.boolean(),
  checklistPayload: requiredString("Task checklist"),
});

export const taskExecutionSchema = z.object({
  taskId: requiredString("Task"),
  executionResult: requiredString("Execution result").max(
    2000,
    "Execution result must stay concise",
  ),
  checklistPayload: requiredString("Task checklist"),
});

export const monthlyCycleSchema = z.object({
  month: z.coerce
    .number()
    .int("Enter a valid month")
    .min(1, "Month must be between 1 and 12")
    .max(12, "Month must be between 1 and 12"),
  year: z.coerce
    .number()
    .int("Enter a valid year")
    .min(2024, "Year must be 2024 or later")
    .max(2100, "Year must stay within a realistic planning range"),
  label: z.string().trim().max(120, "Label must stay concise").optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "ARCHIVED"]),
  activate: z.boolean(),
});

export const monthlyCycleStatusActionSchema = z.object({
  cycleId: requiredString("Monthly cycle"),
  action: z.enum(["activate", "close", "archive", "reopen"]),
});

export const monthlyPerformanceReviewSchema = z.object({
  reviewId: z.string().trim().optional(),
  cycleId: requiredString("Monthly cycle"),
  employeeUserId: requiredString("Employee"),
  managerScorePercent: z.coerce.number().min(0).max(100).optional(),
  managerNotes: z.string().trim().max(2000).optional(),
  recommendation: z.string().trim().max(1000).optional(),
});

export const quarterlyPerformanceReviewSchema = z.object({
  reviewId: z.string().trim().optional(),
  employeeUserId: requiredString("Employee"),
  year: z.coerce
    .number()
    .int("Enter a valid year")
    .min(2024)
    .max(2100),
  quarter: z.coerce
    .number()
    .int("Enter a valid quarter")
    .min(1)
    .max(4),
  managerScorecard: requiredString("Manager scorecard"),
  managerComments: requiredString("Manager comments").max(
    2000,
    "Manager comments must stay concise",
  ),
  recommendation: requiredString("Recommendation").max(
    1000,
    "Recommendation must stay concise",
  ),
});

export const taskChecklistItemPayloadSchema = z.object({
  id: z.string().trim().optional(),
  label: requiredString("Checklist item").max(
    240,
    "Checklist item must stay concise",
  ),
  completed: z.boolean(),
  orderIndex: z.number().int().min(0),
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

export const certificateOverrideSchema = z.object({
  certificateId: requiredString("Certificate"),
  overrideReason: requiredString("Override reason").max(
    500,
    "Override reason must stay concise",
  ),
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

export const createVendorEvaluationCycleSchema = z.object({
  vendorId: requiredString("Vendor"),
  sourceProjectId: requiredString("Source project"),
  year: z.coerce
    .number()
    .int("Enter a valid year")
    .min(2024, "Year must be 2024 or later")
    .max(2100, "Year must stay within a realistic planning range"),
  projectManagerEmail: z.email("Enter a valid Project Manager email"),
});

export const finalizeVendorEvaluationSchema = z.object({
  cycleId: requiredString("Evaluation cycle"),
  criteriaSnapshot: requiredString("Scorecard"),
  totalScorePercent: z.coerce.number().min(0).max(100),
  summary: requiredString("Summary").max(1200, "Summary must stay concise"),
  strengths: requiredString("Strengths").max(
    1200,
    "Strengths must stay concise",
  ),
  concerns: requiredString("Concerns").max(1200, "Concerns must stay concise"),
  recommendation: requiredString("Recommendation").max(
    300,
    "Recommendation must stay concise",
  ),
  correctiveActions: requiredString("Corrective actions").max(
    1200,
    "Corrective actions must stay concise",
  ),
});

export const forceFinalizeVendorEvaluationSchema =
  finalizeVendorEvaluationSchema.extend({
    overrideReason: requiredString("Override reason").max(
      500,
      "Override reason must stay concise",
    ),
  });

export const vendorEvaluationSubmissionSchema = z.object({
  token: requiredString("Token"),
  evaluatorName: requiredString("Full name"),
  criteriaSnapshot: requiredString("Scorecard"),
  totalScorePercent: z.coerce.number().min(0).max(100),
  summary: requiredString("Summary").max(1200, "Summary must stay concise"),
  strengths: requiredString("Strengths").max(
    1200,
    "Strengths must stay concise",
  ),
  concerns: requiredString("Concerns").max(1200, "Concerns must stay concise"),
  recommendation: requiredString("Recommendation").max(
    300,
    "Recommendation must stay concise",
  ),
  correctiveActions: requiredString("Corrective actions").max(
    1200,
    "Corrective actions must stay concise",
  ),
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

export const roleFormSchema = z.object({
  roleId: z.string().trim().optional(),
  name: requiredString("Role name").max(120, "Role name must stay concise"),
  description: z.string().trim().max(500, "Role description must stay concise").optional(),
  permissionKeys: z.array(z.string().trim()).default([]),
});

export const userRoleAssignmentSchema = z.object({
  userId: requiredString("User"),
  roleId: requiredString("Role"),
});

export const internalUserCreateSchema = z.object({
  name: requiredString("Full name").max(160, "Name must stay concise"),
  email: z.email("Enter a valid email address"),
  title: requiredString("Title").max(160, "Title must stay concise"),
  temporaryPassword: z
    .string()
    .min(10, "Temporary password must be at least 10 characters long")
    .regex(/[A-Z]/, "Temporary password must include at least one uppercase letter")
    .regex(/[a-z]/, "Temporary password must include at least one lowercase letter")
    .regex(/[0-9]/, "Temporary password must include at least one number"),
  roleId: requiredString("Role"),
});
