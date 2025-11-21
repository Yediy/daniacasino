-- ============================================================================
-- SECURITY FIXES + SCHEMA ENHANCEMENTS FOR DANIA CASINO OPERATIONS SUITE
-- ============================================================================

-- PART 1: FIX CRITICAL SECURITY ISSUES
-- ============================================================================

-- 1.1: Make audit logs immutable (Security Fix)
DROP POLICY IF EXISTS "Prevent audit log modifications" ON public.audit_logs;
CREATE POLICY "Prevent audit log modifications"
ON public.audit_logs FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "Prevent audit log deletions" ON public.audit_logs;
CREATE POLICY "Prevent audit log deletions"
ON public.audit_logs FOR DELETE
USING (false);

-- 1.2: Remove overly broad staff profile access and replace with restricted access
DROP POLICY IF EXISTS "Staff can view all profiles for support" ON public.profiles;

-- Staff can only view profiles for users with active support tickets assigned to them
DROP POLICY IF EXISTS "Staff can view profiles for assigned tickets" ON public.profiles;
CREATE POLICY "Staff can view profiles for assigned tickets"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'Staff'::app_role) 
  AND id IN (
    SELECT user_id FROM public.support_tickets 
    WHERE assigned_to_staff_id = auth.uid() 
    AND status != 'resolved'
  )
);

-- Admins still have full access
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'Admin'::app_role));


-- PART 2: ADD MISSING CORE TABLES
-- ============================================================================

-- 2.1: Staff table (maps staff members with roles and PINs)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('staff_kitchen', 'staff_floor', 'staff_poker', 'admin', 'super_admin')),
  full_name TEXT NOT NULL,
  email TEXT,
  pin_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own record" ON public.staff;
CREATE POLICY "Staff can view own record"
ON public.staff FOR SELECT
USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admin can manage all staff" ON public.staff;
CREATE POLICY "Admin can manage all staff"
ON public.staff FOR ALL
USING (has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON public.staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);


-- 2.2: Seat holds table (temporary holds when calling players from queue)
CREATE TABLE IF NOT EXISTS public.seat_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  seat_no INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seat_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own seat holds" ON public.seat_holds;
CREATE POLICY "Users can view own seat holds"
ON public.seat_holds FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can manage seat holds" ON public.seat_holds;
CREATE POLICY "Staff can manage seat holds"
ON public.seat_holds FOR ALL
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_seat_holds_table_expires ON public.seat_holds(table_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_holds_user ON public.seat_holds(user_id);


-- 2.3: Slot banks table (aggregated view of slot machine banks)
CREATE TABLE IF NOT EXISTS public.slot_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank TEXT NOT NULL,
  room TEXT,
  total_slots INTEGER NOT NULL DEFAULT 0,
  free_slots INTEGER NOT NULL DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_banks_unique_room_bank UNIQUE(room, bank)
);

ALTER TABLE public.slot_banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view slot banks" ON public.slot_banks;
CREATE POLICY "Anyone can view slot banks"
ON public.slot_banks FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service can update slot banks" ON public.slot_banks;
CREATE POLICY "Service can update slot banks"
ON public.slot_banks FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_slot_banks_room_bank ON public.slot_banks(room, bank);


-- 2.4: Seating maps table (seat map images for events/venues)
CREATE TABLE IF NOT EXISTS public.seating_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  image_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seating_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view seating maps" ON public.seating_maps;
CREATE POLICY "Anyone can view seating maps"
ON public.seating_maps FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin can manage seating maps" ON public.seating_maps;
CREATE POLICY "Admin can manage seating maps"
ON public.seating_maps FOR ALL
USING (has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_seating_maps_event ON public.seating_maps(event_id);


-- 2.5: Enhanced vouchers - add columns to chip_vouchers
ALTER TABLE public.chip_vouchers 
ADD COLUMN IF NOT EXISTS voucher_type TEXT NOT NULL DEFAULT 'CHIP';

ALTER TABLE public.chip_vouchers 
ADD COLUMN IF NOT EXISTS tourney_id UUID;

ALTER TABLE public.chip_vouchers
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraint for voucher_type
DO $$ 
BEGIN
  ALTER TABLE public.chip_vouchers 
  ADD CONSTRAINT chip_vouchers_type_check 
  CHECK (voucher_type IN ('CHIP', 'TOURNEY_ENTRY', 'FOOD', 'PROMO'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- PART 3: ADD HELPER FUNCTIONS FOR OPERATIONS
-- ============================================================================

-- 3.1: Function to get poker tables with seat availability
CREATE OR REPLACE FUNCTION public.get_poker_tables_with_seats()
RETURNS TABLE(
  table_id TEXT,
  table_name TEXT,
  game TEXT,
  stakes TEXT,
  max_seats INTEGER,
  open_seats INTEGER,
  occupied_seats INTEGER,
  queue_length INTEGER,
  status TEXT
) AS $$
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
    pt.wait_count as queue_length,
    pt.status
  FROM public.poker_tables pt
  WHERE pt.status = 'open'
  ORDER BY pt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3.2: Function to update slot bank aggregates
CREATE OR REPLACE FUNCTION public.update_slot_bank_aggregate(p_room TEXT, p_bank TEXT)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_free INTEGER;
  v_avg_lat DOUBLE PRECISION;
  v_avg_lng DOUBLE PRECISION;
BEGIN
  -- Calculate aggregates
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'free'),
    AVG(lat),
    AVG(lng)
  INTO v_total, v_free, v_avg_lat, v_avg_lng
  FROM public.slots
  WHERE room = p_room AND bank = p_bank;

  -- Upsert into slot_banks
  INSERT INTO public.slot_banks (room, bank, total_slots, free_slots, lat, lng, updated_at)
  VALUES (p_room, p_bank, v_total, v_free, v_avg_lat, v_avg_lng, now())
  ON CONFLICT (room, bank) 
  DO UPDATE SET
    total_slots = EXCLUDED.total_slots,
    free_slots = EXCLUDED.free_slots,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3.3: Trigger to auto-update slot banks when slots change
CREATE OR REPLACE FUNCTION public.trigger_update_slot_bank()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_slot_bank_aggregate(OLD.room, OLD.bank);
    RETURN OLD;
  ELSE
    PERFORM update_slot_bank_aggregate(NEW.room, NEW.bank);
    -- If room or bank changed in UPDATE, update old location too
    IF TG_OP = 'UPDATE' AND (OLD.room IS DISTINCT FROM NEW.room OR OLD.bank IS DISTINCT FROM NEW.bank) THEN
      PERFORM update_slot_bank_aggregate(OLD.room, OLD.bank);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_slots_update_bank ON public.slots;
CREATE TRIGGER trigger_slots_update_bank
AFTER INSERT OR UPDATE OR DELETE ON public.slots
FOR EACH ROW
EXECUTE FUNCTION trigger_update_slot_bank();


-- 3.4: Add updated_at trigger to new tables
DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;
CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_slot_banks_updated_at ON public.slot_banks;
CREATE TRIGGER update_slot_banks_updated_at
BEFORE UPDATE ON public.slot_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- PART 4: ENHANCE EXISTING TABLES
-- ============================================================================

-- 4.1: Add external_player_id to profiles for casino system integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS external_player_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_external_player_id ON public.profiles(external_player_id) WHERE external_player_id IS NOT NULL;

-- 4.2: Add marketing_opt_in to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

-- 4.3: Add destination fields to orders for table/seat delivery
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS dest_table TEXT;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS dest_seat TEXT;

-- 4.4: Add name_cache to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS name_cache TEXT;


-- PART 5: GRANT APPROPRIATE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_poker_tables_with_seats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_slot_bank_aggregate(TEXT, TEXT) TO authenticated;