import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderConfig {
  id: string;
  trigger_type: string;
  hours_after_event: number;
  message_template: string;
  escalation_level: number;
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get active reminder configurations
    const { data: reminders, error: remindersError } = await supabaseClient
      .from("notification_reminders")
      .select("*")
      .eq("is_active", true);

    if (remindersError) {
      throw remindersError;
    }

    console.log(`Processing ${reminders?.length || 0} reminder configurations`);

    const now = new Date();
    const notifications: any[] = [];

    for (const reminder of reminders as ReminderConfig[]) {
      const hoursAgo = new Date(now.getTime() - reminder.hours_after_event * 60 * 60 * 1000);

      switch (reminder.trigger_type) {
        case "pending_acceptance": {
          // Find orders pending delivery acceptance for more than X hours
          const { data: pendingOrders } = await supabaseClient
            .from("orders")
            .select("id, order_number, doctor_id, status_updated_at")
            .eq("status", "Ready for Delivery")
            .eq("delivery_pending_confirmation", true)
            .lt("status_updated_at", hoursAgo.toISOString());

          for (const order of pendingOrders || []) {
            // Check if we already sent this reminder
            const { data: existing } = await supabaseClient
              .from("sent_reminders")
              .select("id")
              .eq("order_id", order.id)
              .eq("reminder_id", reminder.id)
              .single();

            if (!existing && order.doctor_id) {
              const message = reminder.message_template.replace("{order_number}", order.order_number);
              
              notifications.push({
                user_id: order.doctor_id,
                order_id: order.id,
                type: "reminder_pending_acceptance",
                title: "Delivery Pending Confirmation",
                message
              });

              // Mark as sent
              await supabaseClient
                .from("sent_reminders")
                .insert({
                  reminder_id: reminder.id,
                  order_id: order.id,
                  sent_at: now.toISOString()
                });
            }
          }
          break;
        }

        case "pending_payment": {
          // Find invoices with overdue payments
          const { data: overdueInvoices } = await supabaseClient
            .from("invoices")
            .select(`id, invoice_number, order_id, due_date`)
            .eq("status", "finalized")
            .eq("payment_status", "pending")
            .lt("due_date", now.toISOString().split("T")[0]);

          for (const invoice of overdueInvoices || []) {
            // Get order details
            const { data: orderData } = await supabaseClient
              .from("orders")
              .select("doctor_id, order_number")
              .eq("id", invoice.order_id)
              .single();

            const { data: existing } = await supabaseClient
              .from("sent_reminders")
              .select("id")
              .eq("order_id", invoice.order_id)
              .eq("reminder_id", reminder.id)
              .single();

            if (!existing && orderData?.doctor_id) {
              const message = reminder.message_template
                .replace("{invoice_number}", invoice.invoice_number)
                .replace("{order_number}", orderData.order_number);
              
              notifications.push({
                user_id: orderData.doctor_id,
                order_id: invoice.order_id,
                type: "reminder_overdue_payment",
                title: "Payment Overdue",
                message
              });

              await supabaseClient
                .from("sent_reminders")
                .insert({
                  reminder_id: reminder.id,
                  order_id: invoice.order_id,
                  sent_at: now.toISOString()
                });
            }
          }
          break;
        }

        case "pending_lab_response": {
          // Find orders waiting for lab response
          const { data: pendingOrders } = await supabaseClient
            .from("orders")
            .select(`
              id, 
              order_number, 
              doctor_id,
              auto_assign_pending,
              created_at
            `)
            .eq("status", "Pending")
            .eq("auto_assign_pending", true)
            .is("assigned_lab_id", null)
            .lt("created_at", hoursAgo.toISOString());

          for (const order of pendingOrders || []) {
            const { data: existing } = await supabaseClient
              .from("sent_reminders")
              .select("id")
              .eq("order_id", order.id)
              .eq("reminder_id", reminder.id)
              .single();

            if (!existing && order.doctor_id) {
              const message = reminder.message_template.replace("{order_number}", order.order_number);
              
              notifications.push({
                user_id: order.doctor_id,
                order_id: order.id,
                type: "reminder_no_lab_response",
                title: "Order Awaiting Lab",
                message
              });

              await supabaseClient
                .from("sent_reminders")
                .insert({
                  reminder_id: reminder.id,
                  order_id: order.id,
                  sent_at: now.toISOString()
                });
            }
          }
          break;
        }
      }
    }

    // Bulk insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Failed to insert notifications:", insertError);
      }
    }

    console.log(`Created ${notifications.length} reminder notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersProcessed: reminders?.length || 0,
        notificationsCreated: notifications.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error processing reminders:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
