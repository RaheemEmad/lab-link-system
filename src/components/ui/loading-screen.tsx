import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
};
