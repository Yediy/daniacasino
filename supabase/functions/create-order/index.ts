import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(50),
  price_cents: z.number().int().min(0),
  notes: z.string().max(500).optional(),
});

const createOrderSchema = z.object({
  vendor_id: z.string().uuid(),
  items: z.array(orderItemSchema).min(1).max(50),
  dest_table: z.string().max(50).optional(),
  dest_seat: z.string().max(20).optional(),
  tip_cents: z.number().int().min(0).max(1000000).optional().default(0),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = createOrderSchema.parse(body);

    console.log('Creating order for user:', user.id, 'vendor:', validatedData.vendor_id);

    // Calculate totals
    const subtotal_cents = validatedData.items.reduce(
      (sum, item) => sum + (item.price_cents * item.qty),
      0
    );
    
    // 7% sales tax for Florida
    const tax_cents = Math.round(subtotal_cents * 0.07);
    
    // $2 service fee per order
    const fee_cents = 200;
    
    const total_cents = subtotal_cents + tax_cents + fee_cents + validatedData.tip_cents;

    console.log('Order totals - subtotal:', subtotal_cents, 'tax:', tax_cents, 'fee:', fee_cents, 'tip:', validatedData.tip_cents, 'total:', total_cents);

    // Start transaction: create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        vendor_id: validatedData.vendor_id,
        subtotal: subtotal_cents,
        tax: tax_cents,
        fee: fee_cents,
        tip: validatedData.tip_cents,
        total: total_cents,
        status: 'placed',
        dest_table: validatedData.dest_table,
        dest_seat: validatedData.dest_seat,
        placed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log('Order created:', order.id);

    // Insert order items
    const orderItems = validatedData.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      name_cache: item.name,
      qty: item.qty,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Try to clean up the order
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    console.log('Order items created:', orderItems.length);

    // Fetch vendor for prep time calculation
    const { data: vendor } = await supabase
      .from('dining_vendors')
      .select('prep_minutes')
      .eq('id', validatedData.vendor_id)
      .single();

    const prep_minutes = vendor?.prep_minutes || 15;
    const pickup_eta = new Date(Date.now() + prep_minutes * 60000).toISOString();

    // Update order with ETA
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ pickup_eta })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) {
      console.warn('Failed to update pickup ETA:', updateError);
    }

    console.log('Order completed successfully:', order.id);

    // Create notification for user
    await supabase.rpc('create_notification', {
      target_user_id: user.id,
      notification_type: 'order_placed',
      notification_title: 'Order Placed',
      notification_message: `Your order has been placed and will be ready in approximately ${prep_minutes} minutes.`,
      ref_id: order.id,
      ref_type: 'order',
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: updatedOrder || order,
        items: orderItems,
        pickup_eta,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-order function:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
