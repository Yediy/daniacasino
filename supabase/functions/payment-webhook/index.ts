import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-WEBHOOK] ${step}${detailsStr}`);
};

const generateBarcode = (type: string, data: any): string => {
  // Simple barcode generation - in production use proper barcode library
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(7);
  return `${type.toUpperCase()}-${timestamp}-${randomPart}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
      // Note: In production, use proper webhook endpoint secret
      event = stripe.webhooks.constructEvent(body, sig, "we_test_webhook_secret");
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    logStep("Event type", { type: event.type });

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { user_id, purpose, ref_id } = paymentIntent.metadata;

      logStep("Payment succeeded", { 
        paymentIntentId: paymentIntent.id, 
        purpose, 
        refId: ref_id, 
        userId: user_id 
      });

      const currentTime = new Date().toISOString();
      const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      switch (purpose) {
        case 'event':
          const barcode = generateBarcode('TICKET', { paymentIntentId: paymentIntent.id });
          await supabaseClient
            .from('event_tickets')
            .update({ 
              status: 'paid', 
              barcode,
              issued_at: currentTime
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
          logStep("Event ticket updated", { barcode });
          break;

        case 'tourney':
          const tourneyBarcode = generateBarcode('TOURNEY', { paymentIntentId: paymentIntent.id });
          await supabaseClient
            .from('poker_entries')
            .update({ 
              status: 'paid', 
              barcode: tourneyBarcode,
              will_call_window_start: currentTime,
              will_call_window_end: twoHoursLater,
              issued_at: currentTime
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
          logStep("Poker entry updated", { barcode: tourneyBarcode });
          break;

        case 'voucher':
          const voucherBarcode = generateBarcode('VOUCHER', { paymentIntentId: paymentIntent.id });
          await supabaseClient
            .from('chip_vouchers')
            .update({ 
              status: 'paid', 
              barcode: voucherBarcode,
              redeem_window_start: currentTime,
              redeem_window_end: twoHoursLater
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
          logStep("Chip voucher updated", { barcode: voucherBarcode });
          break;

        case 'order':
          const orderCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await supabaseClient
            .from('orders')
            .update({ 
              status: 'placed',
              pickup_code: orderCode,
              pickup_eta: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min default
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
          logStep("Order updated", { pickupCode: orderCode });
          break;
      }
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