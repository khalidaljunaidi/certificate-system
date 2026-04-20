"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";
import { requireAdminSession } from "@/lib/auth";
import type { ActionState } from "@/lib/types";
import { changePasswordSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function changePasswordAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  try {
    void prevState;
    const session = await requireAdminSession({
      allowPasswordChangeBypass: true,
    });

    const values = changePasswordSchema.parse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new Error("User account not found.");
    }

    const currentPasswordMatches = await bcrypt.compare(
      values.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new Error("Current password is incorrect.");
    }

    const nextHash = await bcrypt.hash(values.newPassword, 12);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: nextHash,
        passwordChanged: true,
        passwordUpdatedAt: new Date(),
      },
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/profile");
    revalidatePath("/admin/profile/security");

    return {
      success: "Password updated successfully.",
    };
  } catch (error) {
    return toActionState(error);
  }
}
