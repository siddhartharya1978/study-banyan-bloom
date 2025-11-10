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

// Step A: Try official timedtext API first (most reliable, no keys needed)
async function fetchTimedtextTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`[timedtext] Fetching track list for video: ${videoId}`);
    
    // Get list of available caption tracks
    const listResponse = await fetch(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+F+678',
      }
    });
    
    if (!listResponse.ok) {
      console.log(`[timedtext] List request failed: ${listResponse.status}`);
      return null;
    }
    
    const listXml = await listResponse.text();
    console.log(`[timedtext] Track list XML length: ${listXml.length}`);
    
    // Parse tracks - prefer manual, then ASR, prioritize English variants
    const trackRegex = /<track[^>]*lang_code="([^"]+)"[^>]*kind="([^"]*)"[^>]*\/>/g;
    const tracks: Array<{ lang: string; kind: string; isAsr: boolean }> = [];
    
    let match;
    while ((match = trackRegex.exec(listXml)) !== null) {
      tracks.push({ lang: match[1], kind: match[2], isAsr: match[2] === 'asr' });
    }
    
    console.log(`[timedtext] Found ${tracks.length} tracks:`, tracks.map(t => `${t.lang}${t.isAsr ? '(asr)' : ''}`).join(', '));
    
    if (tracks.length === 0) {
      console.log('[timedtext] No tracks found');
      return null;
    }
    
    // Priority: manual en/en-US → ASR en/en-US → any manual → any ASR → first available
    const priorityOrder = [
      tracks.find(t => !t.isAsr && (t.lang === 'en' || t.lang === 'en-US')),
      tracks.find(t => t.isAsr && (t.lang === 'en' || t.lang === 'en-US')),
      tracks.find(t => !t.isAsr && t.lang.startsWith('en')),
      tracks.find(t => t.isAsr && t.lang.startsWith('en')),
      tracks.find(t => !t.isAsr),
      tracks.find(t => t.isAsr),
      tracks[0]
    ];
    
    const selectedTrack = priorityOrder.find(t => t !== undefined);
    if (!selectedTrack) return null;
    
    console.log(`[timedtext] Selected track: ${selectedTrack.lang} (${selectedTrack.isAsr ? 'ASR' : 'manual'})`);
    
    // Fetch transcript as json3 format
    const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3&lang=${selectedTrack.lang}${selectedTrack.isAsr ? '&kind=asr' : ''}`;
    const transcriptResponse = await fetch(transcriptUrl, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+F+678',
      }
    });
    
    if (!transcriptResponse.ok) {
      console.log(`[timedtext] Transcript fetch failed: ${transcriptResponse.status}`);
      return null;
    }
    
    const transcriptData = await transcriptResponse.json();
    
    // Extract text from json3 format: events[].segs[].utf8
    const events = transcriptData?.events || [];
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
    
    if (transcript.length > 0) {
      console.log(`[timedtext] Successfully extracted ${transcript.length} characters`);
      return transcript;
    }
    
    console.log('[timedtext] No text found in transcript data');
    return null;
    
  } catch (error) {
    console.error("[timedtext] Error:", error);
    return null;
  }
}

// Step B: Fallback to InnerTube player API - try multiple clients
async function fetchPlayerTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`[player] Fetching captions via InnerTube player API`);
    
    // First, get the API key from the page
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+F+678',
      }
    });
    
    const html = await pageResponse.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const apiKey = apiKeyMatch ? apiKeyMatch[1] : 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
    
    console.log(`[player] Using API key: ${apiKey.substring(0, 20)}...`);
    
    // Try multiple client types for better compatibility
    const clients = [
      { name: 'WEB', version: '2.20250110.01.00', hl: 'en', gl: 'US' },
      { name: 'ANDROID', version: '19.09.37', hl: 'en', gl: 'US' },
      { name: 'IOS', version: '19.09.3', hl: 'en', gl: 'US' },
    ];
    
    for (const client of clients) {
      console.log(`[player] Trying ${client.name} client...`);
      
      const playerResponse = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-YouTube-Client-Name': client.name === 'WEB' ? '1' : client.name === 'ANDROID' ? '3' : '5',
          'X-YouTube-Client-Version': client.version,
          'Origin': 'https://www.youtube.com',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: client.name,
              clientVersion: client.version,
              hl: client.hl,
              gl: client.gl,
            }
          },
          videoId: videoId,
          params: 'CgIQBg==', // Enable captions
        })
      });
      
      if (!playerResponse.ok) {
        console.log(`[player] ${client.name} client failed: ${playerResponse.status}`);
        continue;
      }
      
      const playerData = await playerResponse.json();
      
      // Log response structure for debugging
      console.log(`[player] ${client.name} response keys:`, Object.keys(playerData));
      if (playerData.captions) {
        console.log(`[player] ${client.name} captions keys:`, Object.keys(playerData.captions));
      }
      
      const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || captionTracks.length === 0) {
        console.log(`[player] ${client.name} - No caption tracks in response`);
        continue;
      }
      
      console.log(`[player] ${client.name} - Found ${captionTracks.length} caption tracks`);
      
      const result = await extractTranscriptFromTracks(captionTracks, videoId);
      if (result) return result;
    }
    
    console.log('[player] All clients failed to get captions');
    return null;
    
  } catch (error) {
    console.error("[player] Error:", error);
    return null;
  }
}

// Main transcript fetcher with cascade: timedtext → player → fail
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`Fetching transcript for video: ${videoId}`);
    
    // Step A: Try timedtext API first (fastest, most reliable)
    const timedtextResult = await fetchTimedtextTranscript(videoId);
    if (timedtextResult) {
      console.log('✓ Transcript obtained via timedtext API');
      return timedtextResult;
    }
    
    console.log('⚠ Timedtext API failed, trying player API...');
    
    // Step B: Fall back to player API
    const playerResult = await fetchPlayerTranscript(videoId);
    if (playerResult) {
      console.log('✓ Transcript obtained via player API');
      return playerResult;
    }
    
    console.log('✗ All methods failed - no accessible captions');
    return null;
    
  } catch (error) {
    console.error("Error in fetchTranscript:", error);
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
