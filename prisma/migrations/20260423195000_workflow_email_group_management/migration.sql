-- Create workflow email groups
CREATE TABLE "WorkflowEmailGroup" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowEmailGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowEmailGroup_key_key" ON "WorkflowEmailGroup"("key");

CREATE TABLE "WorkflowEmailGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowEmailGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowEmailGroupMember_groupId_email_key" ON "WorkflowEmailGroupMember"("groupId", "email");
CREATE INDEX "WorkflowEmailGroupMember_groupId_idx" ON "WorkflowEmailGroupMember"("groupId");
CREATE INDEX "WorkflowEmailGroupMember_email_idx" ON "WorkflowEmailGroupMember"("email");

ALTER TABLE "WorkflowEmailGroupMember"
ADD CONSTRAINT "WorkflowEmailGroupMember_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "WorkflowEmailGroup"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "WorkflowEmailGroup" ("id", "key", "name", "description", "createdAt", "updatedAt") VALUES
    ('workflow-email-group-executive', 'EXECUTIVE_GROUP', 'Executive Group', 'Executive oversight recipients.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('workflow-email-group-projects', 'PROJECTS_GROUP', 'Projects Group', 'Project-side governance recipients.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('workflow-email-group-procurement', 'PROCUREMENT_GROUP', 'Procurement Group', 'Procurement team recipients.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('workflow-email-group-bd', 'BD_GROUP', 'BD Group', 'Business development recipients.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
