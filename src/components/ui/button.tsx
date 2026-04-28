import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "tg-button-live inline-flex items-center justify-center rounded-full text-[13px] font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-[var(--accent)] bg-[linear-gradient(135deg,var(--tg-gold-soft),var(--accent))] !text-[var(--tg-primary)] shadow-[0_14px_34px_rgba(200,164,92,0.22)] hover:border-[var(--tg-gold-soft)] hover:shadow-[0_18px_44px_rgba(200,164,92,0.34)] focus-visible:ring-[var(--accent)]",
        secondary:
          "border border-[var(--border)] bg-[var(--surface)] !text-[var(--text-main)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] hover:border-[var(--accent)] hover:bg-[var(--surface-soft)] focus-visible:ring-[var(--accent)]",
        ghost:
          "!text-[var(--text-main)] hover:bg-[var(--surface-soft)] focus-visible:ring-[var(--accent)]",
        destructive:
          "bg-[#9b1d1d] !text-white hover:bg-[#7e1818] focus-visible:ring-[#9b1d1d]",
      },
      size: {
        default: "h-10 px-[18px]",
        sm: "h-[34px] px-3 text-[11px]",
        lg: "h-11 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
