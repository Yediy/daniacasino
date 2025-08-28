import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Gamepad2, Play, Search, Filter, MapPin, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Slot {
  id: string;
  bank: string;
  position: number;
  game_title: string;
  denom: string;
  room: string;
  status: string;
  lat?: number;
  lng?: number;
  updated_at: string;
}

interface ETGTable {
  id: string;
  game: string;
  stakes: string;
  floor_zone: string;
  max_seats: number;
  players: number;
  open_seats: number;
  status: string;
  updated_at: string;
}

interface JaiAlaiStream {
  id: string;
  title: string;
  status: string;
  start_time?: string;
  end_time?: string;
  hls_url?: string;
  poster_img?: string;
  created_at: string;
}

export const GamingLive = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [etgTables, setETGTables] = useState<ETGTable[]>([]);
  const [jaiAlaiStreams, setJaiAlaiStreams] = useState<JaiAlaiStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedDenom, setSelectedDenom] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchGamingData();
    
    // Set up realtime subscription for gaming floor updates
    const slotsChannel = supabase
      .channel('gaming-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'slots'
      }, () => {
        fetchGamingData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'etg_tables'
      }, () => {
        fetchGamingData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jai_alai_streams'
      }, () => {
        fetchGamingData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(slotsChannel);
    };
  }, []);

  const fetchGamingData = async () => {
    try {
      // Fetch slots data
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .order('bank')
        .order('position');

      if (slotsError) throw slotsError;
      setSlots(slotsData || []);

      // Fetch ETG tables
      const { data: etgData, error: etgError } = await supabase
        .from('etg_tables')
        .select('*')
        .order('game')
        .order('stakes');

      if (etgError) throw etgError;
      setETGTables(etgData || []);

      // Fetch Jai Alai streams
      const { data: streamData, error: streamError } = await supabase
        .from('jai_alai_streams')
        .select('*')
        .order('start_time', { ascending: false });

      if (streamError) throw streamError;
      setJaiAlaiStreams(streamData || []);

    } catch (error) {
      console.error('Error fetching gaming data:', error);
      toast({
        title: "Error",
        description: "Failed to load gaming floor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter slots based on search and filters
  const filteredSlots = slots.filter(slot => {
    const matchesSearch = searchTerm === "" || 
      slot.game_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.bank.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRoom = selectedRoom === "all" || slot.room === selectedRoom;
    const matchesDenom = selectedDenom === "all" || slot.denom === selectedDenom;
    
    return matchesSearch && matchesRoom && matchesDenom;
  });

  // Group slots by bank
  const slotsByBank = filteredSlots.reduce((acc, slot) => {
    if (!acc[slot.bank]) {
      acc[slot.bank] = [];
    }
    acc[slot.bank].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  // Get unique rooms and denominations for filters
  const rooms = [...new Set(slots.map(slot => slot.room))];
  const denoms = [...new Set(slots.map(slot => slot.denom))];

  // Calculate live metrics
  const totalSlots = slots.length;
  const freeSlots = slots.filter(s => s.status === 'free').length;
  const totalETGTables = etgTables.length;
  const openETGSeats = etgTables.reduce((sum, table) => sum + table.open_seats, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading gaming floor data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            🟩 Gaming Floor Live
          </h2>
          <p className="text-muted-foreground">
            Real-time slots, ETG, and Jai-Alai
          </p>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-elegant">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{freeSlots}</div>
              <div className="text-sm text-muted-foreground">Free Slots</div>
              <div className="text-xs text-muted-foreground">of {totalSlots}</div>
            </CardContent>
          </Card>
          <Card className="shadow-elegant">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{openETGSeats}</div>
              <div className="text-sm text-muted-foreground">ETG Seats</div>
              <div className="text-xs text-muted-foreground">{totalETGTables} tables</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search slots by game or bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                {rooms.map(room => (
                  <SelectItem key={room} value={room}>{room}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDenom} onValueChange={setSelectedDenom}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Denoms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Denoms</SelectItem>
                {denoms.map(denom => (
                  <SelectItem key={denom} value={denom}>{denom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gaming Content Tabs */}
        <Tabs defaultValue="slots" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="slots">Slots</TabsTrigger>
            <TabsTrigger value="etg">ETG Tables</TabsTrigger>
            <TabsTrigger value="jaialai">Jai-Alai</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-4 mt-6">
            {Object.entries(slotsByBank).map(([bank, bankSlots]) => {
              const freeInBank = bankSlots.filter(s => s.status === 'free').length;
              const totalInBank = bankSlots.length;
              const percentage = Math.round((freeInBank / totalInBank) * 100);
              
              return (
                <Card key={bank} className="shadow-elegant">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{bank}</CardTitle>
                      <Badge variant={freeInBank > 0 ? "default" : "secondary"}>
                        {freeInBank}/{totalInBank} Free ({percentage}%)
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {bankSlots.slice(0, 6).map(slot => (
                        <div
                          key={slot.id}
                          className={`p-2 rounded text-center text-xs ${
                            slot.status === 'free' 
                              ? 'bg-success/10 text-success border border-success/20'
                              : slot.status === 'in_use'
                              ? 'bg-warning/10 text-warning border border-warning/20'
                              : 'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}
                        >
                          <div className="font-medium">#{slot.position}</div>
                          <div className="text-xs opacity-70">{slot.denom}</div>
                        </div>
                      ))}
                    </div>
                    {bankSlots.length > 6 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{bankSlots.length - 6} more machines
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="etg" className="space-y-4 mt-6">
            {etgTables.map(table => (
              <Card key={table.id} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{table.game}</CardTitle>
                    <Badge variant={table.open_seats > 0 ? "default" : "secondary"}>
                      {table.open_seats > 0 ? 'Open' : 'Full'}
                    </Badge>
                  </div>
                  <CardDescription>{table.stakes} • {table.floor_zone}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open Seats:</span>
                    <span className="font-medium">{table.open_seats}/{table.max_seats}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="jaialai" className="space-y-4 mt-6">
            {jaiAlaiStreams.map(stream => (
              <Card key={stream.id} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{stream.title}</CardTitle>
                    <Badge 
                      variant={
                        stream.status === 'live' ? 'default' : 
                        stream.status === 'vod' ? 'secondary' : 'outline'
                      }
                    >
                      {stream.status === 'live' ? '🔴 Live' : 
                       stream.status === 'vod' ? '📺 Replay' : 'Offline'}
                    </Badge>
                  </div>
                  {stream.start_time && (
                    <CardDescription>
                      {new Date(stream.start_time).toLocaleString()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant={stream.status === 'live' ? 'default' : 'outline'}
                    disabled={stream.status === 'offline'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {stream.status === 'live' ? 'Watch Live' : 
                     stream.status === 'vod' ? 'Watch Replay' : 'Not Available'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Refresh Button */}
        <div className="text-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchGamingData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Data updates automatically every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
};