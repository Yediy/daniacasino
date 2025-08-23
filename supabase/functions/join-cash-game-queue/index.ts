import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[JOIN-QUEUE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { listId, notes } = await req.json();
    if (!listId) throw new Error("Missing listId");

    // Check if user is already in queue for this game
    const { data: existingQueue } = await supabaseClient
      .from('cash_game_queue')
      .select('*')
      .eq('list_id', listId)
      .eq('user_id', user.id)
      .single();

    if (existingQueue) {
      return new Response(JSON.stringify({ 
        error: "Already in queue for this game",
        position: existingQueue.position 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get current wait count
    const { data: gameList } = await supabaseClient
      .from('cash_game_lists')
      .select('wait_count, game')
      .eq('id', listId)
      .single();

    if (!gameList) throw new Error("Game list not found");

    const newPosition = gameList.wait_count + 1;

    // Add to queue
    const { data: queueEntry, error: insertError } = await supabaseClient
      .from('cash_game_queue')
      .insert({
        list_id: listId,
        user_id: user.id,
        position: newPosition,
        checkin_status: 'remote'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update wait count
    await supabaseClient
      .from('cash_game_lists')
      .update({ wait_count: newPosition })
      .eq('id', listId);

    logStep("Added to queue", { 
      game: gameList.game, 
      position: newPosition,
      queueId: queueEntry.id 
    });

    return new Response(JSON.stringify({
      success: true,
      position: newPosition,
      game: gameList.game,
      queueId: queueEntry.id
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