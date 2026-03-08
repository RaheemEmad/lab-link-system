import { cn } from "@/lib/utils";

const STEPS = ["Pending", "In Progress", "Ready for QC", "Ready for Delivery", "Delivered"] as const;

interface OrderProgressStripProps {
  status: string;
}

export const OrderProgressStrip = ({ status }: OrderProgressStripProps) => {
  const currentIndex = STEPS.indexOf(status as typeof STEPS[number]);
  const isCancelled = status === "Cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-destructive font-medium">Cancelled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 w-full max-w-[180px]">
      {STEPS.map((step, i) => (
        <div key={step} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={cn(
              "h-1.5 w-full rounded-full transition-colors",
              i <= currentIndex ? "bg-primary" : "bg-muted"
            )}
          />
        </div>
      ))}
    </div>
  );
};
