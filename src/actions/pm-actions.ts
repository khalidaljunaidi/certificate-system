"use server";

import type { ActionState } from "@/lib/types";
import { pmApprovalSchema, pmRejectionSchema } from "@/lib/validation";
import { approveCertificateByToken, rejectCertificateByToken } from "@/server/services/certificate-workflow";
import { EMPTY_ACTION_STATE, toActionState } from "@/actions/utils";

export async function submitPmDecisionAction(
  prevState: ActionState = EMPTY_ACTION_STATE,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token"));
  const intent = String(formData.get("intent"));

  try {
    void prevState;
    if (intent === "approve") {
      const values = pmApprovalSchema.parse({
        token,
        pmName: formData.get("pmName"),
        pmTitle: formData.get("pmTitle"),
        approvalNotes: formData.get("approvalNotes") || undefined,
      });

      await approveCertificateByToken({
        values,
      });

      return {
        success: "Certificate approved successfully.",
        decisionStatus: "approved",
      };
    }

    const values = pmRejectionSchema.parse({
      token,
      pmName: formData.get("pmName"),
      pmTitle: formData.get("pmTitle"),
      approvalNotes: formData.get("approvalNotes"),
    });

    await rejectCertificateByToken({
      values,
    });

    return {
      success: "Certificate rejected and returned.",
      decisionStatus: "rejected",
    };
  } catch (error) {
    return toActionState(error);
  }
}
