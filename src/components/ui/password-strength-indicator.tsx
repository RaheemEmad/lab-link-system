import { useEffect, useState } from "react";
import { Check, X, AlertCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { validatePasswordStrength, isPasswordCompromised } from "@/lib/passwordSecurity";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const [strengthResult, setStrengthResult] = useState(validatePasswordStrength(""));
  const [isChecking, setIsChecking] = useState(false);
  const [isCompromised, setIsCompromised] = useState(false);
  const [hasCheckedBreach, setHasCheckedBreach] = useState(false);

  useEffect(() => {
    // Validate strength immediately
    const result = validatePasswordStrength(password);
    setStrengthResult(result);

    // Check for breaches with debounce
    if (password.length >= 8 && result.isValid) {
      setIsChecking(true);
      setHasCheckedBreach(false);
      
      const timer = setTimeout(async () => {
        const compromised = await isPasswordCompromised(password);
        setIsCompromised(compromised);
        setHasCheckedBreach(true);
        setIsChecking(false);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setIsCompromised(false);
      setHasCheckedBreach(false);
      setIsChecking(false);
    }
  }, [password]);

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

      {/* Breach Check Status */}
      {strengthResult.isValid && (
        <>
          {isChecking && (
            <Alert className="bg-muted border-muted">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              <AlertDescription className="text-xs">
                <div className="font-medium">Checking security...</div>
                <div className="text-muted-foreground/80">Verifying against known data breaches</div>
              </AlertDescription>
            </Alert>
          )}
          
          {!isChecking && isCompromised && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div className="font-medium">Password found in data breach</div>
                <div className="mt-0.5">This password has been exposed in a security breach. Please choose a different password.</div>
              </AlertDescription>
            </Alert>
          )}
          
          {!isChecking && !isCompromised && hasCheckedBreach && (
            <Alert className="bg-green-50 border-green-200 text-green-900">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs">
                <div className="font-medium">Password is secure</div>
                <div className="text-green-700 mt-0.5">Not found in known data breaches</div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
};
