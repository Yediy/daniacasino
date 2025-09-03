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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS audit_profile_sensitive_changes ON public.profiles;

-- Create trigger for auditing sensitive profile changes
CREATE TRIGGER audit_profile_sensitive_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_changes();