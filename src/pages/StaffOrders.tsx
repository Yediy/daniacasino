import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { UtensilsCrossed, Clock, CheckCircle, Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  user_id: string;
  vendor_id: string;
  status: string;
  total: number;
  placed_at: string;
  pickup_code: string | null;
  pickup_eta: string | null;
  dest_table: string | null;
  dest_seat: string | null;
  order_items: Array<{
    id: string;
    name_cache: string;
    qty: number;
  }>;
  dining_vendors: {
    name: string;
    location: string;
  };
}

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed';

export const StaffOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [vendors, setVendors] = useState<Array<{id: string, name: string}>>([]);
  const { toast } = useToast();
  const { showNotification } = useNotifications();

  useEffect(() => {
    checkStaffAccess();
    fetchVendors();
    fetchOrders();

    // Subscribe to realtime order updates
    const channel = supabase
      .channel('staff-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order:', payload);
          const vendor = vendors.find(v => v.id === (payload.new as any).vendor_id);
          showNotification({
            title: "New Order",
            message: `New order placed at ${vendor?.name || 'vendor'}`,
            type: "order_new",
          });
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const order = payload.new as any;
          if (order.status === 'ready') {
            showNotification({
              title: "Order Ready",
              message: `Order ${order.pickup_code || 'unknown'} is ready for pickup`,
              type: "order_ready",
              referenceId: order.id,
            });
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedVendor]);

  const checkStaffAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Access Denied",
        description: "Staff access required",
        variant: "destructive",
      });
      return;
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('dining_vendors')
        .select('id, name')
        .eq('active', true);

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            name_cache,
            qty
          ),
          dining_vendors (
            name,
            location
          )
        `)
        .in('status', ['pending', 'preparing', 'ready', 'out_for_delivery'])
        .order('placed_at', { ascending: true });

      if (selectedVendor !== "all") {
        query = query.eq('vendor_id', selectedVendor);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      // Get current user for staff tracking
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use the new process_order function
      const { data, error } = await supabase.rpc('process_order', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_staff_id: user?.id || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to update order');
      }

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}`,
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-5 w-5" />;
      case 'preparing': return <Clock className="h-5 w-5" />;
      case 'ready': return <Package className="h-5 w-5" />;
      case 'out_for_delivery': return <UtensilsCrossed className="h-5 w-5" />;
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return "bg-warning";
      case 'preparing': return "bg-primary";
      case 'ready': return "bg-success";
      case 'out_for_delivery': return "bg-casino-gold";
      case 'completed': return "bg-muted";
      default: return "bg-muted";
    }
  };

  const filterOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(o => o.status === status);
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const timeSinceOrder = Math.floor((Date.now() - new Date(order.placed_at).getTime()) / 1000 / 60);
    
    return (
      <Card className="shadow-elegant hover:shadow-floating transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {order.pickup_code && (
                  <Badge variant="outline" className="font-mono text-lg">
                    {order.pickup_code}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {order.dining_vendors.name} • {timeSinceOrder} min ago
              </CardDescription>
            </div>
            <Badge className={cn("text-white", getStatusColor(order.status))}>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Items */}
          <div className="space-y-2">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.qty}x {item.name_cache}</span>
              </div>
            ))}
          </div>

          {/* Delivery Info */}
          {(order.dest_table || order.dest_seat) && (
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              Deliver to: {order.dest_table && `Table ${order.dest_table}`}
              {order.dest_seat && ` Seat ${order.dest_seat}`}
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t font-semibold">
            <span>Total:</span>
            <span className="text-lg">${(order.total / 100).toFixed(2)}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {order.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="w-full"
                >
                  Start Preparing
                </Button>
              </>
            )}
            {order.status === 'preparing' && (
              <Button 
                size="sm" 
                onClick={() => updateOrderStatus(order.id, 'ready')}
                className="w-full col-span-2"
                variant="default"
              >
                Mark Ready
              </Button>
            )}
            {order.status === 'ready' && (
              <Button 
                size="sm" 
                onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                className="w-full col-span-2"
                variant="default"
              >
                Out for Delivery
              </Button>
            )}
            {order.status === 'out_for_delivery' && (
              <Button 
                size="sm" 
                onClick={() => updateOrderStatus(order.id, 'completed')}
                className="w-full col-span-2"
                variant="default"
              >
                Complete Order
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
              Staff Orders Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage kitchen orders and deliveries in real-time
            </p>
          </div>
        </div>

        {/* Vendor Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedVendor === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedVendor("all")}
          >
            All Vendors
          </Button>
          {vendors.map((vendor) => (
            <Button
              key={vendor.id}
              variant={selectedVendor === vendor.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVendor(vendor.id)}
              className="whitespace-nowrap"
            >
              {vendor.name}
            </Button>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-warning">{filterOrdersByStatus('pending').length}</div>
              <div className="text-sm text-muted-foreground mt-1">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{filterOrdersByStatus('preparing').length}</div>
              <div className="text-sm text-muted-foreground mt-1">Preparing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-success">{filterOrdersByStatus('ready').length}</div>
              <div className="text-sm text-muted-foreground mt-1">Ready</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-casino-gold">{filterOrdersByStatus('out_for_delivery').length}</div>
              <div className="text-sm text-muted-foreground mt-1">Out for Delivery</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders by Status */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending ({filterOrdersByStatus('pending').length})
            </TabsTrigger>
            <TabsTrigger value="preparing">
              Preparing ({filterOrdersByStatus('preparing').length})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({filterOrdersByStatus('ready').length})
            </TabsTrigger>
            <TabsTrigger value="delivery">
              Delivery ({filterOrdersByStatus('out_for_delivery').length})
            </TabsTrigger>
          </TabsList>

          {['pending', 'preparing', 'ready', 'out_for_delivery'].map((status) => (
            <TabsContent key={status} value={status === 'out_for_delivery' ? 'delivery' : status} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterOrdersByStatus(status as OrderStatus).map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
              {filterOrdersByStatus(status as OrderStatus).length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No orders with status: {status.replace('_', ' ')}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
