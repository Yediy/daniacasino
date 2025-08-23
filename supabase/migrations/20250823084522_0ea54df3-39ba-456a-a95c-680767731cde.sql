-- Create comprehensive live casino tracking tables

-- Poker Tables (live table status)
CREATE TABLE public.poker_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  game TEXT NOT NULL,
  stakes TEXT NOT NULL,
  max_seats INTEGER DEFAULT 9,
  open_seats INTEGER DEFAULT 0,
  players INTEGER DEFAULT 0,
  seated_player_ids TEXT[], -- array of user IDs
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
  wait_count INTEGER DEFAULT 0,
  floor_zone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Poker Table Players (who's sitting where)
CREATE TABLE public.poker_table_players (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  stack INTEGER DEFAULT 0, -- in cents
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'away', 'left'))
);

-- Slots inventory
CREATE TABLE public.slots (
  id TEXT PRIMARY KEY,
  bank TEXT NOT NULL,
  position INTEGER NOT NULL,
  game_title TEXT NOT NULL,
  denom TEXT NOT NULL,
  room TEXT NOT NULL,
  device_id TEXT UNIQUE,
  status TEXT DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'out_of_order')),
  last_session_end TIMESTAMPTZ,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Electronic Table Games
CREATE TABLE public.etg_tables (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL,
  stakes TEXT NOT NULL,
  max_seats INTEGER DEFAULT 8,
  open_seats INTEGER DEFAULT 0,
  players INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
  floor_zone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jai Alai Streams
CREATE TABLE public.jai_alai_streams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'offline' CHECK (status IN ('live', 'vod', 'offline')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hls_url TEXT,
  poster_img TEXT,
  age_limit TEXT DEFAULT '18+',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update dining vendors to track stock
ALTER TABLE public.dining_vendors ADD COLUMN is_open BOOLEAN DEFAULT true;

-- Update menu items to track stock
ALTER TABLE public.menu_items ADD COLUMN stock_qty INTEGER DEFAULT 999;

-- Enable RLS on new tables
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_table_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etg_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jai_alai_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read tables
CREATE POLICY "Poker tables viewable by everyone" ON public.poker_tables FOR SELECT USING (true);
CREATE POLICY "Poker table players viewable by everyone" ON public.poker_table_players FOR SELECT USING (true);
CREATE POLICY "Slots viewable by everyone" ON public.slots FOR SELECT USING (true);
CREATE POLICY "ETG tables viewable by everyone" ON public.etg_tables FOR SELECT USING (true);
CREATE POLICY "Jai alai streams viewable by everyone" ON public.jai_alai_streams FOR SELECT USING (true);

-- Service policies for updates
CREATE POLICY "Service can update poker tables" ON public.poker_tables FOR UPDATE USING (true);
CREATE POLICY "Service can update poker table players" ON public.poker_table_players FOR UPDATE USING (true);
CREATE POLICY "Service can update slots" ON public.slots FOR UPDATE USING (true);
CREATE POLICY "Service can update ETG tables" ON public.etg_tables FOR UPDATE USING (true);
CREATE POLICY "Service can update streams" ON public.jai_alai_streams FOR UPDATE USING (true);

CREATE POLICY "Service can insert poker table players" ON public.poker_table_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert poker tables" ON public.poker_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert slots" ON public.slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert ETG tables" ON public.etg_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert streams" ON public.jai_alai_streams FOR INSERT WITH CHECK (true);

-- Create triggers for timestamp updates
CREATE TRIGGER update_poker_tables_updated_at BEFORE UPDATE ON public.poker_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_slots_updated_at BEFORE UPDATE ON public.slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_etg_tables_updated_at BEFORE UPDATE ON public.etg_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample poker tables data
INSERT INTO public.poker_tables (id, name, game, stakes, max_seats, open_seats, players, seated_player_ids, status, wait_count, floor_zone) VALUES
('pt_1', 'Table 1', 'No-Limit Hold''em', '1/3', 9, 2, 7, ARRAY['u_21', 'u_45', 'u_78', 'u_31', 'u_19', 'u_12', 'u_66'], 'open', 3, 'Poker A'),
('pt_2', 'Table 2', 'No-Limit Hold''em', '2/5', 9, 0, 9, ARRAY['u_02', 'u_03', 'u_04', 'u_05', 'u_06', 'u_07', 'u_08', 'u_09', 'u_10'], 'open', 6, 'Poker A'),
('pt_3', 'Table 3', 'PLO', '5/5', 8, 1, 7, ARRAY['u_11', 'u_12', 'u_13', 'u_14', 'u_15', 'u_16', 'u_17'], 'open', 2, 'Poker B'),
('pt_4', 'Table 4', 'No-Limit Hold''em', '1/2', 9, 5, 4, ARRAY['u_20', 'u_21', 'u_22', 'u_23'], 'open', 1, 'Poker A'),
('pt_5', 'Table 5', 'Mixed Games', '2/4', 8, 3, 5, ARRAY['u_30', 'u_31', 'u_32', 'u_33', 'u_34'], 'open', 0, 'Poker B');

-- Insert sample slots data
INSERT INTO public.slots (id, bank, position, game_title, denom, room, device_id, status, last_session_end, lat, lng) VALUES
('sl_0001', 'Bank A', 1, 'Lightning Link', '$0.01', 'Main Floor', 'DEV-LL-0001', 'free', '2025-08-12T17:58:00Z', 26.0523, -80.1421),
('sl_0002', 'Bank A', 2, 'Lightning Link', '$0.01', 'Main Floor', 'DEV-LL-0002', 'occupied', NULL, 26.0523, -80.1421),
('sl_0003', 'Bank A', 3, 'Lightning Link', '$0.01', 'Main Floor', 'DEV-LL-0003', 'free', '2025-08-12T18:05:00Z', 26.0523, -80.1421),
('sl_0101', 'Bank B', 1, 'Buffalo Gold', '$0.01', 'Main Floor', 'DEV-BG-0101', 'free', '2025-08-12T17:45:00Z', 26.0524, -80.1422),
('sl_0102', 'Bank B', 2, 'Buffalo Gold', '$0.01', 'Main Floor', 'DEV-BG-0102', 'occupied', NULL, 26.0524, -80.1422),
('sl_0103', 'Bank B', 3, 'Buffalo Gold', '$0.01', 'Main Floor', 'DEV-BG-0103', 'free', '2025-08-12T18:00:00Z', 26.0524, -80.1422),
('sl_0201', 'Bank C', 1, 'Wheel of Fortune', '$0.25', 'High Limit', 'DEV-WF-0201', 'free', '2025-08-12T17:30:00Z', 26.0525, -80.1423),
('sl_0202', 'Bank C', 2, 'Wheel of Fortune', '$0.25', 'High Limit', 'DEV-WF-0202', 'occupied', NULL, 26.0525, -80.1423);

-- Insert more slots to reach ~700 total (abbreviated for demo)
INSERT INTO public.slots (id, bank, position, game_title, denom, room, device_id, status)
SELECT 
    'sl_' || LPAD((row_number() OVER())::text, 4, '0'),
    'Bank ' || chr(65 + (row_number() OVER() % 26)),
    ((row_number() OVER() - 1) % 20) + 1,
    (ARRAY['Lightning Link', 'Buffalo Gold', 'Wheel of Fortune', 'Quick Hit', 'Dancing Drums'])[((row_number() OVER() - 1) % 5) + 1],
    (ARRAY['$0.01', '$0.25', '$1.00', '$5.00'])[((row_number() OVER() - 1) % 4) + 1],
    CASE WHEN row_number() OVER() % 10 = 0 THEN 'High Limit' ELSE 'Main Floor' END,
    (ARRAY['free', 'occupied'])[((row_number() OVER() - 1) % 3) + 1] -- roughly 2/3 free, 1/3 occupied
FROM generate_series(1, 692); -- plus the 8 we inserted above = 700 total

-- Insert sample ETG tables
INSERT INTO public.etg_tables (id, game, stakes, max_seats, open_seats, players, status, floor_zone) VALUES
('etg_21', 'Roulette', '$1 min', 18, 6, 12, 'open', 'ETG Pit'),
('etg_22', 'Blackjack', '$5 min', 7, 2, 5, 'open', 'ETG Pit'),
('etg_23', 'Baccarat', '$10 min', 14, 8, 6, 'open', 'ETG Pit'),
('etg_24', 'Craps', '$5 min', 16, 4, 12, 'open', 'ETG Pit');

-- Insert sample Jai Alai streams
INSERT INTO public.jai_alai_streams (id, title, status, start_time, end_time, hls_url, poster_img, age_limit, notes) VALUES
('ja_01', 'Fronton Live Match 1', 'live', '2025-08-12T18:00:00Z', '2025-08-12T19:00:00Z', 'https://stream.example.com/jai/ja_01.m3u8', '', '18+', 'Low latency HLS'),
('ja_02', 'Fronton Classic Replays', 'vod', NULL, NULL, 'https://stream.example.com/jai/ja_02.m3u8', '', '18+', 'On-demand'),
('ja_03', 'Evening Match', 'offline', '2025-08-12T20:00:00Z', '2025-08-12T21:00:00Z', '', '', '18+', 'Starting soon');

-- Update existing cash game lists to match your model
UPDATE public.cash_game_lists SET game = '1/3 No-Limit Hold''em', open_seats = 4, wait_count = 5 WHERE game = '1/3 No Limit Hold''em';
UPDATE public.cash_game_lists SET game = '2/5 No-Limit Hold''em', open_seats = 0, wait_count = 12 WHERE game = '2/5 No Limit Hold''em';
UPDATE public.cash_game_lists SET game = '5/5 PLO', open_seats = 1, wait_count = 2 WHERE game = '1/2 Pot Limit Omaha';

-- Update dining vendors with open status
UPDATE public.dining_vendors SET is_open = true;

-- Update menu items with stock quantities
UPDATE public.menu_items SET stock_qty = CASE 
  WHEN name LIKE '%Steak%' THEN 8
  WHEN name LIKE '%Salmon%' THEN 12
  WHEN name LIKE '%Sandwich%' THEN 18
  WHEN name LIKE '%Salad%' THEN 25
  WHEN name LIKE '%Wings%' THEN 15
  ELSE 999
END;

-- Update settings with your configuration
UPDATE public.settings SET 
  support_phone = '+1-954-000-0000',
  terms_url = 'https://example.com/terms',
  privacy_url = 'https://example.com/privacy',
  rg_url = 'https://example.com/rg',
  hotline_text = 'Call 888-ADMIT-IT for help',
  cash_game_hold_minutes = 15,
  min_chip_voucher = 10000, -- $100 minimum
  max_chip_voucher = 200000 -- $2000 maximum
WHERE id = 'global';