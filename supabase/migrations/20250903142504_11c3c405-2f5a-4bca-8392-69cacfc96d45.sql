-- Security hardening: Add audit logging for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes with full context
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      staff_id, 
      event_type,
      resource_type,
      resource_id,
      details
    ) VALUES (
      NEW.user_id,
      NEW.created_by,
      'role_assigned',
      'user_role',
      NEW.id::text,
      jsonb_build_object(
        'new_role', NEW.role,
        'assigned_to', NEW.user_id,
        'assigned_by', NEW.created_by
      )
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      staff_id,
      event_type, 
      resource_type,
      resource_id,
      details
    ) VALUES (
      OLD.user_id,
      auth.uid(),
      'role_removed',
      'user_role', 
      OLD.id::text,
      jsonb_build_object(
        'removed_role', OLD.role,
        'removed_from', OLD.user_id
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for role change auditing
CREATE TRIGGER audit_user_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

-- Security hardening: Create secure notification channels
-- Replace broadcast with targeted database events
CREATE OR REPLACE FUNCTION public.notify_wallet_update(target_user_id uuid, event_data jsonb)
RETURNS void AS $$
BEGIN
  -- Insert a notification record that clients can subscribe to
  INSERT INTO public.wallet_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    status,
    reference_id
  ) VALUES (
    target_user_id,
    'system_notification',
    0,
    event_data->>'message',
    'completed',
    event_data->>'reference_id'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Security hardening: Add XSS protection function
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potential XSS characters and encode HTML entities
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '<[^>]*>', '', 'g'),
        '&', '&amp;', 'g'
      ),
      '"', '&quot;', 'g'
    ),
    '''', '&#x27;', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;