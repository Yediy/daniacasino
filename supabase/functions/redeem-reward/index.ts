import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { rewardId } = await req.json();

    if (!rewardId) {
      return new Response(
        JSON.stringify({ error: 'Reward ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start transaction by getting reward details
    const { data: reward, error: rewardError } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('id', rewardId)
      .eq('active', true)
      .single();

    if (rewardError || !reward) {
      return new Response(
        JSON.stringify({ error: 'Reward not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with current points
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has enough points
    if (profile.points < reward.points_cost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient points' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check tier requirement
    if (reward.min_tier && profile.tier !== reward.min_tier && profile.tier !== 'Admin') {
      return new Response(
        JSON.stringify({ error: `${reward.min_tier} tier required` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check stock
    if (reward.stock_qty !== null && reward.stock_qty <= 0) {
      return new Response(
        JSON.stringify({ error: 'Reward out of stock' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate barcode for redemption
    const barcode = `RWD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    let voucherId = null;
    let tournamentEntryId = null;

    // Create appropriate voucher or entry based on reward type
    if (reward.reward_type === 'chip_voucher') {
      const { data: voucher, error: voucherError } = await supabase
        .from('chip_vouchers')
        .insert({
          user_id: user.id,
          amount: reward.monetary_value || reward.points_cost * 10, // Default conversion: 1 pt = $0.10
          voucher_type: 'CHIP',
          status: 'paid',
          barcode: barcode,
          barcode_format: 'Code128',
        })
        .select('id')
        .single();

      if (voucherError) throw voucherError;
      voucherId = voucher.id;
    } else if (reward.reward_type === 'tournament_entry') {
      // Note: This assumes a default tournament exists or you'd need to specify which tournament
      // For now, we'll just create a generic entry that can be applied to any tournament
      const { data: entry, error: entryError } = await supabase
        .from('poker_entries')
        .insert({
          user_id: user.id,
          tourney_id: '00000000-0000-0000-0000-000000000000', // Placeholder - would need actual tournament
          amount: reward.monetary_value || 0,
          status: 'paid',
          barcode: barcode,
          barcode_format: 'PDF417',
        })
        .select('id')
        .single();

      if (entryError) throw entryError;
      tournamentEntryId = entry.id;
    }

    // Create redemption record
    const { error: redemptionError } = await supabase
      .from('rewards_redemptions')
      .insert({
        user_id: user.id,
        reward_id: rewardId,
        points_spent: reward.points_cost,
        voucher_id: voucherId,
        tournament_entry_id: tournamentEntryId,
        status: 'active',
      });

    if (redemptionError) throw redemptionError;

    // Deduct points from user
    const { error: updatePointsError } = await supabase
      .from('profiles')
      .update({ points: profile.points - reward.points_cost })
      .eq('id', user.id);

    if (updatePointsError) throw updatePointsError;

    // Record loyalty transaction
    const { error: txnError } = await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'redemption',
        points_change: -reward.points_cost,
        description: `Redeemed: ${reward.title}`,
        reference_id: rewardId,
      });

    if (txnError) throw txnError;

    // Update stock if applicable
    if (reward.stock_qty !== null) {
      const { error: stockError } = await supabase
        .from('rewards_catalog')
        .update({ stock_qty: reward.stock_qty - 1 })
        .eq('id', rewardId);

      if (stockError) throw stockError;
    }

    // Create notification
    const { error: notifError } = await supabase.rpc('create_notification', {
      target_user_id: user.id,
      notification_type: 'reward_redeemed',
      notification_title: 'Reward Redeemed!',
      notification_message: `Successfully redeemed: ${reward.title}`,
      ref_id: rewardId,
      ref_type: 'reward',
    });

    if (notifError) console.error('Notification error:', notifError);

    return new Response(
      JSON.stringify({ 
        success: true, 
        barcode,
        voucherId,
        tournamentEntryId,
        pointsRemaining: profile.points - reward.points_cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error redeeming reward:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
