import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return false;
    }

    if (!("serviceWorker" in navigator)) {
      toast.error("Service workers are not supported");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("Notifications enabled!");
        return true;
      } else if (result === "denied") {
        toast.error("Notification permission denied");
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return false;
    }
  };

  const subscribe = async () => {
    if (!user) {
      toast.error("You must be logged in to enable notifications");
      return;
    }

    setIsLoading(true);

    try {
      const hasPermission = permission === "granted" || (await requestPermission());

      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Generate VAPID keys for your application
      // In production, generate these securely and store them
      const vapidPublicKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        subscription: subscription.toJSON() as any,
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      toast.error("Failed to disable push notifications");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
    };

    checkSubscription();
  }, [user]);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
};
