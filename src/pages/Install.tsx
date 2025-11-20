import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Zap, Bell, WifiOff, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const features = [
    {
      icon: WifiOff,
      title: "Offline Access",
      description: "Work seamlessly even without internet connection",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Instant loading with cached content",
    },
    {
      icon: Bell,
      title: "Push Notifications",
      description: "Stay updated with order status changes",
    },
    {
      icon: Smartphone,
      title: "Native Experience",
      description: "Feels like a real app on your device",
    },
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              LabLink is already installed on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You can access LabLink from your home screen anytime.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-6">
              <Download className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Install LabLink
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Get the full app experience on your device. Fast, reliable, and works offline.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Ready to Install?</CardTitle>
              <CardDescription>
                {isInstallable
                  ? "Click the button below to add LabLink to your home screen"
                  : "Use your browser's menu to install LabLink"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstallable ? (
                <Button
                  onClick={handleInstallClick}
                  size="lg"
                  className="w-full"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install LabLink
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Installation Instructions:</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>iOS (Safari):</strong> Tap the Share button, then "Add to Home Screen"</p>
                      <p><strong>Android (Chrome):</strong> Tap the menu (⋮), then "Add to Home screen"</p>
                      <p><strong>Desktop:</strong> Look for the install icon in your browser's address bar</p>
                    </div>
                  </div>
                </div>
              )}
              
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full"
              >
                Continue in Browser
              </Button>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Installing LabLink uses minimal storage and provides a superior experience
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Install;