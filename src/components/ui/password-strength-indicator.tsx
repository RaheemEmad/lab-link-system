import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const calculateStrength = (): number => {
    let score = 0;
    
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 20;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 20;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    
    return Math.min(score, 100);
  };

  const strength = calculateStrength();
  
  const getStrengthLabel = (): string => {
    if (strength === 0) return "Enter password";
    if (strength <= 33) return "Weak";
    if (strength <= 66) return "Medium";
    return "Strong";
  };

  const getStrengthColor = (): string => {
    if (strength === 0) return "bg-muted";
    if (strength <= 33) return "bg-destructive";
    if (strength <= 66) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthTextColor = (): string => {
    if (strength === 0) return "text-muted-foreground";
    if (strength <= 33) return "text-destructive";
    if (strength <= 66) return "text-yellow-600";
    return "text-green-600";
  };

  const criteria: PasswordCriteria[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={cn("font-medium", getStrengthTextColor())}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div 
            className={cn("h-full transition-all", getStrengthColor())}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {criterion.met ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn(
              criterion.met ? "text-foreground" : "text-muted-foreground"
            )}>
              {criterion.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
