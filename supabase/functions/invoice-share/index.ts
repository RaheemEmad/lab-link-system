import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // GET: Fetch invoice by share token (public, no auth)
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invoice, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, status, subtotal, adjustments_total, expenses_total,
          final_total, amount_paid, payment_status, due_date, late_fee_applied,
          payment_method, created_at,
          order:orders(patient_name, doctor_name, restoration_type, order_number)
        `)
        .eq("share_token", token)
        .single();

      if (error || !invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch line items
      const { data: lineItems } = await supabase
        .from("invoice_line_items")
        .select("id, description, quantity, unit_price, total_price")
        .eq("invoice_id", invoice.id)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({ ...invoice, line_items: lineItems || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Generate share token (requires auth)
    if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { invoice_id } = await req.json();
      if (!invoice_id) {
        return new Response(JSON.stringify({ error: "invoice_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already has a token
      const { data: existing } = await supabase
        .from("invoices")
        .select("share_token")
        .eq("id", invoice_id)
        .single();

      if (existing?.share_token) {
        return new Response(
          JSON.stringify({ token: existing.share_token }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate token
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from("invoices")
        .update({ share_token: token })
        .eq("id", invoice_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
