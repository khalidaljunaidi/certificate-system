import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-[18px] border border-[var(--color-border)] bg-white px-4 text-[13px] text-[var(--color-ink)] outline-none transition-shadow focus:border-[var(--color-primary)] focus:shadow-[0_0_0_4px_rgba(49,19,71,0.08)]",
        className,
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";

export { Select };
