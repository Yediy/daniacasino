import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SecureText } from "@/components/SecureText";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  CreditCard, 
  Ticket, 
  Trophy, 
  UtensilsCrossed,
  Settings,
  LogOut,
  AlertTriangle
} from "lucide-react";
import { StaffManagement } from "@/components/StaffManagement";
import { AuditLogsViewer } from "@/components/AuditLogsViewer";

interface UserProfile {
  id: string;
  name?: string;
  tier: 'User' | 'Staff' | 'Admin';
  points: number;
  age_verified: boolean;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  active_vouchers: number;
  pending_tickets: number;
  pending_orders: number;
  poker_entries: number;
}

export const Admin = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchAdminData();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }

      // SECURITY FIX: Use only user_roles table for authorization
      const roleResult = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: false })
        .limit(1)
        .single();

      const userRole = roleResult.data?.role || 'User';

      if (userRole !== 'Admin' && userRole !== 'Staff') {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        window.location.href = '/';
        return;
      }

      // Get basic profile info for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, points, age_verified, created_at')
        .eq('id', user.id)
        .single();

      setCurrentUser({
        id: user.id,
        name: profile?.name,
        tier: userRole as 'User' | 'Staff' | 'Admin',
        points: profile?.points || 0,
        age_verified: profile?.age_verified || false,
        created_at: profile?.created_at || new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking admin access:', error);
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch system statistics
      const [
        { data: usersData },
        { data: vouchersData },
        { data: ticketsData },
        { data: ordersData },
        { data: pokerData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('chip_vouchers').select('id').eq('status', 'paid'),
        supabase.from('event_tickets').select('id').eq('status', 'paid'),
        supabase.from('orders').select('id').eq('status', 'pending'),
        supabase.from('poker_entries').select('id').eq('status', 'paid')
      ]);

      setUsers(usersData || []);
      setStats({
        total_users: usersData?.length || 0,
        active_vouchers: vouchersData?.length || 0,
        pending_tickets: ticketsData?.length || 0,
        pending_orders: ordersData?.length || 0,
        poker_entries: pokerData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Security Fix: Use Edge Function for role updates to ensure proper auditing
  const updateUserTier = async (userId: string, newTier: 'User' | 'Staff' | 'Admin') => {
    try {
      const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { userId, role: newTier }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update user role');
      }

      toast({
        title: "User Updated",
        description: `User role updated to ${newTier}`,
      });

      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Checking admin access...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-casino-charcoal flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome, <SecureText>{currentUser.name}</SecureText> ({currentUser.tier})
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Security Warning */}
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              OTP expiry configuration exceeds recommended threshold. Please update in Supabase dashboard.
            </p>
            <p className="text-xs text-muted-foreground">
              Go to Authentication → Settings → Auth to adjust OTP expiry settings.
            </p>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Users className="h-5 w-5 text-primary" />
                  <Badge variant="secondary">{stats.total_users}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Total Users</div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CreditCard className="h-5 w-5 text-casino-emerald" />
                  <Badge variant="secondary">{stats.active_vouchers}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Active Vouchers</div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Ticket className="h-5 w-5 text-casino-ruby" />
                  <Badge variant="secondary">{stats.pending_tickets}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Event Tickets</div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Trophy className="h-5 w-5 text-casino-gold" />
                  <Badge variant="secondary">{stats.poker_entries}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Poker Entries</div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <UtensilsCrossed className="h-5 w-5 text-casino-charcoal" />
                  <Badge variant="secondary">{stats.pending_orders}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">Pending Orders</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <SecureText className="font-medium">
                          {user.name || 'Unnamed User'}
                        </SecureText>
                        <div className="text-sm text-muted-foreground">
                          {user.points} points • {user.age_verified ? 'Age Verified' : 'Not Verified'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={user.tier === 'Admin' ? 'destructive' : user.tier === 'Staff' ? 'default' : 'secondary'}
                        >
                          {user.tier}
                        </Badge>
                        {currentUser.tier === 'Admin' && user.id !== currentUser.id && (
                          <div className="flex gap-1">
                            {user.tier !== 'Staff' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserTier(user.id, 'Staff')}
                              >
                                Make Staff
                              </Button>
                            )}
                            {user.tier !== 'User' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserTier(user.id, 'User')}
                              >
                                Make User
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <StaffManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsViewer />
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Monitor all system transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Transaction monitoring interface coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>System Reports</CardTitle>
                <CardDescription>
                  Generate and view system reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Reporting system coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Settings panel coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};