import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Spade, Users, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PokerTable {
  id: string;
  name: string;
  game: string;
  stakes: string;
  max_seats: number;
  open_seats: number;
  players: number;
  wait_count: number;
  status: string;
  floor_zone: string | null;
}

interface QueueEntry {
  id: string;
  position: number;
  table_id: string;
  created_at: string;
}

interface SeatHold {
  id: string;
  table_id: string;
  seat_no: number;
  expires_at: string;
}

export const PokerSeats = () => {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [myQueue, setMyQueue] = useState<QueueEntry[]>([]);
  const [mySeatHolds, setMySeatHolds] = useState<SeatHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPokerData();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('poker-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'poker_tables' },
          () => fetchPokerData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cash_game_queue' },
          () => fetchPokerData()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'seat_holds' },
          () => fetchPokerData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to join poker queues",
        variant: "destructive",
      });
      return;
    }
    setUserId(user.id);
  };

  const fetchPokerData = async () => {
    if (!userId) return;

    try {
      // Fetch poker tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('poker_tables')
        .select('*')
        .order('name');

      if (tablesError) throw tablesError;
      setTables(tablesData || []);

      // Fetch user's queue entries
      const { data: queueData, error: queueError } = await supabase
        .from('cash_game_queue')
        .select('id, position, list_id, created_at')
        .eq('user_id', userId);

      if (queueError) throw queueError;
      
      // Map list_id to table_id for compatibility
      const mappedQueue: QueueEntry[] = (queueData || []).map(q => ({
        id: q.id,
        position: q.position,
        table_id: q.list_id, // cash_game_queue uses list_id
        created_at: q.created_at
      }));
      
      setMyQueue(mappedQueue);

      // Fetch user's seat holds
      const { data: holdsData, error: holdsError } = await supabase
        .from('seat_holds')
        .select('*')
        .eq('user_id', userId);

      if (holdsError) throw holdsError;
      setMySeatHolds(holdsData || []);
    } catch (error) {
      console.error('Error fetching poker data:', error);
      toast({
        title: "Error",
        description: "Failed to load poker table data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinQueue = async (tableId: string) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to join the queue",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('join-cash-game-queue', {
        body: { tableId }
      });

      if (error) throw error;

      toast({
        title: "Joined Queue",
        description: "You've been added to the waiting list",
      });
      
      fetchPokerData();
    } catch (error) {
      console.error('Error joining queue:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join queue",
        variant: "destructive",
      });
    }
  };

  const claimSeat = async (holdId: string) => {
    try {
      const { error } = await supabase.functions.invoke('claim-seat-from-hold', {
        body: { hold_id: holdId }
      });

      if (error) throw error;

      toast({
        title: "Seat Claimed",
        description: "Your seat is now reserved!",
      });
      
      fetchPokerData();
    } catch (error) {
      console.error('Error claiming seat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to claim seat",
        variant: "destructive",
      });
    }
  };

  const leaveQueue = async (queueId: string) => {
    try {
      const { error } = await supabase
        .from('cash_game_queue')
        .delete()
        .eq('id', queueId);

      if (error) throw error;

      toast({
        title: "Left Queue",
        description: "You've been removed from the waiting list",
      });
      
      fetchPokerData();
    } catch (error) {
      console.error('Error leaving queue:', error);
      toast({
        title: "Error",
        description: "Failed to leave queue",
        variant: "destructive",
      });
    }
  };

  const getTableStatus = (table: PokerTable) => {
    if (table.open_seats === 0) return { label: "Full", color: "bg-destructive" };
    if (table.open_seats <= 2) return { label: "Almost Full", color: "bg-warning" };
    return { label: "Available", color: "bg-success" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading poker tables...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2 mb-2">
            <Spade className="h-8 w-8 text-primary" />
            Poker Tables
          </h1>
          <p className="text-muted-foreground">
            View live availability and join waiting lists
          </p>
        </div>

        {/* My Active Seat Holds */}
        {mySeatHolds.length > 0 && (
          <Card className="border-success shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Your Seat is Ready!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mySeatHolds.map((hold) => {
                const table = tables.find(t => t.id === hold.table_id);
                const expiresIn = Math.max(0, Math.floor((new Date(hold.expires_at).getTime() - Date.now()) / 1000 / 60));
                
                return (
                  <div key={hold.id} className="flex items-center justify-between p-4 bg-success/10 rounded-lg border border-success/20">
                    <div>
                      <div className="font-semibold">{table?.name || 'Unknown Table'}</div>
                      <div className="text-sm text-muted-foreground">
                        Seat #{hold.seat_no} • Expires in {expiresIn} minutes
                      </div>
                    </div>
                    <Button onClick={() => claimSeat(hold.id)} variant="default">
                      Claim Seat
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* My Queue Positions */}
        {myQueue.length > 0 && (
          <Card className="border-primary shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                In Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myQueue.map((entry) => {
                const table = tables.find(t => t.id === entry.table_id);
                
                return (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div>
                      <div className="font-semibold">{table?.name || 'Unknown Table'}</div>
                      <div className="text-sm text-muted-foreground">
                        Position #{entry.position} • Joined {new Date(entry.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <Button onClick={() => leaveQueue(entry.id)} variant="outline" size="sm">
                      Leave Queue
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Poker Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tables.map((table) => {
            const status = getTableStatus(table);
            const inQueue = myQueue.some(q => q.table_id === table.id);
            
            return (
              <Card key={table.id} className="shadow-elegant hover:shadow-floating transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{table.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {table.game} • {table.stakes}
                      </CardDescription>
                      {table.floor_zone && (
                        <Badge variant="outline" className="mt-2">
                          {table.floor_zone}
                        </Badge>
                      )}
                    </div>
                    <Badge className={cn("text-white", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-success">{table.open_seats}</div>
                      <div className="text-xs text-muted-foreground">Open Seats</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{table.players}</div>
                      <div className="text-xs text-muted-foreground">Players</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-warning">{table.wait_count}</div>
                      <div className="text-xs text-muted-foreground">In Queue</div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => joinQueue(table.id)}
                    disabled={inQueue || !userId}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {inQueue ? "Already in Queue" : "Join Queue"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tables.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No poker tables currently available
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
