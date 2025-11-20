import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  // Use web-push library for sending notifications
  // This is a simplified version - in production, use a proper library
  console.log("Sending notification to:", subscription.endpoint);
  console.log("Payload:", payload);

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to send notification:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId, type, message } = await req.json();

    // Get the order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("doctor_id, order_number, patient_name")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get all users who should receive this notification
    let userIds: string[] = [];

    if (type === "status_change") {
      // Notify doctor and assigned lab staff
      userIds.push(order.doctor_id);

      const { data: assignments } = await supabaseClient
        .from("order_assignments")
        .select("user_id")
        .eq("order_id", orderId);

      if (assignments) {
        userIds.push(...assignments.map((a) => a.user_id));
      }
    } else if (type === "new_note") {
      // Notify doctor and all assigned lab staff
      userIds.push(order.doctor_id);

      const { data: assignments } = await supabaseClient
        .from("order_assignments")
        .select("user_id")
        .eq("order_id", orderId);

      if (assignments) {
        userIds.push(...assignments.map((a) => a.user_id));
      }
    }

    // Remove duplicates
    userIds = [...new Set(userIds)];

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", userIds);

    if (subError) {
      throw subError;
    }

    // Send notifications
    const notificationPromises = subscriptions.map((sub) =>
      sendWebPushNotification(sub.subscription as PushSubscription, {
        title: `Order ${order.order_number}`,
        body: message,
        icon: "https://storage.googleapis.com/gpt-engineer-file-uploads/tmNyuY2x94WjbQ35tw5Dp9Bj0lD3/uploads/1763467585853-unnamed.jpg",
        badge: "https://storage.googleapis.com/gpt-engineer-file-uploads/tmNyuY2x94WjbQ35tw5Dp9Bj0lD3/uploads/1763467585853-unnamed.jpg",
        data: {
          orderId,
          type,
          url: `/dashboard?orderId=${orderId}`,
        },
      })
    );

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, notificationsSent: subscriptions.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});