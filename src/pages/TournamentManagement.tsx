import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Plus, Users, DollarSign, Calendar, Clock } from "lucide-react";
import { TournamentClock } from "@/components/TournamentClock";
import { TournamentBlindStructure } from "@/components/TournamentBlindStructure";
import { StreamingIntegration } from "@/components/StreamingIntegration";

interface Tournament {
  id: string;
  name: string;
  tournament_date: string;
  tournament_time: string;
  buyin: number;
  fee: number | null;
  seats_total: number;
  seats_left: number;
  active: boolean | null;
}

interface TournamentEntry {
  id: string;
  user_id: string;
  amount: number;
  status: string | null;
}

export default function TournamentManagement() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    tournament_date: '',
    tournament_time: '',
    buyin: 0,
    fee: 0,
    seats_total: 100,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchEntries(selectedTournament.id);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_tourneys')
        .select('*')
        .order('tournament_date', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from('poker_entries')
        .select('*')
        .eq('tourney_id', tournamentId)
        .order('issued_at', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const createTournament = async () => {
    try {
      const { error } = await supabase
        .from('poker_tourneys')
        .insert({
          ...newTournament,
          seats_left: newTournament.seats_total,
          active: true,
        });

      if (error) throw error;

      toast({
        title: "Tournament Created",
        description: "New tournament has been added",
      });

      setCreateDialogOpen(false);
      setNewTournament({
        name: '',
        tournament_date: '',
        tournament_time: '',
        buyin: 0,
        fee: 0,
        seats_total: 100,
      });
      fetchTournaments();
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
    }
  };

  const toggleTournamentStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('poker_tourneys')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Tournament ${!active ? 'activated' : 'deactivated'}`,
      });

      fetchTournaments();
    } catch (error) {
      console.error('Error updating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Tournament Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage poker tournaments
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Tournament
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Tournament</DialogTitle>
                <DialogDescription>Add a new poker tournament</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tournament Name</Label>
                  <Input
                    value={newTournament.name}
                    onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                    placeholder="Weekend Championship"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newTournament.tournament_date}
                      onChange={(e) => setNewTournament({ ...newTournament, tournament_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={newTournament.tournament_time}
                      onChange={(e) => setNewTournament({ ...newTournament, tournament_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Buy-in ($)</Label>
                    <Input
                      type="number"
                      value={newTournament.buyin}
                      onChange={(e) => setNewTournament({ ...newTournament, buyin: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Fee ($)</Label>
                    <Input
                      type="number"
                      value={newTournament.fee}
                      onChange={(e) => setNewTournament({ ...newTournament, fee: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Total Seats</Label>
                  <Input
                    type="number"
                    value={newTournament.seats_total}
                    onChange={(e) => setNewTournament({ ...newTournament, seats_total: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <Button onClick={createTournament} className="w-full">
                  Create Tournament
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tournaments List */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>All Tournaments</CardTitle>
              <CardDescription>Click to view registrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {tournaments.map(tournament => (
                <div
                  key={tournament.id}
                  onClick={() => setSelectedTournament(tournament)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedTournament?.id === tournament.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold">{tournament.name}</div>
                    <Badge variant={tournament.active ? 'default' : 'secondary'}>
                      {tournament.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(tournament.tournament_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {tournament.tournament_time}
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      ${tournament.buyin} + ${tournament.fee || 0}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {tournament.seats_total - tournament.seats_left}/{tournament.seats_total} registered
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTournamentStatus(tournament.id, tournament.active || false);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {tournament.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
              {tournaments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No tournaments created yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tournament Details */}
          <div className="space-y-6">
            {selectedTournament && (
              <>
                <TournamentClock tourneyId={selectedTournament.id} />
                <TournamentBlindStructure tourneyId={selectedTournament.id} />
                <StreamingIntegration tourneyId={selectedTournament.id} />
              </>
            )}
            
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>
                  {selectedTournament ? 'Registrations' : 'Select a Tournament'}
                </CardTitle>
                {selectedTournament && (
                  <CardDescription>
                    {entries.length} players registered
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
              {!selectedTournament ? (
                <div className="text-center py-12 text-muted-foreground">
                  Select a tournament to view registrations
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Prize Pool */}
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-sm text-muted-foreground">Prize Pool</div>
                    <div className="text-2xl font-bold text-primary">
                      ${((entries.length * selectedTournament.buyin) / 100).toLocaleString()}
                    </div>
                  </div>

                  {/* Entries List */}
                  <div className="space-y-2">
                    {entries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No registrations yet
                      </div>
                    ) : (
                      entries.map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-muted-foreground">
                              #{index + 1}
                            </div>
                            <div>
                              <div className="font-medium">
                                Player {entry.user_id.substring(0, 8)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${(entry.amount / 100).toFixed(2)} paid
                              </div>
                            </div>
                          </div>
                          <Badge variant={entry.status === 'paid' ? 'default' : 'secondary'}>
                            {entry.status || 'pending'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
