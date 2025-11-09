import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Readability-style content extraction
function extractContent(doc: any): { title: string; content: string; lang: string } {
  // Extract title
  let title = doc.querySelector("title")?.textContent?.trim() || "";
  const h1 = doc.querySelector("h1")?.textContent?.trim();
  if (!title || title.length < 5) {
    title = h1 || "Untitled";
  }

  // Remove unwanted elements
  const selectorsToRemove = [
    "script", "style", "nav", "header", "footer", 
    "aside", ".ad", ".advertisement", ".social-share",
    ".comments", ".related-posts", "[role='complementary']"
  ];
  
  selectorsToRemove.forEach(selector => {
    doc.querySelectorAll(selector).forEach((el: any) => el.remove());
  });

  // Find main content area
  const contentSelectors = [
    "main",
    "article", 
    '[role="main"]',
    ".post-content",
    ".article-content",
    ".entry-content",
    "#content",
    ".content"
  ];

  let contentElement = null;
  for (const selector of contentSelectors) {
    contentElement = doc.querySelector(selector);
    if (contentElement) break;
  }

  if (!contentElement) {
    contentElement = doc.body;
  }

  // Extract text with basic structure preservation
  let contentText = "";
  const textNodes: string[] = [];
  
  const traverse = (node: any) => {
    if (node.nodeType === 3) { // Text node
      const text = node.textContent?.trim();
      if (text && text.length > 0) {
        textNodes.push(text);
      }
    } else if (node.nodeType === 1) { // Element node
      // Add line breaks for block elements
      const tagName = node.tagName?.toLowerCase();
      if (["p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"].includes(tagName)) {
        if (textNodes.length > 0 && textNodes[textNodes.length - 1] !== "\n") {
          textNodes.push("\n");
        }
      }
      
      // Traverse children
      node.childNodes?.forEach(traverse);
      
      // Add line break after block elements
      if (["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"].includes(tagName)) {
        if (textNodes.length > 0 && textNodes[textNodes.length - 1] !== "\n") {
          textNodes.push("\n");
        }
      }
    }
  };
  
  traverse(contentElement);
  contentText = textNodes.join(" ");

  // Clean up text
  contentText = contentText
    .replace(/\s+/g, " ")      // Collapse multiple spaces
    .replace(/\n\s+/g, "\n")   // Remove spaces after newlines
    .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
    .trim();

  // Detect language (basic)
  const langAttr = doc.querySelector("html")?.getAttribute("lang") || "en";
  const lang = langAttr.split("-")[0]; // e.g., "en-US" -> "en"

  // Limit to 10k tokens (~40k chars)
  if (contentText.length > 40000) {
    contentText = contentText.substring(0, 40000) + "\n\n[Content truncated...]";
  }

  return { title, content: contentText, lang };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Starting URL ingestion`);

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

    console.log(`[${correlationId}] Fetching: ${source.source_url}`);

    // Update status
    await supabase
      .from("sources")
      .update({ status: "processing" })
      .eq("id", sourceId);

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

    const { title, content, lang } = extractContent(doc);

    console.log(`[${correlationId}] Extracted ${content.length} chars from "${title}"`);

    if (content.length < 100) {
      throw new Error("Not enough content extracted (< 100 chars)");
    }

    // Update source with content
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        title: title,
        content: content,
        language: lang,
        status: "completed",
        error: null,
      })
      .eq("id", sourceId);

    if (updateError) throw updateError;

    // Trigger deck generation
    const { error: generateError } = await supabase.functions.invoke("generate-deck", {
      body: { sourceId, language: lang },
    });

    if (generateError) {
      console.error(`[${correlationId}] Failed to trigger deck generation:`, generateError);
    }

    console.log(`[${correlationId}] URL ingestion complete`);

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
