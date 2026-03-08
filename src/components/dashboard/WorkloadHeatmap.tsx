interface WorkloadHeatmapProps {
  orders: Array<{ status: string }>;
}

const STATUS_CONFIG: { status: string; label: string; color: string }[] = [
  { status: "Pending", label: "Pending", color: "bg-warning" },
  { status: "In Progress", label: "In Progress", color: "bg-info" },
  { status: "Ready for QC", label: "QC", color: "bg-accent" },
  { status: "Ready for Delivery", label: "Delivery", color: "bg-primary" },
  { status: "Delivered", label: "Done", color: "bg-success" },
];

export const WorkloadHeatmap = ({ orders }: WorkloadHeatmapProps) => {
  const total = orders.filter(o => o.status !== "Cancelled").length;
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Workload Distribution</p>
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {STATUS_CONFIG.map(({ status, color }) => {
          const count = orders.filter(o => o.status === status).length;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={status}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${status}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {STATUS_CONFIG.map(({ status, label, color }) => {
          const count = orders.filter(o => o.status === status).length;
          if (count === 0) return null;
          return (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span>{label}: {count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
