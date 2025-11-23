import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lab {
  id: string;
  name: string;
  pricing_tier: string;
  performance_score: number;
}

interface AvailableLabsListProps {
  availableLabs: Lab[];
  onAdd: (labId: string) => void;
  isAdding: boolean;
}

export const AvailableLabsList = ({
  availableLabs,
  onAdd,
  isAdding,
}: AvailableLabsListProps) => {
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [addingLab, setAddingLab] = useState<string | null>(null);

  const handleAdd = (labId: string) => {
    setAddingLab(labId);
    onAdd(labId);
    
    setTimeout(() => {
      setAddingLab(null);
      setSelectedLab(null);
    }, 500);
  };

  if (!availableLabs || availableLabs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-4xl mb-3">🎉</div>
        <p className="font-medium">All labs added!</p>
        <p className="text-sm mt-1">You've bookmarked all available labs</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {availableLabs.map((lab) => (
        <Card
          key={lab.id}
          className={cn(
            "cursor-pointer transition-all duration-200 overflow-hidden",
            "hover:shadow-md hover:border-primary/50",
            selectedLab === lab.id && "border-primary bg-primary/5 shadow-md",
            addingLab === lab.id && "animate-out zoom-out-95 fade-out-0 duration-500"
          )}
          onClick={() => setSelectedLab(lab.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-1 truncate">
                  {lab.name}
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="text-xs">
                    {lab.pricing_tier}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-muted-foreground">
                      {lab.performance_score?.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLab === lab.id && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdd(lab.id);
                  }}
                  disabled={isAdding || addingLab === lab.id}
                  className="shrink-0 animate-in slide-in-from-right-4 fade-in-0 duration-200"
                >
                  {addingLab === lab.id ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
