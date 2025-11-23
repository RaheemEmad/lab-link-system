import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/90",
        outline: "text-foreground border-border hover:bg-primary/5 hover:border-primary/30",
        success: "border-transparent bg-success text-success-foreground shadow hover:bg-success/90",
        // Order Status Badges
        pending: "border-transparent bg-light-blue text-white shadow hover:bg-light-blue/90",
        "in-progress": "border-transparent bg-ocean-blue text-white shadow hover:bg-ocean-blue/90 animate-pulse",
        "ready-qc": "border-transparent bg-dark-teal text-white shadow hover:bg-dark-teal/90",
        "ready-delivery": "border-transparent bg-forest-green text-white shadow hover:bg-forest-green/90",
        delivered: "border-transparent bg-forest-green text-white shadow hover:bg-forest-green/90",
        // Workflow Status Badges
        urgent: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 animate-pulse",
        normal: "border-transparent bg-sky-blue text-white shadow hover:bg-sky-blue/90",
        active: "border-transparent bg-mint-green text-white shadow hover:bg-mint-green/90",
        inactive: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
