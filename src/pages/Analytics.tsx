import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Users, Utensils } from "lucide-react";

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
  tickets: number;
}

interface PopularGame {
  game: string;
  count: number;
}

interface VendorStats {
  name: string;
  orders: number;
  revenue: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--success))'];

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [popularGames, setPopularGames] = useState<PopularGame[]>([]);
  const [vendorStats, setVendorStats] = useState<VendorStats[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch orders data for revenue
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total, placed_at, vendor_id')
        .eq('status', 'completed')
        .gte('placed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (ordersError) throw ordersError;

      // Fetch event tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('event_tickets')
        .select('amount, issued_at')
        .gte('issued_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (ticketsError) throw ticketsError;

      // Fetch poker entries
      const { data: entries, error: entriesError } = await supabase
        .from('poker_entries')
        .select('amount, issued_at, tourney_id')
        .gte('issued_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (entriesError) throw entriesError;

      // Fetch vendors
      const { data: vendors, error: vendorsError } = await supabase
        .from('dining_vendors')
        .select('id, name');

      if (vendorsError) throw vendorsError;

      // Process revenue data by day
      const revenueByDay: Record<string, RevenueData> = {};
      
      orders?.forEach(order => {
        const date = new Date(order.placed_at).toLocaleDateString();
        if (!revenueByDay[date]) {
          revenueByDay[date] = { date, revenue: 0, orders: 0, tickets: 0 };
        }
        revenueByDay[date].revenue += order.total / 100;
        revenueByDay[date].orders += 1;
      });

      tickets?.forEach(ticket => {
        const date = new Date(ticket.issued_at).toLocaleDateString();
        if (!revenueByDay[date]) {
          revenueByDay[date] = { date, revenue: 0, orders: 0, tickets: 0 };
        }
        revenueByDay[date].revenue += ticket.amount / 100;
        revenueByDay[date].tickets += 1;
      });

      entries?.forEach(entry => {
        const date = new Date(entry.issued_at).toLocaleDateString();
        if (!revenueByDay[date]) {
          revenueByDay[date] = { date, revenue: 0, orders: 0, tickets: 0 };
        }
        revenueByDay[date].revenue += entry.amount / 100;
      });

      setRevenueData(Object.values(revenueByDay).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));

      // Calculate totals
      const totalRev = Object.values(revenueByDay).reduce((sum, day) => sum + day.revenue, 0);
      const totalOrd = orders?.length || 0;
      const totalTix = tickets?.length || 0;

      setTotalRevenue(totalRev);
      setTotalOrders(totalOrd);
      setTotalTickets(totalTix);

      // Process popular games from poker entries
      const gameCount: Record<string, number> = {};
      
      entries?.forEach(entry => {
        const game = 'Tournament Entry';
        gameCount[game] = (gameCount[game] || 0) + 1;
      });

      setPopularGames(
        Object.entries(gameCount)
          .map(([game, count]) => ({ game, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );

      // Process vendor stats
      const vendorRevenue: Record<string, { orders: number; revenue: number }> = {};
      
      orders?.forEach(order => {
        if (!vendorRevenue[order.vendor_id]) {
          vendorRevenue[order.vendor_id] = { orders: 0, revenue: 0 };
        }
        vendorRevenue[order.vendor_id].orders += 1;
        vendorRevenue[order.vendor_id].revenue += order.total / 100;
      });

      const vendorStatsData = Object.entries(vendorRevenue).map(([vendorId, stats]) => {
        const vendor = vendors?.find(v => v.id === vendorId);
        return {
          name: vendor?.name || 'Unknown',
          orders: stats.orders,
          revenue: stats.revenue
        };
      }).sort((a, b) => b.revenue - a.revenue);

      setVendorStats(vendorStatsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Revenue metrics and performance insights (Last 30 days)
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Food Orders</CardTitle>
              <Utensils className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">Completed orders</p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTickets}</div>
              <p className="text-xs text-muted-foreground">Event tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="games">Popular Games</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Revenue breakdown by day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Vendor Performance</CardTitle>
                <CardDescription>Orders and revenue by vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={vendorStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue ($)" />
                    <Bar dataKey="orders" fill="hsl(var(--secondary))" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Popular Games</CardTitle>
                <CardDescription>Most played games and tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={popularGames}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ game, count }) => `${game}: ${count}`}
                      outerRadius={120}
                      fill="hsl(var(--primary))"
                      dataKey="count"
                    >
                      {popularGames.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
