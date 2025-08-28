-- CRITICAL SECURITY FIX: Remove overly permissive UPDATE policies
-- These policies allow any authenticated user to update sensitive tables

-- Remove dangerous "Service can update" policies that use "Using: true"
DROP POLICY IF EXISTS "Service can update etg tables" ON public.etg_tables;
DROP POLICY IF EXISTS "Service can update event tickets" ON public.event_tickets;  
DROP POLICY IF EXISTS "Service can update poker entries" ON public.poker_entries;
DROP POLICY IF EXISTS "Service can update poker table players" ON public.poker_table_players;
DROP POLICY IF EXISTS "Service can update poker tables" ON public.poker_tables;
DROP POLICY IF EXISTS "Service can update slots" ON public.slots;

-- Add safer staff-only policies for tables that need client updates
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Add profile protection trigger to prevent users from modifying sensitive fields
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to update anything
  IF has_role(auth.uid(), 'Admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Prevent regular users from updating sensitive fields
  IF OLD.tier IS DISTINCT FROM NEW.tier THEN
    RAISE EXCEPTION 'Only administrators can modify user tier';
  END IF;
  
  IF OLD.points IS DISTINCT FROM NEW.points THEN
    RAISE EXCEPTION 'Only administrators can modify user points';
  END IF;
  
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    RAISE EXCEPTION 'Only administrators can modify KYC status';
  END IF;
  
  IF OLD.age_verified IS DISTINCT FROM NEW.age_verified THEN
    RAISE EXCEPTION 'Only administrators can modify age verification status';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the protection trigger
CREATE TRIGGER protect_sensitive_profile_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();