import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, Trophy, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PokerTable {
  id: string;
  name: string;
  game: string;
  stakes: string;
  max_seats: number;
  players: number;
  open_seats: number;
  status: string;
  floor_zone: string;
  wait_count: number;
  updated_at: string;
}

interface CashGameList {
  id: string;
  game: string;
  table_max: number;
  open_seats: number;
  wait_count: number;
  list_status: string;
  updated_at: string;
}

interface LiveMetrics {
  totalTables: number;
  openSeats: number;
  totalWaiting: number;
}

export const PokerLive = () => {
  const [pokerTables, setPokerTables] = useState<PokerTable[]>([]);
  const [cashGames, setCashGames] = useState<CashGameList[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({ totalTables: 0, openSeats: 0, totalWaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPokerData();
    
    // Set up realtime subscription for poker updates
    const pokerChannel = supabase
      .channel('poker-live-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poker_tables'
      }, () => {
        fetchPokerData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cash_game_lists'
      }, () => {
        fetchPokerData();
      })
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchPokerData, 30000);

    return () => {
      supabase.removeChannel(pokerChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchPokerData = async () => {
    try {
      // Fetch poker tables using the public function
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_public_poker_tables');

      if (tablesError) throw tablesError;
      setPokerTables(tablesData || []);

      // Fetch cash game lists
      const { data: cashGameData, error: cashGameError } = await supabase
        .from('cash_game_lists')
        .select('*')
        .order('game');

      if (cashGameError) throw cashGameError;
      setCashGames(cashGameData || []);

      // Calculate live metrics
      if (tablesData) {
        const metrics: LiveMetrics = {
          totalTables: tablesData.length,
          openSeats: tablesData.reduce((sum: number, table: PokerTable) => sum + table.open_seats, 0),
          totalWaiting: tablesData.reduce((sum: number, table: PokerTable) => sum + table.wait_count, 0)
        };
        setLiveMetrics(metrics);
      }

    } catch (error) {
      console.error('Error fetching poker data:', error);
      toast({
        title: "Error",
        description: "Failed to load poker room data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async (listId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to join cash game queues",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('join-cash-game-queue', {
        body: { listId }
      });

      if (error) throw error;

      toast({
        title: "Joined Queue",
        description: `You're #${data.position} in line for this game`,
      });

      // Refresh data to show updated queue
      fetchPokerData();
    } catch (error) {
      console.error('Error joining queue:', error);
      toast({
        title: "Error",
        description: "Failed to join queue",
        variant: "destructive",
      });
    }
  };

  // Filter tables based on search and zone
  const filteredTables = pokerTables.filter(table => {
    const matchesSearch = searchTerm === "" || 
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.game.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.stakes.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesZone = selectedZone === "all" || table.floor_zone === selectedZone;
    
    return matchesSearch && matchesZone;
  });

  // Get unique zones for filter
  const zones = [...new Set(pokerTables.map(table => table.floor_zone))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading poker room data...</div>
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
            🟩 Poker Room Live
          </h2>
          <p className="text-muted-foreground">
            Live tables and cash game queues
          </p>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-elegant">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-primary">{liveMetrics.totalTables}</div>
              <div className="text-xs text-muted-foreground">Tables</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-success">{liveMetrics.openSeats}</div>
              <div className="text-xs text-muted-foreground">Open Seats</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-warning">{liveMetrics.totalWaiting}</div>
              <div className="text-xs text-muted-foreground">Waiting</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables by name, game, or stakes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger>
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone} value={zone}>{zone}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Poker Content Tabs */}
        <Tabs defaultValue="tables" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tables">Live Tables</TabsTrigger>
            <TabsTrigger value="queue">Cash Game Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="space-y-4 mt-6">
            {filteredTables.map(table => {
              const fillPercentage = Math.round((table.players / table.max_seats) * 100);
              
              return (
                <Card key={table.id} className="shadow-elegant">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{table.name}</CardTitle>
                      <Badge variant={table.open_seats > 0 ? "default" : "secondary"}>
                        {table.open_seats > 0 ? `${table.open_seats} Open` : 'Full'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {table.game} • {table.stakes} • {table.floor_zone}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{table.players}/{table.max_seats} seated ({fillPercentage}%)</span>
                      </div>
                      {table.wait_count > 0 && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-warning" />
                          <span className="text-xs text-warning">{table.wait_count} waiting</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4 mt-6">
            {cashGames.map(game => (
              <Card key={game.id} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{game.game}</CardTitle>
                    <Badge variant={game.list_status === 'open' ? "default" : "secondary"}>
                      {game.list_status === 'open' ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Table Capacity:</span>
                      <span className="font-medium">{game.table_max} players</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Open Seats:</span>
                      <span className="font-medium">{game.open_seats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">In Queue:</span>
                      <span className="font-medium">{game.wait_count} waiting</span>
                    </div>
                  </div>
                  
                  {game.list_status === 'open' && (
                    <Button 
                      className="w-full"
                      onClick={() => handleJoinQueue(game.id)}
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Join Queue
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Auto Update Note */}
        <div className="text-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPokerData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Data updates automatically every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
};