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

// Step 1: Try fetching transcript via timedtext API (no API key needed)
async function fetchTimedtextTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`[timedtext] Fetching captions for video: ${videoId}`);
    
    // Try multiple language codes
    const langCodes = ['en', 'en-US', 'hi', 'hi-IN', 'en-GB'];
    
    for (const lang of langCodes) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const events = data?.events || [];
        const textSegments: string[] = [];
        
        for (const event of events) {
          if (event.segs) {
            for (const seg of event.segs) {
              if (seg.utf8) {
                textSegments.push(seg.utf8.trim());
              }
            }
          }
        }
        
        const transcript = textSegments.filter(s => s.length > 0).join(' ');
        
        if (transcript.length > 100) {
          console.log(`[timedtext] ✓ Found captions in ${lang}: ${transcript.length} chars`);
          return transcript;
        }
      } catch (e) {
        console.log(`[timedtext] Failed for ${lang}:`, e);
        continue;
      }
    }
    
    console.log('[timedtext] No captions found in any language');
    return null;
  } catch (error) {
    console.error("[timedtext] Error:", error);
    return null;
  }
}

// Step 2: Fallback to extracting video description
async function extractVideoDescription(videoId: string): Promise<string | null> {
  try {
    console.log(`[description] Extracting description for: ${videoId}`);
    
    // Get video page
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    
    if (!pageResponse.ok) return null;
    
    const html = await pageResponse.text();
    
    // Extract description
    const descriptionMatch = html.match(/"description":\{"simpleText":"([^"]+)"/);
    const description = descriptionMatch ? descriptionMatch[1].replace(/\\n/g, ' ') : '';
    
    if (description.length > 200) {
      console.log(`[description] ✓ Found description: ${description.length} chars`);
      return description;
    }
    
    return null;
  } catch (error) {
    console.error("[description] Error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Starting YouTube ingestion`);
  
  let sourceId: string | undefined;

  try {
    const body = await req.json();
    sourceId = body.sourceId;

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
      throw new Error("Invalid YouTube URL format. Please check the URL and try again.");
    }

    console.log(`[${correlationId}] Processing YouTube video: ${videoId}`);

    // Update status
    await supabase
      .from("sources")
      .update({ status: "processing" })
      .eq("id", sourceId);

    // Fetch video page to extract title
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    const html = await pageResponse.text();
    
    // Extract title from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `YouTube Video ${videoId}`;
    
    console.log(`[${correlationId}] Video title: ${title}`);
    
    // Step 1: Try timedtext captions first (fastest and most reliable)
    let transcript = await fetchTimedtextTranscript(videoId);
    
    // Step 2: Fallback to video description
    if (!transcript) {
      console.log(`[${correlationId}] Captions not available, trying description...`);
      transcript = await extractVideoDescription(videoId);
      
      if (transcript) {
        transcript = `${title}\n\n${transcript}`;
      }
    }
    
    if (!transcript) {
      throw new Error(
        "📺 Unable to extract content from this video.\n\n" +
        "This could happen if:\n" +
        "• The video doesn't have captions/subtitles\n" +
        "• The video lacks a detailed description\n" +
        "• The video is private or age-restricted\n\n" +
        "💡 Try instead:\n" +
        "✓ A video with captions (look for the CC button)\n" +
        "✓ Upload slides or notes as PDF\n" +
        "✓ Paste an article URL from the web"
      );
    }

    if (transcript.length < 100) {
      throw new Error("Content too short (< 100 characters). Please try a longer video or different content.");
    }

    console.log(`[${correlationId}] ✓ Extracted ${transcript.length} characters`);

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

    console.log(`[${correlationId}] ✓ YouTube ingestion complete`);

    return new Response(
      JSON.stringify({ success: true, sourceId, correlationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${correlationId}] Error:`, error);
    const errorMessage = error.message || "Unknown error occurred";
    
    // Determine if this is a user error (400) or system error (500)
    const isUserError = errorMessage.includes("Unable to extract content") ||
                        errorMessage.includes("Invalid YouTube URL") ||
                        errorMessage.includes("Content too short");
    const statusCode = isUserError ? 400 : 500;
    
    // Update source with error if we have the sourceId
    if (sourceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from("sources")
          .update({ status: "failed", error: errorMessage })
          .eq("id", sourceId);
      } catch (updateError) {
        console.error(`[${correlationId}] Failed to update source error:`, updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage, correlationId }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
