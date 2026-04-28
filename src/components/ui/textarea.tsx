import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--text-main)] outline-none transition-shadow placeholder:text-[12px] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(200,164,92,0.16)]",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
