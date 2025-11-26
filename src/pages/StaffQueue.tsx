import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ArrowRight, Phone } from "lucide-react";

interface QueueEntry {
  id: string;
  user_id: string;
  position: number;
  checkin_status: string;
  estimated_wait_minutes: number;
  created_at: string;
  hold_expires_at: string | null;
  profiles: {
    name: string;
    phone: string;
  };
}

interface CashGameList {
  id: string;
  game: string;
  open_seats: number;
  wait_count: number;
  list_status: string;
}

export default function StaffQueue() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cashGames, setCashGames] = useState<CashGameList[]>([]);
  const [queueEntries, setQueueEntries] = useState<Record<string, QueueEntry[]>>({});
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const queueChannel = supabase
      .channel("queue-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_game_queue",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [gamesRes, queueRes] = await Promise.all([
        supabase.from("cash_game_lists").select("*").order("game"),
        supabase
          .from("cash_game_queue")
          .select("*, profiles(name, phone)")
          .order("position"),
      ]);

      if (gamesRes.data) setCashGames(gamesRes.data);

      if (queueRes.data) {
        const groupedQueue: Record<string, QueueEntry[]> = {};
        queueRes.data.forEach((entry: any) => {
          if (!groupedQueue[entry.list_id]) {
            groupedQueue[entry.list_id] = [];
          }
          groupedQueue[entry.list_id].push(entry);
        });
        setQueueEntries(groupedQueue);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const callNextPlayer = async (listId: string) => {
    const queue = queueEntries[listId];
    if (!queue || queue.length === 0) {
      toast({
        title: "No Players",
        description: "No one is waiting in this queue.",
        variant: "destructive",
      });
      return;
    }

    const nextPlayer = queue[0];
    setLoading(true);

    try {
      // Create seat hold via edge function
      const { data, error } = await supabase.functions.invoke("reserve-seat", {
        body: {
          queueId: nextPlayer.id,
          seatNo: 1, // Staff will assign actual seat
          tableId: listId,
        },
      });

      if (error) throw error;

      toast({
        title: "Player Called",
        description: `${nextPlayer.profiles.name} has been notified.`,
      });

      fetchData();
    } catch (error: any) {
      console.error("Error calling player:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to call player.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromQueue = async (queueId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cash_game_queue")
        .delete()
        .eq("id", queueId);

      if (error) throw error;

      toast({
        title: "Removed",
        description: "Player removed from queue.",
      });

      fetchData();
    } catch (error) {
      console.error("Error removing from queue:", error);
      toast({
        title: "Error",
        description: "Failed to remove player.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">Manage poker table waitlists</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Games List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashGames.map((game) => {
              const queueLength = queueEntries[game.id]?.length || 0;
              return (
                <Card
                  key={game.id}
                  className={`cursor-pointer transition-all ${
                    selectedGame === game.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedGame(game.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{game.game}</h3>
                        <p className="text-sm text-muted-foreground">
                          {game.open_seats} seats • {game.list_status}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-lg">
                          {queueLength}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">waiting</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Queue Details */}
        <Card>
          <CardHeader>
            <CardTitle>Queue Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedGame ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a game to view queue
              </div>
            ) : (
              <div className="space-y-3">
                {queueEntries[selectedGame]?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No players waiting
                  </div>
                ) : (
                  queueEntries[selectedGame]?.map((entry, index) => (
                    <Card key={entry.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className="text-lg px-3 py-1">
                              #{entry.position}
                            </Badge>
                            <div>
                              <h4 className="font-semibold">
                                {entry.profiles?.name || "Unknown"}
                              </h4>
                              {entry.profiles?.phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {entry.profiles.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              entry.checkin_status === "called"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {entry.checkin_status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <Clock className="h-4 w-4" />
                          <span>
                            Wait: ~{entry.estimated_wait_minutes || 0} min
                          </span>
                          <span>•</span>
                          <span>
                            Joined{" "}
                            {new Date(entry.created_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {index === 0 && entry.checkin_status !== "called" && (
                            <Button
                              onClick={() => callNextPlayer(selectedGame)}
                              disabled={loading}
                              className="flex-1"
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Call Player
                            </Button>
                          )}
                          <Button
                            onClick={() => removeFromQueue(entry.id)}
                            disabled={loading}
                            variant="destructive"
                            size={index === 0 ? "default" : "sm"}
                            className={index === 0 ? "" : "w-full"}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
