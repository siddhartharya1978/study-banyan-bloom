-- Drop the problematic trigger and function that requires net.http_post (with CASCADE)
DROP FUNCTION IF EXISTS public.trigger_source_ingestion() CASCADE;