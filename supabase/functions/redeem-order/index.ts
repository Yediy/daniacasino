import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Security Fix: Restrict CORS for staff-only functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://lcfsuhdcexrbqevdojlw.supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REDEEM-ORDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Order pickup request received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate staff user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const staffUser = userData.user;
    logStep("Staff authenticated", { staffId: staffUser.id });

    // Check if user has Staff or Admin role using new role system
    const { data: hasStaffRole, error: staffRoleError } = await supabaseClient.rpc('has_role', {
      _user_id: staffUser.id,
      _role: 'Staff'
    });
    
    const { data: hasAdminRole, error: adminRoleError } = await supabaseClient.rpc('has_role', {
      _user_id: staffUser.id,
      _role: 'Admin'
    });

    if ((staffRoleError && adminRoleError) || (!hasStaffRole && !hasAdminRole)) {
      logStep("Access denied - insufficient privileges");
      return new Response(JSON.stringify({ error: "Access denied. Staff privileges required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { pickup_code } = await req.json();
    if (!pickup_code) {
      return new Response(JSON.stringify({ error: "Pickup code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing pickup code", { pickup_code });

    // Find the order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items!inner(
          id,
          qty,
          menu_items!inner(
            name,
            price
          )
        ),
        dining_vendors!inner(
          name,
          location
        )
      `)
      .eq('pickup_code', pickup_code)
      .in('status', ['ready', 'prepping'])
      .single();

    if (orderError || !order) {
      logStep("Order not found", { pickup_code, error: orderError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid pickup code or order not ready" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if order is ready
    if (order.status !== 'ready') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Order is still ${order.status}. Please wait for ready status.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark order as picked up
    const pickupTime = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({ 
        status: 'picked_up',
        picked_up_at: pickupTime,
        picked_up_by_staff_id: staffUser.id
      })
      .eq('id', order.id);

    if (updateError) {
      logStep("Failed to update order", { error: updateError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to mark order as picked up" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit event
    await supabaseClient
      .from('audit_logs')
      .insert({
        event_type: 'order_picked_up',
        resource_type: 'order',
        resource_id: order.id,
        staff_id: staffUser.id,
        details: {
          pickup_code,
          vendor: order.dining_vendors.name,
          total: order.total,
          picked_up_at: pickupTime
        }
      });

    // Security Fix: Use scoped channels to prevent data leakage
    await supabaseClient.channel(`kitchen:${order.vendor_id}`).send({
      type: 'broadcast',
      event: 'order_picked_up',
      payload: {
        orderId: order.id,
        pickup_code
      }
    });

    await supabaseClient.channel(`wallet:${order.user_id}`).send({
      type: 'broadcast',
      event: 'order_picked_up',
      payload: {
        orderId: order.id
      }
    });

    logStep("Order marked as picked up", { 
      orderId: order.id, 
      pickup_code 
    });

    return new Response(JSON.stringify({ 
      success: true,
      order: {
        id: order.id,
        pickup_code: order.pickup_code,
        vendor: order.dining_vendors.name,
        location: order.dining_vendors.location,
        total: order.total,
        items: order.order_items.map((item: any) => ({
          name: item.menu_items.name,
          qty: item.qty,
          price: item.menu_items.price
        })),
        picked_up_at: pickupTime
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Internal server error" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});