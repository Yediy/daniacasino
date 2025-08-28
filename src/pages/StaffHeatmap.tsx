import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Maximize, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SlotBank {
  id: string;
  bank: string;
  room: string;
  total_slots: number;
  free_slots: number;
  occupied_slots: number;
  percentage: number;
}

export const StaffHeatmap = () => {
  const [slotBanks, setSlotBanks] = useState<SlotBank[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [cycleDuration, setCycleDuration] = useState(12);
  const [autoCycle, setAutoCycle] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSlotData();
    
    // Set up realtime subscription
    const slotsChannel = supabase
      .channel('staff-heatmap')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'slots'
      }, () => {
        fetchSlotData();
      })
      .subscribe();

    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      supabase.removeChannel(slotsChannel);
      clearInterval(timeInterval);
    };
  }, []);

  useEffect(() => {
    let cycleInterval: NodeJS.Timeout;
    
    if (autoCycle && rooms.length > 1) {
      cycleInterval = setInterval(() => {
        const currentIndex = rooms.indexOf(selectedRoom);
        const nextIndex = (currentIndex + 1) % rooms.length;
        setSelectedRoom(rooms[nextIndex]);
      }, cycleDuration * 1000);
    }

    return () => {
      if (cycleInterval) clearInterval(cycleInterval);
    };
  }, [autoCycle, cycleDuration, selectedRoom, rooms]);

  const fetchSlotData = async () => {
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('bank, room, status')
        .order('bank');

      if (error) throw error;

      // Process the data to create bank summaries
      const bankMap = new Map<string, SlotBank>();
      const roomSet = new Set<string>();

      (data || []).forEach(slot => {
        roomSet.add(slot.room);
        const key = `${slot.bank}|${slot.room}`;
        
        const existing = bankMap.get(key) || {
          id: key,
          bank: slot.bank,
          room: slot.room,
          total_slots: 0,
          free_slots: 0,
          occupied_slots: 0,
          percentage: 0
        };
        
        existing.total_slots += 1;
        if (slot.status === 'free') {
          existing.free_slots += 1;
        } else {
          existing.occupied_slots += 1;
        }
        
        existing.percentage = existing.total_slots > 0 
          ? Math.round((existing.free_slots / existing.total_slots) * 100) 
          : 0;
        
        bankMap.set(key, existing);
      });

      const banks = Array.from(bankMap.values());
      const uniqueRooms = Array.from(roomSet);

      setSlotBanks(banks);
      setRooms(uniqueRooms);
      setLastUpdated(new Date());
      
      // Set initial room if not set
      if (selectedRoom === "all" && uniqueRooms.length > 0) {
        setSelectedRoom(uniqueRooms[0]);
      }

    } catch (error) {
      console.error('Error fetching slot data:', error);
      toast({
        title: "Error",
        description: "Failed to load slot data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const filteredBanks = slotBanks.filter(bank => 
    selectedRoom === "all" || bank.room === selectedRoom
  );

  // Sort by occupancy (more free first)
  const sortedBanks = filteredBanks.sort((a, b) => b.percentage - a.percentage);

  const totalSlots = filteredBanks.reduce((sum, bank) => sum + bank.total_slots, 0);
  const totalFree = filteredBanks.reduce((sum, bank) => sum + bank.free_slots, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-2">Loading Heatmap...</div>
          <div className="text-muted-foreground">Fetching real-time slot data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border shadow-elegant z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🟧</span>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Staff Slots Heatmap — <span className="text-muted-foreground">Big Screen</span>
                </h1>
                <Badge className="bg-platform-staff/10 text-platform-staff border-platform-staff/20">
                  Platform: Staff Web
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-platform-glide/10 border-platform-glide/20">
                🟩 Glide
              </Badge>
              <Badge variant="outline" className="bg-platform-flutter/10 border-platform-flutter/20">
                🟪 FlutterFlow
              </Badge>
              <Badge variant="outline" className="bg-platform-admin/10 border-platform-admin/20">
                🟦 Web Admin
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Controls */}
        <div className="mb-6 p-4 bg-card rounded-lg shadow-elegant">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Room</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Auto-cycle</label>
              <Input
                type="number"
                min="5"
                value={cycleDuration}
                onChange={(e) => setCycleDuration(Math.max(5, parseInt(e.target.value) || 12))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">sec</span>
            </div>
            
            <Button
              variant={autoCycle ? "default" : "outline"}
              onClick={() => setAutoCycle(!autoCycle)}
              disabled={rooms.length <= 1}
            >
              {autoCycle ? 'Stop Cycle' : 'Start Cycle'}
            </Button>
            
            <Button variant="outline" onClick={toggleFullscreen}>
              <Maximize className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
            
            <Button variant="outline" onClick={fetchSlotData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Badge variant="secondary" className="ml-auto">
              {currentTime.toLocaleTimeString()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div>Free {totalFree} / {totalSlots}</div>
            {lastUpdated && (
              <div>Updated {lastUpdated.toLocaleTimeString()}</div>
            )}
            <div className="font-medium text-foreground">{selectedRoom === "all" ? "All Rooms" : selectedRoom}</div>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedBanks.map(bank => (
            <HeatmapTile key={bank.id} bank={bank} />
          ))}
        </div>

        {/* Legend */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-4 bg-card/95 backdrop-blur border border-border rounded-full px-4 py-2 shadow-elegant pointer-events-auto">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-muted-foreground">More Free</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span className="text-muted-foreground">Balanced</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span className="text-muted-foreground">More Occupied</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeatmapTile = ({ bank }: { bank: SlotBank }) => {
  const getColorFromPercentage = (percentage: number) => {
    if (percentage >= 70) return 'from-success to-success/80';
    if (percentage >= 40) return 'from-warning to-warning/80';
    return 'from-destructive to-destructive/80';
  };

  return (
    <Card className="shadow-elegant overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{bank.bank}</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {bank.percentage}% free
          </Badge>
        </div>
        <CardDescription className="text-muted-foreground">
          {bank.room}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-4 mb-4 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getColorFromPercentage(bank.percentage)} transition-all duration-500 ease-out`}
            style={{ width: `${bank.percentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between items-center text-sm">
          <div>
            <div className="font-medium">Free: {bank.free_slots}/{bank.total_slots}</div>
          </div>
          <div>
            <div className="font-medium">Occupied: {bank.occupied_slots}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};