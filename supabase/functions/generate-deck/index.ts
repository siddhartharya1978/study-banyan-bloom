import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod validation schemas with Bloom's taxonomy
const CardSchema = z.object({
  type: z.enum(["flashcard", "mcq", "cloze"]),
  topic: z.string().max(50).optional(),
  bloom_level: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]).optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  options: z.array(z.string()).optional(),
  explanation: z.string().max(400).optional(),
  citation: z.string().optional(),
  source_span: z.string().max(200).optional(),
  difficulty: z.number().int().min(1).max(3).default(2),
});

const DeckResponseSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(200).optional(),
  cards: z.array(CardSchema).min(6).max(24),
});

type DeckResponse = z.infer<typeof DeckResponseSchema>;

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries) throw error;
      
      // Don't retry on client errors (4xx except 429)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Should not reach here");
}

// Extract JSON from text (fallback if model returns non-JSON)
function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Look for JSON in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Look for raw JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    
    throw new Error("No valid JSON found in response");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  console.log(`[${correlationId}] Starting deck generation`);

  try {
    const { sourceId, language = "en" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get source content and user profile
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*, profiles!inner(age_group, difficulty_preference)")
      .eq("id", sourceId)
      .single();

    if (sourceError) throw sourceError;

    console.log(`[${correlationId}] Generating deck for: ${source.title}`);

    // Adjust complexity based on user profile
    const ageGroup = (source as any).profiles?.age_group || "adult";
    const difficulty = (source as any).profiles?.difficulty_preference || "medium";
    
    const complexityMap: Record<string, string> = {
      child: "simple, age-appropriate language for children aged 5-12",
      teen: "clear, engaging language for teenagers aged 13-17",
      adult: "comprehensive, detailed explanations for adults",
      senior: "clear, well-structured content with larger concepts",
    };

    const difficultyMap: Record<string, string> = {
      easy: "basic concepts, multiple hints, simple vocabulary",
      medium: "balanced mix of concepts, standard explanations",
      hard: "advanced concepts, minimal hints, technical vocabulary",
    };

    // System prompt for deck generation with Bloom's taxonomy
    const systemPrompt = `You are an expert Indian educator creating adaptive study materials.
Generate a study deck with flashcards and MCQs from the provided content.
Target audience: ${complexityMap[ageGroup]}
Difficulty level: ${difficultyMap[difficulty]}

CRITICAL: Output MUST be valid JSON only. No markdown, no explanations, just the JSON object.

Required JSON structure:
{
  "title": "Deck title (3-120 chars)",
  "description": "Brief description (max 200 chars)",
  "cards": [
    {
      "type": "flashcard",
      "topic": "Main concept (1-3 words)",
      "bloom_level": "remember|understand|apply|analyze|evaluate|create",
      "question": "Question text",
      "answer": "Answer text",
      "citation": "Source reference",
      "source_span": "Brief quote from source (optional)",
      "difficulty": 1
    },
    {
      "type": "mcq",
      "topic": "Main concept",
      "bloom_level": "apply",
      "question": "Question text",
      "answer": "Correct answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "explanation": "Why correct + why others wrong (max 400 chars)",
      "citation": "Source reference",
      "difficulty": 2
    }
  ]
}

Rules:
- Create 8-12 cards total
- Mix flashcards and MCQs (at least 3 of each)
- Distribute Bloom's levels (at least 2 remember, 2 understand, 2 apply+)
- Extract topic for each card (e.g., "Photosynthesis", "Newton's Laws")
- Keep questions clear and concise
- MCQs must have exactly 4 plausible options (no "All of the above")
- Add explanations that teach why answer is correct and others wrong
- difficulty: 1=easy, 2=medium, 3=hard
- All citations should reference the source material
- Questions should test understanding, not just memory
- For Hindi content, keep technical terms in English (e.g., DNA, GDP)`;

    // Call AI with retry logic
    const aiData = await retryWithBackoff(async () => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `Create a study deck from this content:\n\nTitle: ${source.title}\n\nContent: ${source.content?.substring(0, 10000)}` 
            }
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (response.status === 429) {
        const error: any = new Error("Rate limit exceeded");
        error.status = 429;
        throw error;
      }

      if (response.status === 402) {
        const error: any = new Error("Payment required");
        error.status = 402;
        throw error;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${correlationId}] AI error:`, response.status, errorText);
        throw new Error(`AI generation failed: ${response.status}`);
      }

      return await response.json();
    });

    // Extract and validate response
    const rawContent = aiData.choices[0].message.content;
    let deckData: DeckResponse;
    
    try {
      const parsed = extractJSON(rawContent);
      deckData = DeckResponseSchema.parse(parsed);
    } catch (validationError: any) {
      console.error(`[${correlationId}] Validation failed:`, validationError);
      await supabase
        .from("sources")
        .update({ 
          status: "failed",
          error: `Invalid AI response: ${validationError.message}`
        })
        .eq("id", sourceId);
      
      return new Response(
        JSON.stringify({ 
          error: "AI generated invalid deck format",
          details: validationError.message 
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (deckData.cards.length < 6) {
      await supabase
        .from("sources")
        .update({ 
          status: "failed",
          error: `Not enough valid cards generated: ${deckData.cards.length}/6`
        })
        .eq("id", sourceId);
      
      return new Response(
        JSON.stringify({ error: "Generated deck has too few cards" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${correlationId}] Generated ${deckData.cards.length} valid cards`);

    // Create deck
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .insert({
        user_id: source.user_id,
        source_id: sourceId,
        title: deckData.title,
        description: deckData.description || "",
        language: language,
        card_count: deckData.cards.length,
      })
      .select()
      .single();

    if (deckError) throw deckError;

    // Create cards with new fields
    const cards = deckData.cards.map((card) => ({
      deck_id: deck.id,
      card_type: card.type,
      topic: card.topic || null,
      bloom_level: card.bloom_level || null,
      question: card.question,
      answer: card.answer,
      options: card.options ? JSON.stringify(card.options) : null,
      explanation: card.explanation || null,
      citation: card.citation || source.title,
      source_span: card.source_span || null,
      confidence_score: 0.9,
      easiness_factor: 2.5,
      interval_days: 1,
    }));

    const { error: cardsError } = await supabase
      .from("cards")
      .insert(cards);

    if (cardsError) throw cardsError;

    // Update source status
    await supabase
      .from("sources")
      .update({ status: "completed", error: null })
      .eq("id", sourceId);

    console.log(`[${correlationId}] Deck created successfully: ${deck.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deckId: deck.id,
        cardCount: deckData.cards.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[${correlationId}] Error:`, error);
    const errorMessage = error.message || "Unknown error";
    const status = error.status === 429 ? 429 : error.status === 402 ? 402 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage, correlationId }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
