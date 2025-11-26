import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Clock, 
  Trophy, 
  DollarSign,
  Target,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";

interface PlayerStats {
  user_id: string;
  name: string;
  tier: string;
  points: number;
  total_sessions: number;
  avg_session_hours: number;
  total_profit_loss: number;
  total_games: number;
  wins: number;
  losses: number;
  win_rate_percentage: number;
  tournaments_entered: number;
  tournaments_finished: number;
  best_tournament_rank: number | null;
  total_tournament_winnings: number;
}

export default function PlayerAnalytics() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayerStats();
  }, []);

  const fetchPlayerStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('player_performance_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setStats(data);
    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading analytics...</div>;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No analytics data available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start playing to see your performance statistics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AuthGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{stats.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{stats.tier}</Badge>
              <span className="text-sm text-muted-foreground">
                {stats.points.toLocaleString()} points
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cash-games">Cash Games</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Users}
                title="Total Sessions"
                value={stats.total_sessions}
                subtitle="All time"
              />
              <StatCard
                icon={Clock}
                title="Avg Session"
                value={`${stats.avg_session_hours.toFixed(1)}h`}
                subtitle="Hours per session"
              />
              <StatCard
                icon={Target}
                title="Win Rate"
                value={`${stats.win_rate_percentage}%`}
                subtitle={`${stats.wins} wins / ${stats.total_games} games`}
              />
              <StatCard
                icon={DollarSign}
                title="Net P/L"
                value={`$${(stats.total_profit_loss / 100).toFixed(2)}`}
                subtitle="Total profit/loss"
              />
            </div>
          </TabsContent>

          <TabsContent value="cash-games" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Session Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Sessions:</span>
                    <span className="font-bold">{stats.total_sessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Duration:</span>
                    <span className="font-bold">{stats.avg_session_hours.toFixed(1)} hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Games:</span>
                    <span className="font-bold">{stats.total_games}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Wins:</span>
                    <span className="font-bold text-green-500">{stats.wins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Losses:</span>
                    <span className="font-bold text-red-500">{stats.losses}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Win Rate:</span>
                    <Badge variant="outline" className="font-bold">
                      {stats.win_rate_percentage}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Trophy}
                title="Entered"
                value={stats.tournaments_entered}
                subtitle="Total tournaments"
              />
              <StatCard
                icon={TrendingUp}
                title="Finished"
                value={stats.tournaments_finished}
                subtitle="Completed"
              />
              <StatCard
                icon={Trophy}
                title="Best Rank"
                value={stats.best_tournament_rank || 'N/A'}
                subtitle="Highest placement"
              />
              <StatCard
                icon={DollarSign}
                title="Total Winnings"
                value={`$${(stats.total_tournament_winnings / 100).toFixed(2)}`}
                subtitle="Tournament prizes"
              />
            </div>

            {stats.tournaments_finished > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Completion Rate:</span>
                      <span className="font-bold">
                        {((stats.tournaments_finished / stats.tournaments_entered) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Avg Winnings per Tournament:</span>
                      <span className="font-bold">
                        ${(stats.total_tournament_winnings / stats.tournaments_finished / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
