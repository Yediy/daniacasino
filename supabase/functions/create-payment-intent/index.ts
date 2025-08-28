import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestBody = await req.json();
    const { purpose, refId, description } = requestBody;
    
    if (!purpose || !refId) {
      throw new Error("Missing required fields: purpose, refId");
    }

    // SECURITY FIX: Calculate amounts server-side, never trust client input
    let calculatedAmount = 0;
    let fee = 0;

    logStep("Payment request received", { purpose, refId, description });

    // Server-side price calculation based on purpose
    switch (purpose) {
      case 'event':
        const { data: eventData, error: eventError } = await supabaseClient
          .from('events')
          .select('price, fee, inventory')
          .eq('id', refId)
          .single();
        
        if (eventError || !eventData) {
          throw new Error(`Event not found or invalid: ${refId}`);
        }
        
        const qty = requestBody.qty || 1;
        if (eventData.inventory < qty) {
          throw new Error("Insufficient inventory for this event");
        }
        
        calculatedAmount = (eventData.price + (eventData.fee || 0)) * qty;
        logStep("Event price calculated", { price: eventData.price, fee: eventData.fee, qty, total: calculatedAmount });
        break;

      case 'tourney':
        const { data: tourneyData, error: tourneyError } = await supabaseClient
          .from('poker_tourneys')
          .select('buyin, fee, seats_left')
          .eq('id', refId)
          .single();
        
        if (tourneyError || !tourneyData) {
          throw new Error(`Tournament not found or invalid: ${refId}`);
        }
        
        if (tourneyData.seats_left <= 0) {
          throw new Error("Tournament is sold out");
        }
        
        calculatedAmount = tourneyData.buyin + (tourneyData.fee || 0);
        logStep("Tournament price calculated", { buyin: tourneyData.buyin, fee: tourneyData.fee, total: calculatedAmount });
        break;

      case 'voucher':
        const { data: settingsData } = await supabaseClient
          .from('settings')
          .select('min_chip_voucher, max_chip_voucher')
          .eq('id', 'global')
          .single();
        
        const requestedAmount = requestBody.amount;
        if (!requestedAmount || requestedAmount < (settingsData?.min_chip_voucher || 2000)) {
          throw new Error(`Minimum voucher amount is $${((settingsData?.min_chip_voucher || 2000) / 100).toFixed(2)}`);
        }
        
        if (requestedAmount > (settingsData?.max_chip_voucher || 100000)) {
          throw new Error(`Maximum voucher amount is $${((settingsData?.max_chip_voucher || 100000) / 100).toFixed(2)}`);
        }
        
        // Calculate fee (e.g., 3% + $2.99)
        fee = Math.round(requestedAmount * 0.03 + 299);
        calculatedAmount = requestedAmount + fee;
        logStep("Voucher price calculated", { amount: requestedAmount, fee, total: calculatedAmount });
        break;

      case 'order':
        const { data: orderData, error: orderError } = await supabaseClient
          .from('orders')
          .select(`
            id, subtotal, tax, tip, fee, status, user_id,
            order_items (
              qty,
              menu_item_id,
              menu_items (price)
            )
          `)
          .eq('id', refId)
          .eq('user_id', user.id)
          .eq('status', 'cart')
          .single();
        
        if (orderError || !orderData) {
          throw new Error("Order not found or not in cart status");
        }
        
        // Recalculate order total from menu items to prevent tampering
        let recalculatedSubtotal = 0;
        for (const item of orderData.order_items) {
          recalculatedSubtotal += item.qty * item.menu_items.price;
        }
        
        const recalculatedTotal = recalculatedSubtotal + (orderData.tax || 0) + (orderData.tip || 0) + (orderData.fee || 0);
        
        // Verify the stored total matches our calculation
        if (Math.abs(orderData.subtotal - recalculatedSubtotal) > 1) {
          throw new Error("Order subtotal mismatch - please refresh and try again");
        }
        
        calculatedAmount = recalculatedTotal;
        logStep("Order price validated", { 
          storedSubtotal: orderData.subtotal, 
          recalculatedSubtotal, 
          total: calculatedAmount 
        });
        break;

      default:
        throw new Error(`Invalid payment purpose: ${purpose}`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Create payment intent using server-calculated amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculatedAmount,
      currency: "usd",
      customer: customerId,
      description: description || `Casino payment - ${purpose}`,
      metadata: {
        user_id: user.id,
        purpose,
        ref_id: refId
      },
      automatic_payment_methods: { enabled: true }
    });

    logStep("Payment intent created", { 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret 
    });

    // Create initial record based on purpose
    switch (purpose) {
      case 'event':
        await supabaseClient.from('event_tickets').insert({
          user_id: user.id,
          event_id: refId,
          qty: requestBody.qty || 1,
          amount: calculatedAmount,
          status: 'pending',
          stripe_payment_intent_id: paymentIntent.id
        });
        break;
      case 'tourney':
        await supabaseClient.from('poker_entries').insert({
          user_id: user.id,
          tourney_id: refId,
          amount: calculatedAmount,
          status: 'pending',
          stripe_payment_intent_id: paymentIntent.id
        });
        break;
      case 'voucher':
        await supabaseClient.from('chip_vouchers').insert({
          user_id: user.id,
          amount: calculatedAmount - fee,
          fee: fee,
          status: 'pending',
          stripe_payment_intent_id: paymentIntent.id
        });
        break;
      case 'order':
        // Security Fix: Don't mark order as 'placed' until payment is confirmed via webhook
        // Only set payment intent ID and keep status as pending
        await supabaseClient.from('orders').update({
          stripe_payment_intent_id: paymentIntent.id
          // status remains 'cart' until webhook confirms payment
        }).eq('id', refId).eq('user_id', user.id);
        break;
    }

    logStep("Database record created/updated");

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});