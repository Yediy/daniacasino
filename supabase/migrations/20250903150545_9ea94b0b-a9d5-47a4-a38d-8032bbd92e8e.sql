-- Create notifications table to replace broadcast channels
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Fix poker_table_players RLS policy
DROP POLICY IF EXISTS "Dashboard users can view own or staff all poker table players" ON public.poker_table_players;

CREATE POLICY "Users can view own poker table positions"
ON public.poker_table_players
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all poker table positions"
ON public.poker_table_players
FOR SELECT
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Create function for secure notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  ref_id TEXT DEFAULT NULL,
  ref_type TEXT DEFAULT NULL,
  notification_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_id,
    reference_type,
    data
  ) VALUES (
    target_user_id,
    notification_type,
    notification_title,
    notification_message,
    ref_id,
    ref_type,
    notification_data
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Add realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;