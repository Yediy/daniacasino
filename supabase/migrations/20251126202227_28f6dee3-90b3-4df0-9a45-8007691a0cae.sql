-- Add chip count tracking to tournament standings
ALTER TABLE tournament_standings 
ADD COLUMN IF NOT EXISTS current_chips integer DEFAULT 0;

-- Create table balancing function
CREATE OR REPLACE FUNCTION balance_poker_tables(p_table_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_players integer := 0;
  v_table_count integer := 0;
  v_target_per_table integer;
  v_result jsonb := '[]'::jsonb;
  v_table record;
  v_current_table text;
  v_current_count integer;
BEGIN
  -- Staff permission check
  IF NOT (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_table_count := array_length(p_table_ids, 1);
  
  -- Count total players across specified tables
  SELECT COALESCE(SUM(players), 0) INTO v_total_players
  FROM poker_tables
  WHERE id = ANY(p_table_ids);
  
  IF v_total_players = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No players to balance');
  END IF;
  
  -- Calculate target players per table
  v_target_per_table := CEIL(v_total_players::numeric / v_table_count);
  
  -- Build recommendations
  FOR v_table IN (
    SELECT id, name, players, max_seats
    FROM poker_tables
    WHERE id = ANY(p_table_ids)
    ORDER BY players DESC
  ) LOOP
    v_result := v_result || jsonb_build_object(
      'table_id', v_table.id,
      'table_name', v_table.name,
      'current_players', v_table.players,
      'target_players', v_target_per_table,
      'max_seats', v_table.max_seats,
      'action', CASE
        WHEN v_table.players > v_target_per_table THEN 'move_players_out'
        WHEN v_table.players < v_target_per_table THEN 'move_players_in'
        ELSE 'balanced'
      END,
      'delta', v_table.players - v_target_per_table
    );
  END LOOP;
  
  -- Log the action
  PERFORM log_sensitive_action(
    'table_balance_calculated',
    'poker_table',
    array_to_string(p_table_ids, ','),
    jsonb_build_object(
      'total_players', v_total_players,
      'table_count', v_table_count,
      'target_per_table', v_target_per_table
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'total_players', v_total_players,
    'table_count', v_table_count,
    'target_per_table', v_target_per_table,
    'recommendations', v_result
  );
END;
$$;

-- Create view for player performance analytics
CREATE OR REPLACE VIEW player_performance_stats AS
SELECT 
  p.id as user_id,
  p.name,
  p.tier,
  p.points,
  -- Session stats
  COUNT(DISTINCT ps.id) as total_sessions,
  COALESCE(AVG(EXTRACT(EPOCH FROM (ps.session_end - ps.session_start))/3600), 0) as avg_session_hours,
  COALESCE(SUM(ps.total_cash_out - ps.total_buy_in), 0) as total_profit_loss,
  -- Game history stats
  COUNT(DISTINCT gh.id) as total_games,
  COUNT(CASE WHEN gh.outcome = 'win' THEN 1 END) as wins,
  COUNT(CASE WHEN gh.outcome = 'loss' THEN 1 END) as losses,
  CASE 
    WHEN COUNT(gh.id) > 0 THEN 
      ROUND(COUNT(CASE WHEN gh.outcome = 'win' THEN 1 END)::numeric / COUNT(gh.id)::numeric * 100, 2)
    ELSE 0
  END as win_rate_percentage,
  -- Tournament stats
  COUNT(DISTINCT pe.tourney_id) as tournaments_entered,
  COUNT(DISTINCT ts.id) as tournaments_finished,
  MIN(ts.rank) as best_tournament_rank,
  COALESCE(SUM(ts.prize_amount), 0) as total_tournament_winnings
FROM profiles p
LEFT JOIN player_sessions ps ON ps.user_id = p.id AND ps.status = 'completed'
LEFT JOIN game_history gh ON gh.user_id = p.id
LEFT JOIN poker_entries pe ON pe.user_id = p.id AND pe.status = 'paid'
LEFT JOIN tournament_standings ts ON ts.user_id = p.id
GROUP BY p.id, p.name, p.tier, p.points;

-- Grant access to view
GRANT SELECT ON player_performance_stats TO authenticated;
GRANT SELECT ON player_performance_stats TO anon;