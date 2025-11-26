import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { queueId, seatNo, tableId } = await req.json();

    if (!queueId || !seatNo || !tableId) {
      throw new Error('Missing required parameters');
    }

    // Get queue entry
    const { data: queueEntry, error: queueError } = await supabase
      .from('cash_game_queue')
      .select('*, profiles:user_id(name, phone)')
      .eq('id', queueId)
      .single();

    if (queueError || !queueEntry) {
      throw new Error('Queue entry not found');
    }

    // Check if seat is available
    const { data: seat, error: seatError } = await supabase
      .from('poker_seats')
      .select('*')
      .eq('table_id', tableId)
      .eq('seat_no', seatNo)
      .single();

    if (seatError || !seat) {
      throw new Error('Seat not found');
    }

    if (seat.status !== 'open') {
      throw new Error('Seat is not available');
    }

    // Get hold duration from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('cash_game_hold_minutes')
      .eq('id', 'global')
      .single();

    const holdMinutes = settings?.cash_game_hold_minutes || 15;
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

    // Create seat hold
    const { data: hold, error: holdError } = await supabase
      .from('seat_holds')
      .insert({
        user_id: queueEntry.user_id,
        table_id: tableId,
        seat_no: seatNo,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (holdError) {
      throw holdError;
    }

    // Update seat status
    await supabase
      .from('poker_seats')
      .update({ status: 'held', user_id: queueEntry.user_id })
      .eq('table_id', tableId)
      .eq('seat_no', seatNo);

    // Update queue entry
    await supabase
      .from('cash_game_queue')
      .update({
        checkin_status: 'called',
        hold_expires_at: expiresAt,
      })
      .eq('id', queueId);

    // Create notification
    await supabase.rpc('create_notification', {
      target_user_id: queueEntry.user_id,
      notification_type: 'seat_ready',
      notification_title: 'Your Seat is Ready',
      notification_message: `Seat ${seatNo} is ready. Please claim within ${holdMinutes} minutes.`,
      ref_id: hold.id,
      ref_type: 'seat_hold',
    });

    // Send SMS notification if phone number exists
    if (queueEntry.profiles?.phone) {
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioSid && twilioToken && twilioPhone) {
        try {
          const message = `Your seat at the poker table is ready! Seat ${seatNo}. Please check in within ${holdMinutes} minutes.`;
          
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

          await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: queueEntry.profiles.phone,
              From: twilioPhone,
              Body: message,
            }),
          });

          console.log('SMS sent successfully to', queueEntry.profiles.phone);
        } catch (smsError) {
          console.error('Failed to send SMS:', smsError);
          // Don't fail the request if SMS fails
        }
      }
    }

    // Log audit trail
    await supabase.rpc('log_sensitive_action', {
      action_type: 'seat_reserved',
      resource_type: 'seat_hold',
      resource_id: hold.id,
      details: {
        table_id: tableId,
        seat_no: seatNo,
        queue_id: queueId,
        user_id: queueEntry.user_id,
        expires_at: expiresAt,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        holdId: hold.id,
        expiresAt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in reserve-seat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
