import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  menuItemId: string;
  qty: number;
  notes?: string;
}

interface CreateOrderParams {
  vendorId: string;
  items: OrderItem[];
  destTable?: string;
  destSeat?: string;
  tip?: number;
}

/**
 * Create a food order via the secure edge function.
 * User authentication is handled server-side.
 */
export async function createFoodOrder(params: CreateOrderParams): Promise<string> {
  const { vendorId, items, destTable, destSeat, tip } = params;
  
  const { data, error } = await supabase.functions.invoke("create-order", {
    body: {
      vendorId,
      items: items.map(item => ({
        menuItemId: item.menuItemId,
        qty: item.qty,
        notes: item.notes
      })),
      destTable: destTable || null,
      destSeat: destSeat || null,
      tip: tip || 0
    }
  });

  if (error) {
    console.error("Order creation error:", error);
    throw new Error(error.message || "Failed to create order");
  }

  return data.orderId;
}

/**
 * Get current user's orders.
 */
export async function getMyOrders(status?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("orders")
    .select(`
      *,
      dining_vendors (
        name,
        location
      ),
      order_items (
        id,
        qty,
        name_cache,
        notes
      )
    `)
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a specific order by ID (only if owned by current user).
 */
export async function getOrderById(orderId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      dining_vendors (
        name,
        location,
        pickup_counter_code
      ),
      order_items (
        id,
        qty,
        name_cache,
        notes
      )
    `)
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
