-- Create chunks table for better content management
CREATE TABLE public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL,
  text TEXT NOT NULL,
  lang TEXT DEFAULT 'en',
  citation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_id, ord)
);

-- Enable RLS on chunks
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for chunks
CREATE POLICY "Users can view chunks from their sources"
  ON public.chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sources
      WHERE sources.id = chunks.source_id
      AND sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their sources"
  ON public.chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sources
      WHERE sources.id = chunks.source_id
      AND sources.user_id = auth.uid()
    )
  );

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_chunks_source_id_ord ON public.chunks(source_id, ord);
CREATE INDEX IF NOT EXISTS idx_cards_next_review_at ON public.cards(next_review_at) WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_deck_id ON public.reviews(deck_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id_created_at ON public.reviews(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decks_user_id_created_at ON public.decks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_user_id_status ON public.sources(user_id, status);

-- Add error column to sources for better error tracking
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS error TEXT;

-- Add metadata to reviews table for better tracking
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;