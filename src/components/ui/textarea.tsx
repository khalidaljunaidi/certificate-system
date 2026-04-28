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
        "flex min-h-28 w-full rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-[13px] text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[12px] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(49,19,71,0.08)]",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
