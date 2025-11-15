-- Add performance indexes on foreign key columns
-- These indexes significantly improve JOIN performance and foreign key checks

-- Index for cash_game_queue.list_id (foreign key to cash_game_lists)
CREATE INDEX IF NOT EXISTS idx_cash_game_queue_list_id 
ON public.cash_game_queue(list_id);

-- Index for event_tickets.event_id (foreign key to events)
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id 
ON public.event_tickets(event_id);

-- Index for event_tickets.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_event_tickets_user_id 
ON public.event_tickets(user_id);

-- Index for order_items.order_id (foreign key to orders)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items(order_id);

-- Index for order_items.menu_item_id (foreign key to menu_items)
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id 
ON public.order_items(menu_item_id);

-- Index for orders.vendor_id (foreign key to dining_vendors)
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id 
ON public.orders(vendor_id);

-- Index for orders.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON public.orders(user_id);

-- Index for poker_entries.tourney_id (foreign key to poker_tourneys)
CREATE INDEX IF NOT EXISTS idx_poker_entries_tourney_id 
ON public.poker_entries(tourney_id);

-- Index for poker_entries.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_poker_entries_user_id 
ON public.poker_entries(user_id);

-- Index for poker_table_players.table_id (foreign key to poker_tables)
CREATE INDEX IF NOT EXISTS idx_poker_table_players_table_id 
ON public.poker_table_players(table_id);

-- Index for poker_table_players.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_poker_table_players_user_id 
ON public.poker_table_players(user_id);

-- Index for menu_items.vendor_id (foreign key to dining_vendors)
CREATE INDEX IF NOT EXISTS idx_menu_items_vendor_id 
ON public.menu_items(vendor_id);

-- Index for chip_vouchers.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_chip_vouchers_user_id 
ON public.chip_vouchers(user_id);

-- Index for wallet_transactions.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id 
ON public.wallet_transactions(user_id);

-- Index for loyalty_transactions.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id 
ON public.loyalty_transactions(user_id);

-- Index for game_history.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_game_history_user_id 
ON public.game_history(user_id);

-- Index for game_history.session_id (foreign key to player_sessions)
CREATE INDEX IF NOT EXISTS idx_game_history_session_id 
ON public.game_history(session_id);

-- Index for player_sessions.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_player_sessions_user_id 
ON public.player_sessions(user_id);

-- Index for notifications.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

-- Index for support_tickets.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id 
ON public.support_tickets(user_id);

-- Index for audit_logs.user_id (frequent lookups by user)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON public.audit_logs(user_id);

-- Composite index for cash_game_queue lookups (list_id + position)
CREATE INDEX IF NOT EXISTS idx_cash_game_queue_list_position 
ON public.cash_game_queue(list_id, position);

-- Index for slots by status (frequent filtering)
CREATE INDEX IF NOT EXISTS idx_slots_status 
ON public.slots(status);

-- Index for slots by room (frequent filtering)
CREATE INDEX IF NOT EXISTS idx_slots_room 
ON public.slots(room);

-- Composite index for slots room + status queries
CREATE INDEX IF NOT EXISTS idx_slots_room_status 
ON public.slots(room, status);