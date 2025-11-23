import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-glow",
        gradient: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-accent before:to-primary before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:shadow-medium",
        outline: "border-2 border-primary/30 bg-background shadow-sm hover:bg-primary/10 hover:border-primary hover:text-primary hover:shadow-glow",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-primary/5 hover:text-primary hover:shadow-soft",
        ghost: "hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        xl: "h-14 rounded-xl px-8 text-lg",
        icon: "h-10 w-10",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
