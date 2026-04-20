import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--color-panel-soft)] text-[var(--color-ink)]",
        purple: "bg-[rgba(49,19,71,0.10)] text-[var(--color-primary)]",
        orange: "bg-[rgba(215,132,57,0.14)] text-[var(--color-accent)]",
        green: "bg-[rgba(21,128,61,0.12)] text-[#166534]",
        red: "bg-[rgba(185,28,28,0.12)] text-[#991b1b]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
