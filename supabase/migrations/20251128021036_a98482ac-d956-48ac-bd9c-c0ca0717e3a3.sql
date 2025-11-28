-- Fix function search path for calculate_elo_change
CREATE OR REPLACE FUNCTION public.calculate_elo_change(player_rating integer, opponent_rating integer, result numeric, k_factor integer DEFAULT 32)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
DECLARE
  expected_score NUMERIC;
  rating_change INTEGER;
BEGIN
  expected_score := 1.0 / (1.0 + POWER(10.0, (opponent_rating - player_rating) / 400.0));
  rating_change := ROUND(k_factor * (result - expected_score));
  RETURN rating_change;
END;
$function$;

-- Add audit logging function for financial table access by staff
CREATE OR REPLACE FUNCTION public.log_financial_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only log if user is staff accessing data that isn't their own
  IF has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role) THEN
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
      CASE WHEN TG_TABLE_NAME = 'wallet_transactions' THEN NEW.user_id ELSE NULL END,
      auth.uid(),
      'financial_data_access',
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'accessed_by', auth.uid()
      ),
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create triggers for audit logging on financial tables (for SELECT via RLS policy enforcement)
-- Note: Standard triggers don't fire on SELECT, so we use statement-level logging via RLS policy modification
-- Instead, we'll add explicit audit logging when staff queries these tables via a wrapper function

-- Create a secure function for staff to query financial data with automatic logging
CREATE OR REPLACE FUNCTION public.get_financial_transactions_with_audit(p_table_name text, p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify staff/admin role
  IF NOT (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Staff or Admin role required';
  END IF;

  -- Log the access
  INSERT INTO public.audit_logs (
    staff_id,
    event_type,
    resource_type,
    details
  ) VALUES (
    auth.uid(),
    'financial_data_bulk_access',
    p_table_name,
    jsonb_build_object(
      'table', p_table_name,
      'limit', p_limit,
      'accessed_at', now()
    )
  );

  -- Return data based on table name
  CASE p_table_name
    WHEN 'wallet_transactions' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_result
      FROM (SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT p_limit) t;
    WHEN 'orders' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_result
      FROM (SELECT * FROM orders ORDER BY placed_at DESC LIMIT p_limit) t;
    WHEN 'event_tickets' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_result
      FROM (SELECT * FROM event_tickets ORDER BY issued_at DESC LIMIT p_limit) t;
    WHEN 'chip_vouchers' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_result
      FROM (SELECT * FROM chip_vouchers ORDER BY created_at DESC LIMIT p_limit) t;
    WHEN 'poker_entries' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_result
      FROM (SELECT * FROM poker_entries ORDER BY issued_at DESC LIMIT p_limit) t;
    ELSE
      RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END CASE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;