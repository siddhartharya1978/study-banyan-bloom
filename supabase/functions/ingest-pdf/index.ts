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
  console.log(`[${correlationId}] Starting PDF ingestion`);

  try {
    const { sourceId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log(`[${correlationId}] Processing PDF: ${source.file_path}`);

    // Update status
    await supabase
      .from("sources")
      .update({ status: "processing" })
      .eq("id", sourceId);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(source.file_path);

    if (downloadError) throw downloadError;

    // Check file size (limit to 10MB for performance)
    const arrayBuffer = await fileData.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      throw new Error("PDF file too large (max 10MB)");
    }

    console.log(`[${correlationId}] PDF size: ${(arrayBuffer.byteLength / 1024).toFixed(2)}KB`);

    // Convert file to base64 for AI processing
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Extract text using Gemini's vision capabilities
    // Note: For production, consider using pdf.js for text-based PDFs first
    // and only fall back to vision for scanned/image PDFs
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
                text: "Extract all text content from this PDF document. Preserve headings, paragraphs, and structure. Return only the extracted text, nothing else. Limit to first 40 pages if longer."
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
      throw new Error("Rate limit exceeded. Please try again in a few minutes.");
    }

    if (aiResponse.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to your workspace.");
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[${correlationId}] AI error:`, aiResponse.status, errorText);
      throw new Error(`PDF extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;

    console.log(`[${correlationId}] Extracted ${extractedText.length} characters`);

    if (extractedText.length < 100) {
      throw new Error("Not enough content extracted from PDF (< 100 chars). File may be empty or corrupted.");
    }

    // Get title from filename or first line
    const fileName = source.file_path.split("/").pop()?.replace(".pdf", "") || "Untitled";
    let title = fileName.substring(0, 100);
    
    // Try to extract title from first line of content
    const firstLine = extractedText.split("\n")[0]?.trim();
    if (firstLine && firstLine.length > 5 && firstLine.length < 100) {
      title = firstLine;
    }

    // Limit content to 50k chars (~12k tokens)
    const content = extractedText.length > 50000 
      ? extractedText.substring(0, 50000) + "\n\n[Content truncated to 50,000 characters]"
      : extractedText;

    // Update source with content
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        title: title,
        content: content,
        status: "completed",
        error: null,
      })
      .eq("id", sourceId);

    if (updateError) throw updateError;

    // Trigger deck generation
    const { error: generateError } = await supabase.functions.invoke("generate-deck", {
      body: { sourceId },
    });

    if (generateError) {
      console.error(`[${correlationId}] Failed to trigger deck generation:`, generateError);
    }

    console.log(`[${correlationId}] PDF ingestion complete`);

    return new Response(
      JSON.stringify({ success: true, sourceId, correlationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${correlationId}] Error:`, error);
    const errorMessage = error.message || "Unknown error";
    
    // Update source with error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { sourceId } = await req.json();
      
      await supabase
        .from("sources")
        .update({ status: "failed", error: errorMessage })
        .eq("id", sourceId);
    } catch {}
    
    return new Response(
      JSON.stringify({ error: errorMessage, correlationId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
