import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthGuard } from "@/components/AuthGuard";
import { Clock, Users, AlertCircle, CheckCircle2, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CashGameList {
  id: string;
  game: string;
  table_max: number;
  open_seats: number;
  wait_count: number;
  list_status: 'open' | 'closed';
  notes?: string;
  updated_at: string;
}

interface QueueEntry {
  id: string;
  position: number;
  checkin_status: 'remote' | 'present';
  hold_expires_at?: string;
  created_at: string;
  cash_game_lists: {
    game: string;
  };
}

export const PokerQueue = () => {
  const [gamesList, setGamesList] = useState<CashGameList[]>([]);
  const [myEntries, setMyEntries] = useState<QueueEntry[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQueueData();
    
    // Set up real-time subscriptions
    const gameSubscription = supabase
      .channel('cash-game-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_game_lists' },
        () => {
          fetchQueueData();
        }
      )
      .subscribe();

    const queueSubscription = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_game_queue' },
        () => {
          fetchMyEntries();
        }
      )
      .subscribe();

    return () => {
      gameSubscription.unsubscribe();
      queueSubscription.unsubscribe();
    };
  }, []);

  const fetchQueueData = async () => {
    try {
      // Fetch available games
      const { data: games, error: gamesError } = await supabase
        .from('cash_game_lists')
        .select('*')
        .order('game');

      if (gamesError) throw gamesError;
      
      const typedGames = (games || []).map(game => ({
        ...game,
        list_status: game.list_status as 'open' | 'closed'
      }));
      
      setGamesList(typedGames);

      await fetchMyEntries();
    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast({
        title: "Error",
        description: "Failed to load queue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entries, error } = await supabase
        .from('cash_game_queue')
        .select(`
          id, position, checkin_status, hold_expires_at, created_at,
          cash_game_lists!inner(game)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedEntries = (entries || []).map(entry => ({
        ...entry,
        checkin_status: entry.checkin_status as 'remote' | 'present'
      }));
      
      setMyEntries(typedEntries);
    } catch (error) {
      console.error('Error fetching my entries:', error);
    }
  };

  const handleJoinQueue = async () => {
    if (!selectedGame) return;

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to join the queue",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('join-cash-game-queue', {
        body: {
          listId: selectedGame
        }
      });

      if (error) throw error;

      toast({
        title: "Joined Queue!",
        description: `You're now in line for ${data.game}. Position: ${data.position}`,
      });

      setSelectedGame("");
      fetchMyEntries();

    } catch (error) {
      console.error('Error joining queue:', error);
      toast({
        title: "Error",
        description: "Failed to join queue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  const getWaitTime = (waitCount: number) => {
    // Estimate 15-20 minutes per person ahead
    const avgWaitMinutes = waitCount * 17;
    if (avgWaitMinutes < 60) {
      return `~${avgWaitMinutes} min`;
    }
    return `~${Math.round(avgWaitMinutes / 60)} hr`;
  };

  const isHoldExpiring = (entry: QueueEntry) => {
    if (!entry.hold_expires_at) return false;
    const expiry = new Date(entry.hold_expires_at);
    const now = new Date();
    const minutesLeft = (expiry.getTime() - now.getTime()) / (1000 * 60);
    return minutesLeft <= 5 && minutesLeft > 0;
  };

  if (loading) {
    return (
      <AuthGuard requireAuth>
        <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
          <div className="max-w-md mx-auto px-4">
            <div className="text-center">Loading queue...</div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-casino-charcoal">
              Cash Game Queue
            </h2>
            <p className="text-muted-foreground">
              Join the line for your favorite games
            </p>
          </div>

          {/* My Queue Entries */}
          {myEntries.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-casino-charcoal">
                My Queue Positions
              </h3>
              
              {myEntries.map((entry) => (
                <Card key={entry.id} className="shadow-elegant">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-casino-charcoal">
                          {entry.cash_game_lists.game}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Position #{entry.position} in line
                        </div>
                        {entry.hold_expires_at && (
                          <div className={`text-xs flex items-center space-x-1 ${
                            isHoldExpiring(entry) ? 'text-red-600' : 'text-green-600'
                          }`}>
                            <Timer className="h-3 w-3" />
                            <span>
                              {isHoldExpiring(entry) 
                                ? "Hold expiring soon!" 
                                : "Seat held until " + new Date(entry.hold_expires_at).toLocaleTimeString()
                              }
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={entry.checkin_status === 'present' ? "default" : "secondary"}>
                          {entry.checkin_status === 'present' ? 'Present' : 'Remote'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Available Games */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-casino-charcoal">
              Available Games
            </h3>
            
            {gamesList.filter(game => game.list_status === 'open').map((game) => (
              <Card key={game.id} className="shadow-elegant hover:shadow-gold transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold text-casino-charcoal">
                        {game.game}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {game.table_max - game.open_seats}/{game.table_max} seats filled
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <Users className="h-3 w-3 text-primary" />
                        <span>{game.wait_count} waiting</span>
                        {game.wait_count > 0 && (
                          <>
                            <Clock className="h-3 w-3 text-primary ml-2" />
                            <span>{getWaitTime(game.wait_count)} wait</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant={game.open_seats > 0 ? "default" : "secondary"}>
                        {game.open_seats > 0 ? `${game.open_seats} Open` : 'Full'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGame(game.id)}
                        disabled={myEntries.some(e => e.cash_game_lists.game === game.game)}
                        className="w-full text-xs"
                      >
                        {myEntries.some(e => e.cash_game_lists.game === game.game) 
                          ? 'Already Queued' 
                          : 'Join Queue'
                        }
                      </Button>
                    </div>
                  </div>
                  
                  {game.notes && (
                    <div className="mt-2 p-2 bg-accent/20 rounded text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {game.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Join Queue Button */}
          {selectedGame && (
            <Card className="shadow-elegant bg-gradient-gold text-primary-foreground">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <h4 className="font-semibold">Ready to Join Queue?</h4>
                  <p className="text-sm opacity-90">
                    You'll receive notifications when your seat is ready
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedGame("")}
                      className="flex-1 bg-white/10 hover:bg-white/20"
                      disabled={joining}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleJoinQueue}
                      className="flex-1 bg-white/90 text-primary hover:bg-white"
                      disabled={joining}
                    >
                      {joining ? "Joining..." : "Confirm"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue Rules */}
          <Card className="shadow-elegant bg-accent/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Queue Guidelines</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>You'll have 5-10 minutes to claim your seat when called</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>Check in at the poker room desk when you arrive</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span>Wait times are estimates and may vary</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
};