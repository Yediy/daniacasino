import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPayload {
  title: string;
  message: string;
  type: 'seat_available' | 'order_ready' | 'order_new' | 'general';
  referenceId?: string;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  const showNotification = (payload: NotificationPayload) => {
    // Show toast notification
    toast({
      title: payload.title,
      description: payload.message,
      duration: 5000,
    });

    // Show browser notification if permission granted
    if (permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.referenceId || 'general',
        requireInteraction: payload.type === 'seat_available',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const subscribeToNotifications = (userId: string) => {
    // Subscribe to notification events for this user
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          showNotification({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            referenceId: notification.reference_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    permission,
    requestPermission,
    showNotification,
    subscribeToNotifications,
  };
}
