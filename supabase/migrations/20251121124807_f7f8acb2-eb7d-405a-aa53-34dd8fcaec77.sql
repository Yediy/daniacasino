-- Add missing columns to profiles table to match users spec
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Create poker_seats table for seat management
CREATE TABLE IF NOT EXISTS poker_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id TEXT NOT NULL REFERENCES poker_tables(id) ON DELETE CASCADE,
  seat_no INTEGER NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'occupied', 'reserved')),
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(table_id, seat_no)
);

-- Create stripe_events table for webhook idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_poker_seats_table ON poker_seats(table_id);
CREATE INDEX IF NOT EXISTS idx_poker_seats_user ON poker_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed_at);

-- Enable RLS on new tables
ALTER TABLE poker_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for poker_seats
CREATE POLICY "Staff can manage poker seats"
ON poker_seats FOR ALL
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Players can view seats at their table"
ON poker_seats FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM poker_tables pt 
    WHERE pt.id = table_id 
    AND auth.uid()::text = ANY(pt.seated_player_ids)
  )
);

-- RLS policy for stripe_events (service only)
CREATE POLICY "Service can manage stripe events"
ON stripe_events FOR ALL
USING (true);

-- Create trigger for poker_seats updated_at
CREATE OR REPLACE TRIGGER update_poker_seats_updated_at
  BEFORE UPDATE ON poker_seats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RPC for joining poker queue
CREATE OR REPLACE FUNCTION join_poker_queue(p_table_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_queue_id UUID;
  v_next_position INTEGER;
  v_list_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the cash game list ID for this table
  SELECT id INTO v_list_id
  FROM cash_game_lists
  WHERE game = (SELECT game || ' ' || stakes FROM poker_tables WHERE id = p_table_id)
  LIMIT 1;

  IF v_list_id IS NULL THEN
    RAISE EXCEPTION 'No queue list found for this table';
  END IF;

  -- Check if user is already in queue
  IF EXISTS (
    SELECT 1 FROM cash_game_queue 
    WHERE list_id = v_list_id 
    AND user_id = v_user_id 
    AND checkin_status != 'seated'
  ) THEN
    RAISE EXCEPTION 'Already in queue';
  END IF;

  -- Get next position
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
  FROM cash_game_queue
  WHERE list_id = v_list_id;

  -- Insert queue entry
  INSERT INTO cash_game_queue (id, list_id, user_id, position)
  VALUES (gen_random_uuid(), v_list_id, v_user_id, v_next_position)
  RETURNING id INTO v_queue_id;

  -- Update wait count
  UPDATE cash_game_lists
  SET wait_count = wait_count + 1
  WHERE id = v_list_id;

  -- Send notification
  PERFORM create_notification(
    v_user_id,
    'queue_joined',
    'Joined Queue',
    'You have been added to the poker queue at position ' || v_next_position,
    v_queue_id::text,
    'queue_entry'
  );

  RETURN v_queue_id;
END;
$$;

-- Create RPC for redeeming tickets
CREATE OR REPLACE FUNCTION redeem_ticket(p_barcode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_staff_id UUID;
BEGIN
  -- Get staff user
  v_staff_id := auth.uid();
  IF NOT (has_role(v_staff_id, 'Staff'::app_role) OR has_role(v_staff_id, 'Admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Find ticket
  SELECT * INTO v_ticket
  FROM event_tickets
  WHERE barcode = p_barcode;

  IF v_ticket.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_ticket');
  END IF;

  IF v_ticket.status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  -- Redeem ticket
  UPDATE event_tickets
  SET status = 'redeemed',
      redeemed_at = now(),
      redeemed_by_staff_id = v_staff_id
  WHERE id = v_ticket.id;

  -- Log audit
  PERFORM log_sensitive_action(
    'ticket_redeemed',
    'event_ticket',
    v_ticket.id::text,
    jsonb_build_object(
      'staff_id', v_staff_id,
      'user_id', v_ticket.user_id,
      'event_id', v_ticket.event_id
    )
  );

  -- Notify user
  PERFORM create_notification(
    v_ticket.user_id,
    'ticket_redeemed',
    'Ticket Redeemed',
    'Your event ticket has been scanned and redeemed.',
    v_ticket.id::text,
    'event_ticket'
  );

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket.id,
    'event_id', v_ticket.event_id
  );
END;
$$;

-- Create RPC for creating seat holds
CREATE OR REPLACE FUNCTION create_seat_hold(
  p_table_id TEXT,
  p_queue_id UUID,
  p_seat_no INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_id UUID;
  v_queue_entry RECORD;
  v_hold_minutes INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Check staff permission
  IF NOT (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get queue entry
  SELECT * INTO v_queue_entry
  FROM cash_game_queue
  WHERE id = p_queue_id;

  IF v_queue_entry.id IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found';
  END IF;

  -- Check if seat is available
  IF EXISTS (
    SELECT 1 FROM poker_seats 
    WHERE table_id = p_table_id 
    AND seat_no = p_seat_no 
    AND status != 'open'
  ) THEN
    RAISE EXCEPTION 'Seat not available';
  END IF;

  -- Get hold duration from settings
  SELECT COALESCE(cash_game_hold_minutes, 15) INTO v_hold_minutes
  FROM settings
  WHERE id = 'global';

  v_expires_at := now() + (v_hold_minutes || ' minutes')::INTERVAL;

  -- Reserve the seat
  UPDATE poker_seats
  SET status = 'reserved',
      user_id = v_queue_entry.user_id,
      updated_at = now()
  WHERE table_id = p_table_id
  AND seat_no = p_seat_no;

  -- Create seat hold
  INSERT INTO seat_holds (id, user_id, table_id, seat_no, expires_at)
  VALUES (gen_random_uuid(), v_queue_entry.user_id, p_table_id, p_seat_no, v_expires_at)
  RETURNING id INTO v_hold_id;

  -- Update queue entry
  UPDATE cash_game_queue
  SET hold_expires_at = v_expires_at,
      checkin_status = 'called'
  WHERE id = p_queue_id;

  -- Notify player
  PERFORM create_notification(
    v_queue_entry.user_id,
    'seat_ready',
    'Your Seat is Ready',
    'Seat ' || p_seat_no || ' is ready. Please claim within ' || v_hold_minutes || ' minutes.',
    v_hold_id::text,
    'seat_hold'
  );

  RETURN v_hold_id;
END;
$$;