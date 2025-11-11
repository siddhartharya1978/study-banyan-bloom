-- PHASE 2: Expand cards table for adaptive learning
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS bloom_level TEXT CHECK (bloom_level IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS source_span TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cards_topic ON cards(topic);
CREATE INDEX IF NOT EXISTS idx_cards_bloom ON cards(bloom_level);

-- PHASE 3: Create concepts table for mastery tracking
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mastery INTEGER DEFAULT 0 CHECK (mastery >= 0 AND mastery <= 100),
  seen_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deck_id, name)
);

CREATE INDEX IF NOT EXISTS idx_concepts_mastery ON concepts(user_id, mastery);
CREATE INDEX IF NOT EXISTS idx_concepts_deck ON concepts(deck_id);

-- Enable RLS on concepts
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

-- RLS policies for concepts
CREATE POLICY "Users can view their own concepts" ON concepts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concepts" ON concepts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts" ON concepts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concepts" ON concepts
  FOR DELETE USING (auth.uid() = user_id);

-- PHASE 6: Create badges system
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  requirement JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Enable RLS on user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_badges
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add streak_vault to user_progress
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS streak_vault INTEGER DEFAULT 0;

-- Seed initial badges
INSERT INTO badges (name, description, icon, requirement) VALUES
  ('First Deck', 'Created your first study deck', '🌱', '{"type":"decks_created","value":1}'),
  ('Week Warrior', 'Maintained a 7-day streak', '🔥', '{"type":"streak_days","value":7}'),
  ('50 Hard Correct', 'Got 50 hard cards correct', '💪', '{"type":"hard_correct","value":50}'),
  ('1000 XP', 'Earned 1000 total XP', '⭐', '{"type":"xp","value":1000}'),
  ('Perfect Deck', 'Got 100% accuracy on a deck', '✨', '{"type":"deck_accuracy","value":100}')
ON CONFLICT (name) DO NOTHING;

-- Add response_ms and difficulty_at_attempt to reviews for better analytics
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS response_ms INTEGER,
ADD COLUMN IF NOT EXISTS difficulty_at_attempt INTEGER;