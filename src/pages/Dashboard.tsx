import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, LogOut, Plus, BookOpen } from "lucide-react";
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
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Progress Card */}
        {progress && (
          <Card className="p-6 mb-8 bg-gradient-primary shadow-glow">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary-foreground">{progress.xp}</p>
                <p className="text-sm text-primary-foreground/80">XP</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-foreground">{progress.level}</p>
                <p className="text-sm text-primary-foreground/80">Level</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-foreground">{progress.streak_days}</p>
                <p className="text-sm text-primary-foreground/80">Day Streak</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-foreground">{progress.tree_level}</p>
                <p className="text-sm text-primary-foreground/80">Tree Level</p>
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
