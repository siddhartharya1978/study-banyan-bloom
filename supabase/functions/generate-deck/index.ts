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
    const { sourceId, language = "en" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get source content
    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError) throw sourceError;

    console.log("Generating deck for source:", source.title);

    // System prompt for deck generation
    const systemPrompt = `You are an expert educator creating study materials. 
Generate a study deck with flashcards and MCQs from the provided content.
Output MUST be valid JSON following this structure:
{
  "title": "Deck title",
  "description": "Brief description",
  "cards": [
    {
      "type": "flashcard",
      "question": "Question text",
      "answer": "Answer text",
      "citation": "Source reference"
    },
    {
      "type": "mcq",
      "question": "Question text",
      "answer": "Correct answer",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "citation": "Source reference"
    }
  ]
}

Create 8-12 cards that cover key concepts. Mix flashcards and MCQs. Keep questions clear and concise.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Create a study deck from this content:\n\nTitle: ${source.title}\n\nContent: ${source.content?.substring(0, 8000)}` 
          }
        ],
        response_format: { type: "json_object" },
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
      throw new Error("Failed to generate deck");
    }

    const aiData = await aiResponse.json();
    const deckData = JSON.parse(aiData.choices[0].message.content);

    console.log("Generated deck:", deckData.title);

    // Create deck
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .insert({
        user_id: source.user_id,
        source_id: sourceId,
        title: deckData.title,
        description: deckData.description,
        language: language,
        card_count: deckData.cards.length,
      })
      .select()
      .single();

    if (deckError) throw deckError;

    // Create cards
    const cards = deckData.cards.map((card: any) => ({
      deck_id: deck.id,
      card_type: card.type,
      question: card.question,
      answer: card.answer,
      options: card.options ? JSON.stringify(card.options) : null,
      citation: card.citation,
      confidence_score: 0.9,
    }));

    const { error: cardsError } = await supabase
      .from("cards")
      .insert(cards);

    if (cardsError) throw cardsError;

    // Update source status
    await supabase
      .from("sources")
      .update({ status: "completed" })
      .eq("id", sourceId);

    console.log("Deck created successfully:", deck.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deckId: deck.id,
        cardCount: deckData.cards.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating deck:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
