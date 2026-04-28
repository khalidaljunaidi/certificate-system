import type { ActionState } from "@/lib/types";

export function FormStateMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="rounded-[18px] border border-[rgba(185,28,28,0.18)] bg-[rgba(185,28,28,0.06)] px-4 py-3 text-xs leading-5 text-[#991b1b]">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-[18px] border border-[rgba(21,128,61,0.18)] bg-[rgba(21,128,61,0.06)] px-4 py-3 text-xs leading-5 text-[#166534]">
        {state.success}
      </p>
    );
  }

  return null;
}
