import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ToothSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

// FDI notation for adult teeth
const upperTeeth = {
  right: [18, 17, 16, 15, 14, 13, 12, 11],
  left: [21, 22, 23, 24, 25, 26, 27, 28]
};

const lowerTeeth = {
  right: [48, 47, 46, 45, 44, 43, 42, 41],
  left: [31, 32, 33, 34, 35, 36, 37, 38]
};

export const ToothSelector = ({ value, onChange }: ToothSelectorProps) => {
  const selectedTeeth = value ? value.split(',').map(t => t.trim()) : [];

  const toggleTooth = (tooth: number) => {
    const toothStr = tooth.toString();
    const currentTeeth = selectedTeeth.filter(Boolean);
    
    if (currentTeeth.includes(toothStr)) {
      const newTeeth = currentTeeth.filter(t => t !== toothStr);
      onChange(newTeeth.join(', '));
    } else {
      onChange([...currentTeeth, toothStr].sort((a, b) => Number(a) - Number(b)).join(', '));
    }
  };

  const selectAll = () => {
    const allTeeth = [
      ...upperTeeth.right, ...upperTeeth.left,
      ...lowerTeeth.right, ...lowerTeeth.left
    ].sort((a, b) => a - b);
    onChange(allTeeth.join(', '));
  };

  const clearAll = () => {
    onChange('');
  };

  const ToothButton = ({ tooth }: { tooth: number }) => {
    const isSelected = selectedTeeth.includes(tooth.toString());
    
    return (
      <button
        type="button"
        onClick={() => toggleTooth(tooth)}
        className={cn(
          // Base styles - minimum touch target 44x44
          "min-h-[44px] min-w-[36px] sm:min-w-[40px] lg:min-w-[44px]",
          "flex flex-col items-center justify-center",
          "rounded-md border-2 transition-all duration-150",
          "text-xs sm:text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
          "active:scale-95",
          // Selected state
          isSelected
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : "bg-background hover:bg-muted border-border hover:border-primary/50"
        )}
      >
        <span className="font-mono">{tooth}</span>
      </button>
    );
  };

  const TeethRow = ({ teeth, label }: { teeth: number[][]; label: string }) => (
    <div className="space-y-2">
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center font-semibold uppercase tracking-wider">
        {label}
      </p>
      {/* Horizontal scroll on mobile, centered on larger screens */}
      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="flex justify-center min-w-max">
          {/* Right quadrant */}
          <div className="flex gap-1 sm:gap-1.5 lg:gap-2">
            {teeth[0].map(tooth => (
              <ToothButton key={tooth} tooth={tooth} />
            ))}
          </div>
          
          {/* Center divider */}
          <div className="w-2 sm:w-3 lg:w-4 flex items-center justify-center">
            <div className="w-0.5 h-8 bg-border" />
          </div>
          
          {/* Left quadrant */}
          <div className="flex gap-1 sm:gap-1.5 lg:gap-2">
            {teeth[1].map(tooth => (
              <ToothButton key={tooth} tooth={tooth} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm sm:text-base font-medium">Select Teeth (FDI Notation) *</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline focus:outline-none"
          >
            Select All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground focus:outline-none"
          >
            Clear
          </button>
        </div>
      </div>
      
      <Card className="p-3 sm:p-4 lg:p-6 bg-muted/30">
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Upper Jaw */}
          <TeethRow 
            teeth={[upperTeeth.right, upperTeeth.left]} 
            label="Upper Jaw" 
          />

          {/* Divider representing bite line */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-dashed border-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bite Line</span>
            <div className="flex-1 border-t border-dashed border-border" />
          </div>

          {/* Lower Jaw */}
          <TeethRow 
            teeth={[lowerTeeth.right, lowerTeeth.left]} 
            label="Lower Jaw" 
          />
        </div>
      </Card>
      
      {/* Selected teeth summary */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {selectedTeeth.length > 0 ? (
            <>
              Selected: <span className="font-medium text-foreground font-mono">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground/70">No teeth selected</span>
          )}
        </p>
        {selectedTeeth.length > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {selectedTeeth.length} {selectedTeeth.length === 1 ? 'tooth' : 'teeth'}
          </span>
        )}
      </div>
    </div>
  );
};
