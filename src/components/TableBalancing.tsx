import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Scale, Users, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PokerTable {
  id: string;
  name: string;
  game: string;
  stakes: string;
  players: number;
  max_seats: number;
  status: string;
}

interface BalanceRecommendation {
  table_id: string;
  table_name: string;
  current_players: number;
  target_players: number;
  max_seats: number;
  action: string;
  delta: number;
}

export function TableBalancing() {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<BalanceRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTables();
    
    // Subscribe to table changes
    const channel = supabase
      .channel('poker-tables-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poker_tables'
        },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .select('*')
        .eq('status', 'open')
        .order('name');

      if (error) throw error;
      setTables(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching tables",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const calculateBalance = async () => {
    if (selectedTables.length < 2) {
      toast({
        title: "Select at least 2 tables",
        description: "You need to select at least 2 tables to balance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('balance_poker_tables', {
        p_table_ids: selectedTables
      }) as { data: any; error: any };

      if (error) throw error;
      
      setRecommendations(data?.recommendations || []);
      toast({
        title: "Balance calculated",
        description: `Analyzing ${data?.total_players} players across ${data?.table_count} tables`,
      });
    } catch (error: any) {
      toast({
        title: "Error calculating balance",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action === 'move_players_out') return <Badge variant="destructive">Move Out</Badge>;
    if (action === 'move_players_in') return <Badge variant="default">Move In</Badge>;
    return <Badge variant="outline">Balanced</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Table Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTables.includes(table.id)}
                    onCheckedChange={() => toggleTable(table.id)}
                  />
                  <div>
                    <div className="font-semibold">{table.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {table.game} - {table.stakes}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono">
                    {table.players}/{table.max_seats}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <Button
            onClick={calculateBalance}
            disabled={loading || selectedTables.length < 2}
            className="w-full"
          >
            <Scale className="w-4 h-4 mr-2" />
            Calculate Balance
          </Button>
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Balance Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.table_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{rec.table_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getActionBadge(rec.action)}
                      <span className="text-sm text-muted-foreground">
                        {Math.abs(rec.delta)} player{Math.abs(rec.delta) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono">
                        {rec.current_players}
                      </div>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {rec.target_players}
                      </div>
                      <div className="text-xs text-muted-foreground">Target</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
