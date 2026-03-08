import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_RESTORATION_TYPES = ["Zirconia", "Zirconia Layer", "Zirco-Max", "PFM", "Acrylic", "E-max"];
const VALID_URGENCY = ["Normal", "Urgent"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { text, imageBase64, imageMimeType } = await req.json();

    if (!text && !imageBase64) {
      return new Response(JSON.stringify({ error: "Provide text or imageBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a dental order extraction assistant. Extract structured order details from the provided text or image. Only extract fields you can confidently identify. Do not guess.`;

    const userContent: any[] = [];

    if (text) {
      userContent.push({ type: "text", text: `Extract dental order details from this text:\n\n${text}` });
    }

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}` },
      });
      userContent.push({ type: "text", text: "Extract dental order details from this prescription/order image." });
    }

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_order",
            description: "Extract structured dental order details",
            parameters: {
              type: "object",
              properties: {
                patientName: { type: "string", description: "Patient full name" },
                doctorName: { type: "string", description: "Doctor/dentist name" },
                restorationType: {
                  type: "string",
                  enum: VALID_RESTORATION_TYPES,
                  description: "Type of dental restoration",
                },
                teethNumber: { type: "string", description: "Tooth numbers, comma separated (e.g. '14,15')" },
                teethShade: { type: "string", description: "Shade value (e.g. 'A2', 'B1')" },
                biologicalNotes: { type: "string", description: "Any biological or clinical notes" },
                handlingInstructions: { type: "string", description: "Special handling instructions" },
                urgency: { type: "string", enum: VALID_URGENCY, description: "Urgency level" },
              },
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_order" } },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    let extracted: Record<string, string>;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Sanitize: only keep valid values
    if (extracted.restorationType && !VALID_RESTORATION_TYPES.includes(extracted.restorationType)) {
      delete extracted.restorationType;
    }
    if (extracted.urgency && !VALID_URGENCY.includes(extracted.urgency)) {
      delete extracted.urgency;
    }

    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-order-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
