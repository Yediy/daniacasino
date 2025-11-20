import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// SECURITY FIX: Restrict CORS to specific origins
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://lcfsuhdcexrbqevdojlw.supabase.co",
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

  // Authenticate user
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

  // Check if user has Admin role using new role system
  const { data: hasAdminRole, error: adminRoleError } = await supabaseClient.rpc('has_role', {
    _user_id: userData.user.id,
    _role: 'Admin'
  });

  if (adminRoleError || !hasAdminRole) {
    logStep("Access denied - admin privileges required");
    return new Response(JSON.stringify({ error: "Access denied. Admin privileges required." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

    // Input validation with Zod
    const auditLogSchema = z.object({
      event_type: z.string().min(1).max(100, { message: "Event type must be between 1 and 100 characters" }),
      resource_type: z.string().min(1).max(100, { message: "Resource type must be between 1 and 100 characters" }),
      resource_id: z.string().max(255).optional(),
      user_id: z.string().uuid().optional(),
      staff_id: z.string().uuid().optional(),
      details: z.record(z.any()).optional(),
      metadata: z.record(z.any()).optional()
    });

    const requestBody = await req.json();
    const validatedData = auditLogSchema.parse(requestBody);
    
    const {
      event_type,
      resource_type,
      resource_id,
      user_id,
      staff_id,
      details,
      metadata
    } = validatedData;

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