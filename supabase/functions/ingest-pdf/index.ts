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

  try {
    const { sourceId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing PDF for source:", sourceId);

    // Get source
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) throw sourceError;

    if (!source.file_path) {
      throw new Error("No file path found for source");
    }

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(source.file_path);

    if (downloadError) throw downloadError;

    // Convert file to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log("PDF downloaded, size:", arrayBuffer.byteLength);

    // Extract text using Gemini's vision capabilities
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text content from this PDF document. Preserve structure and formatting. Return the full text content."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to extract PDF text");
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;

    console.log(`Extracted ${extractedText.length} characters from PDF`);

    // Get title from filename or first line
    const fileName = source.file_path.split("/").pop()?.replace(".pdf", "") || "Untitled";
    const title = fileName.substring(0, 100);

    // Update source with content
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        title: title,
        content: extractedText,
        status: "completed",
      })
      .eq("id", sourceId);

    if (updateError) throw updateError;

    // Trigger deck generation
    const generateResponse = await fetch(
      `${supabaseUrl}/functions/v1/generate-deck`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sourceId }),
      }
    );

    if (!generateResponse.ok) {
      console.error("Failed to trigger deck generation");
    }

    return new Response(
      JSON.stringify({ success: true, sourceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error ingesting PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
