import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const claimSeatSchema = z.object({
  hold_id: z.string().uuid(),
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
    const validatedData = claimSeatSchema.parse(body);

    console.log('Claiming seat hold:', validatedData.hold_id, 'for user:', user.id);

    // Fetch the seat hold
    const { data: hold, error: holdError } = await supabase
      .from('seat_holds')
      .select('*')
      .eq('id', validatedData.hold_id)
      .eq('user_id', user.id)
      .single();

    if (holdError || !hold) {
      console.error('Seat hold not found or not owned by user:', holdError);
      return new Response(
        JSON.stringify({ error: 'Seat hold not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if hold has expired
    const now = new Date();
    const expiresAt = new Date(hold.expires_at);
    if (expiresAt < now) {
      console.warn('Seat hold has expired:', hold.id);
      return new Response(
        JSON.stringify({ error: 'Seat hold has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Seat hold is valid, claiming seat:', hold.seat_no, 'at table:', hold.table_id);

    // Check if the seat exists and is still reserved
    const { data: seat, error: seatError } = await supabase
      .from('poker_seats')
      .select('*')
      .eq('table_id', hold.table_id)
      .eq('seat_no', hold.seat_no)
      .maybeSingle();

    if (seatError) {
      console.error('Error checking seat:', seatError);
      throw new Error(`Failed to check seat: ${seatError.message}`);
    }

    if (!seat || seat.status !== 'reserved' || seat.user_id !== user.id) {
      console.error('Seat is not reserved for this user');
      return new Response(
        JSON.stringify({ error: 'Seat is no longer available' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update seat to occupied
    const { error: updateError } = await supabase
      .from('poker_seats')
      .update({
        status: 'occupied',
        updated_at: new Date().toISOString(),
      })
      .eq('table_id', hold.table_id)
      .eq('seat_no', hold.seat_no);

    if (updateError) {
      console.error('Error updating seat:', updateError);
      throw new Error(`Failed to occupy seat: ${updateError.message}`);
    }

    // Also create entry in poker_table_players for backward compatibility
    const { error: playerInsertError } = await supabase
      .from('poker_table_players')
      .upsert({
        id: `${hold.table_id}-${hold.seat_no}`,
        table_id: hold.table_id,
        seat: hold.seat_no,
        user_id: user.id,
        status: 'active',
        stack: 0,
      }, { onConflict: 'id' });

    if (playerInsertError) {
      console.warn('Error creating player entry:', playerInsertError);
    }

    // Update poker table open seats count
    const { data: table } = await supabase
      .from('poker_tables')
      .select('open_seats, players')
      .eq('id', hold.table_id)
      .single();

    if (table) {
      await supabase
        .from('poker_tables')
        .update({
          open_seats: Math.max(0, (table.open_seats || 0) - 1),
          players: (table.players || 0) + 1,
        })
        .eq('id', hold.table_id);
    }

    // Delete the seat hold
    const { error: deleteError } = await supabase
      .from('seat_holds')
      .delete()
      .eq('id', validatedData.hold_id);

    if (deleteError) {
      console.warn('Failed to delete seat hold:', deleteError);
    }

    // Remove user from queue if they're in it
    await supabase
      .from('cash_game_queue')
      .delete()
      .eq('user_id', user.id)
      .eq('list_id', hold.table_id);

    console.log('Seat claimed successfully');

    // Create notification
    await supabase.rpc('create_notification', {
      target_user_id: user.id,
      notification_type: 'seat_claimed',
      notification_title: 'Seat Claimed',
      notification_message: `You have successfully claimed seat ${hold.seat_no} at table ${hold.table_id}.`,
      ref_id: hold.table_id,
      ref_type: 'poker_table',
    });

    // Log the action
    await supabase.rpc('log_sensitive_action', {
      action_type: 'seat_claimed',
      resource_type: 'poker_seat',
      resource_id: `${hold.table_id}-${hold.seat_no}`,
      details: {
        table_id: hold.table_id,
        seat_no: hold.seat_no,
        user_id: user.id,
        hold_id: validatedData.hold_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        table_id: hold.table_id,
        seat_no: hold.seat_no,
        message: 'Seat claimed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in claim-seat-from-hold function:', error);
    
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
