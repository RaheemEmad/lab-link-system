import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palette, Bell, Shield, Keyboard } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <LandingNav />
        <main className="flex-1 container max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-6">Settings</h1>

          <Tabs defaultValue="appearance" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="appearance" className="gap-1.5">
                <Palette className="h-4 w-4" /> Appearance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5">
                <Bell className="h-4 w-4" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-1.5">
                <Shield className="h-4 w-4" /> Privacy
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-1.5">
                <Keyboard className="h-4 w-4" /> Shortcuts
              </TabsTrigger>
            </TabsList>

            {/* Appearance */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Choose your preferred theme</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                          theme === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <t.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Control how you receive updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifs">Email notifications</Label>
                    <Switch id="email-notifs" checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifs">Push notifications</Label>
                    <Switch id="push-notifs" checked={pushNotifs} onCheckedChange={setPushNotifs} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Data</CardTitle>
                  <CardDescription>Manage your data and privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Export your data</p>
                      <p className="text-xs text-muted-foreground">Download a copy of all your data</p>
                    </div>
                    <Button variant="outline" size="sm">Export</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Delete account</p>
                      <p className="text-xs text-muted-foreground">Permanently delete your account and data</p>
                    </div>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shortcuts */}
            <TabsContent value="shortcuts">
              <Card>
                <CardHeader>
                  <CardTitle>Keyboard Shortcuts</CardTitle>
                  <CardDescription>Quick access to common actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { keys: ["⌘", "K"], desc: "Open command palette" },
                    { keys: ["⌘", "N"], desc: "New order" },
                    { keys: ["⌘", "D"], desc: "Go to dashboard" },
                  ].map((shortcut) => (
                    <div key={shortcut.desc} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">{shortcut.desc}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
