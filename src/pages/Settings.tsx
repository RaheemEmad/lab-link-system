import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palette, Bell, Shield, Keyboard, Globe } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  const themes = [
    { value: "light", label: t.settings.light, icon: Sun },
    { value: "dark", label: t.settings.dark, icon: Moon },
    { value: "system", label: t.settings.system, icon: Monitor },
  ] as const;

  const languages = [
    { value: "en" as const, label: t.settings.english, flag: "🇺🇸" },
    { value: "ar" as const, label: t.settings.arabic, flag: "🇸🇦" },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <LandingNav />
        <main className="flex-1 container max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-6">{t.settings.title}</h1>

          <Tabs defaultValue="appearance" className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="appearance" className="gap-1.5">
                <Palette className="h-4 w-4" /> {t.settings.appearance}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5">
                <Bell className="h-4 w-4" /> {t.settings.notifications}
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-1.5">
                <Shield className="h-4 w-4" /> {t.settings.privacy}
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-1.5">
                <Keyboard className="h-4 w-4" /> {t.settings.shortcuts}
              </TabsTrigger>
            </TabsList>

            {/* Appearance */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.appearance}</CardTitle>
                  <CardDescription>{t.settings.chooseTheme}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((tm) => (
                      <button
                        key={tm.value}
                        onClick={() => setTheme(tm.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200",
                          theme === tm.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <tm.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{tm.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Language */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t.settings.selectLanguage}
                  </CardTitle>
                  <CardDescription>{t.settings.languageDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {languages.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setLanguage(lang.value)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200",
                          language === lang.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="text-sm font-medium">{lang.label}</span>
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
                  <CardTitle>{t.settings.notificationPrefs}</CardTitle>
                  <CardDescription>{t.settings.controlUpdates}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifs">{t.settings.emailNotifications}</Label>
                    <Switch id="email-notifs" checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifs">{t.settings.pushNotifications}</Label>
                    <Switch id="push-notifs" checked={pushNotifs} onCheckedChange={setPushNotifs} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.privacyData}</CardTitle>
                  <CardDescription>{t.settings.manageData}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.settings.exportData}</p>
                      <p className="text-xs text-muted-foreground">{t.settings.exportDataDesc}</p>
                    </div>
                    <Button variant="outline" size="sm">{t.settings.export}</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">{t.settings.deleteAccount}</p>
                      <p className="text-xs text-muted-foreground">{t.settings.deleteAccountDesc}</p>
                    </div>
                    <Button variant="destructive" size="sm">{t.settings.delete}</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shortcuts */}
            <TabsContent value="shortcuts">
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.keyboardShortcuts}</CardTitle>
                  <CardDescription>{t.settings.quickAccess}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { keys: ["⌘", "K"], desc: t.settings.openCommandPalette },
                    { keys: ["⌘", "N"], desc: t.settings.newOrderShortcut },
                    { keys: ["⌘", "D"], desc: t.settings.goToDashboard },
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
