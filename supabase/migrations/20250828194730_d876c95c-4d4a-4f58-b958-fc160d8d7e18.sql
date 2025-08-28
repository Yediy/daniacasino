-- SECURITY FIX: Remove user access to audit logs
-- Audit logs should only be accessible to staff and administrators

-- Remove policy allowing users to view their own audit logs
DROP POLICY IF EXISTS "Authenticated can view audit logs" ON public.audit_logs;

-- Add staff-only access to audit logs
CREATE POLICY "Staff and admins can view audit logs" ON public.audit_logs
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));