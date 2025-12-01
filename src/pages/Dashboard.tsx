import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, LogOut, BookOpen, X } from "lucide-react";
import TreeVisualization from "@/components/TreeVisualization";
import ContentUploader from "@/components/ContentUploader";
import LanguageToggle from "@/components/LanguageToggle";
import BadgeDisplay from "@/components/BadgeDisplay";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type Deck = Database["public"]["Tables"]["decks"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];
type Source = Database["public"]["Tables"]["sources"]["Row"];

const Dashboard = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    checkAuth();
    
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    
    // Set up realtime subscription for new decks
    const channel = supabase
      .channel('deck-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decks',
        },
        () => {
          // Reload decks when changes occur
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    await loadDashboard();
  };

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load decks
      const { data: decksData, error: decksError } = await supabase
        .from("decks")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (decksError) throw decksError;
      setDecks(decksData || []);

      // Load sources for status tracking
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("sources")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (sourcesError) throw sourcesError;
      setSources(sourcesData || []);

      // Load progress
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (progressError && progressError.code !== "PGRST116") {
        throw progressError;
      }
      
      setProgress(progressData);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <Sparkles className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-1 sm:mb-2">
              {t('dashboard.yourTree', 'Your Learning Tree')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t('dashboard.keepGrowing', 'Keep growing! 🌱')}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto items-center">
            <LanguageToggle />
            <Button variant="outline" size="sm" onClick={() => navigate("/diagnostics")} className="text-xs sm:text-sm flex-1 sm:flex-none">
              {t('dashboard.diagnostics', 'Diagnostics')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/profile")} className="text-xs sm:text-sm flex-1 sm:flex-none">
              {t('profile.yourProfile', 'Profile')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs sm:text-sm flex-1 sm:flex-none">
              <LogOut className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('profile.signOut', 'Sign Out')}</span>
            </Button>
          </div>
        </div>

        {/* PWA Install Prompt */}
        {deferredPrompt && (
          <Card className="p-4 mb-6 bg-primary/5 border-primary/20 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-sm sm:text-base">{t('dashboard.installApp', 'Install Banyan Tree')}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.installDesc', 'Get the app for a better experience')}</p>
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
                }}
                className="bg-gradient-primary text-xs sm:text-sm"
              >
                {t('common.install', 'Install')}
              </Button>
            </div>
          </Card>
        )}

        {/* Progress Card */}
        {progress && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8 shadow-medium">
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex justify-center">
                <TreeVisualization level={progress.tree_level || 1} animated />
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 content-center">
                <div className="text-center p-3 sm:p-4 bg-gradient-primary rounded-lg text-primary-foreground">
                  <p className="text-2xl sm:text-3xl font-bold">{progress.xp}</p>
                  <p className="text-xs sm:text-sm opacity-80">{t('dashboard.xp', 'Total XP')}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{progress.level}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.level', 'Level')}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="text-2xl sm:text-3xl font-bold text-accent">{progress.streak_days} 🔥</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.streak', 'Day Streak')}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{progress.total_cards_reviewed}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.cardsReviewed', 'Cards Reviewed')}</p>
                </div>
              </div>
            </div>
            {progress.streak_vault && progress.streak_vault > 0 && (
              <div className="mt-4 p-3 bg-accent/10 rounded-lg text-center">
                <p className="text-sm font-semibold">🏦 {t('dashboard.streakVault', 'Streak Vault')}: {progress.streak_vault}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.streakVaultDesc', 'Protection for missed days')}</p>
              </div>
            )}
          </Card>
        )}

        {/* Badges Display */}
        {userId && (
          <div className="mb-6 sm:mb-8">
            <BadgeDisplay userId={userId} />
          </div>
        )}

        {/* Processing Status */}
        {sources.some(s => s.status === "processing") && (
          <Card className="p-6 mb-6 border-primary/50 bg-primary/5 animate-spring-in">
            <div className="flex items-center gap-4">
              <Sparkles className="h-8 w-8 text-primary animate-spin" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{t('dashboard.processing', 'Processing Your Content')}</h3>
                <p className="text-sm text-muted-foreground">
                  {sources.filter(s => s.status === "processing").length} {t('dashboard.sourcesProcessing', 'source(s) being processed...')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Failed Sources */}
        {sources.some(s => s.status === "failed") && (
          <Card className="p-6 mb-6 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-4">
              <X className="h-8 w-8 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{t('dashboard.failed', 'Processing Failed')}</h3>
                <div className="space-y-2 mt-2">
                  {sources.filter(s => s.status === "failed").map(source => (
                    <div key={source.id} className="text-sm">
                      <p className="font-medium">{source.title || t('common.untitled', 'Untitled')}</p>
                      <p className="text-destructive text-xs">{source.error}</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 text-xs"
                        onClick={() => window.location.reload()}
                      >
                        {t('dashboard.retry', 'Retry')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Content Uploader */}
        <div className="mb-8">
          <ContentUploader />
        </div>

        {/* Decks */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold">{t('dashboard.myDecks', 'Your Study Decks')}</h2>
        </div>

        {decks.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('dashboard.emptyState.title', 'Your Tree is Waiting')}</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('dashboard.emptyState.description', 'Plant your first seed of knowledge by uploading content')}
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className="p-4 sm:p-6 hover:shadow-medium transition-shadow cursor-pointer active:scale-[0.98]"
                onClick={() => navigate(`/study/${deck.id}`)}
              >
                <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">{deck.title}</h3>
                {deck.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{deck.description}</p>
                )}
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">{deck.card_count} {t('dashboard.cards', 'cards')}</span>
                  <Button size="sm" className="bg-gradient-primary text-xs h-8">
                    {t('dashboard.studyNow', 'Study Now')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
