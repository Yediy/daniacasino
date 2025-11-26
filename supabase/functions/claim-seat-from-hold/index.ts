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

    // Use the claim_cash_seat database function for atomic seat claiming
    // This function handles all the logic in a single transaction with proper locking
    const { error: claimError } = await supabase.rpc('claim_cash_seat', {
      p_table_id: hold.table_id,
      p_seat_no: hold.seat_no,
      p_user_id: user.id,
      p_hold_id: validatedData.hold_id,
    });

    if (claimError) {
      console.error('Error claiming seat:', claimError);
      
      let errorMessage = 'Failed to claim seat';
      let statusCode = 500;
      
      if (claimError.message?.includes('seat_not_found')) {
        errorMessage = 'Seat not found';
        statusCode = 404;
      } else if (claimError.message?.includes('seat_not_available')) {
        errorMessage = 'Seat is no longer available';
        statusCode = 409;
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove user from queue if they're in it
    await supabase
      .from('cash_game_queue')
      .delete()
      .eq('user_id', user.id)
      .eq('list_id', hold.table_id);

    console.log('Seat claimed successfully');

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
