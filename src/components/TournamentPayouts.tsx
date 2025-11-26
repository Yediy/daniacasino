import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, DollarSign, Users } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  buyin: number;
  tournament_date: string;
  tournament_time: string;
  seats_total: number;
}

interface Standing {
  id: string;
  rank: number;
  user_id: string;
  final_chips: number;
  prize_amount: number | null;
  profiles: {
    name: string;
  };
}

export const TournamentPayouts = () => {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchStandings(selectedTournament.id);
    }
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("poker_tourneys")
        .select("*")
        .order("tournament_date", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast({
        title: "Error",
        description: "Failed to load tournaments.",
        variant: "destructive",
      });
    }
  };

  const fetchStandings = async (tourneyId: string) => {
    try {
      const { data, error } = await supabase
        .from("tournament_standings")
        .select("*, profiles(name)")
        .eq("tourney_id", tourneyId)
        .order("rank");

      if (error) throw error;
      setStandings(data || []);
    } catch (error) {
      console.error("Error fetching standings:", error);
      toast({
        title: "Error",
        description: "Failed to load tournament standings.",
        variant: "destructive",
      });
    }
  };

  const calculatePayouts = async () => {
    if (!selectedTournament) return;

    setLoading(true);
    try {
      // Standard payout structure (can be customized)
      const prizeStructure = [
        { position: 1, percentage: 40 },
        { position: 2, percentage: 25 },
        { position: 3, percentage: 15 },
        { position: 4, percentage: 10 },
        { position: 5, percentage: 6 },
        { position: 6, percentage: 4 },
      ];

      const { data, error } = await supabase.rpc("calculate_tournament_payouts", {
        p_tourney_id: selectedTournament.id,
        p_prize_structure: prizeStructure,
      });

      if (error) throw error;

      const result = data as { total_prize_pool: number; payouts: any[] };

      toast({
        title: "Payouts Calculated",
        description: `Total prize pool: $${(result.total_prize_pool / 100).toFixed(2)}`,
      });

      // Refresh standings
      fetchStandings(selectedTournament.id);
    } catch (error: any) {
      console.error("Error calculating payouts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate payouts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPrizePool = selectedTournament
    ? selectedTournament.buyin * selectedTournament.seats_total
    : 0;

  const totalAwarded = standings.reduce((sum, s) => sum + (s.prize_amount || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Selection
          </CardTitle>
          <CardDescription>
            Select a tournament to manage payouts
          </CardDescription>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tournament.name}</CardTitle>
                  <CardDescription>
                    {new Date(tournament.tournament_date).toLocaleDateString()} at{" "}
                    {tournament.tournament_time}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Buy-in:</span>
                    <span className="font-medium">${(tournament.buyin / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entries:</span>
                    <span className="font-medium">{tournament.seats_total}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTournament && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Prize Pool Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Prize Pool</p>
                  <p className="text-2xl font-bold">${(totalPrizePool / 100).toFixed(2)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Awarded</p>
                  <p className="text-2xl font-bold">${(totalAwarded / 100).toFixed(2)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">
                    ${((totalPrizePool - totalAwarded) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                onClick={calculatePayouts}
                disabled={loading || standings.length === 0}
                className="w-full mt-4"
              >
                Calculate Payouts
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Final Standings
              </CardTitle>
              <CardDescription>
                Tournament results and prize distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {standings.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No standings recorded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {standings.map((standing) => (
                    <div
                      key={standing.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={
                            standing.rank === 1
                              ? "default"
                              : standing.rank <= 3
                              ? "secondary"
                              : "outline"
                          }
                          className="text-lg px-3 py-1"
                        >
                          #{standing.rank}
                        </Badge>
                        <div>
                          <p className="font-semibold">{standing.profiles?.name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">
                            {standing.final_chips ? `${standing.final_chips.toLocaleString()} chips` : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {standing.prize_amount ? (
                          <p className="text-xl font-bold text-primary">
                            ${(standing.prize_amount / 100).toFixed(2)}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">No prize</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
