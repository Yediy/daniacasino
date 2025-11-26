import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  tournament_date: string;
  seats_total: number;
}

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_seed: number | null;
  player2_seed: number | null;
  status: string;
  player1?: { name: string };
  player2?: { name: string };
}

export const TournamentBracketView = () => {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchMatches(selectedTournament.id);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("poker_tourneys")
        .select("*")
        .order("tournament_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const fetchMatches = async (tourneyId: string) => {
    try {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select(`
          *,
          player1:profiles!tournament_matches_player1_id_fkey(name),
          player2:profiles!tournament_matches_player2_id_fkey(name)
        `)
        .eq("tourney_id", tourneyId)
        .order("round_number")
        .order("match_number");

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const generateBracket = async () => {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("generate_tournament_bracket", {
        p_tourney_id: selectedTournament.id,
      });

      if (error) throw error;

      const result = data as { rounds: number; entry_count: number };

      toast({
        title: "Bracket Generated",
        description: `Created ${result.rounds} rounds for ${result.entry_count} players.`,
      });

      fetchMatches(selectedTournament.id);
    } catch (error: any) {
      console.error("Error generating bracket:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate bracket.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupMatchesByRound = () => {
    const rounds: Record<number, Match[]> = {};
    matches.forEach((match) => {
      if (!rounds[match.round_number]) {
        rounds[match.round_number] = [];
      }
      rounds[match.round_number].push(match);
    });
    return rounds;
  };

  const roundedMatches = groupMatchesByRound();
  const maxRound = Math.max(...Object.keys(roundedMatches).map(Number), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Select Tournament
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className={`cursor-pointer transition-all ${
                  selectedTournament?.id === tournament.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedTournament(tournament)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold">{tournament.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(tournament.tournament_date).toLocaleDateString()} •{" "}
                    {tournament.seats_total} entries
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTournament && (
        <>
          {matches.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Generate Bracket</h3>
                <p className="text-muted-foreground mb-6">
                  Create tournament brackets with automatic seeding based on player rankings
                </p>
                <Button onClick={generateBracket} disabled={loading} size="lg">
                  Generate Bracket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tournament Bracket</CardTitle>
                  <Button onClick={generateBracket} disabled={loading} variant="outline">
                    Regenerate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex gap-8 min-w-max">
                    {Object.entries(roundedMatches).map(([round, roundMatches]) => (
                      <div key={round} className="space-y-4 min-w-[300px]">
                        <h3 className="font-semibold text-center">
                          {Number(round) === maxRound
                            ? "Finals"
                            : Number(round) === maxRound - 1
                            ? "Semi-Finals"
                            : `Round ${round}`}
                        </h3>
                        {roundMatches.map((match) => (
                          <Card key={match.id} className="border-2">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {match.player1_seed && (
                                      <Badge variant="outline" className="text-xs">
                                        #{match.player1_seed}
                                      </Badge>
                                    )}
                                    <span className={match.winner_id === match.player1_id ? "font-bold" : ""}>
                                      {match.player1?.name || "TBD"}
                                    </span>
                                  </div>
                                  {match.winner_id === match.player1_id && (
                                    <Trophy className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div className="border-t" />
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {match.player2_seed && (
                                      <Badge variant="outline" className="text-xs">
                                        #{match.player2_seed}
                                      </Badge>
                                    )}
                                    <span className={match.winner_id === match.player2_id ? "font-bold" : ""}>
                                      {match.player2?.name || "TBD"}
                                    </span>
                                  </div>
                                  {match.winner_id === match.player2_id && (
                                    <Trophy className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  match.status === "completed"
                                    ? "default"
                                    : match.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="mt-3 w-full justify-center"
                              >
                                {match.status}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
