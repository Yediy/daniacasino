-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- DATABASE FUNCTIONS FOR COMMON OPERATIONS
-- ========================================

-- Function: Create seat hold for poker queue
CREATE OR REPLACE FUNCTION public.create_poker_seat_hold(
  p_table_id TEXT,
  p_user_id UUID,
  p_seat_no INTEGER,
  p_hold_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Calculate expiration time
  v_expires_at := NOW() + (p_hold_duration_minutes || ' minutes')::INTERVAL;
  
  -- Check if seat is available
  IF EXISTS (
    SELECT 1 FROM poker_seats 
    WHERE table_id = p_table_id 
    AND seat_no = p_seat_no 
    AND status != 'open'
  ) THEN
    RAISE EXCEPTION 'Seat % at table % is not available', p_seat_no, p_table_id;
  END IF;
  
  -- Create the hold
  INSERT INTO seat_holds (table_id, user_id, seat_no, expires_at)
  VALUES (p_table_id, p_user_id, p_seat_no, v_expires_at)
  RETURNING id INTO v_hold_id;
  
  -- Update seat status
  UPDATE poker_seats
  SET status = 'held', user_id = p_user_id, updated_at = NOW()
  WHERE table_id = p_table_id AND seat_no = p_seat_no;
  
  -- Log the action
  PERFORM log_sensitive_action(
    'seat_hold_created',
    'seat_hold',
    v_hold_id::TEXT,
    jsonb_build_object(
      'table_id', p_table_id,
      'seat_no', p_seat_no,
      'user_id', p_user_id,
      'expires_at', v_expires_at
    )
  );
  
  RETURN v_hold_id;
END;
$$;

-- Function: Redeem chip voucher
CREATE OR REPLACE FUNCTION public.redeem_chip_voucher(
  p_barcode TEXT,
  p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher RECORD;
BEGIN
  -- Verify staff permissions
  IF NOT (has_role(p_staff_id, 'Staff'::app_role) OR has_role(p_staff_id, 'Admin'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;
  
  -- Find and lock the voucher
  SELECT * INTO v_voucher
  FROM chip_vouchers
  WHERE barcode = p_barcode
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'voucher_not_found');
  END IF;
  
  -- Check voucher status
  IF v_voucher.status != 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'voucher_already_redeemed_or_invalid', 'status', v_voucher.status);
  END IF;
  
  -- Check redemption window if set
  IF v_voucher.redeem_window_start IS NOT NULL AND NOW() < v_voucher.redeem_window_start THEN
    RETURN jsonb_build_object('success', false, 'error', 'redemption_window_not_started');
  END IF;
  
  IF v_voucher.redeem_window_end IS NOT NULL AND NOW() > v_voucher.redeem_window_end THEN
    RETURN jsonb_build_object('success', false, 'error', 'redemption_window_expired');
  END IF;
  
  -- Redeem the voucher
  UPDATE chip_vouchers
  SET 
    status = 'redeemed',
    redeemed_at = NOW(),
    redeemed_by_staff_id = p_staff_id
  WHERE id = v_voucher.id;
  
  -- Log the redemption
  PERFORM log_sensitive_action(
    'voucher_redeemed',
    'chip_voucher',
    v_voucher.id::TEXT,
    jsonb_build_object(
      'voucher_type', v_voucher.voucher_type,
      'amount', v_voucher.amount,
      'user_id', v_voucher.user_id,
      'staff_id', p_staff_id
    )
  );
  
  -- Create notification
  PERFORM create_notification(
    v_voucher.user_id,
    'voucher_redeemed',
    'Voucher Redeemed',
    'Your ' || v_voucher.voucher_type || ' voucher for $' || (v_voucher.amount / 100.0) || ' has been redeemed.',
    v_voucher.id::TEXT,
    'chip_voucher'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'voucher_id', v_voucher.id,
    'amount', v_voucher.amount,
    'voucher_type', v_voucher.voucher_type,
    'user_id', v_voucher.user_id
  );
END;
$$;

-- Function: Process and finalize order
CREATE OR REPLACE FUNCTION public.process_order(
  p_order_id UUID,
  p_new_status TEXT,
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;
  
  -- Validate status transition
  IF v_order.status = 'picked_up' OR v_order.status = 'canceled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_already_finalized', 'current_status', v_order.status);
  END IF;
  
  -- Update order status
  UPDATE orders
  SET 
    status = p_new_status,
    picked_up_at = CASE WHEN p_new_status = 'picked_up' THEN NOW() ELSE picked_up_at END,
    picked_up_by_staff_id = CASE WHEN p_new_status = 'picked_up' THEN p_staff_id ELSE picked_up_by_staff_id END
  WHERE id = p_order_id;
  
  -- Prepare notification based on status
  CASE p_new_status
    WHEN 'prepping' THEN
      v_notification_title := 'Order Being Prepared';
      v_notification_message := 'Your order is now being prepared by the kitchen.';
    WHEN 'ready' THEN
      v_notification_title := 'Order Ready for Pickup';
      v_notification_message := 'Your order is ready! Pickup code: ' || COALESCE(v_order.pickup_code, 'N/A');
    WHEN 'picked_up' THEN
      v_notification_title := 'Order Picked Up';
      v_notification_message := 'Your order has been marked as picked up. Enjoy!';
    WHEN 'canceled' THEN
      v_notification_title := 'Order Canceled';
      v_notification_message := 'Your order has been canceled.';
    ELSE
      v_notification_title := 'Order Status Updated';
      v_notification_message := 'Your order status has been updated to: ' || p_new_status;
  END CASE;
  
  -- Send notification to user
  PERFORM create_notification(
    v_order.user_id,
    'order_status_update',
    v_notification_title,
    v_notification_message,
    p_order_id::TEXT,
    'order'
  );
  
  -- Log the action
  PERFORM log_sensitive_action(
    'order_status_updated',
    'order',
    p_order_id::TEXT,
    jsonb_build_object(
      'old_status', v_order.status,
      'new_status', p_new_status,
      'staff_id', p_staff_id,
      'user_id', v_order.user_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_status', p_new_status,
    'vendor_id', v_order.vendor_id
  );
END;
$$;

-- Function: Release expired seat holds
CREATE OR REPLACE FUNCTION public.release_expired_seat_holds()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_holds RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_expired_holds IN
    SELECT * FROM seat_holds
    WHERE expires_at <= NOW()
  LOOP
    -- Release the seat
    UPDATE poker_seats
    SET status = 'open', user_id = NULL, updated_at = NOW()
    WHERE table_id = v_expired_holds.table_id 
    AND seat_no = v_expired_holds.seat_no;
    
    -- Delete the expired hold
    DELETE FROM seat_holds WHERE id = v_expired_holds.id;
    
    -- Notify user
    PERFORM create_notification(
      v_expired_holds.user_id,
      'seat_hold_expired',
      'Seat Hold Expired',
      'Your seat hold has expired. Please rejoin the queue if you still want to play.',
      v_expired_holds.id::TEXT,
      'seat_hold'
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Add missing RLS policies using DO blocks to avoid conflicts

-- Profiles: Users can view all profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view all profiles'
  ) THEN
    CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Profiles: Users can update own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Poker Tourneys: Staff can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'poker_tourneys' 
    AND policyname = 'Staff can manage poker tourneys'
  ) THEN
    CREATE POLICY "Staff can manage poker tourneys"
    ON poker_tourneys FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Poker Tables: Everyone can view open tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'poker_tables' 
    AND policyname = 'Everyone can view open poker tables'
  ) THEN
    CREATE POLICY "Everyone can view open poker tables"
    ON poker_tables FOR SELECT
    TO authenticated
    USING (status = 'open');
  END IF;
END $$;

-- Poker Seats: Everyone can view open seats
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'poker_seats' 
    AND policyname = 'Everyone can view open seats'
  ) THEN
    CREATE POLICY "Everyone can view open seats"
    ON poker_seats FOR SELECT
    TO authenticated
    USING (status = 'open');
  END IF;
END $$;

-- Dining Vendors: Staff can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dining_vendors' 
    AND policyname = 'Staff can manage vendors'
  ) THEN
    CREATE POLICY "Staff can manage vendors"
    ON dining_vendors FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Menu Items: Staff can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'menu_items' 
    AND policyname = 'Staff can manage menu items'
  ) THEN
    CREATE POLICY "Staff can manage menu items"
    ON menu_items FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Events: Staff can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'events' 
    AND policyname = 'Staff can manage events'
  ) THEN
    CREATE POLICY "Staff can manage events"
    ON events FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Promos: Staff can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'promos' 
    AND policyname = 'Staff can manage promos'
  ) THEN
    CREATE POLICY "Staff can manage promos"
    ON promos FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Settings: Admin can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'settings' 
    AND policyname = 'Admin can manage settings'
  ) THEN
    CREATE POLICY "Admin can manage settings"
    ON settings FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Map Pins: Staff can manage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'map_pins' 
    AND policyname = 'Staff can manage map pins'
  ) THEN
    CREATE POLICY "Staff can manage map pins"
    ON map_pins FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Time Entries: Enable RLS and create policies
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'time_entries' 
    AND policyname = 'Staff can view own time entries'
  ) THEN
    CREATE POLICY "Staff can view own time entries"
    ON time_entries FOR SELECT
    TO authenticated
    USING (staff_id IN (SELECT id FROM staff WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'time_entries' 
    AND policyname = 'Staff can insert own time entries'
  ) THEN
    CREATE POLICY "Staff can insert own time entries"
    ON time_entries FOR INSERT
    TO authenticated
    WITH CHECK (staff_id IN (SELECT id FROM staff WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'time_entries' 
    AND policyname = 'Admin can manage all time entries'
  ) THEN
    CREATE POLICY "Admin can manage all time entries"
    ON time_entries FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Seating Maps: Enable RLS and create policies
ALTER TABLE seating_maps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seating_maps' 
    AND policyname = 'Everyone can view seating maps'
  ) THEN
    CREATE POLICY "Everyone can view seating maps"
    ON seating_maps FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seating_maps' 
    AND policyname = 'Staff can manage seating maps'
  ) THEN
    CREATE POLICY "Staff can manage seating maps"
    ON seating_maps FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));
  END IF;
END $$;

-- Stripe Events: Enable RLS
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stripe_events' 
    AND policyname = 'Service can manage stripe events'
  ) THEN
    CREATE POLICY "Service can manage stripe events"
    ON stripe_events FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Webhook Events: Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'webhook_events' 
    AND policyname = 'Service can manage webhook events'
  ) THEN
    CREATE POLICY "Service can manage webhook events"
    ON webhook_events FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.create_poker_seat_hold TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_chip_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_seat_holds TO authenticated;