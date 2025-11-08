import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, LogOut, Plus, BookOpen } from "lucide-react";
import TreeVisualization from "@/components/TreeVisualization";
import type { Database } from "@/integrations/supabase/types";

type Deck = Database["public"]["Tables"]["decks"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

const Dashboard = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
              Your Learning Tree
            </h1>
            <p className="text-muted-foreground">Keep growing! 🌱</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/profile")}>
              Profile
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        {progress && (
          <Card className="p-6 mb-8 shadow-medium">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TreeVisualization level={progress.tree_level || 1} animated />
              </div>
              
              <div className="grid grid-cols-2 gap-4 content-center">
                <div className="text-center p-4 bg-gradient-primary rounded-lg text-primary-foreground">
                  <p className="text-3xl font-bold">{progress.xp}</p>
                  <p className="text-sm opacity-80">Total XP</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-foreground">{progress.level}</p>
                  <p className="text-sm text-muted-foreground">Level</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-accent">{progress.streak_days} 🔥</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-foreground">{progress.total_cards_reviewed}</p>
                  <p className="text-sm text-muted-foreground">Cards Reviewed</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Decks */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Your Decks</h2>
          <Button onClick={() => navigate("/")} className="bg-gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Create New Deck
          </Button>
        </div>

        {decks.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No decks yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first study deck to start learning!
            </p>
            <Button onClick={() => navigate("/")} className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Deck
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className="p-6 hover:shadow-medium transition-shadow cursor-pointer"
                onClick={() => navigate(`/study/${deck.id}`)}
              >
                <h3 className="font-semibold text-lg mb-2">{deck.title}</h3>
                {deck.description && (
                  <p className="text-sm text-muted-foreground mb-4">{deck.description}</p>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{deck.card_count} cards</span>
                  <Button size="sm" className="bg-gradient-primary">
                    Study Now
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
