import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QueuePosition {
  id: string;
  position: number;
  estimated_wait_minutes: number;
  list_id: string;
  cash_game_lists: {
    game: string;
  };
}

export const WaitlistNotifications = () => {
  const { toast } = useToast();
  const [queuePositions, setQueuePositions] = useState<QueuePosition[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchQueuePositions();
      subscribeToQueueUpdates();
    }
  }, [userId]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchQueuePositions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("cash_game_queue")
        .select("*, cash_game_lists(game)")
        .eq("user_id", userId)
        .in("checkin_status", ["remote", "waiting"]);

      if (error) throw error;
      setQueuePositions(data || []);
    } catch (error) {
      console.error("Error fetching queue positions:", error);
    }
  };

  const subscribeToQueueUpdates = () => {
    if (!userId) return;

    const channel = supabase
      .channel("my-queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_game_queue",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Queue update:", payload);
          
          if (payload.eventType === "UPDATE") {
            const newData = payload.new as any;
            
            // Show toast for position changes
            if (newData.position !== undefined) {
              toast({
                title: "Queue Position Updated",
                description: `You are now #${newData.position}. Estimated wait: ${newData.estimated_wait_minutes || 0} minutes.`,
              });
            }
          }
          
          fetchQueuePositions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (queuePositions.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 space-y-2">
      {queuePositions.map((position) => (
        <Card key={position.id} className="border-2 border-primary shadow-lg animate-in slide-in-from-bottom">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold">
                  {position.cash_game_lists?.game}
                </span>
              </div>
              <Badge className="text-lg px-3">#{position.position}</Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>~{position.estimated_wait_minutes} min</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>In Queue</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
