-- Create audit logs table for compliance and security tracking
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  user_id UUID,
  staff_id UUID,
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_staff ON public.audit_logs(staff_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for staff to view audit logs
CREATE POLICY "Staff can view audit logs" ON public.audit_logs
FOR SELECT
USING (true); -- Allow all authenticated users to read audit logs

-- Only service role can insert audit logs
CREATE POLICY "Service can insert audit logs" ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Add missing columns to existing tables for redemption tracking
ALTER TABLE public.event_tickets 
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS redeemed_by_staff_id UUID;

ALTER TABLE public.chip_vouchers 
ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS redeemed_by_staff_id UUID;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS picked_up_by_staff_id UUID;