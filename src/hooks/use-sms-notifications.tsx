import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SMSNotificationParams {
  to: string;
  message: string;
  type?: 'seat_available' | 'order_ready' | 'tournament_reminder' | 'general';
  userId?: string;
}

export const useSMSNotifications = () => {
  const { toast } = useToast();

  const sendSMS = async ({ to, message, type = 'general', userId }: SMSNotificationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { to, message, type, userId }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error('Failed to send SMS');
      }

      console.log('SMS sent successfully:', data.sid);
      return { success: true, sid: data.sid };
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast({
        title: "SMS Failed",
        description: error instanceof Error ? error.message : "Failed to send SMS notification",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const sendSeatAvailableNotification = async (phone: string, tableName: string, userId: string) => {
    return sendSMS({
      to: phone,
      message: `Your seat at ${tableName} is ready! Please check in within 15 minutes.`,
      type: 'seat_available',
      userId
    });
  };

  const sendOrderReadyNotification = async (phone: string, pickupCode: string, userId: string) => {
    return sendSMS({
      to: phone,
      message: `Your order ${pickupCode} is ready for pickup!`,
      type: 'order_ready',
      userId
    });
  };

  const sendTournamentReminder = async (phone: string, tournamentName: string, startTime: string, userId: string) => {
    return sendSMS({
      to: phone,
      message: `Reminder: ${tournamentName} starts at ${startTime}. Good luck!`,
      type: 'tournament_reminder',
      userId
    });
  };

  return {
    sendSMS,
    sendSeatAvailableNotification,
    sendOrderReadyNotification,
    sendTournamentReminder
  };
};
