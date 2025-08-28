-- CRITICAL SECURITY FIX: Add missing RLS policies to prevent public data access

-- Fix poker_tables - add proper SELECT policies
CREATE POLICY "Public can view poker tables" ON public.poker_tables
FOR SELECT 
USING (true);

-- Additional security: Ensure profiles table has proper public access restrictions
-- Add explicit policy to deny anonymous access to profiles
CREATE POLICY "Deny anonymous access to profiles" ON public.profiles
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Add explicit policy to deny anonymous access to financial data
CREATE POLICY "Deny anonymous access to vouchers" ON public.chip_vouchers
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to orders" ON public.orders
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to tickets" ON public.event_tickets
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny anonymous access to poker entries" ON public.poker_entries
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);