-- Fix critical security issue: Remove player identity exposure from poker tables
-- Create a view that shows poker table info without exposing player IDs

-- First, let's create a public view for poker tables without player IDs
CREATE OR REPLACE VIEW public.poker_tables_public AS
SELECT 
    id,
    name,
    game,
    stakes,
    status,
    floor_zone,
    players,
    open_seats,
    max_seats,
    wait_count,
    updated_at
FROM public.poker_tables;

-- Update the RLS policy to prevent public access to the full poker_tables table
DROP POLICY IF EXISTS "Public can view poker tables" ON public.poker_tables;

-- Create restrictive policies for poker_tables table
CREATE POLICY "Staff can view all poker table details" 
ON public.poker_tables 
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Players can only see tables they're seated at
CREATE POLICY "Players can view tables they're seated at" 
ON public.poker_tables 
FOR SELECT 
USING (auth.uid()::text = ANY(seated_player_ids));

-- Grant public access to the safe view instead
GRANT SELECT ON public.poker_tables_public TO anon;
GRANT SELECT ON public.poker_tables_public TO authenticated;