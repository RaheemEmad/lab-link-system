import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Package, Bell, BarChart3 } from "lucide-react";

interface FirstTimeModalProps {
  open: boolean;
  onClose: () => void;
}

export function FirstTimeModal({ open, onClose }: FirstTimeModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Sparkles className="h-12 w-12 text-primary" />,
      title: "Welcome to LabLink!",
      description: "Your digital workflow platform for seamless dentist-lab collaboration. Let's get you started with a quick tour.",
    },
    {
      icon: <Package className="h-12 w-12 text-accent" />,
      title: "Create & Track Orders",
      description: "Submit new lab orders in seconds with guided forms. Track every step from submission to delivery with real-time updates.",
    },
    {
      icon: <Bell className="h-12 w-12 text-primary" />,
      title: "Stay Notified",
      description: "Get instant notifications when your order status changes, when labs add notes, or when deliveries are ready.",
    },
    {
      icon: <BarChart3 className="h-12 w-12 text-accent" />,
      title: "Monitor Performance",
      description: "View your order history, track turnaround times, and see lab performance metrics all in one dashboard.",
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {currentStep.icon}
          </div>
          <DialogTitle className="text-center text-xl sm:text-2xl">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base pt-2">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          {!isLastStep && (
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip Tour
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? "Get Started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
