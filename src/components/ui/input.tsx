import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border-2 bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-300",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            !error && !success && "border-input hover:border-primary/50",
            !error && !success && isFocused && "border-primary shadow-[0_0_0_3px_rgba(59,130,246,0.1)] scale-[1.01]",
            error && "border-destructive/60 hover:border-destructive bg-destructive/5",
            error && isFocused && "border-destructive shadow-[0_0_0_3px_rgba(239,68,68,0.1)] scale-[1.01]",
            success && "border-success/60 hover:border-success bg-success/5",
            success && isFocused && "border-success shadow-[0_0_0_3px_rgba(34,197,94,0.1)] scale-[1.01]",
            className,
          )}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          ref={ref}
          {...props}
        />
        
        {/* CSS-only gradient border on focus */}
        {isFocused && !error && !success && (
          <div
            className="absolute inset-0 rounded-lg pointer-events-none animate-in fade-in duration-200"
            style={{
              background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
              padding: "2px",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
