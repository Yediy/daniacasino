import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlotBank {
  id: string;
  bank: string;
  room: string | null;
  total_slots: number;
  free_slots: number;
  lat: number | null;
  lng: number | null;
  updated_at: string;
}

export const SlotsHeatmap = () => {
  const [slotBanks, setSlotBanks] = useState<SlotBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchSlotBanks();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('slots-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_banks'
        },
        () => {
          fetchSlotBanks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSlotBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('slot_banks')
        .select('*')
        .order('room', { ascending: true })
        .order('bank', { ascending: true });

      if (error) throw error;
      setSlotBanks(data || []);
    } catch (error) {
      console.error('Error fetching slot banks:', error);
      toast({
        title: "Error",
        description: "Failed to load slot machine data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (freeSlots: number, totalSlots: number) => {
    const occupancyRate = ((totalSlots - freeSlots) / totalSlots) * 100;
    if (occupancyRate >= 90) return "bg-destructive/80";
    if (occupancyRate >= 70) return "bg-warning/80";
    if (occupancyRate >= 40) return "bg-success/80";
    return "bg-primary/80";
  };

  const getOccupancyLabel = (freeSlots: number, totalSlots: number) => {
    const occupancyRate = ((totalSlots - freeSlots) / totalSlots) * 100;
    if (occupancyRate >= 90) return "Very Busy";
    if (occupancyRate >= 70) return "Busy";
    if (occupancyRate >= 40) return "Moderate";
    return "Available";
  };

  const rooms = ["all", ...new Set(slotBanks.map(b => b.room).filter(Boolean))];
  const filteredBanks = selectedRoom === "all" 
    ? slotBanks 
    : slotBanks.filter(b => b.room === selectedRoom);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading slot availability...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2 mb-2">
            <Zap className="h-8 w-8 text-primary" />
            Slots Availability
          </h1>
          <p className="text-muted-foreground">
            Real-time slot machine occupancy by bank and room
          </p>
        </div>

        {/* Room Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {rooms.map((room) => (
            <Button
              key={room}
              variant={selectedRoom === room ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRoom(room)}
              className="whitespace-nowrap"
            >
              {room === "all" ? "All Rooms" : room}
            </Button>
          ))}
        </div>

        {/* Legend */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 fill-primary/80 text-primary/80" />
                <span>Available (&lt;40%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 fill-success/80 text-success/80" />
                <span>Moderate (40-69%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 fill-warning/80 text-warning/80" />
                <span>Busy (70-89%)</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 fill-destructive/80 text-destructive/80" />
                <span>Very Busy (90%+)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot Banks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanks.map((bank) => {
            const occupancyRate = ((bank.total_slots - bank.free_slots) / bank.total_slots) * 100;
            
            return (
              <Card 
                key={bank.id} 
                className={cn(
                  "shadow-elegant hover:shadow-floating transition-all cursor-pointer",
                  "border-2 hover:scale-105"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{bank.bank}</CardTitle>
                      {bank.room && (
                        <CardDescription className="text-xs mt-1">
                          {bank.room}
                        </CardDescription>
                      )}
                    </div>
                    <Badge 
                      className={cn(
                        "text-white",
                        getOccupancyColor(bank.free_slots, bank.total_slots)
                      )}
                    >
                      {getOccupancyLabel(bank.free_slots, bank.total_slots)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Available:</span>
                      <span className="text-2xl font-bold text-success">
                        {bank.free_slots}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Slots:</span>
                      <span className="text-lg font-semibold">
                        {bank.total_slots}
                      </span>
                    </div>
                    
                    {/* Occupancy Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Occupancy</span>
                        <span>{occupancyRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            getOccupancyColor(bank.free_slots, bank.total_slots)
                          )}
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground text-right">
                      Updated {new Date(bank.updated_at).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBanks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No slot banks found for the selected room
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Re-export Button for the filter
import { Button } from "@/components/ui/button";
