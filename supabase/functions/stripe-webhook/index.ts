import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// SECURITY FIX: Restrict CORS to specific origins
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://lcfsuhdcexrbqevdojlw.supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY FIX: Sanitize logs to remove sensitive data
const logStep = (step: string, details?: any) => {
  if (details) {
    // Remove sensitive fields from logs
    const sanitized = { ...details };
    delete sanitized.payment_method;
    delete sanitized.customer_email;
    delete sanitized.stripe_customer_id;
    delete sanitized.amount_total;
    const detailsStr = ` - ${JSON.stringify(sanitized)}`;
    console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
  } else {
    console.log(`[STRIPE-WEBHOOK] ${step}`);
  }
};

const generateBarcode = (type: string, data: any): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(7);
  return `${type.toUpperCase()}-${timestamp}-${randomPart}`;
};

// SECURITY FIX: Replace unsafe broadcast with database notifications
const notifyUser = async (supabaseClient: any, userId: string, eventData: any) => {
  try {
    // Use secure database notification instead of public broadcast
    await supabaseClient.rpc('notify_wallet_update', {
      target_user_id: userId,
      event_data: eventData
    });
    logStep("Database notification sent", { userId });
  } catch (error) {
    logStep("Database notification failed", { error: error.message });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    
    if (!sig) throw new Error("No Stripe signature found");

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    logStep("Event type", { type: event.type, id: event.id });

    // Security Fix: Check for duplicate webhook events (idempotency)
    const { data: existingEvent, error: eventCheckError } = await supabaseClient
      .from('webhook_events')
      .select('id')
      .eq('id', event.id)
      .single();

    if (eventCheckError && eventCheckError.code !== 'PGRST116') {
      logStep('Error checking for duplicate event', { error: eventCheckError });
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    if (existingEvent) {
      logStep('Duplicate webhook event, skipping processing', { eventId: event.id });
      return new Response('OK - Already processed', { status: 200, headers: corsHeaders });
    }

    // Record this webhook event to prevent duplicate processing
    const { error: insertEventError } = await supabaseClient
      .from('webhook_events')
      .insert({
        id: event.id,
        event_type: event.type,
        processed: false
      });

    if (insertEventError) {
      logStep('Failed to record webhook event', { error: insertEventError });
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    const currentTime = new Date().toISOString();
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    // Handle different Stripe events
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const { user_id, purpose, ref_id } = session.metadata || {};
        
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          purpose, 
          refId: ref_id, 
          userId: user_id 
        });

        await handlePaymentSuccess(supabaseClient, purpose, ref_id, user_id, session.id, currentTime, twoHoursLater);
        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const metadata = paymentIntent.metadata;
        
        logStep("Payment intent succeeded", { 
          paymentIntentId: paymentIntent.id, 
          purpose: metadata.purpose, 
          refId: metadata.ref_id, 
          userId: metadata.user_id 
        });

        await handlePaymentSuccess(supabaseClient, metadata.purpose, metadata.ref_id, metadata.user_id, paymentIntent.id, currentTime, twoHoursLater);
        break;

      case "payment_intent.canceled":
        const canceledPI = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(supabaseClient, canceledPI.metadata, canceledPI.id);
        break;

      case "charge.refunded":
        const refundedCharge = event.data.object as Stripe.Charge;
        if (refundedCharge.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(refundedCharge.payment_intent as string);
          await handleRefund(supabaseClient, pi.metadata, pi.id);
        }
        break;

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Mark webhook event as processed
    await supabaseClient
      .from('webhook_events')
      .update({ processed: true })
      .eq('id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Mark webhook event as failed (keep processed: false for potential retry)
    if (event?.id) {
      await supabaseClient
        .from('webhook_events')
        .update({ processed: false })
        .eq('id', event.id);
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handlePaymentSuccess(supabaseClient: any, purpose: string, refId: string, userId: string, paymentId: string, currentTime: string, twoHoursLater: string) {
  // SECURITY FIX: Verify payment amount matches expected amount before issuing entitlements
  let expectedAmount = 0;

  switch (purpose) {
    case 'event':
      // Verify event exists and calculate expected amount
      const { data: eventData, error: eventError } = await supabaseClient
        .from('events')
        .select('price, fee')
        .eq('id', refId)
        .single();

      if (eventError || !eventData) {
        logStep("ERROR: Event verification failed", { refId, error: eventError });
        return;
      }

      const { data: ticketData, error: ticketError } = await supabaseClient
        .from('event_tickets')
        .select('qty, amount')
        .eq('stripe_payment_intent_id', paymentId)
        .single();

      if (ticketError || !ticketData) {
        logStep("ERROR: Ticket data not found", { paymentId, error: ticketError });
        return;
      }

      expectedAmount = (eventData.price + (eventData.fee || 0)) * ticketData.qty;
      
      // Verify stored amount matches calculated amount
      if (Math.abs(ticketData.amount - expectedAmount) > 1) {
        logStep("ERROR: Event payment amount mismatch", { 
          stored: ticketData.amount, 
          expected: expectedAmount,
          paymentId 
        });
        // Set status to payment_mismatch instead of issuing barcode
        await supabaseClient
          .from('event_tickets')
          .update({ status: 'payment_mismatch' })
          .eq('stripe_payment_intent_id', paymentId);
        return;
      }

      const barcode = generateBarcode('TICKET', { paymentId });
      const { data: updatedTicket } = await supabaseClient
        .from('event_tickets')
        .update({ 
          status: 'paid', 
          barcode,
          issued_at: currentTime
        })
        .eq('stripe_payment_intent_id', paymentId)
        .select()
        .single();
      
      if (updatedTicket) {
        // SECURITY FIX: Use database notifications instead of broadcasts
        await notifyUser(supabaseClient, userId, {
          message: 'Event ticket issued',
          reference_id: updatedTicket.id
        });
      }
      logStep("Event ticket updated", { barcode });
      break;

    case 'tourney':
      // Verify tournament exists and calculate expected amount
      const { data: tourneyData, error: tourneyError } = await supabaseClient
        .from('poker_tourneys')
        .select('buyin, fee')
        .eq('id', refId)
        .single();

      if (tourneyError || !tourneyData) {
        logStep("ERROR: Tournament verification failed", { refId, error: tourneyError });
        return;
      }

      const { data: entryRecord, error: entryError } = await supabaseClient
        .from('poker_entries')
        .select('amount')
        .eq('stripe_payment_intent_id', paymentId)
        .single();

      if (entryError || !entryRecord) {
        logStep("ERROR: Poker entry not found", { paymentId, error: entryError });
        return;
      }

      expectedAmount = tourneyData.buyin + (tourneyData.fee || 0);
      
      if (Math.abs(entryRecord.amount - expectedAmount) > 1) {
        logStep("ERROR: Tournament payment amount mismatch", { 
          stored: entryRecord.amount, 
          expected: expectedAmount,
          paymentId 
        });
        await supabaseClient
          .from('poker_entries')
          .update({ status: 'payment_mismatch' })
          .eq('stripe_payment_intent_id', paymentId);
        return;
      }

      const tourneyBarcode = generateBarcode('TOURNEY', { paymentId });
      const { data: entryData } = await supabaseClient
        .from('poker_entries')
        .update({ 
          status: 'paid', 
          barcode: tourneyBarcode,
          will_call_window_start: currentTime,
          will_call_window_end: twoHoursLater,
          issued_at: currentTime
        })
        .eq('stripe_payment_intent_id', paymentId)
        .select()
        .single();
      
      if (entryData) {
        // SECURITY FIX: Use database notifications instead of broadcasts
        await notifyUser(supabaseClient, userId, {
          message: 'Tournament entry issued',
          reference_id: entryData.id
        });
      }
      logStep("Poker entry updated", { barcode: tourneyBarcode });
      break;

    case 'voucher':
      const voucherBarcode = generateBarcode('VOUCHER', { paymentId });
      const { data: voucherData } = await supabaseClient
        .from('chip_vouchers')
        .update({ 
          status: 'paid', 
          barcode: voucherBarcode,
          redeem_window_start: currentTime,
          redeem_window_end: twoHoursLater
        })
        .eq('stripe_payment_intent_id', paymentId)
        .select()
        .single();
      
      if (voucherData) {
        // SECURITY FIX: Use database notifications instead of broadcasts
        await notifyUser(supabaseClient, userId, {
          message: 'Chip voucher issued',
          reference_id: voucherData.id
        });
      }
      logStep("Chip voucher updated", { barcode: voucherBarcode });
      break;

    case 'order':
      const orderCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: orderData } = await supabaseClient
        .from('orders')
        .update({ 
          status: 'placed',
          pickup_code: orderCode,
          pickup_eta: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        })
        .eq('stripe_payment_intent_id', paymentId)
        .select()
        .single();
      
      if (orderData) {
        // SECURITY FIX: Use database notifications instead of broadcasts
        await notifyUser(supabaseClient, orderData.vendor_id, {
          message: 'New order placed',
          reference_id: orderData.id
        });
        
        await notifyUser(supabaseClient, userId, {
          message: 'Order confirmation',
          reference_id: orderData.id
        });
      }
      logStep("Order updated", { pickupCode: orderCode });
      break;
  }
}

async function handlePaymentCanceled(supabaseClient: any, metadata: any, paymentId: string) {
  const { purpose } = metadata;
  logStep("Payment canceled", { purpose, paymentId });

  switch (purpose) {
    case 'event':
      await supabaseClient
        .from('event_tickets')
        .update({ status: 'canceled' })
        .eq('stripe_payment_intent_id', paymentId);
      break;
    case 'tourney':
      await supabaseClient
        .from('poker_entries')
        .update({ status: 'canceled' })
        .eq('stripe_payment_intent_id', paymentId);
      break;
    case 'voucher':
      await supabaseClient
        .from('chip_vouchers')
        .update({ status: 'canceled' })
        .eq('stripe_payment_intent_id', paymentId);
      break;
    case 'order':
      await supabaseClient
        .from('orders')
        .update({ status: 'canceled' })
        .eq('stripe_payment_intent_id', paymentId);
      break;
  }
}

async function handleRefund(supabaseClient: any, metadata: any, paymentId: string) {
  const { purpose } = metadata;
  logStep("Payment refunded", { purpose, paymentId });

  switch (purpose) {
    case 'event':
      await supabaseClient
        .from('event_tickets')
        .update({ status: 'refunded', barcode: null })
        .eq('stripe_payment_intent_id', paymentId);
      break;
    case 'tourney':
      await supabaseClient
        .from('poker_entries')
        .update({ status: 'refunded', barcode: null })
        .eq('stripe_payment_intent_id', paymentId);
      break;
    case 'voucher':
      await supabaseClient
        .from('chip_vouchers')  
        .update({ status: 'refunded', barcode: null })
        .eq('stripe_payment_intent_id', paymentId);
      break;
    case 'order':
      await supabaseClient
        .from('orders')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentId);
      break;
  }
}