import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, SkipForward } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TournamentStructure {
  id: string;
  level_number: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
  break_duration_minutes: number | null;
}

interface ClockState {
  tourney_id: string;
  current_level: number;
  level_started_at: string | null;
  is_paused: boolean;
  is_break: boolean;
}

interface TournamentClockProps {
  tourneyId: string;
}

export function TournamentClock({ tourneyId }: TournamentClockProps) {
  const [structure, setStructure] = useState<TournamentStructure[]>([]);
  const [clockState, setClockState] = useState<ClockState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStructureAndState();

    const channel = supabase
      .channel(`tournament-clock-${tourneyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_clock_state',
          filter: `tourney_id=eq.${tourneyId}`
        },
        () => {
          fetchStructureAndState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tourneyId]);

  useEffect(() => {
    if (!clockState || clockState.is_paused || !clockState.level_started_at) return;

    const interval = setInterval(() => {
      const currentLevel = structure.find(s => s.level_number === clockState.current_level);
      if (!currentLevel) return;

      const startTime = new Date(clockState.level_started_at!).getTime();
      const duration = clockState.is_break 
        ? (currentLevel.break_duration_minutes || 0) * 60 * 1000
        : currentLevel.duration_minutes * 60 * 1000;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining === 0 && !clockState.is_paused) {
        advanceLevel();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [clockState, structure]);

  const fetchStructureAndState = async () => {
    try {
      setLoading(true);

      const [structureRes, stateRes] = await Promise.all([
        supabase
          .from('tournament_structures')
          .select('*')
          .eq('tourney_id', tourneyId)
          .order('level_number'),
        supabase
          .from('tournament_clock_state')
          .select('*')
          .eq('tourney_id', tourneyId)
          .single()
      ]);

      if (structureRes.error) throw structureRes.error;
      if (stateRes.error && stateRes.error.code !== 'PGRST116') throw stateRes.error;

      setStructure(structureRes.data || []);
      setClockState(stateRes.data);
    } catch (error: any) {
      toast({
        title: "Error loading tournament clock",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startClock = async () => {
    try {
      const { error } = await supabase
        .from('tournament_clock_state')
        .upsert({
          tourney_id: tourneyId,
          current_level: 1,
          level_started_at: new Date().toISOString(),
          is_paused: false,
          is_break: false,
        });

      if (error) throw error;

      toast({
        title: "Tournament started",
        description: "The clock is now running",
      });
    } catch (error: any) {
      toast({
        title: "Error starting clock",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePause = async () => {
    if (!clockState) return;

    try {
      const { error } = await supabase
        .from('tournament_clock_state')
        .update({ is_paused: !clockState.is_paused })
        .eq('tourney_id', tourneyId);

      if (error) throw error;

      toast({
        title: clockState.is_paused ? "Clock resumed" : "Clock paused",
      });
    } catch (error: any) {
      toast({
        title: "Error toggling pause",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const advanceLevel = async () => {
    if (!clockState) return;

    const nextLevel = clockState.current_level + 1;
    const nextStructure = structure.find(s => s.level_number === nextLevel);

    if (!nextStructure) {
      toast({
        title: "Tournament complete",
        description: "All levels have been completed",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_clock_state')
        .update({
          current_level: nextLevel,
          level_started_at: new Date().toISOString(),
          is_break: nextStructure.is_break,
        })
        .eq('tourney_id', tourneyId);

      if (error) throw error;

      toast({
        title: nextStructure.is_break ? "Break started" : "Level advanced",
        description: `Now at level ${nextLevel}`,
      });
    } catch (error: any) {
      toast({
        title: "Error advancing level",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentLevel = structure.find(s => s.level_number === clockState?.current_level);

  if (loading) {
    return <div>Loading tournament clock...</div>;
  }

  if (structure.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No tournament structure defined</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Tournament Clock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!clockState ? (
          <Button onClick={startClock} className="w-full">
            <Play className="w-4 h-4 mr-2" />
            Start Tournament
          </Button>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Badge variant={clockState.is_break ? "secondary" : "default"}>
                  Level {clockState.current_level}
                </Badge>
                {clockState.is_paused && <Badge variant="outline">PAUSED</Badge>}
              </div>

              {currentLevel && (
                <>
                  {clockState.is_break ? (
                    <div className="text-2xl font-bold">BREAK</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-3xl font-bold font-mono">
                        {currentLevel.small_blind}/{currentLevel.big_blind}
                      </div>
                      {currentLevel.ante > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Ante: {currentLevel.ante}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-5xl font-bold font-mono text-primary">
                    {formatTime(timeRemaining)}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={togglePause} variant="outline" className="flex-1">
                {clockState.is_paused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button onClick={advanceLevel} variant="outline">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-2">Upcoming Levels</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {structure
                  .filter(s => s.level_number > clockState.current_level)
                  .slice(0, 5)
                  .map((level) => (
                    <div key={level.id} className="flex justify-between text-sm">
                      <span>Level {level.level_number}</span>
                      <span className="font-mono">
                        {level.is_break ? 'Break' : `${level.small_blind}/${level.big_blind}`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
