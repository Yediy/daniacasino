-- FINAL SECURITY HARDENING AND MISSING COMPONENTS

-- Add additional security functions for audit logging
CREATE OR REPLACE FUNCTION public.log_sensitive_action(
  action_type TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}'
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to validate user permissions
CREATE OR REPLACE FUNCTION public.check_user_permission(
  required_role app_role,
  resource_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Always allow access to own resources
  IF resource_user_id IS NOT NULL AND auth.uid() = resource_user_id THEN
    RETURN true;
  END IF;
  
  -- Check role-based access
  RETURN has_role(auth.uid(), required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add update triggers for timestamp management
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_player_sessions_updated_at
    BEFORE UPDATE ON public.player_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_player_preferences_updated_at
    BEFORE UPDATE ON public.player_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_player_sessions_user_id ON public.player_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_status ON public.player_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_session_id ON public.game_history(session_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);