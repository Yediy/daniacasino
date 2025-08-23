import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Users, Clock, MapPin, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PokerTable {
  id: string;
  name: string;
  game: string;
  stakes: string;
  max_seats: number;
  open_seats: number;
  players: number;
  seated_player_ids: string[];
  status: string;
  wait_count: number;
  floor_zone: string;
}

interface CashGameList {
  id: string;
  game: string;
  table_max: number;
  open_seats: number;
  wait_count: number;
  list_status: string;
  notes?: string;
}

interface LiveMetrics {
  totalTables: number;
  totalSeatsOpen: number;
  totalWaiting: number;
}

export const PokerLive = () => {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [cashGames, setCashGames] = useState<CashGameList[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics>({ totalTables: 0, totalSeatsOpen: 0, totalWaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPokerData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchPokerData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPokerData = async () => {
    try {
      // Fetch live poker tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('status', 'open')
        .order('floor_zone', { ascending: true });

      if (tablesError) throw tablesError;

      // Fetch cash game lists
      const { data: cashGamesData, error: cashGamesError } = await supabase
        .from('cash_game_lists')
        .select('*')
        .eq('list_status', 'open')
        .order('game', { ascending: true });

      if (cashGamesError) throw cashGamesError;

      setTables(tablesData || []);
      setCashGames(cashGamesData || []);

      // Calculate live metrics
      const totalTables = (tablesData || []).length;
      const totalSeatsOpen = (tablesData || []).reduce((sum, table) => sum + table.open_seats, 0);
      const totalWaiting = (cashGamesData || []).reduce((sum, game) => sum + game.wait_count, 0);

      setMetrics({ totalTables, totalSeatsOpen, totalWaiting });

    } catch (error) {
      console.error('Error fetching poker data:', error);
      toast({
        title: "Error",
        description: "Failed to load live poker data",
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
          description: "Please log in to join the queue",
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
        description: `You're #${data.position} in line for ${data.game}`,
      });

      // Refresh data
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

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.game.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.stakes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = selectedZone === "all" || table.floor_zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const zones = ["all", ...Array.from(new Set(tables.map(t => t.floor_zone)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading live poker data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Live Poker Room
          </h2>
          <p className="text-muted-foreground">
            Real-time tables and queues
          </p>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center shadow-elegant">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-casino-charcoal">{metrics.totalTables}</div>
              <div className="text-xs text-muted-foreground">Tables Live</div>
            </CardContent>
          </Card>
          <Card className="text-center shadow-elegant">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-green-600">{metrics.totalSeatsOpen}</div>
              <div className="text-xs text-muted-foreground">Seats Open</div>
            </CardContent>
          </Card>
          <Card className="text-center shadow-elegant">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-orange-600">{metrics.totalWaiting}</div>
              <div className="text-xs text-muted-foreground">In Line</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {zones.map((zone) => (
              <Button
                key={zone}
                variant={selectedZone === zone ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedZone(zone)}
                className="whitespace-nowrap text-xs"
              >
                {zone === "all" ? "All Zones" : zone}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="tables" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tables">Live Tables</TabsTrigger>
            <TabsTrigger value="queue">Cash Game Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="space-y-4 mt-6">
            {filteredTables.map((table) => (
              <Card key={table.id} className="shadow-elegant hover:shadow-gold transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-casino-charcoal">
                        {table.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {table.game} • {table.stakes}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      {table.open_seats > 0 ? (
                        <Badge className="bg-green-500 text-white">
                          {table.open_seats} Open
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Full</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Players Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{table.players}/{table.max_seats} players</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">{table.floor_zone}</span>
                    </div>
                  </div>

                  {/* Wait List */}
                  {table.wait_count > 0 && (
                    <div className="bg-accent/20 p-2 rounded text-center">
                      <div className="text-sm font-medium">
                        {table.wait_count} waiting
                      </div>
                    </div>
                  )}

                  {/* Player Avatars (simplified) */}
                  {table.seated_player_ids.length > 0 && (
                    <div className="flex space-x-1">
                      {table.seated_player_ids.slice(0, 5).map((playerId, idx) => (
                        <div
                          key={playerId}
                          className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium"
                        >
                          {playerId.slice(-2)}
                        </div>
                      ))}
                      {table.seated_player_ids.length > 5 && (
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs">
                          +{table.seated_player_ids.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4 mt-6">
            {cashGames.map((game) => (
              <Card key={game.id} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-casino-charcoal">
                        {game.game}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Max {game.table_max} players
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge className={game.open_seats > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                        {game.open_seats} Seats
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Queue Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">{game.wait_count} in line</span>
                    </div>
                    {game.wait_count > 0 && (
                      <div className="text-sm text-muted-foreground">
                        ~{Math.ceil(game.wait_count * 15)} min wait
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {game.notes && (
                    <div className="bg-accent/20 p-2 rounded text-sm">
                      {game.notes}
                    </div>
                  )}

                  {/* Join Queue Button */}
                  <Button 
                    onClick={() => handleJoinQueue(game.id)}
                    className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold"
                    disabled={game.list_status !== 'open'}
                  >
                    Join Queue
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Refresh Note */}
        <Card className="shadow-elegant bg-accent/10">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Data updates automatically every 30 seconds
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};