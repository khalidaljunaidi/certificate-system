import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex max-w-full items-center overflow-hidden text-ellipsis rounded-full px-2 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.08em] whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--surface-soft)] text-[var(--text-muted)]",
        purple: "bg-[rgba(27,16,51,0.10)] text-[var(--primary)]",
        orange: "bg-[rgba(200,164,92,0.18)] text-[var(--primary)]",
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
