import { motion } from "framer-motion";
import { FileText, Zap, BookTemplate } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OrderMode = "detailed" | "quick" | "template";

interface OrderModeChooserProps {
  onSelect: (mode: OrderMode) => void;
  hasTemplates: boolean;
}

const modes = [
  {
    id: "detailed" as OrderMode,
    icon: FileText,
    title: "Full Case Submission",
    description: "Send a detailed case to your preferred lab or invite labs to bid",
    badge: null,
  },
  {
    id: "quick" as OrderMode,
    icon: Zap,
    title: "Quick Order",
    description: "Just 3 fields — patient, restoration, teeth. Send to lab in seconds.",
    badge: "Fast",
  },
  {
    id: "template" as OrderMode,
    icon: BookTemplate,
    title: "From Template",
    description: "Use a saved template to pre-fill and send your order.",
    badge: null,
  },
];

export const OrderModeChooser = ({ onSelect, hasTemplates }: OrderModeChooserProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">How would you like to create your order?</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a method that suits your workflow</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {modes.map((mode, i) => {
          const isDisabled = mode.id === "template" && !hasTemplates;
          return (
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={cn(
                  "cursor-pointer border-2 transition-all duration-200 hover:border-primary hover:shadow-glow",
                  isDisabled && "opacity-50 cursor-not-allowed hover:border-border hover:shadow-none"
                )}
                onClick={() => !isDisabled && onSelect(mode.id)}
              >
                <CardContent className="pt-6 pb-5 px-5 flex flex-col items-center text-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <mode.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-semibold text-foreground">{mode.title}</h3>
                      {mode.badge && (
                        <Badge variant="secondary" className="text-[10px]">{mode.badge}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
                    {isDisabled && (
                      <p className="text-[10px] text-muted-foreground mt-2 italic">No templates saved yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
