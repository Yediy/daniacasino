import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { useSMSNotifications } from "@/hooks/use-sms-notifications";
import { Spade, Users, UserPlus, UserMinus, ArrowRight, Phone } from "lucide-react";

interface PokerTable {
  id: string;
  name: string;
  game: string;
  stakes: string;
  max_seats: number;
  open_seats: number;
  players: number;
  wait_count: number;
  status: string | null;
  floor_zone: string | null;
}

interface QueueEntry {
  id: string;
  user_id: string;
  position: number;
  created_at: string;
}

export default function TableManagement() {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<PokerTable | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { showNotification } = useNotifications();
  const { sendSeatAvailableNotification } = useSMSNotifications();

  useEffect(() => {
    fetchTables();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('table-management')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_tables' },
        () => fetchTables()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_game_queue' },
        () => {
          if (selectedTable) fetchQueue(selectedTable.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchQueue(selectedTable.id);
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .select('*')
        .order('name');

      if (error) throw error;
      setTables(data || []);
      
      if (data && data.length > 0 && !selectedTable) {
        setSelectedTable(data[0]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error",
        description: "Failed to load poker tables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueue = async (tableId: string) => {
    try {
      const { data: queueData, error: queueError } = await supabase
        .from('cash_game_queue')
        .select('*')
        .eq('list_id', tableId)
        .order('position');

      if (queueError) throw queueError;
      setQueue(queueData || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const callNextPlayer = async () => {
    if (!selectedTable || queue.length === 0) return;

    try {
      const nextPlayer = queue[0];
      
      // Create seat hold
      const { error: holdError } = await supabase
        .from('seat_holds')
        .insert({
          table_id: selectedTable.id,
          user_id: nextPlayer.user_id,
          seat_no: 1,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });

      if (holdError) throw holdError;

      // Get player phone for SMS
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', nextPlayer.user_id)
        .single();

      // Send in-app notification
      showNotification({
        title: "Seat Available",
        message: `Your seat at ${selectedTable.name} is ready!`,
        type: "seat_available",
        referenceId: selectedTable.id,
      });

      // Send SMS if phone is available
      if (profile?.phone) {
        await sendSeatAvailableNotification(
          profile.phone,
          selectedTable.name,
          nextPlayer.user_id
        );
      }

      toast({
        title: "Player Called",
        description: `Player has been notified via app${profile?.phone ? ' and SMS' : ''}`,
      });

      fetchQueue(selectedTable.id);
    } catch (error) {
      console.error('Error calling player:', error);
      toast({
        title: "Error",
        description: "Failed to call next player",
        variant: "destructive",
      });
    }
  };

  const removeFromQueue = async (queueId: string) => {
    try {
      const { error } = await supabase
        .from('cash_game_queue')
        .delete()
        .eq('id', queueId);

      if (error) throw error;

      toast({
        title: "Removed from Queue",
        description: "Player has been removed",
      });

      if (selectedTable) fetchQueue(selectedTable.id);
    } catch (error) {
      console.error('Error removing from queue:', error);
      toast({
        title: "Error",
        description: "Failed to remove player",
        variant: "destructive",
      });
    }
  };

  const updateTableStatus = async (tableId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('poker_tables')
        .update({ status })
        .eq('id', tableId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Table status changed to ${status}`,
      });

      fetchTables();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update table status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading tables...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Spade className="h-8 w-8 text-primary" />
            Table Management
          </h1>
          <p className="text-muted-foreground">
            Manage poker tables and waitlists
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables List */}
          <Card className="shadow-elegant lg:col-span-1">
            <CardHeader>
              <CardTitle>Active Tables</CardTitle>
              <CardDescription>{tables.length} tables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tables.map(table => (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTable?.id === table.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-bold">{table.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {table.game} • {table.stakes}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={table.open_seats > 0 ? 'default' : 'secondary'}>
                      {table.players}/{table.max_seats}
                    </Badge>
                    {table.wait_count > 0 && (
                      <Badge variant="outline">
                        {table.wait_count} waiting
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Table Details & Actions */}
          <Card className="shadow-elegant lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTable?.name || 'Select a Table'}</CardTitle>
                  {selectedTable && (
                    <CardDescription>
                      {selectedTable.game} • {selectedTable.stakes}
                    </CardDescription>
                  )}
                </div>
                {selectedTable && (
                  <Select
                    value={selectedTable.status || 'open'}
                    onValueChange={(status) => updateTableStatus(selectedTable.id, status)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTable ? (
                <div className="text-center py-12 text-muted-foreground">
                  Select a table to manage waitlist
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Table Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{selectedTable.players}</div>
                      <div className="text-xs text-muted-foreground">Players Seated</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <UserPlus className="h-6 w-6 mx-auto mb-2 text-success" />
                      <div className="text-2xl font-bold">{selectedTable.open_seats}</div>
                      <div className="text-xs text-muted-foreground">Open Seats</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <UserMinus className="h-6 w-6 mx-auto mb-2 text-warning" />
                      <div className="text-2xl font-bold">{queue.length}</div>
                      <div className="text-xs text-muted-foreground">In Queue</div>
                    </div>
                  </div>

                  {/* Queue Management */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Waiting List</h3>
                      {queue.length > 0 && selectedTable.open_seats > 0 && (
                        <Button onClick={callNextPlayer}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Call Next Player
                        </Button>
                      )}
                    </div>

                    {queue.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted rounded-lg">
                        No players in queue
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {queue.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl font-bold text-primary">
                                #{entry.position}
                              </div>
                              <div>
                                <div className="font-medium">
                                  Player {entry.user_id.substring(0, 8)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Joined {new Date(entry.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => removeFromQueue(entry.id)}
                              variant="outline"
                              size="sm"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
