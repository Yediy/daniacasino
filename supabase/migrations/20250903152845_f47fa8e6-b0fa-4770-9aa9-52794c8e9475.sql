-- Security hardening: Tighten RLS policies for sensitive data tables (fixed)

-- 1. Harden profiles table policies - drop all existing and recreate
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile basic fields" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;

-- Create restrictive profile policies
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Staff can view all profiles for support" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'Admin'::app_role));

-- 2. Harden wallet_transactions policies
DROP POLICY IF EXISTS "Service can manage transactions" ON public.wallet_transactions;

CREATE POLICY "Service can insert transactions" 
ON public.wallet_transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update transaction status" 
ON public.wallet_transactions 
FOR UPDATE 
USING (status IN ('pending', 'processing')) 
WITH CHECK (status IN ('completed', 'failed', 'canceled'));

-- 3. Harden game_history policies
DROP POLICY IF EXISTS "Service can manage game history" ON public.game_history;

CREATE POLICY "Service can insert game history" 
ON public.game_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update game outcomes" 
ON public.game_history 
FOR UPDATE 
USING (outcome IS NULL) 
WITH CHECK (outcome IS NOT NULL);

-- 4. Harden payment table policies
DROP POLICY IF EXISTS "Service can update vouchers" ON public.chip_vouchers;
DROP POLICY IF EXISTS "Service can update tickets" ON public.event_tickets;

CREATE POLICY "Service can update voucher status only" 
ON public.chip_vouchers 
FOR UPDATE 
USING (status IN ('pending', 'paid')) 
WITH CHECK (status IN ('redeemed', 'canceled', 'refunded'));

CREATE POLICY "Service can update ticket status only" 
ON public.event_tickets 
FOR UPDATE 
USING (status IN ('pending', 'paid')) 
WITH CHECK (status IN ('redeemed', 'canceled', 'refunded'));