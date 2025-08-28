import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Coins, MapPin, Clock, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Slot {
  id: string;
  bank: string;
  position: number;
  game_title: string;
  denom: string;
  room: string;
  status: 'free' | 'in_use' | 'down';
  lat?: number;
  lng?: number;
  updated_at: string;
}

interface SlotBank {
  bank: string;
  room: string;
  total_slots: number;
  free_slots: number;
  percentage_free: number;
}

export const SlotsLive = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [banks, setBanks] = useState<SlotBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [selectedDenom, setSelectedDenom] = useState("all");
  const { toast } = useToast();

  const rooms = [
    { id: "all", label: "All Rooms" },
    { id: "Main Floor", label: "Main Floor" },
    { id: "High Limit", label: "High Limit" },
    { id: "Non-Smoking", label: "Non-Smoking" }
  ];

  const denominations = [
    { id: "all", label: "All Denoms" },
    { id: "$0.01", label: "Penny" },
    { id: "$0.05", label: "Nickel" },
    { id: "$0.25", label: "Quarter" },
    { id: "$1.00", label: "Dollar" },
    { id: "$5.00", label: "High Limit" }
  ];

  useEffect(() => {
    fetchSlotsData();
    // Set up real-time subscription
    const subscription = supabase
      .channel('slots-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        () => {
          fetchSlotsData();
        }
      )
      .subscribe();

    // Update every 30 seconds as fallback
    const interval = setInterval(fetchSlotsData, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchSlotsData = async () => {
    try {
      // Fetch individual slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .order('bank', { ascending: true })
        .order('position', { ascending: true });

      if (slotsError) throw slotsError;

      const typedSlots = (slotsData || []).map(slot => ({
        ...slot,
        status: slot.status as 'free' | 'in_use' | 'down'
      }));

      setSlots(typedSlots);

      // Calculate bank statistics
      if (slotsData) {
        const bankStats = slotsData.reduce((acc, slot) => {
          const key = `${slot.bank}-${slot.room}`;
          if (!acc[key]) {
            acc[key] = {
              bank: slot.bank,
              room: slot.room,
              total_slots: 0,
              free_slots: 0,
              percentage_free: 0
            };
          }
          acc[key].total_slots++;
          if (slot.status === 'free') {
            acc[key].free_slots++;
          }
          return acc;
        }, {} as Record<string, SlotBank>);

        const banksArray = Object.values(bankStats).map(bank => ({
          ...bank,
          percentage_free: Math.round((bank.free_slots / bank.total_slots) * 100)
        }));

        setBanks(banksArray);
      }

    } catch (error) {
      console.error('Error fetching slots data:', error);
      toast({
        title: "Error",
        description: "Failed to load slot machine data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = slots.filter(slot => {
    const matchesSearch = slot.game_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slot.bank.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoom = selectedRoom === "all" || slot.room === selectedRoom;
    const matchesDenom = selectedDenom === "all" || slot.denom === selectedDenom;
    return matchesSearch && matchesRoom && matchesDenom;
  });

  const freeSlots = filteredSlots.filter(slot => slot.status === 'free');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading slot data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Live Slot Availability
          </h2>
          <p className="text-muted-foreground">
            Find free machines in real-time
          </p>
        </div>

        {/* Live Status Banner */}
        <div className="bg-gradient-casino-primary p-4 rounded-lg shadow-gold-glow">
          <div className="flex items-center justify-between text-primary-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="font-medium">Live Updates</span>
            </div>
            <div className="text-sm">
              {freeSlots.length} Free Machines
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games or banks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="text-sm border rounded-md px-3 py-2 bg-background"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.label}</option>
              ))}
            </select>
            
            <select
              value={selectedDenom}
              onChange={(e) => setSelectedDenom(e.target.value)}
              className="text-sm border rounded-md px-3 py-2 bg-background"
            >
              {denominations.map(denom => (
                <option key={denom.id} value={denom.id}>{denom.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bank Overview */}
        <Tabs defaultValue="banks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="banks">Bank Overview</TabsTrigger>
            <TabsTrigger value="machines">Free Machines</TabsTrigger>
          </TabsList>

          <TabsContent value="banks" className="space-y-4 mt-6">
            {banks.map((bank, index) => (
              <Card key={index} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{bank.bank}</CardTitle>
                      <CardDescription className="text-sm">{bank.room}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant={bank.percentage_free > 50 ? "default" : bank.percentage_free > 20 ? "secondary" : "destructive"}>
                        {bank.percentage_free}% Free
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {bank.free_slots} of {bank.total_slots}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${bank.percentage_free}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="machines" className="space-y-4 mt-6">
            {freeSlots.length === 0 ? (
              <Card className="shadow-elegant">
                <CardContent className="p-6 text-center">
                  <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-casino-charcoal mb-2">
                    No Free Machines
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedRoom !== "all" || selectedDenom !== "all" 
                      ? "Try adjusting your search filters" 
                      : "All machines are currently in use"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              freeSlots.map((slot) => (
                <Card key={slot.id} className="shadow-elegant hover:shadow-gold transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-casino-charcoal">
                          {slot.game_title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {slot.bank} • Position {slot.position}
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span>{slot.room}</span>
                          <Badge variant="outline" className="text-xs">
                            {slot.denom}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                          Free Now
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Updated {new Date(slot.updated_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">Floor Statistics</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{slots.length}</div>
              <div className="text-xs text-muted-foreground">Total Machines</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{freeSlots.length}</div>
              <div className="text-xs text-muted-foreground">Available Now</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {Math.round((freeSlots.length / slots.length) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Availability</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};