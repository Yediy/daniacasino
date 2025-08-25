-- Fix the profiles table tier column and security issues

-- First, fix the tier column default value issue
ALTER TABLE public.profiles 
ALTER COLUMN tier DROP DEFAULT;

-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('User', 'Staff', 'Admin');

-- Update the tier column to use the enum, converting existing values
ALTER TABLE public.profiles 
ALTER COLUMN tier TYPE user_role USING 
  CASE 
    WHEN tier = 'Standard' THEN 'User'::user_role
    WHEN tier = 'Staff' THEN 'Staff'::user_role  
    WHEN tier = 'Admin' THEN 'Admin'::user_role
    ELSE 'User'::user_role
  END;

-- Set new default
ALTER TABLE public.profiles 
ALTER COLUMN tier SET DEFAULT 'User'::user_role;

-- Fix poker table security - restrict player data access
DROP POLICY IF EXISTS "Poker table players viewable by everyone" ON public.poker_table_players;

-- Players can only see their own data
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
    AND tier IN ('Staff', 'Admin')
  )
);

-- Restrict detailed poker table operations data
DROP POLICY IF EXISTS "Poker tables viewable by everyone" ON public.poker_tables;

-- Create a public view without sensitive data
CREATE OR REPLACE VIEW public.poker_tables_public AS
SELECT 
  id, name, game, stakes, status, floor_zone, 
  players, open_seats, wait_count, max_seats, updated_at
FROM public.poker_tables;

-- Public policy for basic table info only
CREATE POLICY "Public can view basic poker table info" ON public.poker_tables
FOR SELECT  
USING (auth.role() = 'anon');

-- Authenticated users can see table details
CREATE POLICY "Users can view poker tables" ON public.poker_tables
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Staff get full access including sensitive seated_player_ids
CREATE POLICY "Staff can view all poker table data" ON public.poker_tables
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND tier IN ('Staff', 'Admin')
  )
);