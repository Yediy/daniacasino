import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Calendar, Clock, DollarSign, Users, CheckCircle, FileText } from "lucide-react";
import { TournamentEntryDialog } from "./TournamentEntryDialog";

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
  description: string | null;
  structure_pdf: string | null;
  late_reg_until: string | null;
}

interface UserEntry {
  id: string;
  tourney_id: string;
  status: string | null;
}

export const TournamentSchedule = ({ onSelectTournament }: { onSelectTournament?: (tourneyId: string) => void }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchTournaments();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    if (user) {
      fetchUserEntries(user.id);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_tourneys')
        .select('*')
        .eq('active', true)
        .gte('tournament_date', new Date().toISOString().split('T')[0])
        .order('tournament_date', { ascending: true })
        .order('tournament_time', { ascending: true });

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

  const fetchUserEntries = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('poker_entries')
        .select('id, tourney_id, status')
        .eq('user_id', uid)
        .eq('status', 'paid');

      if (error) throw error;
      setUserEntries(data || []);
    } catch (error) {
      console.error('Error fetching user entries:', error);
    }
  };

  const handleRegister = (tournament: Tournament) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register for tournaments",
        variant: "destructive",
      });
      return;
    }

    setSelectedTournament(tournament);
    setEntryDialogOpen(true);
  };

  const handleEntrySuccess = () => {
    setEntryDialogOpen(false);
    setSelectedTournament(null);
    if (userId) {
      fetchUserEntries(userId);
    }
    fetchTournaments();
  };

  const isRegistered = (tourneyId: string) => {
    return userEntries.some(entry => entry.tourney_id === tourneyId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Upcoming Tournaments</h2>
        </div>

        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No upcoming tournaments scheduled at this time.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tournaments.map((tournament) => {
              const registered = isRegistered(tournament.id);
              const isFull = tournament.seats_left <= 0;
              const totalPrizePool = ((tournament.seats_total - tournament.seats_left) * tournament.buyin) / 100;

              return (
                <Card key={tournament.id} className="shadow-elegant hover:shadow-floating transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                          {tournament.name}
                          {registered && (
                            <Badge variant="default" className="ml-2">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Registered
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          {tournament.description && (
                            <div className="text-sm">{tournament.description}</div>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={isFull ? 'secondary' : 'default'}>
                          {isFull ? 'Full' : `${tournament.seats_left} seats left`}
                        </Badge>
                        {onSelectTournament && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectTournament(tournament.id)}
                          >
                            View Bracket
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{formatDate(tournament.tournament_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{formatTime(tournament.tournament_time)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            ${tournament.buyin} + ${tournament.fee || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Buy-in + Fee</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {tournament.seats_total - tournament.seats_left}/{tournament.seats_total}
                          </div>
                          <div className="text-xs text-muted-foreground">Registered</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Prize Pool: </span>
                          <span className="font-bold text-lg text-primary">
                            ${totalPrizePool.toLocaleString()}
                          </span>
                        </div>
                        {tournament.structure_pdf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(tournament.structure_pdf!, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Structure
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={() => handleRegister(tournament)}
                        disabled={registered || isFull || !userId}
                        size="lg"
                      >
                        {registered ? 'Already Registered' : isFull ? 'Tournament Full' : 'Register Now'}
                      </Button>
                    </div>

                    {tournament.late_reg_until && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Late registration until: {new Date(tournament.late_reg_until).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedTournament && (
        <TournamentEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          tournament={{
            id: selectedTournament.id,
            name: selectedTournament.name,
            tournament_date: selectedTournament.tournament_date,
            tournament_time: selectedTournament.tournament_time,
            buyin: selectedTournament.buyin,
            fee: selectedTournament.fee || 0,
            seats_total: selectedTournament.seats_total,
            seats_left: selectedTournament.seats_left,
            description: selectedTournament.description || undefined,
            late_reg_until: selectedTournament.late_reg_until || undefined,
          }}
          onSuccess={handleEntrySuccess}
        />
      )}
    </>
  );
};