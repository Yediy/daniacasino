-- CRITICAL SECURITY FIX: Remove anonymous access to poker player data
-- This prevents public tracking of players' gambling activity and financial positions

-- Remove the dangerous policy that allows anonymous users to view all poker players
DROP POLICY IF EXISTS "Anon can view all poker table players" ON public.poker_table_players;

-- Keep the existing authenticated policy that allows:
-- 1. Users to view their own poker activity
-- 2. Staff to view all players (for legitimate gaming operations)
-- This policy already exists: "Dashboard users can view own or staff all poker table players"

-- Verify no other overly permissive policies exist
-- The INSERT/UPDATE service policies remain for edge function operations