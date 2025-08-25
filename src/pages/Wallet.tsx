import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletCard } from "@/components/WalletCard";
import { WalletIcon, Plus, CreditCard, Trophy, Ticket, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";

// Remove hardcoded stripe key - will be handled by edge functions
// const stripePromise = loadStripe("pk_test_your_publishable_key_here");

interface UserProfile {
  name?: string;
  tier: string;
  points: number;
}

interface WalletItem {
  id: string;
  type: 'ticket' | 'poker_entry' | 'voucher' | 'order';
  title: string;
  subtitle?: string;
  amount?: number;
  status: string;
  barcode?: string;
  pickup_code?: string;
  issued_at: string;
  expires_at?: string;
}

export const WalletPage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tickets, setTickets] = useState<WalletItem[]>([]);
  const [pokerEntries, setPokerEntries] = useState<WalletItem[]>([]);
  const [vouchers, setVouchers] = useState<WalletItem[]>([]);
  const [orders, setOrders] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, tier, points')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch tickets
      const { data: ticketData } = await supabase
        .from('event_tickets')
        .select(`
          id, qty, amount, status, barcode, issued_at,
          events!inner(title, event_date, event_time, venue)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      const formattedTickets = ticketData?.map(ticket => ({
        id: ticket.id,
        type: 'ticket' as const,
        title: ticket.events.title,
        subtitle: `${new Date(ticket.events.event_date).toLocaleDateString()} at ${ticket.events.venue}`,
        amount: ticket.amount,
        status: ticket.status,
        barcode: ticket.barcode,
        issued_at: ticket.issued_at
      })) || [];

      setTickets(formattedTickets);

      // Fetch poker entries
      const { data: pokerData } = await supabase
        .from('poker_entries')
        .select(`
          id, amount, status, barcode, issued_at, will_call_window_end,
          poker_tourneys!inner(name, tournament_date, tournament_time)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      const formattedPoker = pokerData?.map(entry => ({
        id: entry.id,
        type: 'poker_entry' as const,
        title: entry.poker_tourneys.name,
        subtitle: `${new Date(entry.poker_tourneys.tournament_date).toLocaleDateString()}`,
        amount: entry.amount,
        status: entry.status,
        barcode: entry.barcode,
        issued_at: entry.issued_at,
        expires_at: entry.will_call_window_end
      })) || [];

      setPokerEntries(formattedPoker);

      // Fetch chip vouchers
      const { data: voucherData } = await supabase
        .from('chip_vouchers')
        .select('id, amount, fee, status, barcode, created_at, redeem_window_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const formattedVouchers = voucherData?.map(voucher => ({
        id: voucher.id,
        type: 'voucher' as const,
        title: 'Chip Voucher',
        subtitle: `$${(voucher.amount / 100).toFixed(2)} value`,
        amount: voucher.amount + voucher.fee,
        status: voucher.status,
        barcode: voucher.barcode,
        issued_at: voucher.created_at,
        expires_at: voucher.redeem_window_end
      })) || [];

      setVouchers(formattedVouchers);

      // Fetch orders
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id, total, status, pickup_code, placed_at, pickup_eta,
          dining_vendors!inner(name, location)
        `)
        .eq('user_id', user.id)
        .neq('status', 'cart')
        .order('placed_at', { ascending: false });

      const formattedOrders = orderData?.map(order => ({
        id: order.id,
        type: 'order' as const,
        title: `Order from ${order.dining_vendors.name}`,
        subtitle: order.dining_vendors.location,
        amount: order.total,
        status: order.status,
        pickup_code: order.pickup_code,
        issued_at: order.placed_at,
        expires_at: order.pickup_eta
      })) || [];

      setOrders(formattedOrders);

    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyChipVoucher = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in at /auth to purchase vouchers",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Feature Coming Soon",
        description: "Chip voucher purchases will be available soon through secure payment processing",
      });
    } catch (error) {
      console.error('Error with voucher purchase:', error);
      toast({
        title: "Error",
        description: "Unable to process request",
        variant: "destructive",
      });
    }
  };

  const handleViewBarcode = (item: WalletItem) => {
    toast({
      title: "Barcode Ready",
      description: "Present this code at the cashier",
    });
  };

  const handleAddToWallet = (item: WalletItem) => {
    toast({
      title: "Add to Wallet",
      description: "Feature coming soon - save to Apple/Google Wallet",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading wallet...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            My Wallet
          </h2>
          <p className="text-muted-foreground">
            Your tickets, vouchers, and more
          </p>
        </div>

        {/* Profile Card */}
        {profile && (
          <Card className="shadow-elegant bg-gradient-gold text-primary-foreground">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {profile.name || 'Casino Player'}
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    {profile.tier} Member
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{profile.points}</div>
                  <div className="text-sm opacity-80">Points</div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleBuyChipVoucher}
              className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Buy Chip Voucher ($50)
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Items */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">
              <Ticket className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="poker" className="text-xs">
              <Trophy className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="text-xs">
              <CreditCard className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">
              <UtensilsCrossed className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {[...tickets, ...pokerEntries, ...vouchers, ...orders].length === 0 ? (
              <Card className="shadow-elegant">
                <CardContent className="p-6 text-center">
                  <WalletIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-casino-charcoal mb-2">
                    Empty Wallet
                  </h3>
                  <p className="text-muted-foreground">
                    Purchase tickets, vouchers, or join tournaments to see them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              [...tickets, ...pokerEntries, ...vouchers, ...orders]
                .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
                .map((item) => (
                  <WalletCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onViewBarcode={handleViewBarcode}
                    onAddToWallet={handleAddToWallet}
                  />
                ))
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4 mt-6">
            {tickets.map((ticket) => (
              <WalletCard
                key={ticket.id}
                item={ticket}
                onViewBarcode={handleViewBarcode}
                onAddToWallet={handleAddToWallet}
              />
            ))}
          </TabsContent>

          <TabsContent value="poker" className="space-y-4 mt-6">
            {pokerEntries.map((entry) => (
              <WalletCard
                key={entry.id}
                item={entry}
                onViewBarcode={handleViewBarcode}
                onAddToWallet={handleAddToWallet}
              />
            ))}
          </TabsContent>

          <TabsContent value="vouchers" className="space-y-4 mt-6">
            {vouchers.map((voucher) => (
              <WalletCard
                key={voucher.id}
                item={voucher}
                onViewBarcode={handleViewBarcode}
                onAddToWallet={handleAddToWallet}
              />
            ))}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-6">
            {orders.map((order) => (
              <WalletCard
                key={order.id}
                item={order}
                onViewBarcode={handleViewBarcode}
                onAddToWallet={handleAddToWallet}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Responsible Gaming */}
        <Card className="shadow-elegant bg-accent/10">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Responsible Gaming Resources
            </p>
            <p className="text-xs text-muted-foreground">
              Florida Council on Compulsive Gambling: 1-888-ADMIT-IT
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </AuthGuard>
  );
};