import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Volume2, VolumeX, MapPin, RefreshCw, Clock, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSMSNotifications } from "@/hooks/use-sms-notifications";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DroppableColumn } from "@/components/DroppableColumn";

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
  qty: number;
  notes?: string;
}

interface Vendor {
  id: string;
  name: string;
  location: string;
}

interface SlotBank {
  id: string;
  bank: string;
  room: string;
  total_slots: number;
  free_slots: number;
}

export const KitchenDashboard = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [slotBanks, setSlotBanks] = useState<SlotBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filter, setFilter] = useState<'active' | 'ready' | 'all'>('active');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();
  const { sendOrderReadyNotification } = useSMSNotifications();

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchOrders();
      
      // Set up realtime subscription for orders
      const ordersChannel = supabase
        .channel('kitchen-orders')
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

  useEffect(() => {
    if (showHeatmap) {
      fetchSlotBanks();
      
      // Set up realtime subscription for slots
      const slotsChannel = supabase
        .channel('kitchen-slots')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'slots'
        }, () => {
          fetchSlotBanks();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(slotsChannel);
      };
    }
  }, [showHeatmap]);

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
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
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

      // Fetch order items for each order
      const orderIds = ordersData?.map(o => o.id) || [];
      if (orderIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        // Group items by order_id
        const itemsByOrder = (itemsData || []).reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        }, {} as Record<string, OrderItem[]>);

        setOrderItems(itemsByOrder);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotBanks = async () => {
    try {
      // Try to get aggregated slot bank data first
      const { data: bankData, error: bankError } = await supabase
        .from('slots')
        .select('bank, room, status')
        .order('bank');

      if (bankError) throw bankError;

      // Aggregate the data by bank and room
      const bankMap = new Map<string, SlotBank>();
      
      (bankData || []).forEach(slot => {
        const key = `${slot.bank}|${slot.room}`;
        const existing = bankMap.get(key) || {
          id: key,
          bank: slot.bank,
          room: slot.room,
          total_slots: 0,
          free_slots: 0
        };
        
        existing.total_slots += 1;
        if (slot.status === 'free') {
          existing.free_slots += 1;
        }
        
        bankMap.set(key, existing);
      });

      setSlotBanks(Array.from(bankMap.values()));
    } catch (error) {
      console.error('Error fetching slot banks:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      if (status === 'ready' && soundEnabled) {
        playNotificationSound();
        
        // Send SMS notification if order is ready and has user phone
        if (order) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', order.user_id)
            .single();
            
          if (profile?.phone) {
            await sendOrderReadyNotification(profile.phone, order.pickup_code, order.user_id);
          }
        }
      }

      toast({
        title: "Order Updated",
        description: `Order status changed to ${status}`,
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const orderId = active.id as string;
    const newStatus = over.id as string;

    if (newStatus === 'placed' || newStatus === 'prepping' || newStatus === 'ready') {
      updateOrderStatus(orderId, newStatus);
    }

    setActiveId(null);
  };

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio notification failed:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'active') return ['placed', 'accepted', 'prepping'].includes(order.status);
    if (filter === 'ready') return order.status === 'ready';
    return true;
  });

  const getOrdersByStatus = (status: string) => {
    return filteredOrders.filter(order => {
      if (status === 'placed') return ['placed', 'accepted'].includes(order.status);
      return order.status === status;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="text-center">Loading kitchen dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 bg-card border-b border-border shadow-elegant z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-foreground">
                🟧 Kitchen Dashboard
              </h1>
              <Badge className="bg-platform-staff/10 text-platform-staff border-platform-staff/20">
                Staff Web
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="w-48">
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
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="gap-2"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sound: {soundEnabled ? 'On' : 'Off'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="gap-2"
              >
                <MapPin className="h-4 w-4" />
                {showHeatmap ? 'Kitchen' : 'Heatmap'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Filter Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(['active', 'ready', 'all'] as const).map(filterOption => (
              <Button
                key={filterOption}
                variant={filter === filterOption ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterOption)}
                className="capitalize"
              >
                {filterOption}
              </Button>
            ))}
          </div>
          
          <Badge variant="secondary">
            {filter === 'active' && `Active: ${filteredOrders.filter(o => ['placed', 'accepted', 'prepping'].includes(o.status)).length}`}
            {filter === 'ready' && `Ready: ${filteredOrders.filter(o => o.status === 'ready').length}`}
            {filter === 'all' && `All: ${filteredOrders.length}`}
          </Badge>
        </div>

        <Tabs value={showHeatmap ? "heatmap" : "kitchen"} className="w-full">
          <TabsContent value="kitchen" className="space-y-6">
            <DndContext
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Orders Board with Drag and Drop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Placed Column */}
                <DroppableColumn
                  id="placed"
                  title="🔵 Placed"
                  orders={getOrdersByStatus('placed')}
                  orderItems={orderItems}
                  onUpdateStatus={updateOrderStatus}
                />

                {/* Prepping Column */}
                <DroppableColumn
                  id="prepping"
                  title="🟡 Prepping"
                  orders={getOrdersByStatus('prepping')}
                  orderItems={orderItems}
                  onUpdateStatus={updateOrderStatus}
                />

                {/* Ready Column */}
                <DroppableColumn
                  id="ready"
                  title="🟢 Ready for Pickup"
                  orders={getOrdersByStatus('ready')}
                  orderItems={orderItems}
                  onUpdateStatus={updateOrderStatus}
                />
              </div>

              <DragOverlay>
                {activeId ? (
                  <OrderCard
                    order={orders.find(o => o.id === activeId)!}
                    items={orderItems[activeId] || []}
                    onUpdateStatus={updateOrderStatus}
                    isDragging
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Slots & ETG Heatmap</h3>
              <Badge variant="secondary">
                Free {slotBanks.reduce((sum, bank) => sum + bank.free_slots, 0)} / {slotBanks.reduce((sum, bank) => sum + bank.total_slots, 0)}
              </Badge>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slotBanks.map(bank => (
                  <HeatmapCard key={bank.id} bank={bank} />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  items: OrderItem[];
  onUpdateStatus: (orderId: string, status: string) => void;
  isDragging?: boolean;
}

const OrderCard = ({ order, items, onUpdateStatus, isDragging = false }: OrderCardProps) => {
  const getAvailableActions = () => {
    switch (order.status) {
      case 'placed':
        return [
          { label: 'Accept', status: 'accepted' as const, variant: 'default' as const },
          { label: 'Prepping', status: 'prepping' as const, variant: 'outline' as const }
        ];
      case 'accepted':
        return [
          { label: 'Prepping', status: 'prepping' as const, variant: 'default' as const },
          { label: 'Ready', status: 'ready' as const, variant: 'outline' as const }
        ];
      case 'prepping':
        return [
          { label: 'Ready', status: 'ready' as const, variant: 'default' as const }
        ];
      case 'ready':
        return [
          { label: 'Picked Up', status: 'picked_up' as const, variant: 'default' as const }
        ];
      default:
        return [];
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-mono">
            {order.pickup_code || '—'}
          </CardTitle>
          <Badge variant="secondary" className="capitalize">
            {order.status}
          </Badge>
        </div>
        <CardDescription>
          ${(order.total / 100).toFixed(2)} • {new Date(order.placed_at).toLocaleTimeString()}
        </CardDescription>
        
        {/* Delivery destination */}
        {(order.dest_table || order.dest_seat) && (
          <div className="text-sm text-muted-foreground">
            Deliver to Table {order.dest_table || '—'} Seat {order.dest_seat || '—'}
          </div>
        )}
        
        {/* ETA */}
        {order.pickup_eta && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            ETA: {new Date(order.pickup_eta).toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Order Items */}
        <div className="border-t border-dashed pt-3 space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.qty}× {item.menu_item_id}</span>
            <span>—</span>
          </div>
        ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-3">
          {getAvailableActions().map(action => (
            <Button
              key={action.status}
              variant={action.variant}
              size="sm"
              onClick={() => onUpdateStatus(order.id, action.status)}
              className="flex-1"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const HeatmapCard = ({ bank }: { bank: SlotBank }) => {
  const percentage = bank.total_slots > 0 ? Math.round((bank.free_slots / bank.total_slots) * 100) : 0;
  const occupied = bank.total_slots - bank.free_slots;
  
  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{bank.bank}</CardTitle>
          <Badge variant="secondary">{percentage}% free</Badge>
        </div>
        <CardDescription>{bank.room}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-success to-warning h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Free: {bank.free_slots}/{bank.total_slots}</span>
          <span className="text-muted-foreground">Occupied: {occupied}</span>
        </div>
      </CardContent>
    </Card>
  );
};