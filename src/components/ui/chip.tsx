import type { ComponentProps } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex max-w-full items-center overflow-hidden text-ellipsis rounded-full border px-2 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.08em] whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:
          "border-[rgba(17,17,17,0.08)] bg-[var(--color-panel-soft)] text-[var(--color-muted)]",
        purple:
          "border-[rgba(49,19,71,0.08)] bg-[rgba(49,19,71,0.08)] text-[var(--color-primary)]",
        orange:
          "border-[rgba(215,132,57,0.14)] bg-[rgba(215,132,57,0.12)] text-[var(--color-accent)]",
        green:
          "border-[rgba(21,128,61,0.14)] bg-[rgba(21,128,61,0.1)] text-[#166534]",
        red:
          "border-[rgba(185,28,28,0.16)] bg-[rgba(185,28,28,0.1)] text-[#991b1b]",
      },
      size: {
        sm: "px-2 py-[5px] text-[10px] tracking-[0.08em]",
        md: "px-2 py-1 text-[11px] tracking-[0.08em]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
    },
  },
);

function Chip({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof chipVariants>) {
  return <span className={cn(chipVariants({ tone, size }), className)} {...props} />;
}

export { Chip };
