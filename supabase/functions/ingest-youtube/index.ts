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

// Fetch transcript using YouTube's internal API (more reliable than HTML scraping)
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`Fetching transcript for video: ${videoId}`);
    
    // Method 1: Try the get_video_info endpoint (most reliable)
    try {
      console.log("Attempting get_video_info endpoint...");
      const infoUrl = `https://www.youtube.com/get_video_info?video_id=${videoId}`;
      const infoResponse = await fetch(infoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      
      if (infoResponse.ok) {
        const infoText = await infoResponse.text();
        const params = new URLSearchParams(infoText);
        const playerResponseStr = params.get('player_response');
        
        if (playerResponseStr) {
          const playerResponse = JSON.parse(playerResponseStr);
          const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (captionTracks && captionTracks.length > 0) {
            console.log(`Found ${captionTracks.length} caption tracks via get_video_info`);
            return await extractTranscriptFromTracks(captionTracks, videoId);
          }
        }
      }
    } catch (e) {
      console.log("get_video_info method failed, trying HTML scraping:", e);
    }
    
    // Method 2: Fallback to HTML scraping with better headers
    console.log("Attempting HTML scraping method...");
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      }
    });
    
    const html = await pageResponse.text();
    console.log(`Page fetched, HTML length: ${html.length} characters`);
    
    // Try to extract captionTracks from various locations in the HTML
    let captionTracks = null;
    
    // Pattern 1: Direct captionTracks in JSON
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[{[^\]]+\])/);
    if (captionTracksMatch) {
      try {
        captionTracks = JSON.parse(captionTracksMatch[1]);
        console.log("Found caption tracks via direct match");
      } catch (e) {
        console.log("Failed to parse direct caption tracks:", e);
      }
    }
    
    // Pattern 2: Look in ytInitialPlayerResponse
    if (!captionTracks) {
      // Find ytInitialPlayerResponse more carefully
      const ytPlayerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
      if (ytPlayerMatch) {
        try {
          // Clean up the JSON string
          let jsonStr = ytPlayerMatch[1];
          
          // Try to find the end of the object more accurately
          let braceCount = 0;
          let endPos = 0;
          for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === '{') braceCount++;
            else if (jsonStr[i] === '}') braceCount--;
            
            if (braceCount === 0) {
              endPos = i + 1;
              break;
            }
          }
          
          if (endPos > 0) {
            jsonStr = jsonStr.substring(0, endPos);
          }
          
          const playerResponse = JSON.parse(jsonStr);
          captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (captionTracks) {
            console.log("Found caption tracks via ytInitialPlayerResponse");
          }
        } catch (e) {
          console.log("Failed to parse ytInitialPlayerResponse:", e);
        }
      }
    }
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log(`No captions found for video: ${videoId}`);
      return null;
    }
    
    return await extractTranscriptFromTracks(captionTracks, videoId);
    
  } catch (error) {
    console.error("Error fetching transcript:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    return null;
  }
}

// Helper function to extract transcript from caption tracks
async function extractTranscriptFromTracks(captionTracks: any[], videoId: string): Promise<string | null> {
  try {
    
    console.log(`Found ${captionTracks.length} caption track(s)`);
    console.log("Available languages:", captionTracks.map((t: any) => t.languageCode || t.vssId).join(", "));
    
    // Prefer English captions, fall back to first available
    let selectedTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode?.startsWith('en')
    ) || captionTracks[0];
    
    const captionUrl = selectedTrack?.baseUrl;
    
    if (!captionUrl) {
      console.error("Caption track found but no baseUrl available");
      return null;
    }
    
    console.log(`Selected caption language: ${selectedTrack.languageCode || 'unknown'}`);
    console.log(`Fetching transcript from: ${captionUrl.substring(0, 100)}...`);
    
    // Fetch and parse the transcript XML
    const transcriptResponse = await fetch(captionUrl);
    const transcriptXml = await transcriptResponse.text();
    
    console.log(`Transcript XML fetched, length: ${transcriptXml.length} characters`);
    
    // Extract text from XML
    const textRegex = /<text[^>]*>(.*?)<\/text>/gs;
    const textMatches = [...transcriptXml.matchAll(textRegex)];
    
    console.log(`Found ${textMatches.length} text segments in transcript`);
    
    if (textMatches.length === 0) {
      console.error("No text segments found in transcript XML");
      return null;
    }
    
    // Decode HTML entities and join text
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
                   .replace(/<[^>]*>/g, '');
        return text.trim();
      })
      .filter(text => text.length > 0)
      .join(' ');
    
    console.log(`Final transcript length: ${transcript.length} characters`);
    
    return transcript;
  } catch (error) {
    console.error("Error extracting transcript from tracks:", error);
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
