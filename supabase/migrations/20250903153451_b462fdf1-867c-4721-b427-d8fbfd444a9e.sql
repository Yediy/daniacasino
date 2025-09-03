-- Fix security definer view issue
DROP VIEW IF EXISTS public.poker_tables_public;

-- Create a safe function to get public poker table data instead of a view
CREATE OR REPLACE FUNCTION public.get_public_poker_tables()
RETURNS TABLE(
    id text,
    name text, 
    game text,
    stakes text,
    status text,
    floor_zone text,
    players integer,
    open_seats integer,
    max_seats integer,
    wait_count integer,
    updated_at timestamp with time zone
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.game,
    p.stakes,
    p.status,
    p.floor_zone,
    p.players,
    p.open_seats,
    p.max_seats,
    p.wait_count,
    p.updated_at
  FROM public.poker_tables p
$$;