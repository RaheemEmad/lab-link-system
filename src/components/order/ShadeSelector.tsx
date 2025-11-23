import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface ShadeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onSystemChange: (system: "VITA Classical" | "VITA 3D-Master") => void;
}

// VITA Classical (VCL) grouped by hue families
const vitaClassical = {
  A: ["A1", "A2", "A3", "A3.5", "A4"],
  B: ["B1", "B2", "B3", "B4"],
  C: ["C1", "C2", "C3", "C4"],
  D: ["D2", "D3", "D4"]
};

// VITA 3D-Master by Value → Chroma → Hue
const vita3DMaster = {
  "1": ["1M1"],
  "2": ["2L1.5", "2L2.5", "2M1", "2M2", "2R1.5", "2R2.5"],
  "3": ["3L1.5", "3L2.5", "3M1", "3M2", "3M3", "3R1.5", "3R2.5"],
  "4": ["4L1.5", "4L2.5", "4M1", "4M2", "4M3", "4R1.5", "4R2.5"],
  "5": ["5M1", "5M2", "5M3"]
};

export const ShadeSelector = ({ value, onChange, onSystemChange }: ShadeSelectorProps) => {
  const [selectedSystem, setSelectedSystem] = useState<"VITA Classical" | "VITA 3D-Master">("VITA Classical");

  const handleSystemChange = (system: "VITA Classical" | "VITA 3D-Master") => {
    setSelectedSystem(system);
    onSystemChange(system);
    onChange(""); // Reset shade when system changes
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Shade System *</Label>
        <RadioGroup
          value={selectedSystem}
          onValueChange={handleSystemChange}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="VITA Classical" id="vita-classical" />
            <Label htmlFor="vita-classical" className="font-normal cursor-pointer">
              VITA Classical (VCL)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="VITA 3D-Master" id="vita-3d" />
            <Label htmlFor="vita-3d" className="font-normal cursor-pointer">
              VITA 3D-Master
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-base">Select Shade *</Label>
        
        {selectedSystem === "VITA Classical" ? (
          <Card className="p-4 mt-2 bg-muted/30">
            <div className="space-y-4">
              {Object.entries(vitaClassical).map(([hue, shades]) => (
                <div key={hue} className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">
                    {hue} Group
                  </Label>
                  <RadioGroup
                    value={value}
                    onValueChange={onChange}
                    className="flex flex-wrap gap-2"
                  >
                    {shades.map((shade) => (
                      <div key={shade} className="flex items-center">
                        <RadioGroupItem
                          value={shade}
                          id={`shade-${shade}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`shade-${shade}`}
                          className="flex items-center justify-center px-4 py-2 border-2 border-border rounded-md cursor-pointer hover:bg-primary/5 hover:border-primary transition-all peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary font-medium text-sm"
                        >
                          {shade}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-4 mt-2 bg-muted/30">
            <div className="space-y-4">
              {Object.entries(vita3DMaster).map(([value_level, shades]) => (
                <div key={value_level} className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Value {value_level}
                  </Label>
                  <RadioGroup
                    value={value}
                    onValueChange={onChange}
                    className="flex flex-wrap gap-2"
                  >
                    {shades.map((shade) => (
                      <div key={shade} className="flex items-center">
                        <RadioGroupItem
                          value={shade}
                          id={`shade-${shade}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`shade-${shade}`}
                          className="flex items-center justify-center px-3 py-2 border-2 border-border rounded-md cursor-pointer hover:bg-primary/5 hover:border-primary transition-all peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary font-medium text-xs"
                        >
                          {shade}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </Card>
        )}

        {value && (
          <p className="text-sm text-muted-foreground mt-2">
            Selected: <span className="font-medium text-foreground">{value}</span> ({selectedSystem})
          </p>
        )}
      </div>
    </div>
  );
};
