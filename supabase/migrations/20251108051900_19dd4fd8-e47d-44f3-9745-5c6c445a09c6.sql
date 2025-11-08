-- Add user profile fields for personalization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_group TEXT CHECK (age_group IN ('child', 'teen', 'adult', 'senior')),
ADD COLUMN IF NOT EXISTS learning_goals TEXT[],
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS difficulty_preference TEXT CHECK (difficulty_preference IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system';

-- Update the handle_new_user function to initialize profile with defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, age_group, difficulty_preference, daily_goal)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'adult',
    'medium',
    5
  );
  
  -- Also initialize user_progress
  INSERT INTO public.user_progress (id, xp, level, streak_days, tree_level)
  VALUES (NEW.id, 0, 1, 0, 1);
  
  RETURN NEW;
END;
$$;