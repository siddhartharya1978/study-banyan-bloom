import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get source
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) throw sourceError;

    console.log("Ingesting URL:", source.source_url);

    // Fetch content
    const response = await fetch(source.source_url!, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BanyanTreeBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      throw new Error("Failed to parse HTML");
    }

    // Extract title
    let title = doc.querySelector("title")?.textContent?.trim() || "Untitled";
    
    // Try to get h1 if title is generic
    if (title === "Untitled" || title.length < 5) {
      const h1 = doc.querySelector("h1")?.textContent?.trim();
      if (h1) title = h1;
    }

    // Extract main content (skip removing elements for simplicity in Deno DOM)

    // Try to find main content area
    let contentText = "";
    const mainContent = doc.querySelector("main") || 
                       doc.querySelector("article") || 
                       doc.querySelector('[role="main"]') ||
                       doc.querySelector(".content") ||
                       doc.querySelector("#content");

    if (mainContent) {
      contentText = mainContent.textContent || "";
    } else {
      contentText = doc.body?.textContent || "";
    }

    // Clean up text
    contentText = contentText
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();

    // Limit to reasonable size
    if (contentText.length > 50000) {
      contentText = contentText.substring(0, 50000);
    }

    console.log(`Extracted ${contentText.length} characters from ${title}`);

    // Update source with content
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        title: title,
        content: contentText,
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
    console.error("Error ingesting URL:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
