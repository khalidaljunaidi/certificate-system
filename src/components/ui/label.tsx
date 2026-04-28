import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[11px] font-medium leading-5 tracking-[0.08em] text-[var(--color-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
