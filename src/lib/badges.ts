import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Badge = Database["public"]["Tables"]["badges"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

export interface BadgeRequirement {
  type: "decks_created" | "streak_days" | "hard_correct" | "xp" | "deck_accuracy";
  value: number;
}

/**
 * Check and award badges based on user progress
 */
export async function checkAndAwardBadges(
  userId: string,
  progress: UserProgress
): Promise<Badge[]> {
  try {
    // Get all available badges
    const { data: allBadges, error: badgesError } = await supabase
      .from("badges")
      .select("*");

    if (badgesError) throw badgesError;
    if (!allBadges) return [];

    // Get user's current badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId);

    if (userBadgesError) throw userBadgesError;

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

    // Check each badge requirement
    const newlyEarned: Badge[] = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      const requirement = badge.requirement as unknown as BadgeRequirement;
      let earned = false;

      switch (requirement.type) {
        case "decks_created":
          earned = (progress.total_decks_completed || 0) >= requirement.value;
          break;
        case "streak_days":
          earned = (progress.streak_days || 0) >= requirement.value;
          break;
        case "xp":
          earned = (progress.xp || 0) >= requirement.value;
          break;
        // Add more badge types as needed
      }

      if (earned) {
        // Award the badge
        const { error: awardError } = await supabase
          .from("user_badges")
          .insert({
            user_id: userId,
            badge_id: badge.id,
          });

        if (!awardError) {
          newlyEarned.push(badge);
        }
      }
    }

    return newlyEarned;
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select(`
        badge_id,
        earned_at,
        badges (*)
      `)
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });

    if (error) throw error;

    return data?.map((ub: any) => ub.badges).filter(Boolean) || [];
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return [];
  }
}
