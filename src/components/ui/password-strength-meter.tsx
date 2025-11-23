import { useEffect, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { validatePasswordStrength, isPasswordCompromised } from "@/lib/passwordSecurity";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
  onValidationChange?: (isValid: boolean, isCompromised: boolean) => void;
}

export function PasswordStrengthMeter({ password, onValidationChange }: PasswordStrengthMeterProps) {
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
        onValidationChange?.(result.isValid && !compromised, compromised);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setIsCompromised(false);
      setHasCheckedBreach(false);
      setIsChecking(false);
      onValidationChange?.(false, false);
    }
  }, [password, onValidationChange]);

  if (!password) return null;

  const getStrengthLevel = () => {
    const passedChecks = 5 - strengthResult.errors.length;
    if (passedChecks <= 1) return { label: "Weak", color: "bg-red-500", width: "20%" };
    if (passedChecks <= 2) return { label: "Fair", color: "bg-orange-500", width: "40%" };
    if (passedChecks <= 3) return { label: "Good", color: "bg-yellow-500", width: "60%" };
    if (passedChecks <= 4) return { label: "Strong", color: "bg-green-500", width: "80%" };
    return { label: "Very Strong", color: "bg-green-600", width: "100%" };
  };

  const strength = getStrengthLevel();

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={cn(
            "font-medium",
            strength.color.replace('bg-', 'text-')
          )}>
            {strength.label}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300", strength.color)}
            style={{ width: strength.width }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1.5 text-xs">
        <RequirementItem 
          met={password.length >= 8}
          text="At least 8 characters"
        />
        <RequirementItem 
          met={/[A-Z]/.test(password)}
          text="One uppercase letter"
        />
        <RequirementItem 
          met={/[a-z]/.test(password)}
          text="One lowercase letter"
        />
        <RequirementItem 
          met={/[0-9]/.test(password)}
          text="One number"
        />
        <RequirementItem 
          met={/[^A-Za-z0-9]/.test(password)}
          text="One special character"
        />
      </div>

      {/* Breach Check Status */}
      {strengthResult.isValid && (
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg text-xs",
          isChecking && "bg-muted",
          !isChecking && isCompromised && "bg-red-50 border border-red-200",
          !isChecking && !isCompromised && hasCheckedBreach && "bg-green-50 border border-green-200"
        )}>
          {isChecking ? (
            <>
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 animate-pulse" />
              <div>
                <div className="font-medium text-muted-foreground">Checking security...</div>
                <div className="text-muted-foreground/80">Verifying against known data breaches</div>
              </div>
            </>
          ) : isCompromised ? (
            <>
              <X className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-red-900">Password found in data breach</div>
                <div className="text-red-700">This password has been exposed in a security breach. Please choose a different password.</div>
              </div>
            </>
          ) : hasCheckedBreach ? (
            <>
              <Check className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-green-900">Password is secure</div>
                <div className="text-green-700">Not found in known data breaches</div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground/40" />
      )}
      <span className={cn(
        met ? "text-green-700" : "text-muted-foreground"
      )}>
        {text}
      </span>
    </div>
  );
}
