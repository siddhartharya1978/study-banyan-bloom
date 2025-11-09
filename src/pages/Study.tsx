import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, Check, X, SkipForward, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type CardType = Database["public"]["Tables"]["cards"]["Row"];
type Review = Database["public"]["Tables"]["reviews"]["Insert"];

const Study = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cards, setCards] = useState<CardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime, setStartTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, skipped: 0 });
  const [timeRemaining, setTimeRemaining] = useState(90); // 90 seconds for mini-review
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    loadCards();
  }, [deckId]);

  // 90-second timer for mini-review
  useEffect(() => {
    if (!timerActive || sessionComplete) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up - end session
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, sessionComplete]);

  const loadCards = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load cards for mini-review (exactly 8-10 cards)
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("next_review_at", { ascending: true, nullsFirst: true })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No cards found",
          description: "This deck doesn't have any cards yet",
        });
        navigate("/dashboard");
        return;
      }

      // Lock to 8-10 cards for mini-review
      const miniReviewCards = data.slice(0, Math.min(10, Math.max(8, data.length)));
      setCards(miniReviewCards);
      setStartTime(Date.now());
      setTimerActive(true); // Start timer
    } catch (error: any) {
      toast({
        title: "Error loading cards",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  // SM-2 Spaced Repetition Algorithm
  const calculateNextReview = (card: CardType, quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    // quality: 0=complete blackout, 1=incorrect/hard recall, 2=incorrect/easy recall, 
    //          3=correct/hard recall, 4=correct/good recall, 5=correct/perfect recall
    const now = new Date();
    let easiness = card.easiness_factor || 2.5;
    let interval = card.interval_days || 1;
    let repetitions = card.review_count || 0;

    // SM-2 formula
    easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easiness = Math.max(1.3, easiness); // Minimum easiness factor

    if (quality < 3) {
      // Incorrect answer - reset interval
      interval = 1;
      repetitions = 0;
    } else {
      // Correct answer - increase interval
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easiness);
      }
    }

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      easiness_factor: easiness,
      interval_days: interval,
      next_review_at: nextReview.toISOString(),
      last_reviewed_at: now.toISOString(),
      review_count: repetitions,
    };
  };

  const handleTimeUp = async () => {
    setTimerActive(false);
    // Auto-mark remaining cards as skipped
    const remaining = cards.length - currentIndex;
    setSessionStats(prev => ({ ...prev, skipped: prev.skipped + remaining }));
    await updateUserProgress();
    setSessionComplete(true);
  };

  const handleReview = async (result: "correct" | "incorrect" | "skip") => {
    const currentCard = cards[currentIndex];
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const userId = (await supabase.auth.getSession()).data.session!.user.id;

      // Record review
      const review: Review = {
        user_id: userId,
        card_id: currentCard.id,
        deck_id: deckId!,
        result,
        session_id: sessionId,
        time_spent_seconds: timeSpent,
        metadata: { 
          timer_remaining: timeRemaining,
          card_number: currentIndex + 1 
        }
      };

      const { error: reviewError } = await supabase
        .from("reviews")
        .insert(review);

      if (reviewError) throw reviewError;

      // Update card with SM-2 algorithm
      if (result !== "skip") {
        // Map result to SM-2 quality (0-5)
        const quality = result === "correct" ? 4 : 1; // 4 = good recall, 1 = hard incorrect
        const updates = calculateNextReview(currentCard, quality);
        
        const { error: updateError } = await supabase
          .from("cards")
          .update(updates)
          .eq("id", currentCard.id);

        if (updateError) throw updateError;
      }

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        [result]: prev[result] + 1,
      }));

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
        setStartTime(Date.now());
      } else {
        // Session complete
        setTimerActive(false);
        await updateUserProgress();
        setSessionComplete(true);
      }
    } catch (error: any) {
      toast({
        title: "Error recording review",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateUserProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // XP: 10 per correct, 2 per incorrect, 0 per skip (effort-based)
      const xpGained = sessionStats.correct * 10 + sessionStats.incorrect * 2;

      const { data: progress, error: fetchError } = await supabase
        .from("user_progress")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (fetchError) throw fetchError;

      const today = new Date().toISOString().split("T")[0];
      const lastStudy = progress.last_study_date;
      
      // Check if consecutive day (yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const isConsecutiveDay = lastStudy === yesterdayStr;

      const newStreak = !lastStudy 
        ? 1 
        : lastStudy === today 
          ? progress.streak_days || 1 // Same day - maintain streak
          : isConsecutiveDay 
            ? (progress.streak_days || 0) + 1 
            : 1; // Streak broken

      const newXp = (progress.xp || 0) + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;
      const newTreeLevel = Math.floor(newXp / 50) + 1; // Tree grows every 50 XP

      const { error: updateError } = await supabase
        .from("user_progress")
        .update({
          xp: newXp,
          level: newLevel,
          streak_days: newStreak,
          last_study_date: today,
          total_cards_reviewed: (progress.total_cards_reviewed || 0) + (sessionStats.correct + sessionStats.incorrect),
          tree_level: newTreeLevel,
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;
    } catch (error: any) {
      console.error("Error updating progress:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <Sparkles className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (sessionComplete) {
    const totalCards = sessionStats.correct + sessionStats.incorrect;
    const accuracy = totalCards > 0 
      ? Math.round((sessionStats.correct / totalCards) * 100) 
      : 0;
    const xpEarned = sessionStats.correct * 10 + sessionStats.incorrect * 2;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-3 sm:p-4">
        <Card className="max-w-lg w-full p-6 sm:p-8 text-center animate-spring-in">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse-glow" />
              <div className="relative bg-gradient-warm p-4 sm:p-6 rounded-2xl shadow-glow">
                <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-accent-foreground animate-float" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Shabash! 🎉
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8">
            Mini-review complete!
          </p>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{sessionStats.correct}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-destructive">{sessionStats.incorrect}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-2xl sm:text-3xl font-bold text-accent">{accuracy}%</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Accuracy</p>
            </div>
          </div>

          <div className="bg-gradient-primary p-4 sm:p-6 rounded-xl mb-4 sm:mb-6 shadow-glow">
            <p className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">+{xpEarned} XP</p>
            <p className="text-xs sm:text-sm text-primary-foreground/80">Your tree is growing! 🌱</p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity h-11 sm:h-12"
            >
              Review Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full h-11 sm:h-12"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-3 sm:p-4">
      <div className="container mx-auto max-w-3xl py-4 sm:py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-xs sm:text-sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Back</span>
          </Button>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-semibold">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className={timeRemaining <= 30 ? "text-destructive animate-pulse" : ""}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {currentIndex + 1} / {cards.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-4 sm:mb-8 h-1.5 sm:h-2" />

        {/* Card */}
        <Card 
          className="p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 min-h-[250px] sm:min-h-[300px] flex items-center justify-center cursor-pointer transition-all hover:shadow-medium active:scale-[0.99]"
          onClick={() => !showAnswer && setShowAnswer(true)}
        >
          <div className="text-center w-full">
            {currentCard.card_type === "mcq" && !showAnswer ? (
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4 sm:mb-6 px-2">{currentCard.question}</h3>
                {currentCard.options && JSON.parse(currentCard.options as string).map((option: string, idx: number) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full text-left justify-start h-auto py-3 sm:py-4 px-4 sm:px-6 hover:bg-accent hover:text-accent-foreground text-sm sm:text-base active:scale-[0.98] transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAnswer(true);
                    }}
                  >
                    <span className="font-semibold mr-2 sm:mr-3 text-primary min-w-[20px] sm:min-w-[24px]">{String.fromCharCode(65 + idx)}.</span>
                    <span className="flex-1">{option}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 uppercase tracking-wide">Question</p>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-semibold px-2">{currentCard.question}</h3>
                </div>
                
                {showAnswer && (
                  <div className="animate-spring-in">
                    <div className="border-t pt-4 sm:pt-6">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 uppercase tracking-wide">Answer</p>
                      <p className="text-base sm:text-lg md:text-xl text-primary font-medium px-2">{currentCard.answer}</p>
                    </div>
                    
                    {currentCard.citation && (
                      <p className="text-xs text-muted-foreground mt-3 sm:mt-4 italic px-2">
                        📚 {currentCard.citation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showAnswer && currentCard.card_type === "flashcard" && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 animate-pulse">
                👆 Tap to reveal answer
              </p>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        {showAnswer && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 animate-spring-in">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleReview("incorrect")}
              className="h-12 sm:h-14 md:h-16 hover:bg-destructive hover:text-destructive-foreground flex-col sm:flex-row gap-1 sm:gap-2 active:scale-95 transition-transform"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm md:text-base">Incorrect</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleReview("skip")}
              className="h-12 sm:h-14 md:h-16 flex-col sm:flex-row gap-1 sm:gap-2 active:scale-95 transition-transform"
            >
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm md:text-base">Skip</span>
            </Button>
            <Button
              size="lg"
              onClick={() => handleReview("correct")}
              className="h-12 sm:h-14 md:h-16 bg-gradient-primary hover:opacity-90 transition-opacity flex-col sm:flex-row gap-1 sm:gap-2 active:scale-95 transition-transform"
            >
              <Check className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm md:text-base">Correct</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Study;
