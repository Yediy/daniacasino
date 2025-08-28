-- CRITICAL SECURITY FIX: Enable RLS and create policies for new tables

-- Enable RLS on all new tables
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for player_sessions
CREATE POLICY "Users can view own sessions" ON public.player_sessions
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.player_sessions
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.player_sessions
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all sessions" ON public.player_sessions
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Service can manage sessions" ON public.player_sessions
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for wallet_transactions  
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all transactions" ON public.wallet_transactions
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Service can manage transactions" ON public.wallet_transactions
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for game_history
CREATE POLICY "Users can view own game history" ON public.game_history
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all game history" ON public.game_history
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Service can manage game history" ON public.game_history
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for player_preferences
CREATE POLICY "Users can manage own preferences" ON public.player_preferences
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all preferences" ON public.player_preferences
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Create RLS policies for support_tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON public.support_tickets
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can manage all tickets" ON public.support_tickets
FOR ALL 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Create RLS policies for loyalty_transactions
CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all loyalty transactions" ON public.loyalty_transactions
FOR SELECT 
USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Service can manage loyalty transactions" ON public.loyalty_transactions
FOR ALL 
USING (true)
WITH CHECK (true);