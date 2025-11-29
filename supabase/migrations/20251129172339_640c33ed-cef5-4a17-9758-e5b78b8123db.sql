
-- Improve claim_cash_seat with search_path security
CREATE OR REPLACE FUNCTION public.claim_cash_seat(p_table_id text, p_seat_no integer, p_user_id uuid, p_hold_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat RECORD;
BEGIN
  -- Lock and get the seat
  SELECT * INTO v_seat
  FROM public.poker_seats
  WHERE table_id = p_table_id
    AND seat_no = p_seat_no
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'seat_not_found';
  END IF;

  IF v_seat.status <> 'held' AND v_seat.status <> 'open' THEN
    RAISE EXCEPTION 'seat_not_available';
  END IF;

  -- Claim the seat
  UPDATE public.poker_seats
  SET status = 'occupied',
      user_id = p_user_id,
      updated_at = NOW()
  WHERE table_id = p_table_id
    AND seat_no = p_seat_no;

  -- Remove the hold
  DELETE FROM public.seat_holds WHERE id = p_hold_id;

  -- Update table stats
  UPDATE public.poker_tables
  SET open_seats = GREATEST(open_seats - 1, 0),
      players = players + 1
  WHERE id = p_table_id;

  -- Log the action
  PERFORM log_sensitive_action(
    'seat_claimed',
    'poker_seat',
    p_hold_id::text,
    jsonb_build_object(
      'table_id', p_table_id,
      'seat_no', p_seat_no,
      'user_id', p_user_id
    )
  );

  -- Notify the user
  PERFORM create_notification(
    p_user_id,
    'seat_claimed',
    'Seat Claimed',
    'You have successfully claimed seat ' || p_seat_no || '.',
    p_hold_id::text,
    'seat_hold'
  );
END;
$$;

-- Improve join_poker_queue with search_path security
CREATE OR REPLACE FUNCTION public.join_poker_queue(p_table_id text)
RETURNS uuid
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

-- Improve get_poker_tables_with_seats with queue length
CREATE OR REPLACE FUNCTION public.get_poker_tables_with_seats()
RETURNS TABLE(
  table_id text, 
  table_name text, 
  game text, 
  stakes text, 
  max_seats integer, 
  open_seats integer, 
  occupied_seats integer, 
  queue_length integer, 
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.name,
    pt.game,
    pt.stakes,
    pt.max_seats,
    pt.open_seats,
    pt.players as occupied_seats,
    COALESCE((
      SELECT COUNT(*)::integer 
      FROM cash_game_queue cq
      JOIN cash_game_lists cl ON cq.list_id = cl.id
      WHERE cl.game = pt.game || ' ' || pt.stakes
        AND cq.checkin_status IN ('remote', 'waiting')
    ), 0) as queue_length,
    pt.status
  FROM public.poker_tables pt
  WHERE pt.status = 'open'
  ORDER BY pt.name;
END;
$$;

-- Improve redeem_ticket with search_path (keeps existing role checks)
CREATE OR REPLACE FUNCTION public.redeem_ticket(p_barcode text)
RETURNS jsonb
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

-- Add search_path to other security-critical functions
CREATE OR REPLACE FUNCTION public.create_seat_hold(p_table_id text, p_queue_id uuid, p_seat_no integer)
RETURNS uuid
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
