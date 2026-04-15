import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, shadeSystem } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a dental shade matching expert AI assistant. Analyze the provided intraoral/dental photo and suggest the most appropriate VITA shade match.

Your response MUST use the tool provided to return structured shade suggestions.

Guidelines:
- If the image is clearly NOT a dental/intraoral photo, return an error message in the primary shade suggestion.
- Consider lighting conditions - note if the photo has poor lighting that may affect accuracy.
- The shade system being used is: ${shadeSystem || "VITA Classical"}
- For VITA Classical: shades are A1-A4, B1-B4, C1-C4, D2-D4
- For VITA 3D-Master: shades follow the format like 1M1, 2L1.5, 3R2.5, etc.
- Provide a confidence percentage (0-100).
- If confidence is below 60%, recommend consulting the lab.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this dental photo and suggest the best VITA shade match.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:")
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_shade",
              description: "Return shade matching suggestions for the dental photo.",
              parameters: {
                type: "object",
                properties: {
                  primary_shade: {
                    type: "string",
                    description: "The recommended VITA shade (e.g. A2, B1, 2M2)",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence percentage 0-100",
                  },
                  alternatives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shade: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["shade", "reason"],
                    },
                    description: "1-2 alternative shade suggestions",
                  },
                  notes: {
                    type: "string",
                    description: "Observations about lighting, photo quality, or clinical factors",
                  },
                  consult_lab: {
                    type: "boolean",
                    description: "Whether to recommend consulting the lab due to ambiguity",
                  },
                },
                required: ["primary_shade", "confidence", "notes", "consult_lab"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_shade" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No shade suggestion returned from AI");
    }

    const shadeData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: shadeData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("shade-match error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
