import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REDEEM-TICKET] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Redemption request received");

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

    const { barcode } = await req.json();
    if (!barcode) {
      return new Response(JSON.stringify({ error: "Barcode required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing barcode", { barcode });

    // Validate barcode format and extract data
    if (!barcode.startsWith('TICKET-')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid ticket barcode format" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('event_tickets')
      .select(`
        *,  
        events!inner(
          id,
          title,
          event_date,
          event_time,
          venue
        )
      `)
      .eq('barcode', barcode)
      .eq('status', 'paid')
      .single();

    if (ticketError || !ticket) {
      logStep("Ticket not found", { barcode, error: ticketError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid or already redeemed ticket" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check event timing
    const eventDateTime = new Date(`${ticket.events.event_date}T${ticket.events.event_time}`);
    const now = new Date();
    const timeDiff = eventDateTime.getTime() - now.getTime();
    const hoursUntilEvent = timeDiff / (1000 * 60 * 60);

    // Allow redemption starting 2 hours before event
    if (hoursUntilEvent > 2) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Event check-in opens 2 hours before start time. Event starts at ${eventDateTime.toLocaleString()}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if event has passed (allow 1 hour after start)
    if (hoursUntilEvent < -1) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Event has ended, ticket no longer valid" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redeem the ticket
    const redeemTime = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('event_tickets')
      .update({ 
        status: 'redeemed',
        redeemed_at: redeemTime,
        redeemed_by_staff_id: staffUser.id
      })
      .eq('id', ticket.id);

    if (updateError) {
      logStep("Failed to update ticket", { error: updateError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to redeem ticket" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit event
    await supabaseClient
      .from('audit_logs')
      .insert({
        event_type: 'ticket_redeemed',
        resource_type: 'event_ticket',
        resource_id: ticket.id,
        staff_id: staffUser.id,
        details: {
          barcode,
          event_id: ticket.event_id,
          event_title: ticket.events.title,
          redeemed_at: redeemTime
        }
      });

    // Broadcast update
    await supabaseClient.channel('staff-updates').send({
      type: 'broadcast',
      event: 'ticket_redeemed',
      payload: {
        ticketId: ticket.id,
        eventTitle: ticket.events.title,
        redeemedBy: staffUser.id
      }
    });

    logStep("Ticket redeemed successfully", { 
      ticketId: ticket.id, 
      eventTitle: ticket.events.title 
    });

    return new Response(JSON.stringify({ 
      success: true,
      ticket: {
        id: ticket.id,
        event_title: ticket.events.title,
        event_date: ticket.events.event_date,
        event_time: ticket.events.event_time,
        venue: ticket.events.venue,
        quantity: ticket.qty,
        redeemed_at: redeemTime
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