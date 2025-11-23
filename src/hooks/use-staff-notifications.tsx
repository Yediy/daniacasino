import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffNotification {
  id: string;
  type: 'new_order' | 'order_update';
  title: string;
  message: string;
  order_id?: string;
  vendor_id?: string;
  timestamp: string;
}

export const useStaffNotifications = () => {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('staff-order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const order = payload.new as any;
          
          // Fetch vendor details
          const { data: vendor } = await supabase
            .from('dining_vendors')
            .select('name')
            .eq('id', order.vendor_id)
            .single();

          const notification: StaffNotification = {
            id: `order-new-${order.id}`,
            type: 'new_order',
            title: '🔔 New Order',
            message: `New order #${order.pickup_code || 'pending'} at ${vendor?.name || 'Unknown Vendor'}`,
            order_id: order.id,
            vendor_id: order.vendor_id,
            timestamp: new Date().toISOString(),
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
          });

          // Play notification sound (optional)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLTgTUIFmm98OScTgwOUKjk77RgGwU7k9bxzn0vBSV+zPDahDoKElyx6OipWBUIRp3d8sBrJAUsg8/y04Y5CBdqvfDlm00KD1Cn4/C0YRoFO5XW8c59LgQmfczx3oU6ChJcr+jnq1cXCEee3fLAayQFLIPP8tOGOQgXar3w5ZtNCg9Qp+PwtGEaBTuV1vHOfS4EJn3M8d6FOgoSXK/o56tXFwhHnt3ywGskBSyDz/LThjkIF2q98OWbTQoPUKfj8LRhGgU7ldbxzn0uBCZ9zPHehToKElyx6OepWBcIR57d8r9rJAUshM7y04U5CBhqvfDlm00KD1Cn4++0YRsFO5TW8c98LQQnfczy3oU6ChJcr+jnq1cXCEee3fLAayQFLIPP8tOGOQgXar3w5ZtNCg9Qp+PwtGEaBTuV1vHOfS4EJn3M8d6FOgoSXK/o56tXFwhHnt3ywGskBSyDz/LThjkIF2q98OWbTQoPUKfj8LRhGgU7ldbxzn0uBCZ9zPHehToKElyx6OepWBcIR57d8r9rJAUshM7y04U5CBhqvfDlm00KD1Cn4++0YRsFO5TW8c98LQQnfczy3oU6ChJcr+jnq1cXCEee3fK/ayQFLITO8tOFOQgYar3w5ZtNCg9Qp+PvtGEbBTuU1vHPfC0EJ3/M8t6FOgoSXK/o56tXFwhHnt3yv2skBSyEzvLThTkIGGq98OWbTQoPUKfj77RhGwU7ldbxz3wtBCh+zPHfhToKE1uw6Oeo');
            audio.play().catch(() => {});
          } catch (error) {
            // Ignore audio errors
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const order = payload.new as any;
          
          if (order.status === 'ready') {
            const { data: vendor } = await supabase
              .from('dining_vendors')
              .select('name')
              .eq('id', order.vendor_id)
              .single();

            const notification: StaffNotification = {
              id: `order-ready-${order.id}`,
              type: 'order_update',
              title: '✅ Order Ready',
              message: `Order #${order.pickup_code} is ready for pickup at ${vendor?.name || 'Unknown'}`,
              order_id: order.id,
              vendor_id: order.vendor_id,
              timestamp: new Date().toISOString(),
            };

            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            toast({
              title: notification.title,
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [toast]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};