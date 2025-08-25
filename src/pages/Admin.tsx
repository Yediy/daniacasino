import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";
import { 
  Users, 
  Shield, 
  Activity, 
  CreditCard, 
  Ticket, 
  Trophy,
  UtensilsCrossed,
  AlertTriangle,
  Settings,
  RefreshCw
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalTickets: number;
  totalVouchers: number;
  totalOrders: number;
  recentActivity: any[];
}

export const Admin = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTickets: 0,
    totalVouchers: 0,
    totalOrders: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch ticket count
      const { count: ticketCount } = await supabase
        .from('event_tickets')
        .select('*', { count: 'exact', head: true });

      // Fetch voucher count
      const { count: voucherCount } = await supabase
        .from('chip_vouchers')
        .select('*', { count: 'exact', head: true });

      // Fetch order count
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Fetch recent activity from audit logs
      const { data: recentActivity } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      setStats({
        totalUsers: userCount || 0,
        totalTickets: ticketCount || 0,
        totalVouchers: voucherCount || 0,
        totalOrders: orderCount || 0,
        recentActivity: recentActivity || []
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "Failed to load admin statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatsCard = ({ icon: Icon, title, value, description, color = "primary" }: {
    icon: any;
    title: string;
    value: string | number;
    description: string;
    color?: string;
  }) => (
    <Card className="shadow-elegant">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={`h-4 w-4 text-${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );

  const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
      fetchUsers();
    }, []);

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    const updateUserRole = async (userId: string, newRole: 'User' | 'Staff' | 'Admin') => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ tier: newRole })
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "User role updated successfully",
        });
        
        fetchUsers(); // Refresh the list
      } catch (error) {
        console.error('Error updating user role:', error);
        toast({
          title: "Error",
          description: "Failed to update user role",
          variant: "destructive",
        });
      }
    };

    if (loadingUsers) return <div>Loading users...</div>;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">User Management</h3>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Age Verified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell>{user.name || 'No name'}</TableCell>
                <TableCell>
                  <Badge variant={
                    user.tier === 'Admin' ? 'destructive' : 
                    user.tier === 'Staff' ? 'secondary' : 
                    'outline'
                  }>
                    {user.tier}
                  </Badge>
                </TableCell>
                <TableCell>{user.points || 0}</TableCell>
                <TableCell>
                  <Badge variant={user.age_verified ? 'default' : 'outline'}>
                    {user.age_verified ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    {user.tier !== 'Staff' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserRole(user.id, 'Staff')}
                      >
                        Make Staff
                      </Button>
                    )}
                    {user.tier !== 'Admin' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserRole(user.id, 'Admin')}
                      >
                        Make Admin
                      </Button>
                    )}
                    {user.tier !== 'User' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserRole(user.id, 'User')}
                      >
                        Make User
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const AuditLogs = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recent Activity</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.recentActivity.map((activity: any) => (
            <TableRow key={activity.id}>
              <TableCell>
                <Badge variant="outline">{activity.event_type}</Badge>
              </TableCell>
              <TableCell>{activity.resource_type}</TableCell>
              <TableCell className="font-mono text-xs">
                {activity.user_id ? activity.user_id.substring(0, 8) + '...' : 'System'}
              </TableCell>
              <TableCell>
                {new Date(activity.timestamp).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AuthGuard requireAuth requireRole="Admin">
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold casino-heading flex items-center justify-center space-x-3">
              <Shield className="h-8 w-8 text-primary" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              System management and oversight
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={Users}
              title="Total Users"
              value={stats.totalUsers}
              description="Registered casino members"
            />
            <StatsCard
              icon={Ticket}
              title="Event Tickets"
              value={stats.totalTickets}
              description="Total tickets issued"
              color="casino-emerald"
            />
            <StatsCard
              icon={CreditCard}
              title="Chip Vouchers"
              value={stats.totalVouchers}
              description="Vouchers in system"
              color="casino-gold"
            />
            <StatsCard
              icon={UtensilsCrossed}
              title="Food Orders"
              value={stats.totalOrders}
              description="Total orders placed"
              color="casino-ruby"
            />
          </div>

          {/* Admin Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="security">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <Card className="shadow-elegant">
                <CardContent className="p-6">
                  <UserManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card className="shadow-elegant">
                <CardContent className="p-6">
                  <AuditLogs />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure casino system parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Settings management coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Security Overview</CardTitle>
                  <CardDescription>
                    Monitor system security and audit trails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Advanced security monitoring coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={fetchAdminStats} className="bg-gradient-gold hover:bg-casino-gold-dark">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Stats
                </Button>
                <Button variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  Tournament Management
                </Button>
                <Button variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};