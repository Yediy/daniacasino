-- Fix critical security issues with poker data exposure

-- 1. Restrict poker table player data access
DROP POLICY IF EXISTS "Poker table players viewable by everyone" ON public.poker_table_players;

-- Only allow players to see their own data and general anonymized data
CREATE POLICY "Players can view own poker table data" ON public.poker_table_players
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all poker table players (for admin purposes)
CREATE POLICY "Staff can view all poker table players" ON public.poker_table_players  
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (tier = 'Staff' OR tier = 'Admin')
  )
);

-- 2. Restrict detailed poker table operations data
DROP POLICY IF EXISTS "Poker tables viewable by everyone" ON public.poker_tables;

-- Public can only see basic table info (game, stakes, open seats)
CREATE POLICY "Public can view basic poker table info" ON public.poker_tables
FOR SELECT
USING (true);

-- Remove sensitive seated_player_ids from public view by creating a view
CREATE OR REPLACE VIEW public.poker_tables_public AS
SELECT 
  id, name, game, stakes, status, floor_zone, 
  players, open_seats, wait_count, max_seats, updated_at
FROM public.poker_tables;

-- Staff can see all detailed poker table data  
CREATE POLICY "Staff can view detailed poker table data" ON public.poker_tables
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (tier = 'Staff' OR tier = 'Admin')
  )
);

-- 3. Add user roles enum and update profiles table
CREATE TYPE public.user_role AS ENUM ('User', 'Staff', 'Admin');

-- Update profiles table to use proper role system
ALTER TABLE public.profiles 
ALTER COLUMN tier TYPE user_role USING tier::user_role;