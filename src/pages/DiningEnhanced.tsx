import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, Phone, Plus, Minus, ShoppingCart, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";

interface Vendor {
  id: string;
  name: string;
  location: string;
  hours: any;
  accepts_mobile_orders: boolean;
  is_open: boolean;
  prep_minutes: number;
}

interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description?: string;
  price: number;
  tags?: string[];
  is_active: boolean;
  stock_qty?: number;
}

interface CartItem {
  menu_item: MenuItem;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  total: number;
  pickup_code?: string;
  pickup_eta?: string;
  placed_at: string;
  vendor: {
    name: string;
    location: string;
  };
}

export const DiningEnhanced = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [tableNumber, setTableNumber] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
    fetchActiveOrders();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchMenuItems();
    }
  }, [selectedVendor]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('dining_vendors')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
      
      if (data && data.length > 0) {
        setSelectedVendor(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load dining venues",
        variant: "destructive",
      });
    }
  };

  const fetchMenuItems = async () => {
    if (!selectedVendor) return;

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('vendor_id', selectedVendor)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast({
        title: "Error",
        description: "Failed to load menu items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total, pickup_code, pickup_eta, placed_at,
          dining_vendors!inner(name, location)
        `)
        .eq('user_id', user.id)
        .in('status', ['placed', 'accepted', 'prepping', 'ready'])
        .order('placed_at', { ascending: false });

      if (error) throw error;
      
      const formattedOrders = (data || []).map(order => ({
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_code: order.pickup_code,
        pickup_eta: order.pickup_eta,
        placed_at: order.placed_at,
        vendor: {
          name: order.dining_vendors.name,
          location: order.dining_vendors.location
        }
      }));

      setActiveOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    }
  };

  const addToCart = (menuItem: MenuItem) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.menu_item.id === menuItem.id);
      
      if (existingItem) {
        return currentCart.map(item =>
          item.menu_item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...currentCart, { menu_item: menuItem, quantity: 1 }];
      }
    });
    
    toast({
      title: "Added to Cart",
      description: `${menuItem.name} added to your order`,
    });
  };

  const updateCartQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(currentCart => currentCart.filter(item => item.menu_item.id !== menuItemId));
    } else {
      setCart(currentCart =>
        currentCart.map(item =>
          item.menu_item.id === menuItemId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.menu_item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const checkout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to place an order",
          variant: "destructive",
        });
        return;
      }

      if (cart.length === 0) {
        toast({
          title: "Empty Cart",
          description: "Please add items to your cart before checkout",
          variant: "destructive",
        });
        return;
      }

      // For now, show a message about the checkout process
      toast({
        title: "Checkout Coming Soon",
        description: "Mobile ordering with Stripe integration will be available soon",
      });

      // TODO: Implement Stripe checkout integration
      // This would involve:
      // 1. Creating an order record
      // 2. Creating order items
      // 3. Integrating with Stripe for payment
      // 4. Updating order status after payment

    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        title: "Error",
        description: "Failed to process checkout",
        variant: "destructive",
      });
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
      (item.tags && item.tags.includes(selectedCategory));
    
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(menuItems.flatMap(item => item.tags || []))];
  const selectedVendorData = vendors.find(v => v.id === selectedVendor);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading dining options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            🟩 Mobile Dining
          </h2>
          <p className="text-muted-foreground">
            Order food to your table or seat
          </p>
        </div>

        {/* Vendor Selection */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base">Select Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a restaurant" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{vendor.name}</span>
                      {vendor.is_open ? (
                        <Badge variant="default" className="ml-2">Open</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">Closed</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Venue Info */}
        {selectedVendorData && (
          <Card className="shadow-elegant">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{selectedVendorData.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Prep time: ~{selectedVendorData.prep_minutes} minutes</span>
                </div>
                {selectedVendorData.accepts_mobile_orders && (
                  <Badge variant="outline" className="text-xs">
                    📱 Mobile Orders Available
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu" className="relative">
              <Utensils className="h-4 w-4 mr-1" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="orders" className="relative">
              <ShoppingCart className="h-4 w-4 mr-1" />
              Orders
              {activeOrders.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-4 mt-6">
            {/* Search and Filter */}
            <div className="space-y-3">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {filteredMenuItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={addToCart}
                  cartQuantity={cart.find(cartItem => cartItem.menu_item.id === item.id)?.quantity || 0}
                  onUpdateQuantity={updateCartQuantity}
                />
              ))}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <Card className="shadow-elegant bg-accent/10 sticky bottom-20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{getTotalItems()} items</div>
                      <div className="text-sm text-muted-foreground">
                        Total: ${(getTotalPrice() / 100).toFixed(2)}
                      </div>
                    </div>
                    <Button onClick={checkout} className="bg-primary">
                      Checkout
                    </Button>
                  </div>
                  
                  {/* Table/Seat Selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Table #"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Seat #"
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-6">
            <AuthGuard requireAuth>
              {activeOrders.length === 0 ? (
                <Card className="shadow-elegant">
                  <CardContent className="p-6 text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Active Orders
                    </h3>
                    <p className="text-muted-foreground">
                      Your current orders will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </AuthGuard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  cartQuantity: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

const MenuItemCard = ({ item, onAddToCart, cartQuantity, onUpdateQuantity }: MenuItemCardProps) => {
  const isOutOfStock = item.stock_qty !== null && item.stock_qty <= 0;

  return (
    <Card className="shadow-elegant">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{item.name}</h3>
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">Sold Out</Badge>
              )}
            </div>
            
            {item.description && (
              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary">
                ${(item.price / 100).toFixed(2)}
              </span>
              
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1">
                  {item.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {cartQuantity > 0 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="min-w-[2rem] text-center font-medium">{cartQuantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, cartQuantity + 1)}
                  disabled={isOutOfStock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToCart(item)}
                disabled={isOutOfStock}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const OrderCard = ({ order }: { order: Order }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'accepted': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'prepping': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'ready': return 'bg-green-500/10 text-green-700 border-green-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{order.vendor.name}</CardTitle>
          <Badge className={`${getStatusColor(order.status)} capitalize`}>
            {order.status}
          </Badge>
        </div>
        <CardDescription>{order.vendor.location}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="font-semibold">${(order.total / 100).toFixed(2)}</span>
        </div>
        
        {order.pickup_code && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pickup Code:</span>
            <span className="font-mono font-bold text-primary">{order.pickup_code}</span>
          </div>
        )}
        
        {order.pickup_eta && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">ETA:</span>
            <span className="font-medium">{new Date(order.pickup_eta).toLocaleTimeString()}</span>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          Placed: {new Date(order.placed_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};