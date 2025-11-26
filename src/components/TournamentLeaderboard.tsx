import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  tournament_date: string;
  tournament_time: string;
  buyin: number;
}

interface Standing {
  id: string;
  rank: number;
  user_id: string;
  current_chips: number;
  final_chips: number | null;
  prize_amount: number | null;
  eliminated_at: string | null;
  profiles: {
    name: string;
  };
}

export function TournamentLeaderboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchStandings(selectedTournament);
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('tournament-standings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_standings',
            filter: `tourney_id=eq.${selectedTournament}`
          },
          () => {
            fetchStandings(selectedTournament);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_tourneys')
        .select('*')
        .eq('active', true)
        .order('tournament_date', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
      if (data && data.length > 0) {
        setSelectedTournament(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching tournaments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async (tourneyId: string) => {
    try {
      const { data, error } = await supabase
        .from('tournament_standings')
        .select(`
          *,
          profiles:user_id (
            name
          )
        `)
        .eq('tourney_id', tourneyId)
        .order('rank', { ascending: true });

      if (error) throw error;
      setStandings(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching standings",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500"><Trophy className="w-3 h-3 mr-1" />1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600">3rd</Badge>;
    return <Badge variant="outline">{rank}th</Badge>;
  };

  const getChipTrend = (standing: Standing) => {
    if (!standing.final_chips || standing.eliminated_at) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
    if (standing.current_chips > standing.final_chips) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    if (standing.current_chips < standing.final_chips) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (loading) {
    return <div className="text-center p-8">Loading tournaments...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {tournaments.map((tournament) => (
              <button
                key={tournament.id}
                onClick={() => setSelectedTournament(tournament.id)}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedTournament === tournament.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold">{tournament.name}</div>
                <div className="text-sm text-muted-foreground">
                  {tournament.tournament_date} at {tournament.tournament_time}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTournament && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Live Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {standings.map((standing) => (
                <div
                  key={standing.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    standing.eliminated_at
                      ? 'bg-muted/50 opacity-60'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getRankBadge(standing.rank)}
                    <div className="flex-1">
                      <div className="font-semibold">{standing.profiles.name}</div>
                      {standing.eliminated_at && (
                        <div className="text-xs text-red-500">
                          Eliminated
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Chips</div>
                      <div className="font-bold flex items-center gap-2">
                        {getChipTrend(standing)}
                        {standing.eliminated_at 
                          ? standing.final_chips?.toLocaleString() 
                          : standing.current_chips.toLocaleString()}
                      </div>
                    </div>
                    
                    {standing.prize_amount && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Prize</div>
                        <div className="font-bold text-green-500">
                          ${(standing.prize_amount / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {standings.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No standings yet for this tournament
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
