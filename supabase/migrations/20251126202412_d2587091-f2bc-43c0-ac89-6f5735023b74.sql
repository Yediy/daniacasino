-- Fix security definer view by removing SECURITY DEFINER and relying on RLS instead
DROP VIEW IF EXISTS player_performance_stats;

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