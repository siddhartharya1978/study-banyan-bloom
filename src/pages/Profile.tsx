import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile>>({
    display_name: "",
    age_group: "adult",
    difficulty_preference: "medium",
    daily_goal: 5,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name,
          age_group: profile.age_group,
          difficulty_preference: profile.difficulty_preference,
          daily_goal: profile.daily_goal,
          preferred_language: profile.preferred_language,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast({
        title: "Profile updated! 🎉",
        description: "Your learning experience will be personalized",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <Sparkles className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-3 sm:p-4">
      <div className="container mx-auto max-w-2xl py-4 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 sm:mb-6 text-xs sm:text-sm">
          <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-4 sm:p-6 md:p-8 animate-spring-in shadow-medium">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
              Personalize Your Learning
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tell us about yourself so we can create the perfect study experience 🌱
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-sm sm:text-base">Display Name</Label>
              <Input
                id="display_name"
                value={profile.display_name || ""}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="What should we call you?"
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age_group">Age Group</Label>
              <Select
                value={profile.age_group || "adult"}
                onValueChange={(value) => setProfile({ ...profile, age_group: value as any })}
              >
                <SelectTrigger id="age_group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="child">Child (5-12)</SelectItem>
                  <SelectItem value="teen">Teen (13-17)</SelectItem>
                  <SelectItem value="adult">Adult (18-59)</SelectItem>
                  <SelectItem value="senior">Senior (60+)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                We'll adjust question complexity based on your age
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Preferred Difficulty</Label>
              <Select
                value={profile.difficulty_preference || "medium"}
                onValueChange={(value) => setProfile({ ...profile, difficulty_preference: value as any })}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy - Gentle Introduction</SelectItem>
                  <SelectItem value="medium">Medium - Balanced Challenge</SelectItem>
                  <SelectItem value="hard">Hard - Expert Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_goal">Daily Goal (Cards)</Label>
              <Input
                id="daily_goal"
                type="number"
                min="1"
                max="100"
                value={profile.daily_goal || 5}
                onChange={(e) => setProfile({ ...profile, daily_goal: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                How many cards do you want to review each day?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Preferred Language</Label>
              <Select
                value={profile.preferred_language || "en"}
                onValueChange={(value) => setProfile({ ...profile, preferred_language: value as any })}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Language for study cards and interface
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity h-11 sm:h-12 text-sm sm:text-base"
            >
              {isSaving ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Save Profile</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
