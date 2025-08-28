import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Security Fix: Create secure endpoint for role management
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://lcfsuhdcexrbqevdojlw.supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-USER-ROLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Role update request received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate admin user
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

    const adminUser = userData.user;
    logStep("Admin authenticated", { adminId: adminUser.id });

    // Check if user has Admin role
    const { data: hasAdminRole, error: adminRoleError } = await supabaseClient.rpc('has_role', {
      _user_id: adminUser.id,
      _role: 'Admin'
    });

    if (adminRoleError || !hasAdminRole) {
      logStep("Access denied - Admin privileges required");
      return new Response(JSON.stringify({ error: "Access denied. Admin privileges required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { targetUserId, newRole } = await req.json();
    if (!targetUserId || !newRole) {
      return new Response(JSON.stringify({ error: "Target user ID and new role required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!['User', 'Staff', 'Admin'].includes(newRole)) {
      return new Response(JSON.stringify({ error: "Invalid role. Must be User, Staff, or Admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing role update", { targetUserId, newRole });

    // Remove existing roles for the user
    const { error: deleteError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId);

    if (deleteError) {
      logStep("Failed to remove existing roles", { error: deleteError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to update user role" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add new role
    const { error: insertError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: targetUserId,
        role: newRole,
        created_by: adminUser.id
      });

    if (insertError) {
      logStep("Failed to insert new role", { error: insertError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to assign new role" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log audit event
    await supabaseClient
      .from('audit_logs')
      .insert({
        event_type: 'user_role_updated',
        resource_type: 'user_role',
        resource_id: targetUserId,
        staff_id: adminUser.id,
        details: {
          target_user_id: targetUserId,
          new_role: newRole,
          updated_by: adminUser.id
        }
      });

    logStep("Role updated successfully", { 
      targetUserId, 
      newRole 
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `User role updated to ${newRole}`
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