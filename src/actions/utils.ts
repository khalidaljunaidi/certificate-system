import { ZodError } from "zod";

import type { ActionState } from "@/lib/types";

export const EMPTY_ACTION_STATE: ActionState = {};

export function toActionState(error: unknown): ActionState {
  if (error instanceof ZodError) {
    return {
      error: "Please review the highlighted fields.",
      fieldErrors: error.flatten().fieldErrors,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
    };
  }

  return {
    error: "Something went wrong. Please try again.",
  };
}
