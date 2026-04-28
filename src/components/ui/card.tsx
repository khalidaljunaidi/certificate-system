import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "tg-surface-live rounded-[26px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_44px_rgba(27,16,51,0.07)]",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-[var(--text-main)]", className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardHeader, CardTitle };
