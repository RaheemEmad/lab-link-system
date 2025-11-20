import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

  const ToothCheckbox = ({ tooth }: { tooth: number }) => {
    const isSelected = selectedTeeth.includes(tooth.toString());
    
    return (
      <div className="flex flex-col items-center gap-1">
        <Checkbox
          id={`tooth-${tooth}`}
          checked={isSelected}
          onCheckedChange={() => toggleTooth(tooth)}
          className="h-6 w-6 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <label
          htmlFor={`tooth-${tooth}`}
          className="text-xs font-medium cursor-pointer select-none hover:text-primary transition-colors"
        >
          {tooth}
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-base">Select Teeth (FDI Notation) *</Label>
      <Card className="p-6 bg-muted/30">
        <div className="space-y-6">
          {/* Upper Jaw */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center font-semibold">UPPER JAW</p>
            <div className="flex justify-center gap-8">
              <div className="flex gap-3">
                {upperTeeth.right.map(tooth => (
                  <ToothCheckbox key={tooth} tooth={tooth} />
                ))}
              </div>
              <div className="w-px bg-border" />
              <div className="flex gap-3">
                {upperTeeth.left.map(tooth => (
                  <ToothCheckbox key={tooth} tooth={tooth} />
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-border" />

          {/* Lower Jaw */}
          <div className="space-y-3">
            <div className="flex justify-center gap-8">
              <div className="flex gap-3">
                {lowerTeeth.right.map(tooth => (
                  <ToothCheckbox key={tooth} tooth={tooth} />
                ))}
              </div>
              <div className="w-px bg-border" />
              <div className="flex gap-3">
                {lowerTeeth.left.map(tooth => (
                  <ToothCheckbox key={tooth} tooth={tooth} />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center font-semibold">LOWER JAW</p>
          </div>
        </div>
      </Card>
      
      {selectedTeeth.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{value}</span>
        </p>
      )}
    </div>
  );
};
