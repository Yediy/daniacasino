import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";

interface EloHistory {
  id: string;
  game_type: string;
  old_rating: number;
  new_rating: number;
  rating_change: number;
  game_result: string;
  created_at: string;
}

interface PlayerEloRatingProps {
  userId: string;
}

export function PlayerEloRating({ userId }: PlayerEloRatingProps) {
  const [cashGameElo, setCashGameElo] = useState<number>(1500);
  const [tournamentElo, setTournamentElo] = useState<number>(1500);
  const [history, setHistory] = useState<EloHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEloData();
  }, [userId]);

  const fetchEloData = async () => {
    try {
      setLoading(true);

      const [profileRes, historyRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('cash_game_elo, tournament_elo')
          .eq('id', userId)
          .single(),
        supabase
          .from('elo_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (profileRes.data) {
        setCashGameElo(profileRes.data.cash_game_elo || 1500);
        setTournamentElo(profileRes.data.tournament_elo || 1500);
      }

      if (historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (error) {
      console.error('Error fetching ELO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEloColor = (rating: number) => {
    if (rating >= 2000) return "text-purple-500";
    if (rating >= 1800) return "text-blue-500";
    if (rating >= 1600) return "text-green-500";
    if (rating >= 1400) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const getEloLabel = (rating: number) => {
    if (rating >= 2000) return "Master";
    if (rating >= 1800) return "Expert";
    if (rating >= 1600) return "Advanced";
    if (rating >= 1400) return "Intermediate";
    return "Beginner";
  };

  if (loading) {
    return <div>Loading ELO ratings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Rating (ELO)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cash" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash">Cash Games</TabsTrigger>
            <TabsTrigger value="tournament">Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="cash" className="space-y-4">
            <div className="text-center space-y-2">
              <div className={`text-5xl font-bold ${getEloColor(cashGameElo)}`}>
                {cashGameElo}
              </div>
              <Badge variant="secondary">{getEloLabel(cashGameElo)}</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Recent Games</div>
              {history
                .filter(h => h.game_type === 'cash_game')
                .slice(0, 10)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.game_result === 'win' ? 'default' : 'outline'}>
                        {entry.game_result}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {entry.old_rating} → {entry.new_rating}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 font-mono ${entry.rating_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {entry.rating_change >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {entry.rating_change >= 0 ? '+' : ''}{entry.rating_change}
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="tournament" className="space-y-4">
            <div className="text-center space-y-2">
              <div className={`text-5xl font-bold ${getEloColor(tournamentElo)}`}>
                {tournamentElo}
              </div>
              <Badge variant="secondary">{getEloLabel(tournamentElo)}</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Recent Tournaments</div>
              {history
                .filter(h => h.game_type === 'tournament')
                .slice(0, 10)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.game_result === 'win' ? 'default' : 'outline'}>
                        {entry.game_result}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {entry.old_rating} → {entry.new_rating}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 font-mono ${entry.rating_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {entry.rating_change >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {entry.rating_change >= 0 ? '+' : ''}{entry.rating_change}
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
