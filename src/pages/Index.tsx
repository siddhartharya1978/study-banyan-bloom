import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Youtube, Sparkles, Zap, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

      // Upload to storage
      const filePath = `${session.user.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create source
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

      // Call PDF processing function
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

      // Create source - trigger will automatically call ingest-url
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
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-grow">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse-glow" />
              <div className="relative bg-gradient-primary p-6 rounded-2xl shadow-glow">
                <Sparkles className="h-16 w-16 text-primary-foreground animate-float" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Banyan Tree
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Transform Any Content into Study Decks
          </p>
          
          <p className="text-lg text-secondary font-medium">
            Learn Smarter, Grow Stronger 🌱
          </p>
        </div>

        {/* Input Section */}
        <Card className="max-w-3xl mx-auto p-8 shadow-medium backdrop-blur-sm bg-card/95">
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="youtube" className="gap-2">
                <Youtube className="h-4 w-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="pdf" className="gap-2">
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
                className="text-lg h-12"
              />
              <Button 
                onClick={handleUrlSubmit}
                disabled={isProcessing || !url}
                className="w-full h-12 text-lg bg-gradient-primary hover:opacity-90 transition-opacity"
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
                className="text-lg h-12"
              />
              <Button 
                onClick={handleUrlSubmit}
                disabled={isProcessing || !url}
                className="w-full h-12 text-lg bg-gradient-primary hover:opacity-90 transition-opacity"
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
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer block"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-2">
                  {selectedFile ? selectedFile.name : "Drop your PDF here or click to upload"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Max file size: 20MB
                </p>
              </label>
              <Button 
                onClick={handlePdfSubmit}
                disabled={isProcessing || !selectedFile}
                className="w-full h-12 text-lg bg-gradient-primary hover:opacity-90 transition-opacity"
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

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-16">
          <Card className="p-6 text-center hover:shadow-medium transition-shadow animate-spring-in">
            <div className="bg-gradient-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">90s to First Review</h3>
            <p className="text-muted-foreground">
              Start studying in just 90 seconds with AI-generated flashcards and MCQs
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-medium transition-shadow animate-spring-in" style={{ animationDelay: "100ms" }}>
            <div className="bg-gradient-warm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Smart Spaced Repetition</h3>
            <p className="text-muted-foreground">
              Cards adapt to your learning pace for maximum retention
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-medium transition-shadow animate-spring-in" style={{ animationDelay: "200ms" }}>
            <div className="bg-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Grow Your Tree</h3>
            <p className="text-muted-foreground">
              Track progress with XP, streaks, and watch your Banyan Tree flourish
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
