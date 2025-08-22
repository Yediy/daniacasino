-- Create comprehensive casino app database schema

-- Users profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  dob DATE,
  tier TEXT DEFAULT 'Standard',
  points INTEGER DEFAULT 0,
  kyc_status TEXT DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified')),
  age_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('concert', 'comedy', 'tribute', 'special')),
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  venue TEXT NOT NULL,
  price INTEGER NOT NULL, -- in cents
  fee INTEGER DEFAULT 0,
  inventory INTEGER NOT NULL,
  hero_img TEXT,
  description TEXT,
  onsale BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event tickets table
CREATE TABLE public.event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL, -- total amount in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'redeemed')),
  barcode TEXT,
  barcode_format TEXT DEFAULT 'PDF417',
  stripe_payment_intent_id TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poker tournaments table
CREATE TABLE public.poker_tourneys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tournament_date DATE NOT NULL,
  tournament_time TIME NOT NULL,
  buyin INTEGER NOT NULL, -- in cents
  fee INTEGER DEFAULT 0,
  late_reg_until TIMESTAMPTZ,
  seats_total INTEGER NOT NULL,
  seats_left INTEGER NOT NULL,
  structure_pdf TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poker entries table
CREATE TABLE public.poker_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tourney_id UUID NOT NULL REFERENCES public.poker_tourneys(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- buyin + fee in cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'seated', 'refunded', 'redeemed')),
  barcode TEXT,
  barcode_format TEXT DEFAULT 'PDF417',
  will_call_window_start TIMESTAMPTZ,
  will_call_window_end TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cash game lists table
CREATE TABLE public.cash_game_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL, -- e.g., '1/3 NL', '2/5 NL', 'PLO', etc.
  table_max INTEGER DEFAULT 9,
  open_seats INTEGER DEFAULT 0,
  wait_count INTEGER DEFAULT 0,
  list_status TEXT DEFAULT 'open' CHECK (list_status IN ('open', 'paused', 'closed')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cash game queue table
CREATE TABLE public.cash_game_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.cash_game_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  checkin_status TEXT DEFAULT 'remote' CHECK (checkin_status IN ('remote', 'on_site')),
  hold_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chip vouchers table
CREATE TABLE public.chip_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in cents
  fee INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'redeemed', 'expired', 'refunded')),
  barcode TEXT,
  barcode_format TEXT DEFAULT 'Code128',
  redeem_window_start TIMESTAMPTZ,
  redeem_window_end TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dining vendors table
CREATE TABLE public.dining_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  hours JSONB, -- store hours as JSON
  menu_url TEXT,
  accepts_mobile_orders BOOLEAN DEFAULT true,
  prep_minutes INTEGER DEFAULT 15,
  pickup_counter_code TEXT,
  active BOOLEAN DEFAULT true
);

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.dining_vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in cents
  image TEXT,
  tags TEXT[], -- array of tags like 'vegan', 'gf', 'spicy', 'popular'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.dining_vendors(id) ON DELETE CASCADE,
  subtotal INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  tip INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'cart' CHECK (status IN ('cart', 'placed', 'accepted', 'prepping', 'ready', 'picked_up', 'cancelled')),
  pickup_eta TIMESTAMPTZ,
  pickup_code TEXT,
  stripe_payment_intent_id TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  notes TEXT
);

-- Promotions table
CREATE TABLE public.promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  details TEXT,
  terms_url TEXT,
  image TEXT,
  segments TEXT[] DEFAULT ARRAY['all'], -- 'all', 'vip', 'locals'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  support_phone TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  rg_url TEXT,
  hotline_text TEXT,
  cash_game_hold_minutes INTEGER DEFAULT 15,
  min_chip_voucher INTEGER DEFAULT 2000, -- $20 in cents
  max_chip_voucher INTEGER DEFAULT 100000, -- $1000 in cents
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Map pins table
CREATE TABLE public.map_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrance', 'valet', 'poker', 'stage', 'restaurant', 'parking')),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  info TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_tourneys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_game_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_game_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chip_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_pins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for public read tables (events, tourneys, vendors, etc.)
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Poker tourneys are viewable by everyone" ON public.poker_tourneys FOR SELECT USING (true);
CREATE POLICY "Cash game lists are viewable by everyone" ON public.cash_game_lists FOR SELECT USING (true);
CREATE POLICY "Dining vendors are viewable by everyone" ON public.dining_vendors FOR SELECT USING (true);
CREATE POLICY "Menu items are viewable by everyone" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Promos are viewable by everyone" ON public.promos FOR SELECT USING (true);
CREATE POLICY "Settings are viewable by everyone" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Map pins are viewable by everyone" ON public.map_pins FOR SELECT USING (true);

-- RLS Policies for user-specific tables
CREATE POLICY "Users can view own tickets" ON public.event_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own poker entries" ON public.poker_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own queue position" ON public.cash_game_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own vouchers" ON public.chip_vouchers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- Insert policies for user transactions (edge functions will use service role)
CREATE POLICY "Service can insert tickets" ON public.event_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert poker entries" ON public.poker_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert queue entries" ON public.cash_game_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert vouchers" ON public.chip_vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Update policies for service operations
CREATE POLICY "Service can update tickets" ON public.event_tickets FOR UPDATE USING (true);
CREATE POLICY "Service can update poker entries" ON public.poker_entries FOR UPDATE USING (true);
CREATE POLICY "Service can update queue" ON public.cash_game_queue FOR UPDATE USING (true);
CREATE POLICY "Service can update vouchers" ON public.chip_vouchers FOR UPDATE USING (true);
CREATE POLICY "Service can update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Service can update cash game lists" ON public.cash_game_lists FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cash_game_lists_updated_at BEFORE UPDATE ON public.cash_game_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

-- Insert sample data for cash game lists
INSERT INTO public.cash_game_lists (game, table_max, open_seats, wait_count) VALUES
('1/3 No Limit Hold''em', 9, 3, 2),
('2/5 No Limit Hold''em', 9, 1, 5),
('1/2 Pot Limit Omaha', 8, 2, 1),
('5/10 No Limit Hold''em', 9, 0, 3);

-- Insert sample dining vendors
INSERT INTO public.dining_vendors (name, location, hours, prep_minutes, pickup_counter_code, accepts_mobile_orders) VALUES
('The Grill', 'Main Gaming Floor', '{"weekday": "11:00 AM - 11:00 PM", "weekend": "11:00 AM - 12:00 AM"}', 20, 'GRILL', true),
('Café 954', 'Near Poker Room', '{"weekday": "6:00 AM - 2:00 AM", "weekend": "24 Hours"}', 10, 'CAFE', true),
('Sports Bar', 'Stage 954 Area', '{"weekday": "12:00 PM - 2:00 AM", "weekend": "12:00 PM - 3:00 AM"}', 15, 'BAR', true);

-- Insert sample menu items
INSERT INTO public.menu_items (vendor_id, name, description, price, tags) VALUES
((SELECT id FROM public.dining_vendors WHERE name = 'The Grill' LIMIT 1), 'Ribeye Steak', 'Prime 12oz ribeye with garlic butter', 4500, ARRAY['popular']),
((SELECT id FROM public.dining_vendors WHERE name = 'The Grill' LIMIT 1), 'Grilled Salmon', 'Atlantic salmon with lemon herb butter', 2800, ARRAY['gf']),
((SELECT id FROM public.dining_vendors WHERE name = 'Café 954' LIMIT 1), 'Club Sandwich', 'Triple decker with turkey, bacon, lettuce, tomato', 1400, ARRAY['popular']),
((SELECT id FROM public.dining_vendors WHERE name = 'Café 954' LIMIT 1), 'Caesar Salad', 'Romaine lettuce with house-made dressing', 1200, ARRAY['vegan']),
((SELECT id FROM public.dining_vendors WHERE name = 'Sports Bar' LIMIT 1), 'Buffalo Wings', 'Traditional wings with celery and blue cheese', 1600, ARRAY['spicy', 'popular']),
((SELECT id FROM public.dining_vendors WHERE name = 'Sports Bar' LIMIT 1), 'Loaded Nachos', 'Tortilla chips with cheese, jalapeños, sour cream', 1800, ARRAY['popular']);

-- Insert sample events
INSERT INTO public.events (title, category, event_date, event_time, venue, price, fee, inventory, description) VALUES
('Rock Tribute Night', 'tribute', CURRENT_DATE + INTERVAL '3 days', '20:00', 'Stage 954', 2500, 500, 300, 'The ultimate rock tribute experience'),
('Comedy Night Live', 'comedy', CURRENT_DATE + INTERVAL '5 days', '21:00', 'Stage 954', 3000, 500, 200, 'Stand-up comedy with top performers'),
('Weekend Concert Series', 'concert', CURRENT_DATE + INTERVAL '7 days', '19:00', 'Stage 954', 4000, 750, 500, 'Live music under the stars');

-- Insert sample poker tournaments
INSERT INTO public.poker_tourneys (name, tournament_date, tournament_time, buyin, fee, seats_total, seats_left, description) VALUES
('Daily No Limit Hold''em', CURRENT_DATE + INTERVAL '1 day', '19:00', 5000, 1000, 100, 85, 'Daily tournament with guaranteed prize pool'),
('Weekend Omaha Hi-Lo', CURRENT_DATE + INTERVAL '2 days', '14:00', 10000, 2000, 80, 72, 'Split pot Omaha tournament'),
('Monthly Championship', CURRENT_DATE + INTERVAL '10 days', '13:00', 25000, 5000, 200, 180, 'Monthly championship event with deep stacks');

-- Insert sample promotions
INSERT INTO public.promos (title, start_date, end_date, details, segments) VALUES
('New Player Bonus', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Get $50 in free play for new sign-ups', ARRAY['all']),
('VIP Happy Hour', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'Double points during happy hour for VIP members', ARRAY['vip']),
('Local Appreciation Week', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '8 days', 'Special offers for Florida residents', ARRAY['locals']);