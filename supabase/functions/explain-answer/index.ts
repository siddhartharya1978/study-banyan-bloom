import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Explaining answer`);

  try {
    const { cardId, userAnswer, correctAnswer, question, options, citation } = await req.json();

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Build context for explanation
    let context = `Question: ${question}\nCorrect Answer: ${correctAnswer}`;
    if (userAnswer !== correctAnswer) {
      context += `\nUser's Answer: ${userAnswer}`;
    }
    if (citation) {
      context += `\nSource: ${citation}`;
    }

    const systemPrompt = `You are an expert tutor explaining answers clearly and concisely.
Return ONLY valid JSON with no markdown, no explanations, just the JSON object.

Required format:
{
  "why_correct": "Explain in ≤40 words why this answer is correct",
  "why_others": {
    "A": "≤10 words why this is wrong",
    "B": "≤10 words why this is wrong",
    "C": "≤10 words why this is wrong"
  }
}

Be specific, use the citation for context, and keep it concise.`;

    let prompt = context;
    if (options && Array.isArray(options)) {
      prompt += `\n\nOptions:\n${options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${correlationId}] AI error:`, response.status, errorText);
      throw new Error("Failed to generate explanation");
    }

    const aiData = await response.json();
    const explanation = JSON.parse(aiData.choices[0].message.content);

    console.log(`[${correlationId}] Explanation generated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        explanation,
        correlationId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${correlationId}] Error:`, error);
    const errorMessage = error.message || "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage, correlationId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
