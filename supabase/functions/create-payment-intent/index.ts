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
    const { purpose, refId, amountCents, description } = requestBody;
    
    if (!purpose || !refId || !amountCents) {
      throw new Error("Missing required fields: purpose, refId, amountCents");
    }

    logStep("Payment request", { purpose, refId, amountCents, description });

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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
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
          amount: amountCents,
          status: 'pending',
          stripe_payment_intent_id: paymentIntent.id
        });
        break;
      case 'tourney':
        await supabaseClient.from('poker_entries').insert({
          user_id: user.id,
          tourney_id: refId,
          amount: amountCents,
          status: 'pending',
          stripe_payment_intent_id: paymentIntent.id
        });
        break;
      case 'voucher':
        await supabaseClient.from('chip_vouchers').insert({
          user_id: user.id,
          amount: amountCents - (requestBody.fee || 0),
          fee: requestBody.fee || 0,
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