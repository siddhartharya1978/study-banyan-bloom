import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Youtube, Sparkles, Zap, Target, LogIn, UserPlus, LayoutDashboard, BookOpen, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import FAQ from "@/components/FAQ";
import Testimonials from "@/components/Testimonials";
import banyanLogo from "@/assets/banyan-logo.png";
import heroBg from "@/assets/hero-bg.png";

const Index = () => {
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "PDF must be under 20MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handlePdfSubmit = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please sign in to upload PDFs",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const filePath = `${session.user.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: source, error: sourceError } = await supabase
        .from("sources")
        .insert({
          user_id: session.user.id,
          source_type: "pdf",
          file_path: filePath,
          status: "processing",
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      const { error: functionError } = await supabase.functions.invoke("ingest-pdf", {
        body: { sourceId: source.id },
      });

      if (functionError) throw functionError;

      toast({
        title: "PDF uploaded!",
        description: "Your document is being processed",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) return;

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please sign in to create study decks",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data: source, error: sourceError } = await supabase
        .from("sources")
        .insert({
          user_id: session.user.id,
          source_type: url.includes("youtube.com") || url.includes("youtu.be") ? "youtube" : "url",
          source_url: url,
          status: "processing",
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      const { error: functionError } = await supabase.functions.invoke("ingest-url", {
        body: { sourceId: source.id },
      });

      if (functionError) throw functionError;

      toast({
        title: "Processing started! 🌱",
        description: "Your deck will appear on the dashboard in ~90 seconds",
      });

      setUrl("");
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-4 sticky top-0 bg-background/80 backdrop-blur-lg z-50 border-b border-border/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 animate-slide-up">
            <img src={banyanLogo} alt="Banyan Tree" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Banyan Tree
            </span>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button 
                onClick={() => navigate("/dashboard")}
                variant="default"
                className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => navigate("/auth")}
                  variant="ghost"
                  className="gap-2 hover:bg-muted"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
                <Button 
                  onClick={() => navigate("/auth")}
                  variant="default"
                  className="gap-2 bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Background */}
      <section 
        className="relative container mx-auto px-4 py-20 overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />
        
        <div className="relative z-10 text-center mb-12 animate-bounce-in">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse-glow" />
              <img 
                src={banyanLogo} 
                alt="Banyan Tree"
                className="relative h-24 w-24 animate-float drop-shadow-2xl"
              />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
            Studying Doesn't Have to Suck
          </h1>
          
          <p className="text-xl md:text-3xl text-foreground mb-4 font-semibold">
            Transform Any Content into Study Decks
          </p>
          
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            AI flashcards & MCQs in 90 seconds. Learn smarter, grow stronger 🌱
          </p>
        </div>

        {/* Input Section */}
        <Card className="max-w-3xl mx-auto p-8 shadow-glow backdrop-blur-sm bg-card/95 border-2 border-primary/20 animate-slide-up">
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50">
              <TabsTrigger value="url" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <LinkIcon className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="youtube" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Youtube className="h-4 w-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Upload className="h-4 w-4" />
                PDF
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <Input
                type="url"
                placeholder="Paste any URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-lg h-14 border-2 focus:border-primary"
              />
              <Button 
                onClick={handleUrlSubmit}
                disabled={isProcessing || !url}
                className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                    Creating your deck...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Generate Study Deck
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="youtube" className="space-y-4">
              <Input
                type="url"
                placeholder="Paste YouTube URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-lg h-14 border-2 focus:border-primary"
              />
              <Button 
                onClick={handleUrlSubmit}
                disabled={isProcessing || !url}
                className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                    Processing video...
                  </>
                ) : (
                  <>
                    <Youtube className="mr-2 h-5 w-5" />
                    Convert to Deck
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary hover:bg-muted/50 transition-all cursor-pointer block"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-primary animate-bounce-in" />
                <p className="text-lg text-foreground mb-2 font-medium">
                  {selectedFile ? selectedFile.name : "Drop your PDF here or click to upload"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Max file size: 20MB
                </p>
              </label>
              <Button 
                onClick={handlePdfSubmit}
                disabled={isProcessing || !selectedFile}
                className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                    Processing PDF...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Upload & Generate
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-primary via-accent to-secondary">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="animate-bounce-in">
              <div className="text-5xl font-bold text-primary-foreground mb-2">50K+</div>
              <div className="text-primary-foreground/90 font-medium">Active Learners</div>
            </div>
            <div className="animate-bounce-in" style={{ animationDelay: "100ms" }}>
              <div className="text-5xl font-bold text-primary-foreground mb-2">1M+</div>
              <div className="text-primary-foreground/90 font-medium">Cards Reviewed</div>
            </div>
            <div className="animate-bounce-in" style={{ animationDelay: "200ms" }}>
              <div className="text-5xl font-bold text-primary-foreground mb-2">90s</div>
              <div className="text-primary-foreground/90 font-medium">Avg. Deck Creation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Why Students Love Banyan Tree
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The smartest way to learn, backed by science and loved by learners worldwide
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-8 text-center hover:shadow-glow hover:-translate-y-2 transition-all duration-300 animate-spring-in border-2 border-border/50">
            <div className="bg-gradient-primary rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Zap className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="font-bold text-2xl mb-3 text-foreground">90s to First Review</h3>
            <p className="text-muted-foreground text-lg">
              Start studying in just 90 seconds with AI-generated flashcards and MCQs that actually make sense
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-glow hover:-translate-y-2 transition-all duration-300 animate-spring-in border-2 border-border/50" style={{ animationDelay: "100ms" }}>
            <div className="bg-gradient-warm rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Target className="h-10 w-10 text-secondary-foreground" />
            </div>
            <h3 className="font-bold text-2xl mb-3 text-foreground">Smart Spaced Repetition</h3>
            <p className="text-muted-foreground text-lg">
              Our algorithm learns how you learn. Cards adapt to your pace for maximum retention
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-glow hover:-translate-y-2 transition-all duration-300 animate-spring-in border-2 border-border/50" style={{ animationDelay: "200ms" }}>
            <div className="bg-accent rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-glow">
              <TrendingUp className="h-10 w-10 text-accent-foreground" />
            </div>
            <h3 className="font-bold text-2xl mb-3 text-foreground">Grow Your Tree</h3>
            <p className="text-muted-foreground text-lg">
              Track progress with XP, streaks, and levels. Watch your Banyan Tree flourish as you learn
            </p>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-accent to-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoMnYyaC0yVjMwem0wLTRoMnYyaC0ydi0yem0wIDhoMnYyaC0ydi0yem00LTRoMnYyaC0ydi0yem00LTRoMnYyaC0ydi0yem00IDhoMnYyaC0ydi0yem0tOC00aDJ2MmgtMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-primary-foreground animate-bounce-in">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto animate-slide-up">
            Join thousands of students who are studying smarter, not harder 🚀
          </p>
          <Button 
            onClick={() => navigate("/auth")}
            size="lg"
            className="h-16 px-12 text-xl bg-background text-foreground hover:bg-background/90 shadow-2xl hover:shadow-glow transition-all hover:scale-105 animate-bounce-in font-bold"
            style={{ animationDelay: "200ms" }}
          >
            <Sparkles className="mr-3 h-6 w-6" />
            Start Growing Your Tree - Free
          </Button>
          <p className="text-primary-foreground/80 mt-6 text-sm">
            No credit card required • Get started in 60 seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={banyanLogo} alt="Banyan Tree" className="h-8 w-8" />
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Banyan Tree
            </span>
          </div>
          <p className="text-muted-foreground mb-4">
            Empowering learners worldwide to grow their knowledge tree 🌱
          </p>
          <p className="text-sm text-muted-foreground">
            © 2025 Banyan Tree. Made with ❤️ for learners everywhere.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
