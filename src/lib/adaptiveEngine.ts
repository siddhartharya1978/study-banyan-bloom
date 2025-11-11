import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CardType = Database["public"]["Tables"]["cards"]["Row"];
type ConceptType = Database["public"]["Tables"]["concepts"]["Row"];

export interface SessionCard extends CardType {
  conceptMastery?: number;
}

/**
 * Adaptive session selection algorithm
 * Selects 8-10 cards based on concept mastery:
 * - 60% weak cards (mastery < 40)
 * - 20% medium cards (mastery 40-70)
 * - 20% strong cards (mastery > 70)
 */
export async function selectAdaptiveSession(
  deckId: string,
  userId: string,
  sessionSize: number = 10
): Promise<SessionCard[]> {
  try {
    // Get all cards for the deck
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("next_review_at", { ascending: true, nullsFirst: true });

    if (cardsError) throw cardsError;
    if (!cards || cards.length === 0) return [];

    // Get concept mastery for each card's topic
    const { data: concepts, error: conceptsError } = await supabase
      .from("concepts")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", userId);

    if (conceptsError) throw conceptsError;

    // Create a map of topic -> mastery
    const masteryMap = new Map<string, number>();
    concepts?.forEach(concept => {
      masteryMap.set(concept.name, concept.mastery || 0);
    });

    // Assign mastery to each card based on topic
    const cardsWithMastery: SessionCard[] = cards.map(card => ({
      ...card,
      conceptMastery: card.topic ? masteryMap.get(card.topic) || 0 : 0,
    }));

    // Categorize cards by mastery level
    const weak = cardsWithMastery.filter(c => (c.conceptMastery || 0) < 40);
    const medium = cardsWithMastery.filter(c => (c.conceptMastery || 0) >= 40 && (c.conceptMastery || 0) <= 70);
    const strong = cardsWithMastery.filter(c => (c.conceptMastery || 0) > 70);

    // Calculate target counts
    const targetWeak = Math.ceil(sessionSize * 0.6);
    const targetMedium = Math.ceil(sessionSize * 0.2);
    const targetStrong = sessionSize - targetWeak - targetMedium;

    // Select cards from each category
    const selectedCards: SessionCard[] = [];
    
    // Add weak cards (prioritize)
    selectedCards.push(...shuffle(weak).slice(0, Math.min(targetWeak, weak.length)));
    
    // Add medium cards
    const mediumNeeded = sessionSize - selectedCards.length;
    if (mediumNeeded > 0) {
      selectedCards.push(...shuffle(medium).slice(0, Math.min(targetMedium, medium.length, mediumNeeded)));
    }
    
    // Add strong cards (fill remaining)
    const remainingNeeded = sessionSize - selectedCards.length;
    if (remainingNeeded > 0) {
      selectedCards.push(...shuffle(strong).slice(0, Math.min(targetStrong, strong.length, remainingNeeded)));
    }
    
    // If we still don't have enough, fill from any category
    if (selectedCards.length < Math.min(sessionSize, cards.length)) {
      const remaining = cardsWithMastery.filter(c => !selectedCards.includes(c));
      selectedCards.push(...shuffle(remaining).slice(0, sessionSize - selectedCards.length));
    }

    return shuffle(selectedCards).slice(0, sessionSize);
  } catch (error) {
    console.error("Error selecting adaptive session:", error);
    // Fallback to simple selection
    const { data: fallbackCards } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .limit(sessionSize);
    return fallbackCards || [];
  }
}

/**
 * Update concept mastery after a review
 * Rules:
 * - Correct: +9 (max 100)
 * - Incorrect: -7 (min 0)
 * - Skip: no change
 */
export async function updateConceptMastery(
  userId: string,
  deckId: string,
  topic: string,
  result: "correct" | "incorrect" | "skip"
): Promise<void> {
  if (!topic || result === "skip") return;

  try {
    // Get or create concept
    const { data: existing, error: fetchError } = await supabase
      .from("concepts")
      .select("*")
      .eq("user_id", userId)
      .eq("deck_id", deckId)
      .eq("name", topic)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    const currentMastery = existing?.mastery || 0;
    const seenCount = (existing?.seen_count || 0) + 1;
    const correctCount = (existing?.correct_count || 0) + (result === "correct" ? 1 : 0);
    
    // Calculate new mastery
    let newMastery = currentMastery;
    if (result === "correct") {
      newMastery = Math.min(100, currentMastery + 9);
    } else if (result === "incorrect") {
      newMastery = Math.max(0, currentMastery - 7);
    }

    if (existing) {
      // Update existing concept
      await supabase
        .from("concepts")
        .update({
          mastery: newMastery,
          seen_count: seenCount,
          correct_count: correctCount,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new concept
      await supabase
        .from("concepts")
        .insert({
          user_id: userId,
          deck_id: deckId,
          name: topic,
          mastery: newMastery,
          seen_count: seenCount,
          correct_count: correctCount,
          last_seen_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error("Error updating concept mastery:", error);
  }
}

/**
 * Check if difficulty band should be adjusted
 * - If accuracy ≥ 85%, suggest harder difficulty
 * - If accuracy ≤ 60%, suggest easier difficulty
 */
export function suggestDifficultyAdjustment(
  correctCount: number,
  totalCount: number
): "increase" | "decrease" | "maintain" {
  if (totalCount < 5) return "maintain"; // Need more data
  
  const accuracy = correctCount / totalCount;
  
  if (accuracy >= 0.85) return "increase";
  if (accuracy <= 0.60) return "decrease";
  return "maintain";
}

// Helper: Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
