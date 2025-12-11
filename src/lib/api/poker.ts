import { supabase } from "@/integrations/supabase/client";

/**
 * Get all poker tables with seat counts and queue length.
 * Uses the secure RPC function that doesn't expose sensitive data.
 */
export async function getPokerTables() {
  const { data, error } = await supabase.rpc("get_poker_tables_with_seats");
  if (error) throw error;
  return data;
}

/**
 * Get public poker table info (no auth required).
 */
export async function getPublicPokerTables() {
  const { data, error } = await supabase.rpc("get_public_poker_tables");
  if (error) throw error;
  return data;
}

/**
 * Join the poker queue for a specific table.
 * User ID is derived server-side from auth.uid() - no client-side ID passing.
 */
export async function joinPokerQueue(tableId: string): Promise<string> {
  // The RPC function uses auth.uid() internally - more secure
  const { data, error } = await supabase.rpc("join_poker_queue", {
    p_table_id: tableId
  });
  
  if (error) {
    if (error.message.includes('Already in queue')) {
      throw new Error('You are already in this queue');
    }
    if (error.message.includes('Not authenticated')) {
      throw new Error('Please sign in to join the queue');
    }
    throw error;
  }
  
  return data;
}

/**
 * Leave the poker queue.
 */
export async function leavePokerQueue(queueId: string): Promise<void> {
  const { error } = await supabase
    .from("cash_game_queue")
    .delete()
    .eq("id", queueId);
    
  if (error) throw error;
}

/**
 * Get current user's queue entries.
 */
export async function getMyQueueEntries() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("cash_game_queue")
    .select(`
      *,
      cash_game_lists (
        game,
        open_seats,
        list_status
      )
    `)
    .eq("user_id", user.id)
    .in("checkin_status", ["remote", "waiting", "called"]);

  if (error) throw error;
  return data || [];
}

/**
 * Get current user's seat holds.
 */
export async function getMySeatHolds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("seat_holds")
    .select("*")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString());

  if (error) throw error;
  return data || [];
}
