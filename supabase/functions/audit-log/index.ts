import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUDIT-LOG] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Audit log request received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      event_type,
      resource_type,
      resource_id,
      user_id,
      staff_id,
      details,
      metadata
    } = await req.json();

    if (!event_type || !resource_type) {
      return new Response(JSON.stringify({ error: "event_type and resource_type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create audit log entry
    const auditEntry = {
      event_type,
      resource_type,
      resource_id: resource_id || null,
      user_id: user_id || null,
      staff_id: staff_id || null,
      details: details || {},
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown"
    };

    const { data, error } = await supabaseClient
      .from('audit_logs')
      .insert(auditEntry)
      .select()
      .single();

    if (error) {
      logStep("Failed to create audit log", { error });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to create audit log" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Audit log created", { 
      id: data.id, 
      event_type, 
      resource_type 
    });

    return new Response(JSON.stringify({ 
      success: true,
      audit_id: data.id
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