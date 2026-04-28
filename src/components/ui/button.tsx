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
          "bg-[var(--color-primary)] !text-white hover:bg-[var(--color-primary-strong)] focus-visible:ring-[var(--color-primary)]",
        secondary:
          "border border-[var(--color-border)] bg-white !text-[var(--color-ink)] hover:bg-[var(--color-panel-soft)] focus-visible:ring-[var(--color-primary)]",
        ghost:
          "!text-[var(--color-ink)] hover:bg-[var(--color-panel-soft)] focus-visible:ring-[var(--color-primary)]",
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
