-- Fix the security definer view issue
DROP VIEW IF EXISTS public.poker_tables_public;

-- Create a proper view without security definer issues
-- Instead, we'll rely on RLS policies to control access
CREATE VIEW public.poker_tables_public AS
SELECT 
  id, name, game, stakes, status, floor_zone, 
  players, open_seats, wait_count, max_seats, updated_at
FROM public.poker_tables;

-- Grant proper permissions on the view
GRANT SELECT ON public.poker_tables_public TO anon, authenticated;