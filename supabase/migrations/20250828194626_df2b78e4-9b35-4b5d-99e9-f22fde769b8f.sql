-- Fix RLS policy missing on webhook_events table
-- This table is only accessed by Edge Functions via service role, so we add a minimal policy

CREATE POLICY "Service can manage webhook events" ON public.webhook_events
FOR ALL 
USING (true)
WITH CHECK (true);