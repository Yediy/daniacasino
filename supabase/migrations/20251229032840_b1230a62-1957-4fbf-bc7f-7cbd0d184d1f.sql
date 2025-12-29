-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add a temporary column for the hashed PIN
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Hash all existing plaintext PINs using bcrypt
UPDATE public.staff 
SET pin_hash = crypt(pin_code, gen_salt('bf')) 
WHERE pin_code IS NOT NULL AND pin_hash IS NULL;

-- Drop the old plaintext column and rename the hash column
ALTER TABLE public.staff DROP COLUMN IF EXISTS pin_code;
ALTER TABLE public.staff RENAME COLUMN pin_hash TO pin_code;

-- Create a function to verify staff PIN codes securely
CREATE OR REPLACE FUNCTION public.verify_staff_pin(
  p_staff_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  -- Get the stored hash for this staff member
  SELECT pin_code INTO v_stored_hash
  FROM public.staff
  WHERE id = p_staff_id;
  
  IF v_stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify the PIN against the stored hash
  RETURN v_stored_hash = crypt(p_pin, v_stored_hash);
END;
$$;

-- Create a function to set/update a staff PIN (hashes it before storing)
CREATE OR REPLACE FUNCTION public.set_staff_pin(
  p_staff_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT has_role(auth.uid(), 'Admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can set staff PINs';
  END IF;
  
  -- Validate PIN format (4 digits)
  IF p_pin IS NULL OR length(p_pin) != 4 OR p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;
  
  -- Hash and store the PIN
  UPDATE public.staff
  SET pin_code = crypt(p_pin, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_staff_id;
  
  -- Log the PIN change (not the actual PIN)
  INSERT INTO public.audit_logs (
    staff_id,
    event_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    'staff_pin_changed',
    'staff',
    p_staff_id::text,
    jsonb_build_object('changed_by', auth.uid(), 'changed_at', now())
  );
  
  RETURN TRUE;
END;
$$;

-- Grant execute on the functions
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(UUID, TEXT) TO authenticated;