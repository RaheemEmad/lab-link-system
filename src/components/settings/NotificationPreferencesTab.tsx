import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail } from "lucide-react";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationPreferences";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

export function NotificationPreferencesTab() {
  const { prefs, isLoading, update, isUpdating } = useNotificationPreferences();

  const toggle = (category: string, channel: "in_app" | "email", value: boolean) => {
    const current = prefs[category as keyof typeof prefs];
    update(
      { category: category as any, in_app: current.in_app, email: current.email, [channel]: value } as any,
      // @ts-ignore - react-query v5 callback shape
      { onSuccess: () => toast.success("Preferences updated"), onError: () => toast.error("Failed to update") }
    );
  };

  if (isLoading) {
    return <div className="h-32 animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified for each event type. In-app notifications are on by default; email is off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-2 py-2 text-xs text-muted-foreground border-b">
          <span>Event type</span>
          <span className="flex items-center gap-1 w-20 justify-center"><Bell className="h-3 w-3" /> In-app</span>
          <span className="flex items-center gap-1 w-20 justify-center"><Mail className="h-3 w-3" /> Email</span>
        </div>
        {NOTIFICATION_CATEGORIES.map((cat) => {
          const p = prefs[cat.key];
          return (
            <div
              key={cat.key}
              className="grid grid-cols-[1fr_auto_auto] sm:gap-4 gap-3 items-center p-3 rounded-lg hover:bg-muted/40 transition-colors min-h-11"
            >
              <div>
                <Label className="text-sm font-medium">{cat.label}</Label>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="w-20 flex justify-center">
                <Switch
                  checked={p.in_app}
                  disabled={isUpdating}
                  onCheckedChange={(v) => toggle(cat.key, "in_app", v)}
                  aria-label={`In-app ${cat.label}`}
                />
              </div>
              <div className="w-20 flex justify-center">
                <Switch
                  checked={p.email}
                  disabled={isUpdating}
                  onCheckedChange={(v) => toggle(cat.key, "email", v)}
                  aria-label={`Email ${cat.label}`}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
