import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-[-0.01em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tss-steel/35 focus-visible:ring-offset-2 focus-visible:ring-offset-tss-surface disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-tss-navy text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] hover:bg-tss-navy-deep",
        steel:
          "bg-tss-steel text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset] hover:bg-[#1858d1]",
        outline:
          "border border-tss-border-strong/80 bg-white text-tss-ink hover:border-tss-steel/35 hover:bg-tss-steel-soft/70",
        ghost: "text-tss-ink hover:bg-tss-steel-soft/80",
        danger: "bg-tss-danger text-white hover:bg-[#941d13]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";
