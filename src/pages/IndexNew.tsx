import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Youtube, Sparkles, Zap, Target, LogIn, UserPlus, LayoutDashboard, BookOpen, TrendingUp, Users, Brain, Clock, Trophy, Leaf, Globe, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import FAQ from "@/components/FAQ";
import Testimonials from "@/components/Testimonials";
import banyanLogo from "@/assets/banyan-logo.png";

const FloatingLeaf = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute text-2xl pointer-events-none opacity-60"
    initial={{ 
      x: Math.random() * 100 - 50 + "%", 
      y: -20,
      rotate: 0,
      opacity: 0 
    }}
    animate={{ 
      y: "120vh",
      rotate: 360,
      opacity: [0, 0.6, 0.6, 0],
      x: `calc(${Math.random() * 100}% + ${Math.sin(Math.random() * 10) * 100}px)`
    }}
    transition={{ 
      duration: 15 + Math.random() * 10,
      delay,
      repeat: Infinity,
      ease: "linear"
    }}
  >
    🍃
  </motion.div>
);

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

      const { data, error: functionError } = await supabase.functions.invoke("ingest-pdf", {
        body: { sourceId: source.id },
      });

      if (functionError) {
        const errorMessage = data?.error || functionError.message || "Processing failed";
        throw new Error(errorMessage);
      }

      toast({
        title: "PDF uploaded! 🌱",
        description: "Your deck will be ready in ~90 seconds",
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

      const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
      
      const { data: source, error: sourceError } = await supabase
        .from("sources")
        .insert({
          user_id: session.user.id,
          source_type: isYoutube ? "youtube" : "url",
          source_url: url,
          status: "processing",
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      const functionName = isYoutube ? "ingest-youtube" : "ingest-url";
      
      const response = await supabase.functions.invoke(functionName, {
        body: { sourceId: source.id },
      });

      if (response.error) {
        let errorMessage = "Processing failed";
        if (response.data?.error) {
          errorMessage = response.data.error;
        } else if (response.error.message) {
          errorMessage = response.error.message;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Processing started! 🌱",
        description: isYoutube 
          ? "Video processing may take 60-90 seconds" 
          : "Your deck will appear on the dashboard shortly",
      });

      setUrl("");
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Unable to process content",
        description: error.message || "Failed to process URL",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Floating Leaves Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(8)].map((_, i) => (
          <FloatingLeaf key={i} delay={i * 2} />
        ))}
      </div>

      {/* Header - Claymorphism */}
      <header className="container mx-auto px-4 py-4 sticky top-0 z-50">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="clay-card px-4 py-3 flex justify-between items-center"
        >
          <div className="flex items-center gap-3">
            <motion.img 
              src={banyanLogo} 
              alt="Banyan Tree" 
              className="h-10 w-10"
              whileHover={{ scale: 1.1, rotate: 5 }}
            />
            <span className="text-xl font-bold text-foreground">
              Banyan Tree
            </span>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Button 
                onClick={() => navigate("/dashboard")}
                className="clay-button bg-primary text-primary-foreground"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => navigate("/auth")}
                  variant="ghost"
                  className="hover:bg-muted/50"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button 
                  onClick={() => navigate("/auth")}
                  className="clay-button bg-primary text-primary-foreground"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Animated Tree */}
          <motion.div 
            className="mb-8 flex justify-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            <div className="relative">
              <motion.div 
                className="absolute inset-0 bg-secondary/20 blur-3xl rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <img 
                src={banyanLogo} 
                alt="Banyan Tree"
                className="relative h-28 w-28 md:h-36 md:w-36 drop-shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Headlines */}
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground leading-tight"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Studying Doesn't Have
            <br />
            <span className="text-primary">to Suck</span>
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground mb-4 font-medium"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Transform any content into AI-powered study decks
          </motion.p>

          <motion.p 
            className="text-lg text-muted-foreground mb-10"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Flashcards & MCQs in 90 seconds. Learn smarter, grow stronger 🌱
          </motion.p>

          {/* Main Input Card - Claymorphism */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="clay-card max-w-2xl mx-auto p-6 md:p-8">
              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/30 p-1 rounded-xl">
                  <TabsTrigger 
                    value="url" 
                    className="clay-tab data-[state=active]:clay-tab-active rounded-lg gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">URL</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="youtube" 
                    className="clay-tab data-[state=active]:clay-tab-active rounded-lg gap-2"
                  >
                    <Youtube className="h-4 w-4" />
                    <span className="hidden sm:inline">YouTube</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pdf" 
                    className="clay-tab data-[state=active]:clay-tab-active rounded-lg gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <Input
                    type="url"
                    placeholder="Paste any article or blog URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="clay-input h-14 text-lg"
                  />
                  <Button 
                    onClick={handleUrlSubmit}
                    disabled={isProcessing || !url}
                    className="w-full h-14 text-lg clay-button bg-primary text-primary-foreground"
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
                    placeholder="Paste YouTube video URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="clay-input h-14 text-lg"
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Works with videos that have captions. Processing takes 60-90 seconds.
                  </p>
                  <Button 
                    onClick={handleUrlSubmit}
                    disabled={isProcessing || !url}
                    className="w-full h-14 text-lg clay-button bg-primary text-primary-foreground"
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
                    className="clay-card-inset border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer block"
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg text-foreground mb-2 font-medium">
                      {selectedFile ? selectedFile.name : "Drop your PDF here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click to browse • Max 20MB
                    </p>
                  </label>
                  <Button 
                    onClick={handlePdfSubmit}
                    disabled={isProcessing || !selectedFile}
                    className="w-full h-14 text-lg clay-button bg-primary text-primary-foreground"
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
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              From content to knowledge in three simple steps
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent" />

              {[
                { step: 1, icon: LinkIcon, title: "Paste Content", desc: "Drop any URL, YouTube video, or PDF" },
                { step: 2, icon: Brain, title: "AI Magic", desc: "Our AI creates perfect flashcards & MCQs" },
                { step: 3, icon: Trophy, title: "Learn & Grow", desc: "Study in 90-second sessions, watch your tree grow" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="text-center"
                >
                  <div className="clay-card w-24 h-24 mx-auto mb-6 flex items-center justify-center relative">
                    <item.icon className="h-10 w-10 text-primary" />
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-4">
          <div className="clay-card max-w-4xl mx-auto p-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: "50K+", label: "Active Learners", icon: Users },
                { value: "1M+", label: "Cards Created", icon: BookOpen },
                { value: "90s", label: "Time to First Card", icon: Clock },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Why Students Love Banyan Tree
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for Indian learners, powered by cutting-edge AI
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Zap, title: "90s to First Review", desc: "Start studying in just 90 seconds with AI-generated flashcards", color: "text-primary" },
              { icon: Target, title: "Adaptive Learning", desc: "Cards adapt to your knowledge level using spaced repetition", color: "text-secondary" },
              { icon: Globe, title: "Bilingual Support", desc: "Learn in English or Hindi - switch anytime", color: "text-accent" },
              { icon: Leaf, title: "Gamified Progress", desc: "Earn XP, level up, and watch your Banyan tree grow", color: "text-primary" },
              { icon: Brain, title: "Smart Questions", desc: "AI generates MCQs based on Bloom's taxonomy", color: "text-secondary" },
              { icon: Shield, title: "Works Offline", desc: "Study anywhere with PWA support and offline mode", color: "text-accent" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="clay-card p-6 h-full hover:scale-[1.02] transition-transform">
                  <div className={`clay-card-inset w-14 h-14 flex items-center justify-center mb-4 rounded-xl`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="clay-card max-w-3xl mx-auto p-10 text-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join 50,000+ learners growing their knowledge tree today
            </p>
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="clay-button bg-primary text-primary-foreground text-lg px-8 py-6"
            >
              <Leaf className="mr-2 h-5 w-5" />
              Start Growing Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={banyanLogo} alt="Banyan Tree" className="h-8 w-8" />
              <span className="font-semibold text-foreground">Banyan Tree</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Made with ❤️ in India • Empowering learners everywhere
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
