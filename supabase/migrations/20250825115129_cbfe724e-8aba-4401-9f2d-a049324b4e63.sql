-- Fix security issue: Restrict audit log access to service role only
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.audit_logs;

-- Create a more restrictive policy - only service role can read audit logs
CREATE POLICY "Service role can view audit logs" ON public.audit_logs
FOR SELECT
USING (false); -- Block all user access, only service role can read

-- Service role can still insert (this policy already exists and is correct)
-- CREATE POLICY "Service can insert audit logs" ON public.audit_logs
-- FOR INSERT  
-- WITH CHECK (true);