-- Marketing Campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  segment_filter JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'canceled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shift Management
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_hours DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty Rewards Catalog
CREATE TABLE public.rewards_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_play', 'tournament_entry', 'dining_credit', 'chip_voucher')),
  points_cost INTEGER NOT NULL,
  monetary_value INTEGER,
  min_tier TEXT CHECK (min_tier IN ('User', 'Staff', 'Admin')),
  active BOOLEAN DEFAULT true,
  stock_qty INTEGER,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.rewards_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards_catalog(id),
  points_spent INTEGER NOT NULL,
  voucher_id UUID REFERENCES public.chip_vouchers(id),
  tournament_entry_id UUID REFERENCES public.poker_entries(id),
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'canceled'))
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Campaigns
CREATE POLICY "Admin can manage campaigns"
  ON public.campaigns FOR ALL
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Staff can view campaigns"
  ON public.campaigns FOR SELECT
  USING (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admin can view recipients"
  ON public.campaign_recipients FOR SELECT
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- RLS Policies for Shifts
CREATE POLICY "Admin can manage all shifts"
  ON public.shifts FOR ALL
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Staff can view own shifts"
  ON public.shifts FOR SELECT
  USING (staff_id IN (SELECT id FROM public.staff WHERE auth_user_id = auth.uid()));

-- RLS Policies for Time Entries
CREATE POLICY "Admin can view all time entries"
  ON public.time_entries FOR SELECT
  USING (has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Staff can manage own time entries"
  ON public.time_entries FOR ALL
  USING (staff_id IN (SELECT id FROM public.staff WHERE auth_user_id = auth.uid()));

-- RLS Policies for Rewards Catalog
CREATE POLICY "Anyone can view active rewards"
  ON public.rewards_catalog FOR SELECT
  USING (active = true);

CREATE POLICY "Admin can manage rewards catalog"
  ON public.rewards_catalog FOR ALL
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- RLS Policies for Rewards Redemptions
CREATE POLICY "Users can view own redemptions"
  ON public.rewards_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert redemptions"
  ON public.rewards_redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view all redemptions"
  ON public.rewards_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- Triggers
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate total hours
CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    -- Subtract break time if exists
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.total_hours := NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hours_trigger
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_hours();