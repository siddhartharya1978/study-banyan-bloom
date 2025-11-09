import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

// Fetch transcript using YouTube's timedtext API (no external API needed)
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Step 1: Get video page to extract caption tracks
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await pageResponse.text();
    
    // Step 2: Extract caption track URLs from the page
    const captionRegex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(captionRegex);
    
    if (!match || !match[1]) {
      console.log(`No captions available for video: ${videoId}`);
      return null;
    }
    
    const captionTracks = JSON.parse(match[1]);
    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }
    
    // Step 3: Prefer English captions, fall back to first available
    let captionUrl = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode?.startsWith('en')
    )?.baseUrl || captionTracks[0]?.baseUrl;
    
    if (!captionUrl) {
      return null;
    }
    
    // Step 4: Fetch and parse the transcript XML
    const transcriptResponse = await fetch(captionUrl);
    const transcriptXml = await transcriptResponse.text();
    
    // Step 5: Extract text from XML (simple regex parsing)
    const textRegex = /<text[^>]*>(.*?)<\/text>/gs;
    const textMatches = [...transcriptXml.matchAll(textRegex)];
    
    if (textMatches.length === 0) {
      return null;
    }
    
    // Step 6: Decode HTML entities and join text
    const transcript = textMatches
      .map(match => {
        let text = match[1];
        // Decode HTML entities
        text = text.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'")
                   .replace(/&nbsp;/g, ' ')
                   .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
        return text.trim();
      })
      .filter(text => text.length > 0)
      .join(' ');
    
    return transcript;
    
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Starting YouTube ingestion`);

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

    const videoId = extractVideoId(source.source_url!);
    if (!videoId) {
      throw new Error("Invalid YouTube URL format");
    }

    console.log(`[${correlationId}] Processing YouTube video: ${videoId}`);

    // Update status
    await supabase
      .from("sources")
      .update({ status: "processing" })
      .eq("id", sourceId);

    // Fetch video page to extract title
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await pageResponse.text();
    
    // Extract title from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `YouTube Video ${videoId}`;
    
    // Try to fetch transcript
    const transcript = await fetchTranscript(videoId);
    
    if (!transcript) {
      throw new Error(
        "YouTube transcript not available. This video doesn't have captions/subtitles enabled. Please try:\n" +
        "1) A video with captions (CC button visible)\n" +
        "2) Upload a PDF instead\n" +
        "3) Paste an article URL"
      );
    }

    if (transcript.length < 100) {
      throw new Error("Transcript too short (< 100 characters). Video may be too brief or captions incomplete.");
    }

    console.log(`[${correlationId}] Extracted ${transcript.length} characters from transcript`);

    // Limit content to reasonable size (~40k chars)
    const content = transcript.length > 40000 
      ? transcript.substring(0, 40000) + "\n\n[Content truncated to 40,000 characters]"
      : transcript;

    // Update source with content
    const { error: updateError } = await supabase
      .from("sources")
      .update({
        title: title,
        content: content,
        language: "en",
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

    console.log(`[${correlationId}] YouTube ingestion complete`);

    return new Response(
      JSON.stringify({ success: true, sourceId, correlationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${correlationId}] Error:`, error);
    const errorMessage = error.message || "Unknown error";
    
    // Determine if this is a user error (400) or system error (500)
    const isUserError = errorMessage.includes("YouTube transcript not available") ||
                        errorMessage.includes("Invalid YouTube URL") ||
                        errorMessage.includes("Transcript too short");
    const statusCode = isUserError ? 400 : 500;
    
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
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
