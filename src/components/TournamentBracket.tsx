import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TournamentBracket {
  id: string;
  round_number: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_chips: number;
  player2_chips: number;
  status: string;
}

interface TournamentStanding {
  id: string;
  user_id: string;
  rank: number;
  prize_amount: number;
  final_chips: number;
  profiles: {
    name: string | null;
  };
}

export default function TournamentBracket({ tourneyId }: { tourneyId: string }) {
  const [brackets, setBrackets] = useState<TournamentBracket[]>([]);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [prizePool, setPrizePool] = useState(0);

  useEffect(() => {
    fetchBrackets();
    fetchStandings();
    subscribeToBrackets();
  }, [tourneyId]);

  const fetchBrackets = async () => {
    const { data, error } = await supabase
      .from("tournament_brackets")
      .select("*")
      .eq("tourney_id", tourneyId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    if (!error && data) {
      setBrackets(data);
    }
  };

  const fetchStandings = async () => {
    const { data: standingsData, error: standingsError } = await supabase
      .from("tournament_standings")
      .select(`
        *,
        profiles:user_id (name)
      `)
      .eq("tourney_id", tourneyId)
      .order("rank", { ascending: true });

    if (!standingsError && standingsData) {
      setStandings(standingsData as any);
      const total = standingsData.reduce((sum, s) => sum + s.prize_amount, 0);
      setPrizePool(total);
    }
  };

  const subscribeToBrackets = () => {
    const channel = supabase
      .channel(`tournament-${tourneyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_brackets",
          filter: `tourney_id=eq.${tourneyId}`
        },
        () => {
          fetchBrackets();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_standings",
          filter: `tourney_id=eq.${tourneyId}`
        },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const groupByRound = () => {
    const rounds: { [key: number]: TournamentBracket[] } = {};
    brackets.forEach((bracket) => {
      if (!rounds[bracket.round_number]) {
        rounds[bracket.round_number] = [];
      }
      rounds[bracket.round_number].push(bracket);
    });
    return rounds;
  };

  const getRoundName = (round: number) => {
    const totalRounds = Math.max(...brackets.map((b) => b.round_number), 0);
    if (round === totalRounds) return "Finals";
    if (round === totalRounds - 1) return "Semi-Finals";
    if (round === totalRounds - 2) return "Quarter-Finals";
    return `Round ${round}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <Award className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const rounds = groupByRound();

  return (
    <Tabs defaultValue="bracket" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="bracket">Bracket</TabsTrigger>
        <TabsTrigger value="standings">Standings</TabsTrigger>
      </TabsList>

      <TabsContent value="bracket">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Bracket</CardTitle>
            <CardDescription>Live tournament progression</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="flex gap-8 pb-4">
                {Object.entries(rounds).map(([roundNum, matches]) => (
                  <div key={roundNum} className="flex-shrink-0 min-w-[250px]">
                    <h3 className="font-semibold mb-4 text-center">
                      {getRoundName(parseInt(roundNum))}
                    </h3>
                    <div className="space-y-4">
                      {matches.map((match) => (
                        <Card key={match.id}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div
                                className={`p-2 rounded flex justify-between items-center ${
                                  match.winner_id === match.player1_id
                                    ? "bg-primary/20 border border-primary"
                                    : "bg-muted"
                                }`}
                              >
                                <span className="font-medium">
                                  {match.player1_id ? `Player ${match.match_number * 2 - 1}` : "TBD"}
                                </span>
                                <Badge variant="outline">{match.player1_chips}</Badge>
                              </div>
                              <div className="text-center text-xs text-muted-foreground">vs</div>
                              <div
                                className={`p-2 rounded flex justify-between items-center ${
                                  match.winner_id === match.player2_id
                                    ? "bg-primary/20 border border-primary"
                                    : "bg-muted"
                                }`}
                              >
                                <span className="font-medium">
                                  {match.player2_id ? `Player ${match.match_number * 2}` : "TBD"}
                                </span>
                                <Badge variant="outline">{match.player2_chips}</Badge>
                              </div>
                              <Badge
                                className="w-full justify-center"
                                variant={
                                  match.status === "completed"
                                    ? "default"
                                    : match.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {match.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="standings">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Standings</CardTitle>
            <CardDescription>
              Prize Pool: ${(prizePool / 100).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {standings.map((standing) => (
                  <Card key={standing.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getRankIcon(standing.rank)}
                        <div>
                          <div className="font-semibold">
                            {standing.profiles?.name || "Anonymous"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Rank #{standing.rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          ${(standing.prize_amount / 100).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {standing.final_chips.toLocaleString()} chips
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {standings.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No standings available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
