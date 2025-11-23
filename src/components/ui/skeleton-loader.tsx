import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "card" | "text" | "circle" | "button" | "input";
}

export const SkeletonLoader = ({ className, variant = "card" }: SkeletonLoaderProps) => {
  const baseClasses = "animate-pulse bg-muted";
  
  const variants = {
    card: "h-32 w-full rounded-xl",
    text: "h-4 w-full rounded",
    circle: "h-12 w-12 rounded-full",
    button: "h-11 w-32 rounded-lg",
    input: "h-11 w-full rounded-lg",
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)}>
      <div className="h-full w-full shimmer rounded-inherit" />
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-6 space-y-4">
    <div className="flex items-center gap-4">
      <SkeletonLoader variant="circle" className="h-16 w-16" />
      <div className="flex-1 space-y-2">
        <SkeletonLoader variant="text" className="w-3/4" />
        <SkeletonLoader variant="text" className="w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <SkeletonLoader variant="text" />
      <SkeletonLoader variant="text" />
      <SkeletonLoader variant="text" className="w-5/6" />
    </div>
    <div className="flex gap-2 pt-2">
      <SkeletonLoader variant="button" />
      <SkeletonLoader variant="button" />
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <SkeletonLoader variant="text" className="w-24 h-3" />
      <SkeletonLoader variant="input" />
    </div>
    <div className="space-y-2">
      <SkeletonLoader variant="text" className="w-32 h-3" />
      <SkeletonLoader variant="input" />
    </div>
    <div className="space-y-2">
      <SkeletonLoader variant="text" className="w-28 h-3" />
      <SkeletonLoader variant="input" className="h-24" />
    </div>
    <div className="flex gap-2">
      <SkeletonLoader variant="button" className="w-full" />
    </div>
  </div>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
        <SkeletonLoader variant="circle" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" className="w-3/4" />
          <SkeletonLoader variant="text" className="w-1/2 h-3" />
        </div>
        <SkeletonLoader variant="button" className="w-24" />
      </div>
    ))}
  </div>
);
