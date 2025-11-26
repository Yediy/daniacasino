import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TournamentBlindStructure({ tourneyId }: { tourneyId: string }) {
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStructure();
  }, [tourneyId]);

  const fetchStructure = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_structures')
        .select('*')
        .eq('tourney_id', tourneyId)
        .order('level_number');

      if (error) throw error;
      setStructure(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading structure",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Blind Structure
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Configure blind levels for this tournament</p>
      </CardContent>
    </Card>
  );
}
