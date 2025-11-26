-- Add claim_cash_seat function (cleaner seat claiming logic)
CREATE OR REPLACE FUNCTION public.claim_cash_seat(
  p_table_id text,
  p_seat_no integer,
  p_user_id uuid,
  p_hold_id uuid
)
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

-- Add generic updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to tables that need them
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_poker_seats ON public.poker_seats;
CREATE TRIGGER set_updated_at_poker_seats
BEFORE UPDATE ON public.poker_seats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_poker_tables ON public.poker_tables;
CREATE TRIGGER set_updated_at_poker_tables
BEFORE UPDATE ON public.poker_tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_cash_game_lists ON public.cash_game_lists;
CREATE TRIGGER set_updated_at_cash_game_lists
BEFORE UPDATE ON public.cash_game_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Improve recalculate_slot_banks trigger function
CREATE OR REPLACE FUNCTION public.trigger_recalculate_slot_banks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_slot_bank_aggregate(OLD.bank, OLD.room);
    RETURN OLD;
  ELSE
    PERFORM update_slot_bank_aggregate(NEW.bank, NEW.room);
    -- If bank or room changed, update old location too
    IF TG_OP = 'UPDATE' AND (OLD.bank IS DISTINCT FROM NEW.bank OR OLD.room IS DISTINCT FROM NEW.room) THEN
      PERFORM update_slot_bank_aggregate(OLD.bank, OLD.room);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Add trigger for slot banks if not exists
DROP TRIGGER IF EXISTS slots_after_change ON public.slots;
CREATE TRIGGER slots_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.slots
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_slot_banks();