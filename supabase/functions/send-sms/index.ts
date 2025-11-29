import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // SECURITY: Authorize - only Staff or Admin can send SMS
    const { data: isStaff } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'Staff'
    });

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'Admin'
    });

    if (!isStaff && !isAdmin) {
      console.error(`User ${user.id} attempted SMS without Staff/Admin role`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Staff or Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} authorized as ${isAdmin ? 'Admin' : 'Staff'}`);

    const { to, message, type, userId } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    console.log(`Sending SMS to ${to}: ${message.substring(0, 50)}...`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: twilioPhoneNumber,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio error:', error);
      throw new Error(`Twilio API error: ${error}`);
    }

    const twilioData = await twilioResponse.json();
    console.log('SMS sent successfully:', twilioData.sid);

    // Log the SMS notification
    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: type || 'sms',
        title: 'SMS Sent',
        message: message,
        data: { phone: to, sms_sid: twilioData.sid, sent_by: user.id }
      });
    }

    // Audit log the SMS action
    await supabase.rpc('log_sensitive_action', {
      action_type: 'sms_sent',
      resource_type: 'sms_notification',
      resource_id: twilioData.sid,
      details: {
        to_phone: to.substring(0, 6) + '****', // Partially redacted
        message_type: type || 'general',
        target_user_id: userId,
        sent_by_staff: user.id
      }
    });

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
