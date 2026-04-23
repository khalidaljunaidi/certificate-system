import { NOTIFICATION_EMAIL_GROUP_DEFINITIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type {
  WorkflowEmailGroupMemberView,
  WorkflowEmailGroupView,
} from "@/lib/types";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toMemberView(member: {
  id: string;
  groupId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowEmailGroupMemberView {
  return {
    id: member.id,
    groupId: member.groupId,
    name: member.name,
    email: normalizeEmail(member.email),
    isActive: member.isActive,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

async function ensureDefaultGroups() {
  const existingGroups = await prisma.workflowEmailGroup.findMany({
    select: {
      key: true,
    },
  });
  const existingKeys = new Set(existingGroups.map((group) => group.key));

  await Promise.all(
    NOTIFICATION_EMAIL_GROUP_DEFINITIONS.filter(
      (definition) => !existingKeys.has(definition.value),
    ).map((definition) =>
      prisma.workflowEmailGroup.create({
        data: {
          key: definition.value,
          name: definition.label,
          description: definition.description,
        },
      }),
    ),
  );
}

export async function getNotificationEmailGroups(): Promise<
  WorkflowEmailGroupView[]
> {
  await ensureDefaultGroups();

  const groups = await prisma.workflowEmailGroup.findMany({
    include: {
      members: {
        orderBy: [
          {
            isActive: "desc",
          },
          {
            name: "asc",
          },
          {
            email: "asc",
          },
        ],
      },
    },
  });

  const groupMap = new Map(groups.map((group) => [group.key, group]));

  return NOTIFICATION_EMAIL_GROUP_DEFINITIONS.map((definition) => {
    const group = groupMap.get(definition.value);

    if (!group) {
      return {
        id: "",
        key: definition.value,
        name: definition.label,
        description: definition.description,
        members: [],
        activeMembers: [],
        inactiveMembers: [],
      };
    }

    const members = group.members.map(toMemberView);

    return {
      id: group.id,
      key: group.key,
      name: group.name,
      description: group.description,
      members,
      activeMembers: members.filter((member) => member.isActive),
      inactiveMembers: members.filter((member) => !member.isActive),
    };
  });
}

export async function saveNotificationEmailGroupMember(input: {
  groupId: string;
  memberId?: string;
  intent: "create" | "update" | "deactivate" | "activate";
  name: string;
  email: string;
}) {
  await ensureDefaultGroups();

  const group = await prisma.workflowEmailGroup.findUnique({
    where: {
      id: input.groupId,
    },
    select: {
      id: true,
      key: true,
      name: true,
    },
  });

  if (!group) {
    throw new Error("Notification group was not found.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const memberId = input.memberId?.trim() || null;
  const existingMemberByEmail = await prisma.workflowEmailGroupMember.findFirst({
    where: {
      groupId: input.groupId,
      email: normalizedEmail,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (input.intent === "create") {
    if (existingMemberByEmail && existingMemberByEmail.isActive) {
      throw new Error("A member with this email already exists in the group.");
    }

    if (existingMemberByEmail) {
      return prisma.workflowEmailGroupMember.update({
        where: {
          id: existingMemberByEmail.id,
        },
        data: {
          name: input.name.trim(),
          email: normalizedEmail,
          isActive: true,
        },
      });
    }

    return prisma.workflowEmailGroupMember.create({
      data: {
        groupId: input.groupId,
        name: input.name.trim(),
        email: normalizedEmail,
        isActive: true,
      },
    });
  }

  if (!memberId) {
    throw new Error("Select a group member before saving changes.");
  }

  const currentMember = await prisma.workflowEmailGroupMember.findFirst({
    where: {
      id: memberId,
      groupId: input.groupId,
    },
    select: {
      id: true,
      email: true,
      isActive: true,
    },
  });

  if (!currentMember) {
    throw new Error("The selected group member was not found.");
  }

  if (
    existingMemberByEmail &&
    existingMemberByEmail.id !== currentMember.id &&
    existingMemberByEmail.isActive
  ) {
    throw new Error("Another active member already uses this email address.");
  }

  return prisma.workflowEmailGroupMember.update({
    where: {
      id: currentMember.id,
    },
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      isActive:
        input.intent === "deactivate"
          ? false
          : input.intent === "activate"
            ? true
            : currentMember.isActive,
    },
  });
}
