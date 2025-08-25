import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REDEEM-VOUCHER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Voucher redemption request received");

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

    const { barcode } = await req.json();
    if (!barcode) {
      return new Response(JSON.stringify({ error: "Barcode required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing voucher barcode", { barcode });

    // Validate barcode format
    if (!barcode.startsWith('VOUCHER-')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid voucher barcode format" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the voucher
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('chip_vouchers')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'paid')
      .single();

    if (voucherError || !voucher) {
      logStep("Voucher not found", { barcode, error: voucherError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid or already redeemed voucher" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check redemption window
    const now = new Date();
    const windowStart = new Date(voucher.redeem_window_start);
    const windowEnd = new Date(voucher.redeem_window_end);

    if (now < windowStart) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Redemption window not yet open. Available from ${windowStart.toLocaleString()}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (now > windowEnd) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Redemption window has expired. Was valid until ${windowEnd.toLocaleString()}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redeem the voucher
    const redeemTime = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('chip_vouchers')
      .update({ 
        status: 'redeemed',
        redeemed_at: redeemTime,
        redeemed_by_staff_id: staffUser.id
      })
      .eq('id', voucher.id);

    if (updateError) {
      logStep("Failed to update voucher", { error: updateError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to redeem voucher" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit event
    await supabaseClient
      .from('audit_logs')
      .insert({
        event_type: 'voucher_redeemed',
        resource_type: 'chip_voucher',
        resource_id: voucher.id,
        staff_id: staffUser.id,
        details: {
          barcode,
          amount: voucher.amount,
          redeemed_at: redeemTime
        }
      });

    // Broadcast update
    await supabaseClient.channel('staff-updates').send({
      type: 'broadcast',
      event: 'voucher_redeemed',
      payload: {
        voucherId: voucher.id,
        amount: voucher.amount,
        redeemedBy: staffUser.id
      }
    });

    logStep("Voucher redeemed successfully", { 
      voucherId: voucher.id, 
      amount: voucher.amount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      voucher: {
        id: voucher.id,
        amount: voucher.amount,
        redeemed_at: redeemTime,
        chip_value: voucher.amount / 100 // Convert cents to dollars
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