-- CREATE MISSING TABLES FOR COMPLETE CASINO SYSTEM

-- 1. Player sessions table - track active gaming sessions
CREATE TABLE public.player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_id TEXT,
  game_type TEXT NOT NULL, -- 'poker', 'slots', 'etg', etc.
  session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end TIMESTAMPTZ,
  total_buy_in INTEGER DEFAULT 0,
  total_cash_out INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'ended', 'paused'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Wallet transactions table - track all money movements
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'bonus', 'cashout', 'buyin'
  amount INTEGER NOT NULL, -- in cents
  description TEXT,
  reference_id TEXT, -- stripe payment intent, voucher id, etc.
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Game history table - track individual game outcomes
CREATE TABLE public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  table_id TEXT,
  session_id UUID REFERENCES public.player_sessions(id),
  bet_amount INTEGER,
  payout_amount INTEGER DEFAULT 0,
  outcome TEXT, -- 'win', 'loss', 'push', 'fold'
  game_data JSONB, -- store game-specific data
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Player preferences table - user settings and preferences  
CREATE TABLE public.player_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  auto_rebuy BOOLEAN DEFAULT false,
  default_tip_percentage INTEGER DEFAULT 15,
  notification_settings JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Support tickets table - customer service
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  assigned_to_staff_id UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Loyalty point transactions table - track points earning/spending
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points_change INTEGER NOT NULL, -- positive for earning, negative for spending  
  transaction_type TEXT NOT NULL, -- 'earned_play', 'earned_bonus', 'redeemed_comp', 'redeemed_cashback'
  description TEXT,
  reference_id UUID, -- game session, voucher, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);