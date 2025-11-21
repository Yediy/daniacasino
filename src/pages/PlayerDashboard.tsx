import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Ticket, DollarSign, Gift, Star, TrendingUp, Calendar, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Profile {
  id: string;
  name: string | null;
  tier: string | null;
  points: number | null;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
}

export default function PlayerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayerData();
  }, []);

  const fetchPlayerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to view your dashboard",
          variant: "destructive",
        });
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch active vouchers
      const { data: vouchersData } = await supabase
        .from('chip_vouchers')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5);

      setVouchers(vouchersData || []);

      // Fetch upcoming tickets
      const { data: ticketsData } = await supabase
        .from('event_tickets')
        .select('*, events(*)')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('issued_at', { ascending: false })
        .limit(5);

      setTickets(ticketsData || []);

      // Fetch loyalty points history
      const { data: pointsData } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Process points history for chart
      const history = (pointsData || []).reverse().reduce((acc, transaction, index) => {
        const prevTotal = index === 0 ? (profileData?.points || 0) - transaction.points_change : acc[index - 1].points;
        acc.push({
          date: new Date(transaction.created_at).toLocaleDateString(),
          points: prevTotal + transaction.points_change
        });
        return acc;
      }, [] as any[]);

      setPointsHistory(history);

      // Build recent activity
      const activity: RecentActivity[] = [];

      vouchersData?.forEach(v => {
        activity.push({
          id: v.id,
          type: 'voucher',
          description: `Chip Voucher - $${(v.amount / 100).toFixed(2)}`,
          amount: v.amount / 100,
          date: v.created_at
        });
      });

      ticketsData?.forEach(t => {
        activity.push({
          id: t.id,
          type: 'ticket',
          description: `Event Ticket - ${(t as any).events?.title || 'Event'}`,
          amount: t.amount / 100,
          date: t.issued_at
        });
      });

      pointsData?.forEach(p => {
        activity.push({
          id: p.id,
          type: 'points',
          description: p.description || 'Points Transaction',
          amount: p.points_change,
          date: p.created_at
        });
      });

      // Sort by date and limit
      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 10));

    } catch (error) {
      console.error('Error fetching player data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please sign in to view your dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case 'Admin': return 'bg-destructive';
      case 'Staff': return 'bg-warning';
      default: return 'bg-primary';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'voucher': return Gift;
      case 'ticket': return Ticket;
      case 'points': return Star;
      default: return DollarSign;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile.name || 'Player'}!
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getTierColor(profile.tier)}>
              {profile.tier || 'User'}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{profile.points || 0} Points</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
              <Star className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.points || 0}</div>
              <p className="text-xs text-muted-foreground">Lifetime earned</p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Vouchers</CardTitle>
              <Gift className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vouchers.length}</div>
              <p className="text-xs text-muted-foreground">Ready to use</p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Event Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.length}</div>
              <p className="text-xs text-muted-foreground">Upcoming events</p>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(vouchers.reduce((sum, v) => sum + v.amount, 0) / 100).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Points History Chart */}
        {pointsHistory.length > 0 && (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Points History</CardTitle>
              <CardDescription>Your loyalty points over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={pointsHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Vouchers */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Active Vouchers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vouchers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active vouchers
                </p>
              ) : (
                vouchers.map(voucher => (
                  <div key={voucher.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">${(voucher.amount / 100).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{voucher.voucher_type}</div>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tickets */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming events
                </p>
              ) : (
                tickets.map(ticket => (
                  <div key={ticket.id} className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{(ticket as any).events?.title || 'Event'}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date((ticket as any).events?.event_date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest transactions and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                recentActivity.map(activity => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{activity.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-mono">
                        {activity.type === 'points' ? `${activity.amount > 0 ? '+' : ''}${activity.amount} pts` : `$${activity.amount.toFixed(2)}`}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
