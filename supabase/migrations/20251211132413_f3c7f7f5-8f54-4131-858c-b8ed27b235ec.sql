-- Add SET search_path = public to all SECURITY DEFINER functions for security hardening

-- Update set_updated_at trigger function (add if not exists with security)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Ensure recalculate_slot_banks has proper security
CREATE OR REPLACE FUNCTION public.trigger_recalculate_slot_banks()
RETURNS trigger
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
    IF TG_OP = 'UPDATE' AND (OLD.bank IS DISTINCT FROM NEW.bank OR OLD.room IS DISTINCT FROM NEW.room) THEN
      PERFORM update_slot_bank_aggregate(OLD.bank, OLD.room);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Ensure trigger_update_slot_bank has proper security
CREATE OR REPLACE FUNCTION public.trigger_update_slot_bank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_slot_bank_aggregate(OLD.room, OLD.bank);
    RETURN OLD;
  ELSE
    PERFORM update_slot_bank_aggregate(NEW.room, NEW.bank);
    IF TG_OP = 'UPDATE' AND (OLD.room IS DISTINCT FROM NEW.room OR OLD.bank IS DISTINCT FROM NEW.bank) THEN
      PERFORM update_slot_bank_aggregate(OLD.room, OLD.bank);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Ensure calculate_wait_time has proper security
CREATE OR REPLACE FUNCTION public.calculate_wait_time(p_list_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_seats integer;
  v_avg_session_minutes integer := 120;
BEGIN
  SELECT open_seats INTO v_open_seats
  FROM cash_game_lists
  WHERE id = p_list_id;
  
  IF v_open_seats > 0 THEN
    RETURN 0;
  END IF;
  
  RETURN v_avg_session_minutes;
END;
$$;

-- Ensure update_queue_positions has proper security  
CREATE OR REPLACE FUNCTION public.update_queue_positions(p_list_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_entry record;
  v_position integer := 1;
  v_wait_time integer;
BEGIN
  FOR v_queue_entry IN
    SELECT * FROM cash_game_queue
    WHERE list_id = p_list_id
      AND checkin_status IN ('remote', 'waiting')
    ORDER BY created_at
  LOOP
    v_wait_time := calculate_wait_time(p_list_id) * v_position;
    
    UPDATE cash_game_queue
    SET 
      position = v_position,
      estimated_wait_minutes = v_wait_time
    WHERE id = v_queue_entry.id;
    
    IF v_queue_entry.notified_at IS NULL OR 
       v_queue_entry.notified_at < NOW() - INTERVAL '5 minutes' THEN
      
      PERFORM create_notification(
        v_queue_entry.user_id,
        'queue_position_update',
        'Queue Position Update',
        'You are now #' || v_position || ' in queue. Estimated wait: ' || v_wait_time || ' minutes.',
        v_queue_entry.id::text,
        'queue_entry'
      );
      
      UPDATE cash_game_queue
      SET notified_at = NOW()
      WHERE id = v_queue_entry.id;
    END IF;
    
    v_position := v_position + 1;
  END LOOP;
END;
$$;

-- Ensure trigger_queue_position_update has proper security
CREATE OR REPLACE FUNCTION public.trigger_queue_position_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_queue_positions(OLD.list_id);
    RETURN OLD;
  ELSE
    PERFORM update_queue_positions(NEW.list_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Ensure trigger_tier_check has proper security
CREATE OR REPLACE FUNCTION public.trigger_tier_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_tier_upgrade(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Ensure calculate_time_entry_hours has proper security
CREATE OR REPLACE FUNCTION public.calculate_time_entry_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.total_hours := NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;