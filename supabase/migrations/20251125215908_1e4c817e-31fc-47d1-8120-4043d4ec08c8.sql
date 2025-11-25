-- Support chat messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'staff')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_created ON public.support_messages(created_at);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support messages
CREATE POLICY "Users can view messages from their tickets"
  ON public.support_messages FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_type = 'user' AND
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all messages"
  ON public.support_messages FOR SELECT
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Staff can send messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role)
  );

-- Player activity tracking for heatmap analytics
CREATE TABLE IF NOT EXISTS public.player_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_created ON public.player_activity_log(created_at);
CREATE INDEX idx_activity_log_type ON public.player_activity_log(activity_type);
CREATE INDEX idx_activity_log_user ON public.player_activity_log(user_id);

ALTER TABLE public.player_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can insert activity logs"
  ON public.player_activity_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can view activity logs"
  ON public.player_activity_log FOR SELECT
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Tournament brackets and standings
CREATE TABLE IF NOT EXISTS public.tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourney_id UUID NOT NULL REFERENCES public.poker_tourneys(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES public.profiles(id),
  player2_id UUID REFERENCES public.profiles(id),
  winner_id UUID REFERENCES public.profiles(id),
  player1_chips INTEGER DEFAULT 0,
  player2_chips INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournament_brackets_tourney ON public.tournament_brackets(tourney_id);
CREATE INDEX idx_tournament_brackets_round ON public.tournament_brackets(round_number);

ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tournament brackets"
  ON public.tournament_brackets FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage brackets"
  ON public.tournament_brackets FOR ALL
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Tournament standings
CREATE TABLE IF NOT EXISTS public.tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourney_id UUID NOT NULL REFERENCES public.poker_tourneys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  rank INTEGER NOT NULL,
  prize_amount INTEGER DEFAULT 0,
  eliminated_at TIMESTAMPTZ,
  final_chips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tourney_id, user_id)
);

CREATE INDEX idx_tournament_standings_tourney ON public.tournament_standings(tourney_id);
CREATE INDEX idx_tournament_standings_rank ON public.tournament_standings(rank);

ALTER TABLE public.tournament_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tournament standings"
  ON public.tournament_standings FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage standings"
  ON public.tournament_standings FOR ALL
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

-- Loyalty tier benefits and achievements
CREATE TABLE IF NOT EXISTS public.tier_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('User', 'Staff', 'Admin')),
  benefit_type TEXT NOT NULL,
  benefit_name TEXT NOT NULL,
  benefit_description TEXT,
  benefit_value JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tier_benefits_tier ON public.tier_benefits(tier);

ALTER TABLE public.tier_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tier benefits"
  ON public.tier_benefits FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage tier benefits"
  ON public.tier_benefits FOR ALL
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- Player achievements
CREATE TABLE IF NOT EXISTS public.player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT,
  points_awarded INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_achievements_user ON public.player_achievements(user_id);
CREATE INDEX idx_achievements_earned ON public.player_achievements(earned_at);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.player_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all achievements"
  ON public.player_achievements FOR SELECT
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Service can insert achievements"
  ON public.player_achievements FOR INSERT
  WITH CHECK (true);

-- Add realtime publication for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_brackets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_standings;