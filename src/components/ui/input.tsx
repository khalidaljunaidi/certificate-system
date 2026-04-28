import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] text-[var(--text-main)] outline-none transition-shadow placeholder:text-[12px] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(200,164,92,0.16)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
