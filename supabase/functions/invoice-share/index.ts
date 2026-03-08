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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceSupabase = createClient(supabaseUrl, serviceKey);

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

      const { data: invoice, error } = await serviceSupabase
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
      const { data: lineItems } = await serviceSupabase
        .from("invoice_line_items")
        .select("id, description, quantity, unit_price, total_price")
        .eq("invoice_id", invoice.id)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({ ...invoice, line_items: lineItems || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Generate share token (requires authenticated user who owns the invoice)
    if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate the JWT and get user identity
      const token = authHeader.replace("Bearer ", "");
      const authedSupabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authedSupabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub as string;

      const { invoice_id } = await req.json();
      if (!invoice_id) {
        return new Response(JSON.stringify({ error: "invoice_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the caller owns this invoice (doctor of the order, or admin, or assigned lab staff)
      const { data: invoiceOwnership } = await serviceSupabase
        .from("invoices")
        .select("id, order:orders!inner(doctor_id)")
        .eq("id", invoice_id)
        .single();

      if (!invoiceOwnership) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderData = invoiceOwnership.order as any;
      const isOwner = orderData?.doctor_id === userId;

      // Check if admin or assigned lab staff
      let isAuthorized = isOwner;
      if (!isAuthorized) {
        const { data: roleData } = await serviceSupabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (roleData?.role === "admin") {
          isAuthorized = true;
        } else if (roleData?.role === "lab_staff") {
          const { data: assignment } = await serviceSupabase
            .from("order_assignments")
            .select("id")
            .eq("order_id", (invoiceOwnership as any).order?.id || invoice_id)
            .eq("user_id", userId)
            .maybeSingle();
          isAuthorized = !!assignment;
        }
      }

      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already has a token
      const { data: existing } = await serviceSupabase
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
      const shareToken = crypto.randomUUID();
      const { error } = await serviceSupabase
        .from("invoices")
        .update({ share_token: shareToken })
        .eq("id", invoice_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ token: shareToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
