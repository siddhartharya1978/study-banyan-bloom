import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Loader2, Link as LinkIcon, FileText, Youtube } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

const Diagnostics = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
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

    await loadSources();
  };

  const loadSources = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading sources",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (source: Source) => {
    setRetryingId(source.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Reset source status
      await supabase
        .from("sources")
        .update({ status: "processing", error: null })
        .eq("id", source.id);

      // Retry based on source type
      let functionName = "";
      let body = {};

      if (source.source_type === "url" || source.source_type === "youtube") {
        functionName = source.source_type === "youtube" ? "ingest-youtube" : "ingest-url";
        body = { sourceId: source.id };
      } else if (source.source_type === "pdf") {
        functionName = "ingest-pdf";
        body = { sourceId: source.id };
      }

      const { error: functionError } = await supabase.functions.invoke(functionName, { body });

      if (functionError) throw functionError;

      toast({
        title: "Retry initiated",
        description: "Your content is being reprocessed",
      });

      // Reload sources after a delay
      setTimeout(() => loadSources(), 2000);
    } catch (error: any) {
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-info animate-spin" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "url":
        return <LinkIcon className="h-5 w-5" />;
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "youtube":
        return <Youtube className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
              Processing Diagnostics
            </h1>
            <p className="text-muted-foreground">Monitor and retry your content ingestion</p>
          </div>
        </div>

        {/* Sources List */}
        {sources.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No sources yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first document or URL to get started
            </p>
            <Button onClick={() => navigate("/")} className="bg-gradient-primary">
              Get Started
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sources.map((source, index) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card className="p-6 hover:shadow-medium transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getSourceIcon(source.source_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg truncate">
                            {source.title || "Untitled"}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {source.source_type === "url" && source.source_url}
                            {source.source_type === "pdf" && source.file_path?.split("/").pop()}
                            {source.source_type === "youtube" && source.source_url}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(source.status)}
                          <span className="text-sm font-medium capitalize">
                            {source.status || "unknown"}
                          </span>
                        </div>
                      </div>

                      {/* Error Message */}
                      {source.error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                          <p className="text-sm text-destructive font-medium">Error:</p>
                          <p className="text-sm text-destructive/80">{source.error}</p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created: {new Date(source.created_at || "").toLocaleDateString()}</span>
                        {source.language && <span>Language: {source.language}</span>}
                      </div>

                      {/* Retry Button */}
                      {source.status === "failed" && (
                        <Button
                          size="sm"
                          onClick={() => handleRetry(source)}
                          disabled={retryingId === source.id}
                          className="mt-3 bg-gradient-primary"
                        >
                          {retryingId === source.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Diagnostics;
