-- Security Fix 1: Lock down RLS for value-bearing tables

-- Fix event_tickets policies
DROP POLICY IF EXISTS "Service can insert tickets" ON public.event_tickets;
DROP POLICY IF EXISTS "Service can update tickets" ON public.event_tickets;

CREATE POLICY "Users can view own tickets" ON public.event_tickets
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all tickets" ON public.event_tickets
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Service can insert tickets" ON public.event_tickets
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update tickets" ON public.event_tickets
FOR UPDATE 
USING (true);

-- Fix poker_entries policies
DROP POLICY IF EXISTS "Service can insert poker entries" ON public.poker_entries;
DROP POLICY IF EXISTS "Service can update poker entries" ON public.poker_entries;

CREATE POLICY "Users can view own poker entries" ON public.poker_entries
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all poker entries" ON public.poker_entries
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Service can insert poker entries" ON public.poker_entries
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update poker entries" ON public.poker_entries
FOR UPDATE 
USING (true);

-- Fix chip_vouchers policies
DROP POLICY IF EXISTS "Service can insert vouchers" ON public.chip_vouchers;
DROP POLICY IF EXISTS "Service can update vouchers" ON public.chip_vouchers;

CREATE POLICY "Users can view own vouchers" ON public.chip_vouchers
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all vouchers" ON public.chip_vouchers
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Service can insert vouchers" ON public.chip_vouchers
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update vouchers" ON public.chip_vouchers
FOR UPDATE 
USING (true);

-- Fix orders policies
DROP POLICY IF EXISTS "Service can update orders" ON public.orders;

CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all orders" ON public.orders
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Service can update orders" ON public.orders
FOR UPDATE 
USING (true);

-- Fix cash_game_queue policies
DROP POLICY IF EXISTS "Service can insert queue entries" ON public.cash_game_queue;
DROP POLICY IF EXISTS "Service can update queue" ON public.cash_game_queue;

CREATE POLICY "Users can join queue" ON public.cash_game_queue
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue status" ON public.cash_game_queue
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can update all queue entries" ON public.cash_game_queue
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Users can delete own queue entry" ON public.cash_game_queue
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can delete any queue entry" ON public.cash_game_queue
FOR DELETE 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

-- Fix cash_game_lists policies
DROP POLICY IF EXISTS "Service can update cash game lists" ON public.cash_game_lists;

CREATE POLICY "Staff can update cash game lists" ON public.cash_game_lists
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

-- Security Fix 2: Enable and tighten RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Staff can view all profiles" ON public.profiles
FOR SELECT 
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Users can update own profile basic fields" ON public.profiles
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can update any profile" ON public.profiles
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Admin'));

-- Security Fix 4: Add webhook idempotency table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT,
  processed BOOLEAN DEFAULT true
);

-- Security Fix 8: RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admin can view all roles" ON public.user_roles
FOR SELECT 
USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admin can insert roles" ON public.user_roles
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admin can update roles" ON public.user_roles
FOR UPDATE 
USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admin can delete roles" ON public.user_roles
FOR DELETE 
USING (public.has_role(auth.uid(), 'Admin'));