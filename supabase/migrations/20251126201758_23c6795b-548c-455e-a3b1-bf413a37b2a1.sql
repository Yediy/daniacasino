-- Add estimated wait time tracking
ALTER TABLE cash_game_queue
ADD COLUMN IF NOT EXISTS estimated_wait_minutes integer,
ADD COLUMN IF NOT EXISTS notified_at timestamp with time zone;

-- Function to calculate estimated wait time
CREATE OR REPLACE FUNCTION public.calculate_wait_time(
  p_list_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_seats integer;
  v_position integer;
  v_avg_session_minutes integer := 120; -- Average session length
BEGIN
  -- Get open seats for this game
  SELECT open_seats INTO v_open_seats
  FROM cash_game_lists
  WHERE id = p_list_id;
  
  -- If seats available, no wait
  IF v_open_seats > 0 THEN
    RETURN 0;
  END IF;
  
  -- Calculate based on position in queue
  -- Assume seats turn over every 2 hours on average
  -- Each open seat reduces wait proportionally
  RETURN v_avg_session_minutes;
END;
$$;

-- Function to update queue positions and notify users
CREATE OR REPLACE FUNCTION public.update_queue_positions(
  p_list_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_entry record;
  v_position integer := 1;
  v_wait_time integer;
BEGIN
  -- Recalculate positions
  FOR v_queue_entry IN
    SELECT * FROM cash_game_queue
    WHERE list_id = p_list_id
      AND checkin_status IN ('remote', 'waiting')
    ORDER BY created_at
  LOOP
    v_wait_time := calculate_wait_time(p_list_id) * v_position;
    
    UPDATE cash_game_queue
    SET 
      position = v_position,
      estimated_wait_minutes = v_wait_time
    WHERE id = v_queue_entry.id;
    
    -- Notify user of position change if not recently notified
    IF v_queue_entry.notified_at IS NULL OR 
       v_queue_entry.notified_at < NOW() - INTERVAL '5 minutes' THEN
      
      PERFORM create_notification(
        v_queue_entry.user_id,
        'queue_position_update',
        'Queue Position Update',
        'You are now #' || v_position || ' in queue. Estimated wait: ' || v_wait_time || ' minutes.',
        v_queue_entry.id::text,
        'queue_entry'
      );
      
      UPDATE cash_game_queue
      SET notified_at = NOW()
      WHERE id = v_queue_entry.id;
    END IF;
    
    v_position := v_position + 1;
  END LOOP;
END;
$$;

-- Trigger to update queue positions when queue changes
CREATE OR REPLACE FUNCTION public.trigger_queue_position_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_queue_positions(OLD.list_id);
    RETURN OLD;
  ELSE
    PERFORM update_queue_positions(NEW.list_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_queue_on_change ON cash_game_queue;
CREATE TRIGGER update_queue_on_change
AFTER INSERT OR DELETE OR UPDATE ON cash_game_queue
FOR EACH ROW
EXECUTE FUNCTION trigger_queue_position_update();

-- Loyalty tier thresholds and automation
CREATE TABLE IF NOT EXISTS public.tier_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier user_role NOT NULL,
  min_points integer NOT NULL,
  min_sessions integer DEFAULT 0,
  min_play_hours integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert default tier thresholds
INSERT INTO public.tier_thresholds (tier, min_points, min_sessions, min_play_hours)
VALUES 
  ('User', 0, 0, 0),
  ('Staff', 10000, 50, 100),
  ('Admin', 50000, 200, 500)
ON CONFLICT DO NOTHING;

-- Function to check and upgrade tier automatically
CREATE OR REPLACE FUNCTION public.check_tier_upgrade(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_tier user_role;
  v_points integer;
  v_sessions integer;
  v_play_hours integer;
  v_new_tier user_role;
  v_threshold record;
BEGIN
  -- Get current profile stats
  SELECT tier, points INTO v_current_tier, v_points
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get session statistics
  SELECT 
    COUNT(*) as session_count,
    COALESCE(SUM(EXTRACT(EPOCH FROM (session_end - session_start))/3600), 0) as hours
  INTO v_sessions, v_play_hours
  FROM player_sessions
  WHERE user_id = p_user_id
    AND status = 'completed';
  
  -- Find highest tier user qualifies for
  SELECT tier INTO v_new_tier
  FROM tier_thresholds
  WHERE min_points <= v_points
    AND min_sessions <= v_sessions
    AND min_play_hours <= v_play_hours
  ORDER BY min_points DESC
  LIMIT 1;
  
  -- Upgrade if qualified for higher tier
  IF v_new_tier IS NOT NULL AND v_new_tier != v_current_tier THEN
    UPDATE profiles
    SET tier = v_new_tier
    WHERE id = p_user_id;
    
    -- Log the automatic upgrade
    PERFORM log_sensitive_action(
      'tier_auto_upgraded',
      'profile',
      p_user_id::text,
      jsonb_build_object(
        'old_tier', v_current_tier,
        'new_tier', v_new_tier,
        'points', v_points,
        'sessions', v_sessions,
        'play_hours', v_play_hours
      )
    );
    
    -- Notify user
    PERFORM create_notification(
      p_user_id,
      'tier_upgraded',
      'Congratulations! Tier Upgraded',
      'You have been upgraded to ' || v_new_tier || ' tier based on your activity!',
      NULL,
      NULL
    );
  END IF;
END;
$$;

-- Trigger to check tier upgrade on points or session changes
CREATE OR REPLACE FUNCTION public.trigger_tier_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_tier_upgrade(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_tier_on_points_change ON loyalty_transactions;
CREATE TRIGGER check_tier_on_points_change
AFTER INSERT OR UPDATE ON loyalty_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_tier_check();

DROP TRIGGER IF EXISTS check_tier_on_session_end ON player_sessions;
CREATE TRIGGER check_tier_on_session_end
AFTER INSERT OR UPDATE ON player_sessions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION trigger_tier_check();

-- Tournament bracket generation
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourney_id uuid NOT NULL REFERENCES poker_tourneys(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  match_number integer NOT NULL,
  table_id text,
  player1_id uuid REFERENCES profiles(id),
  player2_id uuid REFERENCES profiles(id),
  winner_id uuid REFERENCES profiles(id),
  player1_seed integer,
  player2_seed integer,
  scheduled_time timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'bye')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tourney_id, round_number, match_number)
);

-- Enable RLS on tournament matches
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tournament matches"
ON tournament_matches FOR SELECT
USING (true);

CREATE POLICY "Staff can manage tournament matches"
ON tournament_matches FOR ALL
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Function to generate tournament brackets
CREATE OR REPLACE FUNCTION public.generate_tournament_bracket(
  p_tourney_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_count integer;
  v_rounds integer;
  v_matches_per_round integer;
  v_entries record;
  v_round integer;
  v_match integer;
  v_result jsonb := '[]'::jsonb;
BEGIN
  -- Get all paid entries with player rankings (simulated by points)
  CREATE TEMP TABLE IF NOT EXISTS bracket_entries AS
  SELECT 
    pe.id,
    pe.user_id,
    p.points,
    ROW_NUMBER() OVER (ORDER BY p.points DESC) as seed
  FROM poker_entries pe
  JOIN profiles p ON p.id = pe.user_id
  WHERE pe.tourney_id = p_tourney_id
    AND pe.status = 'paid'
  ORDER BY p.points DESC;
  
  v_entry_count := (SELECT COUNT(*) FROM bracket_entries);
  
  IF v_entry_count < 2 THEN
    RAISE EXCEPTION 'Not enough entries to generate bracket';
  END IF;
  
  -- Calculate number of rounds (log2 of next power of 2)
  v_rounds := CEIL(LOG(2, v_entry_count));
  
  -- Clear existing matches for this tournament
  DELETE FROM tournament_matches WHERE tourney_id = p_tourney_id;
  
  -- Generate first round matches with seeding
  v_matches_per_round := CEIL(v_entry_count / 2.0);
  v_match := 1;
  
  FOR v_entries IN (
    SELECT 
      e1.user_id as player1,
      e1.seed as seed1,
      e2.user_id as player2,
      e2.seed as seed2
    FROM bracket_entries e1
    LEFT JOIN bracket_entries e2 ON e2.seed = (v_entry_count + 1 - e1.seed)
    WHERE e1.seed <= v_matches_per_round
    ORDER BY e1.seed
  ) LOOP
    INSERT INTO tournament_matches (
      tourney_id,
      round_number,
      match_number,
      player1_id,
      player2_id,
      player1_seed,
      player2_seed,
      status
    ) VALUES (
      p_tourney_id,
      1,
      v_match,
      v_entries.player1,
      v_entries.player2,
      v_entries.seed1,
      v_entries.seed2,
      CASE WHEN v_entries.player2 IS NULL THEN 'bye' ELSE 'pending' END
    );
    
    v_match := v_match + 1;
  END LOOP;
  
  -- Generate subsequent round placeholders
  FOR v_round IN 2..v_rounds LOOP
    v_matches_per_round := CEIL(v_matches_per_round / 2.0);
    
    FOR v_match IN 1..v_matches_per_round LOOP
      INSERT INTO tournament_matches (
        tourney_id,
        round_number,
        match_number,
        status
      ) VALUES (
        p_tourney_id,
        v_round,
        v_match,
        'pending'
      );
    END LOOP;
  END LOOP;
  
  -- Log bracket generation
  PERFORM log_sensitive_action(
    'bracket_generated',
    'poker_tourney',
    p_tourney_id::text,
    jsonb_build_object(
      'entry_count', v_entry_count,
      'rounds', v_rounds
    )
  );
  
  DROP TABLE IF EXISTS bracket_entries;
  
  RETURN jsonb_build_object(
    'tourney_id', p_tourney_id,
    'rounds', v_rounds,
    'entry_count', v_entry_count
  );
END;
$$;