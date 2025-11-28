import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Tournament {
  id: string;
  name: string;
  tournament_date: string;
  tournament_time: string;
  buyin: number;
  fee: number | null;
  seats_total: number;
  seats_left: number;
  description: string | null;
  active: boolean | null;
}

interface TournamentScheduleProps {
  onSelectTournament?: (tourneyId: string) => void;
}

export function TournamentSchedule({ onSelectTournament }: TournamentScheduleProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/2 mb-4" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No upcoming tournaments scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => {
        const isFull = tournament.seats_left <= 0;
        const isLowSeats = tournament.seats_left <= 5 && tournament.seats_left > 0;

        return (
          <Card 
            key={tournament.id} 
            className={`shadow-elegant cursor-pointer transition-all hover:shadow-lg ${
              onSelectTournament ? 'hover:ring-2 hover:ring-primary/20' : ''
            }`}
            onClick={() => onSelectTournament?.(tournament.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{tournament.name}</CardTitle>
                <div className="flex gap-2">
                  {isFull && (
                    <Badge variant="destructive">Full</Badge>
                  )}
                  {isLowSeats && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {tournament.seats_left} left
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament.description && (
                <p className="text-sm text-muted-foreground">{tournament.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{format(new Date(tournament.tournament_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{tournament.tournament_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span>
                    ${tournament.buyin}
                    {tournament.fee ? ` + $${tournament.fee}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{tournament.seats_left} / {tournament.seats_total} seats</span>
                </div>
              </div>

              {onSelectTournament && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  disabled={isFull}
                >
                  {isFull ? 'Tournament Full' : 'View Details'}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
