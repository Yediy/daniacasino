-- Security Fix: Enable RLS on webhook_events table
-- This table is only accessed by edge functions using service role key,
-- but we enable RLS for security compliance

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies needed since this table is only accessed by edge functions
-- using the service role key which bypasses RLS