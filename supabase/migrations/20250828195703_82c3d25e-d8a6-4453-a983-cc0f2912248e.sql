-- FIX FUNCTION SEARCH PATH SECURITY WARNINGS

-- Fix the functions with proper search paths
CREATE OR REPLACE FUNCTION public.log_sensitive_action(
  action_type TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}'
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    staff_id,
    event_type,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    CASE WHEN has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role) 
         THEN auth.uid() ELSE NULL END,
    action_type,
    resource_type,
    resource_id,
    details,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_permission(
  required_role app_role,
  resource_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always allow access to own resources
  IF resource_user_id IS NOT NULL AND auth.uid() = resource_user_id THEN
    RETURN true;
  END IF;
  
  -- Check role-based access
  RETURN has_role(auth.uid(), required_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;