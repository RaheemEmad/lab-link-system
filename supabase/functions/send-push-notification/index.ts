import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

const ALLOWED_TYPES = new Set(["status_change", "new_note"]);

async function sendWebPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "TTL": "86400" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("Failed to send notification:", response.statusText);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

function sanitize(input: unknown, max = 500): string {
  return String(input ?? "").replace(/[\r\n\t]+/g, " ").slice(0, max);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Require authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const supabaseClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const orderId = String(body.orderId || "");
    const type = String(body.type || "");
    const message = sanitize(body.message, 500);

    if (!orderId || !ALLOWED_TYPES.has(type) || !message) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load order and authorize caller (doctor, admin, or assigned to order)
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("doctor_id, order_number, patient_name, assigned_lab_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseClient
      .from("user_roles")
      .select("role, lab_id")
      .eq("user_id", callerId)
      .maybeSingle();

    const isAdmin = callerRole?.role === "admin";
    const isDoctorOwner = order.doctor_id === callerId;
    const isAssignedLabStaff =
      callerRole?.role === "lab_staff" &&
      callerRole?.lab_id === order.assigned_lab_id;

    let isAssigned = false;
    if (!isAdmin && !isDoctorOwner && !isAssignedLabStaff) {
      const { data: assignment } = await supabaseClient
        .from("order_assignments")
        .select("user_id")
        .eq("order_id", orderId)
        .eq("user_id", callerId)
        .maybeSingle();
      isAssigned = !!assignment;
    }

    if (!isAdmin && !isDoctorOwner && !isAssignedLabStaff && !isAssigned) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect recipients
    const userIds: string[] = [order.doctor_id];
    const { data: assignments } = await supabaseClient
      .from("order_assignments")
      .select("user_id")
      .eq("order_id", orderId);
    if (assignments) userIds.push(...assignments.map((a) => a.user_id));

    const uniqueIds = [...new Set(userIds)];

    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", uniqueIds);

    if (subError) throw subError;

    const notificationPromises = (subscriptions || []).map((sub) =>
      sendWebPushNotification(sub.subscription as PushSubscription, {
        title: `Order ${sanitize(order.order_number, 60)}`,
        body: message,
        icon: "https://storage.googleapis.com/gpt-engineer-file-uploads/tmNyuY2x94WjbQ35tw5Dp9Bj0lD3/uploads/1763467585853-unnamed.jpg",
        badge: "https://storage.googleapis.com/gpt-engineer-file-uploads/tmNyuY2x94WjbQ35tw5Dp9Bj0lD3/uploads/1763467585853-unnamed.jpg",
        data: { orderId, type, url: `/dashboard?orderId=${orderId}` },
      })
    );

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ success: true, notificationsSent: subscriptions?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
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
