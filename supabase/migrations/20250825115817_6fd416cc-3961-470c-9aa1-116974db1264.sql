-- Remove the problematic view and rely only on RLS policies
DROP VIEW IF EXISTS public.poker_tables_public CASCADE;