import type {
  AuditAction,
  CertificateStatus,
  MonthlyCycleStatus,
  NotificationEventKey,
  NotificationSeverity,
  NotificationType,
  OperationalTaskPriority,
  OperationalTaskStatus,
  OperationalTaskType,
  PerformanceGrade,
  PerformanceReviewStatus,
  ProjectStatus,
  TaskSlaStatus,
  UserRole,
  VendorStatus,
  VendorEvaluationCycleStatus,
  VendorEvaluationEvaluatorRole,
  VendorEvaluationGrade,
  WorkflowEmailEvent,
} from "@prisma/client";

export type ActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  redirectTo?: string;
  noticeKey?: string;
  decisionStatus?: "approved" | "rejected";
  completionState?: "submitted";
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
    vendorRecordId: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    vendorStatus: VendorStatus;
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
  eventKey: NotificationEventKey | null;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  actionedAt: Date | null;
  relatedProjectId: string | null;
  relatedCertificateId: string | null;
  relatedVendorId: string | null;
  relatedProjectVendorId: string | null;
  relatedTaskId: string | null;
  href: string | null;
};

export type VendorRegistryItem = {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string | null;
  status: VendorStatus;
  classification: string | null;
  notes: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  projectCount: number;
  activeProjectCount: number;
  assignmentCount: number;
  certificateCount: number;
  issuedCertificateCount: number;
  latestIssuedAt: Date | null;
  latestEvaluationYear: number | null;
  latestEvaluationStatus: VendorEvaluationCycleStatus | null;
  latestFinalGrade: VendorEvaluationGrade | null;
  latestFinalScorePercent: number | null;
};

export type VendorRegistryView = {
  vendor: {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
    vendorPhone: string | null;
    status: VendorStatus;
    classification: string | null;
    notes: string | null;
    categoryId: string | null;
    categoryName: string | null;
    subcategoryId: string | null;
    subcategoryName: string | null;
  };
  assignmentGroups: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    projectStatus: ProjectStatus;
    isArchived: boolean;
    assignments: Array<{
      id: string;
      vendorRecordId: string;
      poNumber: string | null;
      contractNumber: string | null;
      isActive: boolean;
      certificateCount: number;
      latestCertificateId: string | null;
      latestCertificateStatus: CertificateStatus | null;
      createdAt: Date;
    }>;
  }>;
  certificateHistory: Array<{
    id: string;
    certificateCode: string;
    projectId: string;
    projectName: string;
    projectCode: string;
    projectVendorId: string;
    poNumber: string;
    contractNumber: string | null;
    status: CertificateStatus;
    issueDate: Date;
    issuedAt: Date | null;
    isArchived: boolean;
    archivedAt: Date | null;
  }>;
  evaluationCycles: Array<{
    id: string;
    year: number;
    status: VendorEvaluationCycleStatus;
    finalGrade: VendorEvaluationGrade | null;
    finalScorePercent: number | null;
    sourceProjectId: string;
    sourceProjectName: string;
    sourceProjectCode: string;
    projectManagerEmail: string;
    headOfProjectsEmail: string;
    createdAt: Date;
    finalizedAt: Date | null;
    submissions: Array<{
      id: string;
      evaluatorRole: VendorEvaluationEvaluatorRole;
      grade: VendorEvaluationGrade;
      totalScorePercent: number | null;
      criteriaSnapshot: Array<{
        criterionId: string;
        criterionLabel: string;
        weightPercent: number;
        scoreValue: number;
        weightedScore: number;
        notes: string;
      }> | null;
      summary: string;
      strengths: string;
      concerns: string;
      recommendation: string | null;
      correctiveActions: string | null;
      evaluatorName: string;
      evaluatorEmail: string;
      submittedAt: Date;
    }>;
  }>;
  availableSourceProjects: Array<{
    id: string;
    projectCode: string;
    projectName: string;
  }>;
};

export type VendorGovernanceOptions = {
  categories: Array<{
    id: string;
    name: string;
    subcategories: Array<{
      id: string;
      name: string;
      categoryId: string;
    }>;
  }>;
};

export type VendorEvaluationPublicView = {
  cycleId: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  categoryName: string | null;
  subcategoryName: string | null;
  vendorStatus: VendorStatus | null;
  sourceProjectName: string;
  sourceProjectCode: string;
  year: number;
  evaluatorRole: VendorEvaluationEvaluatorRole | null;
  evaluatorEmail: string | null;
  tokenStatus: "valid" | "expired" | "used" | "invalid" | "processed";
  cycleStatus: VendorEvaluationCycleStatus | null;
  finalGrade: VendorEvaluationGrade | null;
  submission: {
    grade: VendorEvaluationGrade;
    totalScorePercent: number | null;
    evaluatorName: string;
    submittedAt: Date;
  } | null;
};

export type WorkflowEmailSettingView = {
  event: WorkflowEmailEvent;
  enabled: boolean;
  includeDefaultTo: boolean;
  includeDefaultCc: boolean;
  toEmails: string[];
  ccEmails: string[];
  updatedAt: Date | null;
  updatedByName: string | null;
};

export type WorkflowEmailGroupMemberView = {
  id: string;
  groupId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowEmailGroupView = {
  id: string;
  key: string;
  name: string;
  description: string;
  members: WorkflowEmailGroupMemberView[];
  activeMembers: WorkflowEmailGroupMemberView[];
  inactiveMembers: WorkflowEmailGroupMemberView[];
};

export type VendorPickerOption = {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string | null;
  status: VendorStatus;
  categoryName: string | null;
  subcategoryName: string | null;
};

export type TaskChecklistItemView = {
  id: string;
  label: string;
  completed: boolean;
  completedAt: Date | null;
  orderIndex: number;
};

export type OperationalTaskListItem = {
  id: string;
  title: string;
  description: string;
  type: OperationalTaskType;
  priority: OperationalTaskPriority;
  status: OperationalTaskStatus;
  slaStatus: TaskSlaStatus;
  startDate: Date | null;
  dueDate: Date;
  completedAt: Date | null;
  executionResult: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: {
    id: string;
    name: string;
    email: string;
    title: string;
    role: UserRole;
  };
  assignedBy: {
    id: string;
    name: string;
    email: string;
    title: string;
  };
  checklistCompletionPercent: number;
  checklistItemsCount: number;
  completedChecklistItemsCount: number;
  elapsedHoursSinceAssignment: number;
  remainingHoursToDueDate: number | null;
  reopenedCount: number;
  linkedProject: {
    id: string;
    projectCode: string;
    projectName: string;
  } | null;
  linkedVendor: {
    id: string;
    vendorId: string;
    vendorName: string;
  } | null;
  linkedProjectVendor: {
    id: string;
    poNumber: string | null;
    contractNumber: string | null;
  } | null;
  linkedCertificate: {
    id: string;
    certificateCode: string;
    status: CertificateStatus;
  } | null;
  monthlyCycle: {
    id: string;
    label: string;
    month: number;
    year: number;
    status: MonthlyCycleStatus;
    isActive: boolean;
  } | null;
  href: string;
};

export type OperationalTaskDetailView = {
  task: OperationalTaskListItem & {
    requiresChecklistCompletion: boolean;
    executionResult: string | null;
    dueSoonNotifiedAt: Date | null;
    overdueNotifiedAt: Date | null;
    lastStatusChangedAt: Date;
  };
  checklistItems: TaskChecklistItemView[];
};

export type TaskLookupOptions = {
  users: Array<{
    id: string;
    name: string;
    email: string;
    title: string;
    role: UserRole;
  }>;
  projects: Array<{
    id: string;
    projectCode: string;
    projectName: string;
  }>;
  vendors: Array<{
    id: string;
    vendorId: string;
    vendorName: string;
  }>;
  assignments: Array<{
    id: string;
    projectId: string;
    vendorId: string;
    projectLabel: string;
    vendorLabel: string;
    poNumber: string | null;
    contractNumber: string | null;
  }>;
  monthlyCycles: Array<{
    id: string;
    label: string;
    month: number;
    year: number;
    status: MonthlyCycleStatus;
    isActive: boolean;
  }>;
  certificates: Array<{
    id: string;
    projectId: string;
    vendorId: string;
    projectVendorId: string;
    certificateCode: string;
    status: CertificateStatus;
  }>;
};

export type OperationalTaskSummaryMetrics = {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  onTimeCompletionRate: number;
  overdueRate: number;
  averageCompletionHours: number;
  workloadOpenTasks: number;
};

export type PerformanceReviewListItem = {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    title: string;
    role: UserRole;
  };
  evaluator: {
    id: string;
    name: string;
    email: string;
  };
  year: number;
  quarter: number;
  status: PerformanceReviewStatus;
  systemScorePercent: number;
  managerScorePercent: number;
  finalScorePercent: number;
  grade: PerformanceGrade;
  executionCapability: number | null;
  accuracyIndex: number | null;
  ownershipIndex: number | null;
  followUpDiscipline: number | null;
  responseAgility: number | null;
  procurementEffectiveness: number | null;
  finalizedAt: Date | null;
  managerComments: string | null;
  recommendation: string | null;
};

export type PerformanceReviewDetailView = PerformanceReviewListItem & {
  roleScorecard: Array<{
    id: string;
    label: string;
    weightPercent: number;
    scorePercent: number;
    weightedScore: number;
    notes: string;
  }>;
  systemMetrics: {
    completionRate: number;
    onTimeCompletionRate: number;
    overdueRate: number;
    averageCompletionHours: number;
    workflowCompliance: number;
    reopenRate: number;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalTasks: number;
  };
};

export type TeamPerformanceMemberView = {
  userId: string;
  name: string;
  email: string;
  title: string;
  role: UserRole;
  activeTasks: number;
  completedTasks: number;
  completionRate: number;
  onTimeCompletionRate: number;
  overdueRate: number;
  averageCompletionHours: number;
  systemScore: number;
  managerScore: number | null;
  finalScore: number | null;
  grade: PerformanceGrade | null;
  workloadOpenTasks: number;
  productivityScore: number;
};

export type TeamDashboardView = {
  isExecutive: boolean;
  currentQuarter: number;
  currentYear: number;
  kpis: {
    teamCompletionRate: number;
    overdueExposure: number;
    productivityScore: number;
    topPerformer: string | null;
    atRiskMember: string | null;
  };
  workloadDistribution: Array<{
    userId: string;
    name: string;
    openTasks: number;
    overdueTasks: number;
  }>;
  memberCards: TeamPerformanceMemberView[];
  quarterlyTrend: Array<{
    year: number;
    quarter: number;
    completionRate: number;
    finalScore: number | null;
  }>;
  currentUserSummary: TeamPerformanceMemberView | null;
  recentTasks: OperationalTaskListItem[];
  recentNotifications: NotificationItem[];
};

export type MonthlyCycleOption = {
  id: string;
  month: number;
  year: number;
  label: string;
  status: MonthlyCycleStatus;
  isActive: boolean;
  activatedAt: Date | null;
  closedAt: Date | null;
};

export type MonthlyPerformanceReviewView = {
  id: string;
  cycleId: string;
  employeeUserId: string;
  evaluatorUserId: string;
  status: PerformanceReviewStatus;
  systemMetrics: {
    completionRate: number;
    onTimeCompletionRate: number;
    overdueRate: number;
    averageCompletionHours: number;
    workflowCompliance: number;
    reopenRate: number;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalTasks: number;
  };
  managerNotes: string | null;
  recommendation: string | null;
  systemScorePercent: number;
  managerScorePercent: number;
  finalScorePercent: number;
  grade: PerformanceGrade;
  finalizedAt: Date | null;
};

export type MonthlyEmployeePerformanceCard = {
  userId: string;
  name: string;
  email: string;
  title: string;
  role: UserRole;
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  onTimeCompletionRate: number;
  overdueRate: number;
  averageCompletionHours: number;
  workloadOpenTasks: number;
  workloadLevel: "Light" | "Balanced" | "Focused" | "Heavy";
  workloadPercent: number;
  systemScore: number;
  managerScore: number | null;
  monthlyScore: number;
  grade: PerformanceGrade | null;
  trendDelta: number | null;
  review: MonthlyPerformanceReviewView | null;
};

export type MonthlyTimelineDayView = {
  isoDate: string;
  dayOfMonth: number;
  weekdayShort: string;
  isToday: boolean;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  assigneeLoads: Array<{
    userId: string;
    name: string;
    count: number;
  }>;
  taskTitles: string[];
};

export type MonthlyGovernanceDashboardView = {
  cycles: MonthlyCycleOption[];
  selectedCycle: MonthlyCycleOption | null;
  previousCycle: MonthlyCycleOption | null;
  kpis: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    monthlyCompletionRate: number;
    workloadBalance: number;
    monthlyTeamScore: number;
  };
  taskSummary: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    overdueTasks: number;
  };
  employeeCards: MonthlyEmployeePerformanceCard[];
  tasks: OperationalTaskListItem[];
  timeline: MonthlyTimelineDayView[];
};
