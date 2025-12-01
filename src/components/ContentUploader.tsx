import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Youtube, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const ContentUploader = () => {
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

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

      setSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

      // Create source
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

      // Call processing function
      const functionName = url.includes("youtube.com") || url.includes("youtu.be") ? "ingest-youtube" : "ingest-url";
      const { error: functionError } = await supabase.functions.invoke(functionName, {
        body: { sourceId: source.id },
      });

      if (functionError) throw functionError;

      toast({
        title: "Processing started! 🌱",
        description: "Your deck will appear on the dashboard in ~90 seconds",
      });

      setUrl("");
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
    <Card className="p-6 sm:p-8 shadow-medium backdrop-blur-sm bg-card/95">
      <h3 className="text-lg sm:text-xl font-semibold mb-4">{t('dashboard.createNew', 'Create New Study Deck')}</h3>
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="url" className="gap-2 text-xs sm:text-sm">
            <LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('dashboard.url', 'URL')}</span>
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-2 text-xs sm:text-sm">
            <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('dashboard.youtube', 'YouTube')}</span>
          </TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2 text-xs sm:text-sm">
            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{t('dashboard.pdf', 'PDF')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <Input
            type="url"
            placeholder={t('dashboard.pasteUrl', 'Paste any URL here...')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11"
          />
          <Button 
            onClick={handleUrlSubmit}
            disabled={isProcessing || !url}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            {isProcessing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                {t('dashboard.creating', 'Creating your deck...')}
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                {t('dashboard.generate', 'Generate Study Deck')}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="youtube" className="space-y-4">
          <Input
            type="url"
            placeholder={t('dashboard.pasteYouTube', 'Paste YouTube URL here...')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11"
          />
          <Button 
            onClick={handleUrlSubmit}
            disabled={isProcessing || !url}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            {isProcessing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                {t('dashboard.processingVideo', 'Processing video...')}
              </>
            ) : (
              <>
                <Youtube className="mr-2 h-4 w-4" />
                {t('dashboard.convertToDeck', 'Convert to Deck')}
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
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer block"
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm sm:text-base text-muted-foreground mb-1">
              {selectedFile ? selectedFile.name : t('dashboard.dropPdf', 'Drop your PDF here or click to upload')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.maxSize', 'Max file size: 20MB')}
            </p>
          </label>
          <Button 
            onClick={handlePdfSubmit}
            disabled={isProcessing || !selectedFile}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            {isProcessing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                {t('dashboard.processingPdf', 'Processing PDF...')}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t('dashboard.uploadGenerate', 'Upload & Generate')}
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default ContentUploader;
