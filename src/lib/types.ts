import type {
  AuditAction,
  CertificateStatus,
  NotificationType,
  ProjectStatus,
  UserRole,
} from "@prisma/client";

export type ActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
  decisionStatus?: "approved" | "rejected";
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  title: string;
  role: UserRole;
  isActive: boolean;
  passwordChanged: boolean;
  passwordUpdatedAt: Date | null;
};

export type ProjectListItem = {
  id: string;
  projectCode: string;
  projectName: string;
  projectLocation: string;
  clientName: string;
  status: ProjectStatus;
  isArchived: boolean;
  archivedAt: Date | null;
  startDate: Date;
  endDate: Date | null;
  vendorCount: number;
  certificateCount: number;
  issuedCount: number;
};

export type ProjectWorkspaceView = {
  project: {
    id: string;
    projectCode: string;
    projectName: string;
    projectLocation: string;
    clientName: string;
    status: ProjectStatus;
    isArchived: boolean;
    archivedAt: Date | null;
    startDate: Date;
    endDate: Date | null;
  };
  vendors: Array<{
    id: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    poNumber: string | null;
    contractNumber: string | null;
    isActive: boolean;
    certificateCount: number;
    latestCertificateId: string | null;
    latestCertificateStatus: CertificateStatus | null;
  }>;
  certificates: Array<{
    id: string;
    certificateCode: string;
    vendorName: string;
    poNumber: string;
    contractNumber: string | null;
    status: CertificateStatus;
    isArchived: boolean;
    archivedAt: Date | null;
    issueDate: Date;
    issuedAt: Date | null;
  }>;
  activity: Array<{
    id: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    createdAt: Date;
    actorName: string | null;
    details: unknown;
  }>;
};

export type CertificateSummaryView = {
  id: string;
  certificateCode: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  vendorId: string;
  vendorName: string;
  projectVendorId: string;
  issueDate: Date;
  completionDate: Date;
  poNumber: string;
  contractNumber: string | null;
  totalAmount: string;
  executedScopeSummary: string;
  clientName: string;
  clientTitle: string;
  approverName: string;
  approverTitle: string;
  pmName: string | null;
  pmEmail: string | null;
  pmTitle: string | null;
  pmApprovedAt: Date | null;
  approvalNotes: string | null;
  status: CertificateStatus;
  isArchived: boolean;
  archivedAt: Date | null;
  issuedAt: Date | null;
  pdfUrl: string | null;
  revokedAt: Date | null;
  revokedReason: string | null;
};

export type PmApprovalView = {
  certificateId: string;
  certificateCode: string;
  projectName: string;
  projectCode: string;
  vendorName: string;
  poNumber: string;
  contractNumber: string | null;
  completionDate: Date;
  totalAmount: string;
  executedScopeSummary: string;
  pmEmail: string | null;
  tokenStatus: "valid" | "expired" | "used" | "invalid" | "processed";
  decisionStatus: "approved" | "rejected" | null;
  expiresAt: Date | null;
  status: CertificateStatus | null;
};

export type CertificateVerificationView = {
  certificateCode: string;
  projectName: string;
  projectCode: string;
  vendorName: string;
  poNumber: string;
  contractNumber: string | null;
  issueDate: Date;
  completionDate: Date;
  status: CertificateStatus;
  revokedReason: string | null;
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  relatedProjectId: string | null;
  relatedCertificateId: string | null;
};
