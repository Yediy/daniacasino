-- Fix security linter: Set search_path for functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';