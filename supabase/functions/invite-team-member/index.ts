import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const inviterId = claims.claims.sub;

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["lab_staff", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve inviter's lab_id
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("lab_id, role")
      .eq("user_id", inviterId)
      .maybeSingle();

    if (!roleRow?.lab_id) {
      return new Response(JSON.stringify({ error: "You are not associated with a lab" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create invitation row
    const { data: invitation, error: insertErr } = await adminClient
      .from("team_invitations")
      .insert({
        lab_id: roleRow.lab_id,
        invited_email: email,
        invited_role: role,
        invited_by: inviterId,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the invite email via Supabase Auth (uses service role)
    const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { invite_token: invitation.invite_token, lab_id: roleRow.lab_id },
    });

    if (inviteErr && !inviteErr.message?.includes("already")) {
      console.error("Invite email error:", inviteErr);
      // Still return success — invitation row exists; user can sign up directly
    }

    return new Response(
      JSON.stringify({ success: true, invitation }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-team-member error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
