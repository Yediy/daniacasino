import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const generateBarcode = (type: string, data: any): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(7);
  return `${type.toUpperCase()}-${timestamp}-${randomPart}`;
};

const broadcastUpdate = async (supabaseClient: any, channel: string, payload: any) => {
  try {
    await supabaseClient.channel(channel).send({
      type: 'broadcast',
      event: 'update',
      payload
    });
    logStep("WS broadcast sent", { channel, payload });
  } catch (error) {
    logStep("WS broadcast failed", { error: error.message });
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

    logStep("Event type", { type: event.type });

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

    return new Response(JSON.stringify({ received: true }), {
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

async function handlePaymentSuccess(supabaseClient: any, purpose: string, refId: string, userId: string, paymentId: string, currentTime: string, twoHoursLater: string) {
  switch (purpose) {
    case 'event':
      const barcode = generateBarcode('TICKET', { paymentId });
      const { data: ticketData } = await supabaseClient
        .from('event_tickets')
        .update({ 
          status: 'paid', 
          barcode,
          issued_at: currentTime
        })
        .eq('stripe_payment_intent_id', paymentId)
        .select()
        .single();
      
      if (ticketData) {
        await broadcastUpdate(supabaseClient, 'wallet-updates', {
          type: 'ticket_issued',
          userId,
          ticketId: ticketData.id
        });
      }
      logStep("Event ticket updated", { barcode });
      break;

    case 'tourney':
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
        await broadcastUpdate(supabaseClient, 'wallet-updates', {
          type: 'entry_issued',
          userId,
          entryId: entryData.id
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
        await broadcastUpdate(supabaseClient, 'wallet-updates', {
          type: 'voucher_issued',
          userId,
          voucherId: voucherData.id
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
        await broadcastUpdate(supabaseClient, 'kitchen-updates', {
          type: 'order_placed',
          orderId: orderData.id
        });
        
        await broadcastUpdate(supabaseClient, 'wallet-updates', {
          type: 'order_placed',
          userId,
          orderId: orderData.id
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