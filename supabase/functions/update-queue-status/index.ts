import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}$ : '';
  console.log(`[UPDATE-QUEUE] ${step}${detailsStr}`);
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

    const { queueId, action } = await req.json();
    if (!queueId || !action) throw new Error("Missing queueId or action");

    logStep("Queue update request", { queueId, action });

    // Get current queue entry
    const { data: queueEntry } = await supabaseClient
      .from('cash_game_queue')
      .select('*')
      .eq('id', queueId)
      .eq('user_id', user.id)
      .single();

    if (!queueEntry) throw new Error("Queue entry not found");

    let updateData: any = {};
    
    switch (action) {
      case 'check_in':
        updateData.checkin_status = 'on_site';
        logStep("Checking in user on-site");
        break;
      case 'leave_queue':
        // Remove from queue and update positions
        await supabaseClient
          .from('cash_game_queue')
          .delete()
          .eq('id', queueId);
          
        // Update positions for remaining queue members
        await supabaseClient
          .from('cash_game_queue')
          .update({ position: supabaseClient.sql`position - 1` })
          .eq('list_id', queueEntry.list_id)
          .gt('position', queueEntry.position);
          
        // Update wait count
        const { data: currentList } = await supabaseClient
          .from('cash_game_lists')
          .select('wait_count')
          .eq('id', queueEntry.list_id)
          .single();
          
        if (currentList) {
          await supabaseClient
            .from('cash_game_lists')
            .update({ wait_count: Math.max(0, currentList.wait_count - 1) })
            .eq('id', queueEntry.list_id);
        }
        
        logStep("Removed from queue", { removedPosition: queueEntry.position });
        
        return new Response(JSON.stringify({
          success: true,
          action: 'removed_from_queue'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
    }

    if (Object.keys(updateData).length > 0) {
      await supabaseClient
        .from('cash_game_queue')
        .update(updateData)
        .eq('id', queueId);
    }

    logStep("Queue entry updated", updateData);

    return new Response(JSON.stringify({
      success: true,
      action,
      queueId
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