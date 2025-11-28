-- Fix security definer view warning by setting security_invoker = true
-- This ensures the view uses the calling user's permissions (RLS) rather than the view owner's

ALTER VIEW public.player_performance_stats SET (security_invoker = true);