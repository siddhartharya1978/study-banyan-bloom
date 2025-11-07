-- Fix search path for trigger function
DROP FUNCTION IF EXISTS public.trigger_source_ingestion() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_source_ingestion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Recreate trigger
CREATE TRIGGER on_source_created
  AFTER INSERT ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_source_ingestion();