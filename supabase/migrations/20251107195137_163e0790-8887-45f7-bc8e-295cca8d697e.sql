-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies for documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger to auto-process sources
CREATE OR REPLACE FUNCTION public.trigger_source_ingestion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger for URL and YouTube sources
  IF NEW.source_type IN ('url', 'youtube') AND NEW.status = 'processing' THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/ingest-url',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('sourceId', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_source_created
  AFTER INSERT ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_source_ingestion();