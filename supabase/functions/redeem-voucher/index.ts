import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Security Fix: Normalize CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security Fix: Improved logging hygiene
const logStep = (step: string, details?: any) => {
  // Sanitize sensitive information from logs
  const sanitizedDetails = details ? JSON.stringify(details).replace(/("token":\s*")[^"]+"/g, '$1***"').replace(/("email":\s*")[^"]+"/g, '$1***"') : '';
  console.log(`[REDEEM-VOUCHER] ${step}${sanitizedDetails ? ` - ${sanitizedDetails}` : ''}`);
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

    // Input validation with Zod
    const voucherRedeemSchema = z.object({
      barcode: z.string()
        .min(1, { message: "Barcode cannot be empty" })
        .max(100, { message: "Barcode too long" })
        .regex(/^VOUCHER-/, { message: "Invalid voucher barcode format" })
    });

    const requestBody = await req.json();
    const { barcode } = voucherRedeemSchema.parse(requestBody);

    logStep("Processing voucher barcode", { barcode });

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

    // Auto-create tournament entry if this is a tournament voucher
    let tournamentEntryId = null;
    if (voucher.voucher_type === 'TOURNAMENT_ENTRY' && voucher.tourney_id) {
      logStep("Auto-creating tournament entry", { tourneyId: voucher.tourney_id });
      
      const { data: entryData, error: entryError } = await supabaseClient
        .from('poker_entries')
        .insert({
          user_id: voucher.user_id,
          tourney_id: voucher.tourney_id,
          amount: 0, // Voucher entries are free
          status: 'paid',
          issued_at: redeemTime
        })
        .select('id')
        .single();

      if (entryError) {
        logStep("Warning: Failed to create tournament entry", { error: entryError });
      } else {
        tournamentEntryId = entryData.id;
        logStep("Tournament entry created", { entryId: tournamentEntryId });
        
        // Notify user about tournament registration
        await supabaseClient.rpc('create_notification', {
          target_user_id: voucher.user_id,
          notification_type: 'tournament_registered',
          notification_title: 'Tournament Entry Created',
          notification_message: 'Your tournament voucher has been redeemed and you are now registered for the tournament.',
          ref_id: tournamentEntryId,
          ref_type: 'poker_entry'
        });
      }
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

    // Security Fix: Use secure notifications instead of broadcasts
    await supabaseClient.rpc('create_notification', {
      target_user_id: voucher.user_id,
      notification_type: 'voucher_redeemed',
      notification_title: 'Voucher Redeemed',
      notification_message: `Your $${(voucher.amount / 100).toFixed(2)} chip voucher has been redeemed successfully.`,
      ref_id: voucher.id,
      ref_type: 'chip_voucher',
      notification_data: {
        amount: voucher.amount,
        redeemed_at: redeemTime
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