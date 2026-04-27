-- RBAC catalog and user-role assignment tables
CREATE TYPE "PermissionCategory" AS ENUM ('VENDORS', 'PROJECTS', 'TASKS', 'CERTIFICATES', 'EVALUATIONS', 'SYSTEM');

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE INDEX "Role_name_idx" ON "Role"("name");
CREATE INDEX "Role_isSystem_idx" ON "Role"("isSystem");

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PermissionCategory" NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");
CREATE INDEX "Permission_category_sortOrder_idx" ON "Permission"("category", "sortOrder");

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

CREATE TABLE "UserRoleAssignment" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "UserRoleAssignment_roleId_idx" ON "UserRoleAssignment"("roleId");
CREATE INDEX "UserRoleAssignment_assignedByUserId_idx" ON "UserRoleAssignment"("assignedByUserId");

ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "Role"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_permissionId_fkey"
FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignment"
ADD CONSTRAINT "UserRoleAssignment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignment"
ADD CONSTRAINT "UserRoleAssignment_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "Role"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserRoleAssignment"
ADD CONSTRAINT "UserRoleAssignment_assignedByUserId_fkey"
FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
