-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  external_player_id text unique,
  full_name text not null,
  email text,
  phone text,
  tier text,
  loyalty_points integer not null default 0,
  date_of_birth date,
  marketing_opt_in boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);
create index if not exists idx_users_email on public.users(email);

-- STAFF
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  role text not null, -- staff_kitchen | staff_floor | staff_poker | admin | super_admin
  full_name text not null,
  email text,
  pin_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- EVENTS
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  venue text not null,
  price_cents integer not null,
  fee_cents integer not null default 0,
  inventory integer not null,
  onsale boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_events_onsale on public.events(onsale);
create index if not exists idx_events_start_time on public.events(start_time);

-- EVENT TICKETS
create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  quantity integer not null default 1,
  amount_cents integer not null,
  status text not null default 'paid', -- paid|refunded|redeemed|locked
  barcode_value text,
  barcode_image_url text,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_event_tickets_event_id on public.event_tickets(event_id);
create index if not exists idx_event_tickets_user_id on public.event_tickets(user_id);
create index if not exists idx_event_tickets_status on public.event_tickets(status);

-- POKER TOURNAMENTS
create table if not exists public.poker_tourneys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time timestamptz not null,
  buyin_cents integer not null,
  fee_cents integer not null default 0,
  seats_total integer not null,
  seats_left integer not null,
  status text not null default 'scheduled', -- scheduled|running|completed|cancelled
  created_at timestamptz default now()
);

-- POKER ENTRIES
create table if not exists public.poker_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  tourney_id uuid not null references public.poker_tourneys(id) on delete cascade,
  amount_cents integer not null,
  status text not null default 'paid', -- paid|refunded|locked
  source text not null default 'payment', -- payment|voucher
  voucher_id uuid references public.vouchers(id),
  barcode_value text,
  barcode_image_url text,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_poker_entries_tourney on public.poker_entries(tourney_id, status);

-- POKER CASH TABLES
create table if not exists public.poker_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game text not null,   -- NLH, PLO, etc
  stakes text not null, -- "1/2", "2/5"
  max_seats integer not null,
  open_seats integer not null,
  room text,
  is_open boolean not null default true,
  created_at timestamptz default now()
);

-- POKER SEATS
create table if not exists public.poker_seats (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  seat_no integer not null,
  status text not null default 'open', -- open|held|occupied
  user_id uuid references public.users(id),
  updated_at timestamptz default now(),
  constraint poker_seats_unique_table_seat unique(table_id, seat_no)
);

-- POKER QUEUE
create table if not exists public.poker_queue (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  user_id uuid not null references public.users(id),
  position integer not null,
  status text not null default 'waiting', -- waiting|seated|skipped|left
  joined_at timestamptz default now()
);

create index if not exists idx_poker_queue_table_status_pos on public.poker_queue(table_id, status, position);

-- SEAT HOLDS
create table if not exists public.seat_holds (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  user_id uuid not null references public.users(id),
  seat_no integer not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_seat_holds_table_expires on public.seat_holds(table_id, expires_at);

-- VENDORS
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz default now()
);

-- MENU ITEMS
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  tags text,
  is_active boolean not null default true,
  stock_qty integer,
  created_at timestamptz default now()
);

create index if not exists idx_menu_items_vendor_active on public.menu_items(vendor_id, is_active);

-- ORDERS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  vendor_id uuid not null references public.vendors(id),
  subtotal_cents integer not null default 0,
  fee_cents integer not null default 0,
  tax_cents integer not null default 0,
  tip_cents integer not null default 0,
  total_cents integer not null default 0,
  status text not null default 'placed', -- placed|prepping|ready|picked_up|cancelled
  pickup_eta timestamptz,
  pickup_code text,
  dest_table text,
  dest_seat text,
  placed_at timestamptz default now(),
  picked_up_at timestamptz
);

create index if not exists idx_orders_vendor_status_placed_at on public.orders(vendor_id, status, placed_at);

-- ORDER ITEMS
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  name_cache text not null,
  qty integer not null default 1,
  price_cents integer not null default 0
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- VOUCHERS
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type text not null, -- CHIP|TOURNEY_ENTRY|FOOD|PROMO
  amount_cents integer not null default 0,
  tourney_id uuid references public.poker_tourneys(id),
  status text not null default 'active', -- active|used|refunded|locked|expired
  barcode_value text,
  barcode_image_url text,
  redeem_start timestamptz,
  redeem_end timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_vouchers_user_type_status on public.vouchers(user_id, type, status);

-- SLOTS
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  bank text not null,
  position text,
  game_title text,
  denom text,
  room text,
  status text not null default 'free', -- free|in_use|down
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

create index if not exists idx_slots_room_bank_status on public.slots(room, bank, status);

-- SLOT BANKS
create table if not exists public.slot_banks (
  id uuid primary key default gen_random_uuid(),
  bank text not null,
  room text,
  total_slots integer not null default 0,
  free_slots integer not null default 0,
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

create index if not exists idx_slot_banks_room_bank on public.slot_banks(room, bank);

-- SEATING MAPS
create table if not exists public.seating_maps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id),
  image_url text not null,
  notes text,
  created_at timestamptz default now()
);

-- STRIPE EVENTS (idempotency)
create table if not exists public.stripe_events (
  id text primary key,
  received_at timestamptz default now()
);

-- AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id, created_at);
