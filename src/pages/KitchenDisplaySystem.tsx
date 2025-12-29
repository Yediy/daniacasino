import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, VolumeX, Maximize, Clock, AlertTriangle, CheckCircle, ChefHat, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  pickup_code: string;
  total: number;
  status: string;
  pickup_eta?: string;
  placed_at: string;
  dest_table?: string;
  dest_seat?: string;
  vendor_id: string;
  user_id: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_cache?: string;
  qty: number;
  notes?: string;
}

interface Vendor {
  id: string;
  name: string;
  location: string;
}

// Timer thresholds in minutes
const TIMER_WARNING = 5;  // Yellow after 5 min
const TIMER_CRITICAL = 10; // Red after 10 min

export const KitchenDisplaySystem = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update time every second for timer calculations
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchOrders();
      
      const ordersChannel = supabase
        .channel('kds-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${selectedVendor}`
        }, () => {
          fetchOrders();
          if (soundEnabled) playNotificationSound();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
      };
    }
  }, [selectedVendor, soundEnabled]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('dining_vendors')
        .select('id, name, location')
        .eq('active', true);

      if (error) throw error;
      setVendors(data || []);
      
      if (data && data.length > 0) {
        setSelectedVendor(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchOrders = async () => {
    if (!selectedVendor) return;

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', selectedVendor)
        .in('status', ['placed', 'accepted', 'prepping', 'ready'])
        .order('placed_at', { ascending: true });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const orderIds = ordersData?.map(o => o.id) || [];
      if (orderIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const itemsByOrder = (itemsData || []).reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        }, {} as Record<string, OrderItem[]>);

        setOrderItems(itemsByOrder);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      if (status === 'ready' && soundEnabled) {
        playReadySound();
      }

      toast({
        title: "Order Updated",
        description: `Order marked as ${status}`,
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio notification failed:', error);
    }
  }, []);

  const playReadySound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Two-tone chime for ready
      [523, 659].forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (i * 0.15);
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });
    } catch (error) {
      console.log('Audio notification failed:', error);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getElapsedMinutes = (placedAt: string) => {
    const placed = new Date(placedAt);
    return Math.floor((currentTime.getTime() - placed.getTime()) / 60000);
  };

  const getTimerStatus = (minutes: number) => {
    if (minutes >= TIMER_CRITICAL) return 'critical';
    if (minutes >= TIMER_WARNING) return 'warning';
    return 'normal';
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  // Group orders by status
  const ordersByStatus = useMemo(() => ({
    placed: orders.filter(o => o.status === 'placed' || o.status === 'accepted'),
    prepping: orders.filter(o => o.status === 'prepping'),
    ready: orders.filter(o => o.status === 'ready'),
  }), [orders]);

  // Count critical/warning orders
  const alertCounts = useMemo(() => {
    let critical = 0, warning = 0;
    orders.filter(o => o.status !== 'ready').forEach(o => {
      const mins = getElapsedMinutes(o.placed_at);
      if (mins >= TIMER_CRITICAL) critical++;
      else if (mins >= TIMER_WARNING) warning++;
    });
    return { critical, warning };
  }, [orders, currentTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl font-bold text-muted-foreground">Loading KDS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(220,20%,10%)] text-foreground">
      {/* KDS Header - compact for max screen real estate */}
      <header className="sticky top-0 bg-[hsl(220,20%,8%)] border-b border-border/30 z-10 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-accent flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              KDS
            </h1>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger className="w-48 bg-background/10 border-border/30">
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Summary */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-base px-3 py-1">
                New: {ordersByStatus.placed.length}
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-base px-3 py-1">
                Prepping: {ordersByStatus.prepping.length}
              </Badge>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-base px-3 py-1">
                Ready: {ordersByStatus.ready.length}
              </Badge>
            </div>

            {/* Alert indicators */}
            {alertCounts.critical > 0 && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse text-base px-3 py-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {alertCounts.critical} Critical
              </Badge>
            )}
            {alertCounts.warning > 0 && (
              <Badge className="bg-warning text-warning-foreground text-base px-3 py-1">
                <Clock className="h-4 w-4 mr-1" />
                {alertCounts.warning} Warning
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-lg">
              {currentTime.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "h-10 w-10",
                soundEnabled ? "text-green-400" : "text-muted-foreground"
              )}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-10 w-10"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Order Grid - optimized for large monitors */}
      <main className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-80px)]">
          {/* New Orders Column */}
          <OrderColumn
            title="NEW ORDERS"
            icon={<Flame className="h-5 w-5" />}
            orders={ordersByStatus.placed}
            orderItems={orderItems}
            onUpdateStatus={updateOrderStatus}
            getElapsedMinutes={getElapsedMinutes}
            getTimerStatus={getTimerStatus}
            formatTime={formatTime}
            statusColor="bg-blue-500"
            nextStatus="prepping"
            nextLabel="START"
          />

          {/* Prepping Column */}
          <OrderColumn
            title="PREPPING"
            icon={<ChefHat className="h-5 w-5" />}
            orders={ordersByStatus.prepping}
            orderItems={orderItems}
            onUpdateStatus={updateOrderStatus}
            getElapsedMinutes={getElapsedMinutes}
            getTimerStatus={getTimerStatus}
            formatTime={formatTime}
            statusColor="bg-yellow-500"
            nextStatus="ready"
            nextLabel="READY"
          />

          {/* Ready Column */}
          <OrderColumn
            title="READY FOR PICKUP"
            icon={<CheckCircle className="h-5 w-5" />}
            orders={ordersByStatus.ready}
            orderItems={orderItems}
            onUpdateStatus={updateOrderStatus}
            getElapsedMinutes={getElapsedMinutes}
            getTimerStatus={getTimerStatus}
            formatTime={formatTime}
            statusColor="bg-green-500"
            nextStatus="picked_up"
            nextLabel="PICKED UP"
          />
        </div>
      </main>
    </div>
  );
};

interface OrderColumnProps {
  title: string;
  icon: React.ReactNode;
  orders: Order[];
  orderItems: Record<string, OrderItem[]>;
  onUpdateStatus: (orderId: string, status: string) => void;
  getElapsedMinutes: (placedAt: string) => number;
  getTimerStatus: (minutes: number) => string;
  formatTime: (minutes: number) => string;
  statusColor: string;
  nextStatus: string;
  nextLabel: string;
}

const OrderColumn = ({
  title,
  icon,
  orders,
  orderItems,
  onUpdateStatus,
  getElapsedMinutes,
  getTimerStatus,
  formatTime,
  statusColor,
  nextStatus,
  nextLabel,
}: OrderColumnProps) => (
  <div className="flex flex-col h-full">
    <div className={cn("flex items-center gap-2 px-4 py-3 rounded-t-lg", statusColor)}>
      {icon}
      <span className="font-bold text-lg uppercase tracking-wide">{title}</span>
      <Badge variant="secondary" className="ml-auto bg-background/20 text-foreground">
        {orders.length}
      </Badge>
    </div>
    <div className="flex-1 overflow-y-auto bg-background/5 rounded-b-lg p-2 space-y-2">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        {orders.map(order => (
          <KDSOrderCard
            key={order.id}
            order={order}
            items={orderItems[order.id] || []}
            onUpdateStatus={onUpdateStatus}
            elapsedMinutes={getElapsedMinutes(order.placed_at)}
            timerStatus={getTimerStatus(getElapsedMinutes(order.placed_at))}
            formatTime={formatTime}
            nextStatus={nextStatus}
            nextLabel={nextLabel}
          />
        ))}
      </div>
      {orders.length === 0 && (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No orders
        </div>
      )}
    </div>
  </div>
);

interface KDSOrderCardProps {
  order: Order;
  items: OrderItem[];
  onUpdateStatus: (orderId: string, status: string) => void;
  elapsedMinutes: number;
  timerStatus: string;
  formatTime: (minutes: number) => string;
  nextStatus: string;
  nextLabel: string;
}

const KDSOrderCard = ({
  order,
  items,
  onUpdateStatus,
  elapsedMinutes,
  timerStatus,
  formatTime,
  nextStatus,
  nextLabel,
}: KDSOrderCardProps) => {
  const timerColors = {
    normal: 'bg-muted text-muted-foreground',
    warning: 'bg-warning/20 text-warning border border-warning/50',
    critical: 'bg-destructive/20 text-destructive border border-destructive/50 animate-pulse',
  };

  return (
    <div
      className={cn(
        "rounded-lg p-3 transition-all",
        timerStatus === 'critical' 
          ? "bg-destructive/10 border-2 border-destructive" 
          : timerStatus === 'warning'
          ? "bg-warning/10 border-2 border-warning/50"
          : "bg-card border border-border/50"
      )}
    >
      {/* Header with pickup code and timer */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-2xl font-black text-accent tracking-wider">
          {order.pickup_code || order.id.slice(-4).toUpperCase()}
        </span>
        <Badge className={cn("text-sm font-mono", timerColors[timerStatus as keyof typeof timerColors])}>
          <Clock className="h-3 w-3 mr-1" />
          {formatTime(elapsedMinutes)}
        </Badge>
      </div>

      {/* Destination if available */}
      {(order.dest_table || order.dest_seat) && (
        <div className="text-sm text-muted-foreground mb-2">
          📍 Table {order.dest_table}{order.dest_seat && ` / Seat ${order.dest_seat}`}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-2 text-sm">
            <span className="font-bold text-accent min-w-[1.5rem]">{item.qty}×</span>
            <span className="flex-1">{item.name_cache || `Item ${item.menu_item_id.slice(-4)}`}</span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground italic">No items</div>
        )}
      </div>

      {/* Action button */}
      <Button
        onClick={() => onUpdateStatus(order.id, nextStatus)}
        className={cn(
          "w-full font-bold text-base h-12",
          timerStatus === 'critical' && "animate-pulse"
        )}
        variant={timerStatus === 'critical' ? "destructive" : "default"}
      >
        {nextLabel}
      </Button>
    </div>
  );
};

export default KitchenDisplaySystem;
