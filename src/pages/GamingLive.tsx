import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Filter, MonitorPlay } from "lucide-react";

interface Slot {
  id: string;
  bank: string;
  position: number;
  game_title: string;
  denom: string;
  room: string;
  device_id?: string;
  status: string;
  last_session_end?: string;
  lat?: number;
  lng?: number;
}

interface ETGTable {
  id: string;
  game: string;
  stakes: string;
  max_seats: number;
  open_seats: number;
  players: number;
  status: string;
  floor_zone: string;
}

interface JaiAlaiStream {
  id: string;
  title: string;
  status: string;
  start_time?: string;
  end_time?: string;
  hls_url?: string;
  poster_img?: string;
  age_limit: string;
  notes?: string;
}

interface GamingMetrics {
  slotsTotal: number;
  slotsFree: number;
  slotsOccupied: number;
  etgTablesOpen: number;
  etgSeatsOpen: number;
  jaiAlaiLive: number;
}

export const GamingLive = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [etgTables, setEtgTables] = useState<ETGTable[]>([]);
  const [jaiAlaiStreams, setJaiAlaiStreams] = useState<JaiAlaiStream[]>([]);
  const [metrics, setMetrics] = useState<GamingMetrics>({
    slotsTotal: 0,
    slotsFree: 0,
    slotsOccupied: 0,
    etgTablesOpen: 0,
    etgSeatsOpen: 0,
    jaiAlaiLive: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [selectedDenom, setSelectedDenom] = useState("all");

  useEffect(() => {
    fetchGamingData();
    // Set up real-time updates every 60 seconds for slots
    const interval = setInterval(fetchGamingData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchGamingData = async () => {
    try {
      // Fetch slots data
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .neq('status', 'out_of_order')
        .order('bank', { ascending: true });

      if (slotsError) throw slotsError;

      // Fetch ETG tables
      const { data: etgData, error: etgError } = await supabase
        .from('etg_tables')
        .select('*')
        .eq('status', 'open')
        .order('game', { ascending: true });

      if (etgError) throw etgError;

      // Fetch Jai Alai streams
      const { data: jaiAlaiData, error: jaiAlaiError } = await supabase
        .from('jai_alai_streams')
        .select('*')
        .order('status', { ascending: false });

      if (jaiAlaiError) throw jaiAlaiError;

      setSlots(slotsData || []);
      setEtgTables(etgData || []);
      setJaiAlaiStreams(jaiAlaiData || []);

      // Calculate metrics
      const slotsTotal = (slotsData || []).length;
      const slotsFree = (slotsData || []).filter(s => s.status === 'free').length;
      const slotsOccupied = slotsTotal - slotsFree;
      const etgTablesOpen = (etgData || []).length;
      const etgSeatsOpen = (etgData || []).reduce((sum, table) => sum + table.open_seats, 0);
      const jaiAlaiLive = (jaiAlaiData || []).filter(s => s.status === 'live').length;

      setMetrics({
        slotsTotal,
        slotsFree,
        slotsOccupied,
        etgTablesOpen,
        etgSeatsOpen,
        jaiAlaiLive
      });

    } catch (error) {
      console.error('Error fetching gaming data:', error);
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

  const rooms = ["all", ...Array.from(new Set(slots.map(s => s.room)))];
  const denoms = ["all", ...Array.from(new Set(slots.map(s => s.denom)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading gaming data...</div>
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
            Gaming Floor Live
          </h2>
          <p className="text-muted-foreground">
            Real-time slots, ETGs, and Jai Alai
          </p>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center shadow-elegant">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-casino-charcoal">{metrics.slotsTotal}</div>
              <div className="text-xs text-muted-foreground">Total Slots</div>
              <div className="text-sm text-green-600 font-medium">{metrics.slotsFree} Free</div>
            </CardContent>
          </Card>
          <Card className="text-center shadow-elegant">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-casino-charcoal">{metrics.etgTablesOpen}</div>
              <div className="text-xs text-muted-foreground">ETG Tables</div>
              <div className="text-sm text-green-600 font-medium">{metrics.etgSeatsOpen} Seats</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="slots" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="slots" className="text-xs">Slots</TabsTrigger>
            <TabsTrigger value="etg" className="text-xs">ETG Tables</TabsTrigger>
            <TabsTrigger value="jai-alai" className="text-xs">Jai Alai</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-4 mt-6">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search slots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto">
                {rooms.map((room) => (
                  <Button
                    key={room}
                    variant={selectedRoom === room ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRoom(room)}
                    className="whitespace-nowrap text-xs"
                  >
                    {room === "all" ? "All Rooms" : room}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {denoms.map((denom) => (
                  <Button
                    key={denom}
                    variant={selectedDenom === denom ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDenom(denom)}
                    className="whitespace-nowrap text-xs"
                  >
                    {denom === "all" ? "All Denoms" : denom}
                  </Button>
                ))}
              </div>
            </div>

            {/* Slots by Bank */}
            <div className="space-y-4">
              {Array.from(new Set(filteredSlots.map(s => s.bank))).map(bank => {
                const bankSlots = filteredSlots.filter(s => s.bank === bank);
                const freeSlots = bankSlots.filter(s => s.status === 'free');
                
                return (
                  <Card key={bank} className="shadow-elegant">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{bank}</CardTitle>
                        <Badge className={freeSlots.length > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                          {freeSlots.length}/{bankSlots.length} Free
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-2">
                        {bankSlots.slice(0, 12).map(slot => (
                          <div
                            key={slot.id}
                            className={`p-2 rounded text-center text-xs ${
                              slot.status === 'free' 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            <div className="font-medium">#{slot.position}</div>
                            <div className="text-[10px] truncate">{slot.game_title}</div>
                            <div className="text-[10px]">{slot.denom}</div>
                          </div>
                        ))}
                        {bankSlots.length > 12 && (
                          <div className="p-2 rounded text-center text-xs bg-muted">
                            +{bankSlots.length - 12} more
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="etg" className="space-y-4 mt-6">
            {etgTables.map((table) => (
              <Card key={table.id} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-casino-charcoal">
                        {table.game}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {table.stakes} • {table.floor_zone}
                      </CardDescription>
                    </div>
                    <Badge className={table.open_seats > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                      {table.open_seats}/{table.max_seats} Open
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span>{table.players} players active</span>
                    <span className="text-muted-foreground">Live now</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="jai-alai" className="space-y-4 mt-6">
            {jaiAlaiStreams.map((stream) => (
              <Card key={stream.id} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-casino-charcoal">
                        {stream.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {stream.age_limit} • {stream.notes}
                      </CardDescription>
                    </div>
                    <Badge className={
                      stream.status === 'live' ? "bg-red-500 text-white animate-pulse" :
                      stream.status === 'vod' ? "bg-blue-500 text-white" :
                      "bg-gray-500 text-white"
                    }>
                      {stream.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stream.status === 'live' && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <MonitorPlay className="h-4 w-4" />
                      <span>Stream is live now</span>
                    </div>
                  )}
                  
                  {stream.start_time && (
                    <div className="text-sm text-muted-foreground">
                      {stream.status === 'live' ? 'Started' : 'Starts'}: {new Date(stream.start_time).toLocaleString()}
                    </div>
                  )}

                  {stream.hls_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      disabled={stream.status === 'offline'}
                    >
                      <MonitorPlay className="h-4 w-4 mr-2" />
                      {stream.status === 'live' ? 'Watch Live' : 'Watch Replay'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="shadow-elegant bg-accent/10">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Gaming floor data updates every minute • 18+ for Jai Alai • 21+ for slots/ETGs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};