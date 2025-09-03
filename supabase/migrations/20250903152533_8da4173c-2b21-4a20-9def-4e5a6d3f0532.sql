-- Security hardening: Tighten RLS policies for sensitive data tables

-- 1. Harden profiles table policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;

-- Ensure profiles table has the most restrictive policies
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

CREATE POLICY "Admin can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'Admin'::app_role));

-- 2. Harden wallet_transactions policies - remove broad service access
DROP POLICY IF EXISTS "Service can manage transactions" ON public.wallet_transactions;

-- Replace with more restrictive service policies
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

-- 4. Add additional security constraints for payment tables
-- Ensure chip_vouchers can only be updated by service for status changes
DROP POLICY IF EXISTS "Service can update vouchers" ON public.chip_vouchers;

CREATE POLICY "Service can update voucher status only" 
ON public.chip_vouchers 
FOR UPDATE 
USING (status IN ('pending', 'paid')) 
WITH CHECK (status IN ('redeemed', 'canceled', 'refunded'));

-- Ensure event_tickets can only be updated for redemption
DROP POLICY IF EXISTS "Service can update tickets" ON public.event_tickets;

CREATE POLICY "Service can update ticket status only" 
ON public.event_tickets 
FOR UPDATE 
USING (status IN ('pending', 'paid')) 
WITH CHECK (status IN ('redeemed', 'canceled', 'refunded'));

-- Add audit trigger for sensitive profile changes
CREATE OR REPLACE FUNCTION audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.points IS DISTINCT FROM NEW.points OR 
     OLD.tier IS DISTINCT FROM NEW.tier OR 
     OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    
    INSERT INTO public.audit_logs (
      user_id,
      staff_id,
      event_type,
      resource_type,
      resource_id,
      details
    ) VALUES (
      NEW.id,
      CASE WHEN auth.uid() != NEW.id THEN auth.uid() ELSE NULL END,
      'profile_sensitive_update',
      'profile',
      NEW.id::text,
      jsonb_build_object(
        'points_changed', OLD.points IS DISTINCT FROM NEW.points,
        'tier_changed', OLD.tier IS DISTINCT FROM NEW.tier,
        'kyc_changed', OLD.kyc_status IS DISTINCT FROM NEW.kyc_status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_profile_sensitive_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_changes();