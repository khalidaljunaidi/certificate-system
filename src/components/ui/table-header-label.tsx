import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function TableHeaderLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { TableHeaderLabel };
