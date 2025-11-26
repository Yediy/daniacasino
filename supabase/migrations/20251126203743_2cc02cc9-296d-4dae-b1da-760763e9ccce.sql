-- Drop existing policies only on player_preferences (which already exists)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own preferences" ON public.player_preferences;
  DROP POLICY IF EXISTS "Users can update their own preferences" ON public.player_preferences;
  DROP POLICY IF EXISTS "Staff can view all preferences" ON public.player_preferences;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Create tournament structures table for blind management
CREATE TABLE IF NOT EXISTS public.tournament_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourney_id UUID NOT NULL REFERENCES public.poker_tourneys(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  is_break BOOLEAN DEFAULT false,
  break_duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tourney_id, level_number)
);

-- Create tournament clock state table
CREATE TABLE IF NOT EXISTS public.tournament_clock_state (
  tourney_id UUID PRIMARY KEY REFERENCES public.poker_tourneys(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1,
  level_started_at TIMESTAMPTZ,
  is_paused BOOLEAN DEFAULT false,
  is_break BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add ELO ratings to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS cash_game_elo INTEGER DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS tournament_elo INTEGER DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tournaments_played INTEGER DEFAULT 0;

-- Create ELO history table
CREATE TABLE IF NOT EXISTS public.elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  old_rating INTEGER NOT NULL,
  new_rating INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  opponent_id UUID,
  opponent_rating INTEGER,
  game_result TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create live streaming table
CREATE TABLE IF NOT EXISTS public.tournament_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourney_id UUID NOT NULL REFERENCES public.poker_tourneys(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  stream_key TEXT,
  channel_id TEXT,
  status TEXT DEFAULT 'scheduled',
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_clock_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.player_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.player_preferences FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all preferences"
  ON public.player_preferences FOR SELECT
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- RLS Policies for tournament structures
CREATE POLICY "Anyone can view tournament structures"
  ON public.tournament_structures FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage tournament structures"
  ON public.tournament_structures FOR ALL
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- RLS Policies for tournament clock state
CREATE POLICY "Anyone can view tournament clock"
  ON public.tournament_clock_state FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage tournament clock"
  ON public.tournament_clock_state FOR ALL
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- RLS Policies for ELO history
CREATE POLICY "Users can view their own ELO history"
  ON public.elo_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view ELO history"
  ON public.elo_history FOR SELECT
  USING (true);

CREATE POLICY "System can insert ELO history"
  ON public.elo_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for tournament streams
CREATE POLICY "Anyone can view tournament streams"
  ON public.tournament_streams FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage tournament streams"
  ON public.tournament_streams FOR ALL
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_preferences_user_id ON public.player_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_structures_tourney_id ON public.tournament_structures(tourney_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_user_id ON public.elo_history(user_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_game_type ON public.elo_history(game_type);
CREATE INDEX IF NOT EXISTS idx_tournament_streams_tourney_id ON public.tournament_streams(tourney_id);
CREATE INDEX IF NOT EXISTS idx_tournament_streams_status ON public.tournament_streams(status);

-- Function to calculate ELO rating change
CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  player_rating INTEGER,
  opponent_rating INTEGER,
  result NUMERIC,
  k_factor INTEGER DEFAULT 32
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  expected_score NUMERIC;
  rating_change INTEGER;
BEGIN
  expected_score := 1.0 / (1.0 + POWER(10.0, (opponent_rating - player_rating) / 400.0));
  rating_change := ROUND(k_factor * (result - expected_score));
  RETURN rating_change;
END;
$$;

-- Function to update player ELO after a game
CREATE OR REPLACE FUNCTION public.update_player_elo(
  p_user_id UUID,
  p_opponent_id UUID,
  p_game_type TEXT,
  p_result TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_rating INTEGER;
  v_opponent_rating INTEGER;
  v_result_score NUMERIC;
  v_rating_change INTEGER;
  v_new_rating INTEGER;
BEGIN
  IF p_game_type = 'cash_game' THEN
    SELECT cash_game_elo INTO v_player_rating FROM profiles WHERE id = p_user_id;
    SELECT cash_game_elo INTO v_opponent_rating FROM profiles WHERE id = p_opponent_id;
  ELSE
    SELECT tournament_elo INTO v_player_rating FROM profiles WHERE id = p_user_id;
    SELECT tournament_elo INTO v_opponent_rating FROM profiles WHERE id = p_opponent_id;
  END IF;
  
  v_result_score := CASE p_result
    WHEN 'win' THEN 1.0
    WHEN 'draw' THEN 0.5
    WHEN 'loss' THEN 0.0
  END;
  
  v_rating_change := calculate_elo_change(v_player_rating, v_opponent_rating, v_result_score);
  v_new_rating := v_player_rating + v_rating_change;
  v_new_rating := GREATEST(v_new_rating, 100);
  
  IF p_game_type = 'cash_game' THEN
    UPDATE profiles 
    SET cash_game_elo = v_new_rating, games_played = games_played + 1
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles 
    SET tournament_elo = v_new_rating, tournaments_played = tournaments_played + 1
    WHERE id = p_user_id;
  END IF;
  
  INSERT INTO elo_history (
    user_id, game_type, old_rating, new_rating, rating_change,
    opponent_id, opponent_rating, game_result, reference_id
  ) VALUES (
    p_user_id, p_game_type, v_player_rating, v_new_rating, v_rating_change,
    p_opponent_id, v_opponent_rating, p_result, p_reference_id
  );
  
  RETURN jsonb_build_object(
    'old_rating', v_player_rating,
    'new_rating', v_new_rating,
    'rating_change', v_rating_change
  );
END;
$$;

-- Function to optimize seat assignments
CREATE OR REPLACE FUNCTION public.optimize_seat_assignments(
  p_table_id TEXT,
  p_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignments JSONB := '[]'::JSONB;
  v_player_id UUID;
  v_seat_no INTEGER := 1;
  v_max_seats INTEGER;
BEGIN
  SELECT max_seats INTO v_max_seats FROM poker_tables WHERE id = p_table_id;
  
  FOREACH v_player_id IN ARRAY p_player_ids
  LOOP
    v_assignments := v_assignments || jsonb_build_object(
      'user_id', v_player_id,
      'seat_no', v_seat_no,
      'preference_score', 100
    );
    
    v_seat_no := v_seat_no + 1;
    EXIT WHEN v_seat_no > v_max_seats;
  END LOOP;
  
  RETURN jsonb_build_object(
    'table_id', p_table_id,
    'assignments', v_assignments
  );
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS update_player_preferences_updated_at ON public.player_preferences;
CREATE TRIGGER update_player_preferences_updated_at
  BEFORE UPDATE ON public.player_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_clock_updated_at ON public.tournament_clock_state;
CREATE TRIGGER update_tournament_clock_updated_at
  BEFORE UPDATE ON public.tournament_clock_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_streams_updated_at ON public.tournament_streams;
CREATE TRIGGER update_tournament_streams_updated_at
  BEFORE UPDATE ON public.tournament_streams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();