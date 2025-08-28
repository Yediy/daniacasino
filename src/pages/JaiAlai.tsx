import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, Clock, MapPin, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JaiAlaiStream {
  id: string;
  title: string;
  status: string;
  hls_url?: string;
  start_time?: string;
  end_time?: string;
  poster_img?: string;
  notes?: string;
  age_limit?: string;
}

export const JaiAlai = () => {
  const [streams, setStreams] = useState<JaiAlaiStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<JaiAlaiStream | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('jai_alai_streams')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setStreams(data || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast({
        title: "Error",
        description: "Failed to load Jai-Alai streams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWatchStream = (stream: JaiAlaiStream) => {
    if (stream.status !== 'live' || !stream.hls_url) {
      toast({
        title: "Stream Not Available",
        description: stream.status === 'upcoming' ? "Stream starts soon" : "Stream is offline",
        variant: "destructive",
      });
      return;
    }
    setSelectedStream(stream);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading Jai-Alai...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold casino-heading">
            Jai-Alai Live
          </h2>
          <p className="text-muted-foreground">
            Watch live matches and upcoming games
          </p>
        </div>

        {/* Featured Live Stream */}
        {selectedStream && (
          <Card className="shadow-elegant bg-gradient-dark text-white overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">LIVE</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedStream(null)}
                  className="text-white hover:bg-white/10"
                >
                  ×
                </Button>
              </div>
              <CardTitle className="text-lg">{selectedStream.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center mb-4">
                {selectedStream.hls_url ? (
                  <div className="text-center">
                    <Play className="h-12 w-12 mx-auto mb-2 opacity-60" />
                    <p className="text-sm opacity-80">Video Player Integration Required</p>
                    <p className="text-xs opacity-60 mt-1">HLS: {selectedStream.hls_url}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-60" />
                    <p className="text-sm opacity-80">Stream Starting Soon</p>
                  </div>
                )}
              </div>
              {selectedStream.notes && (
                <p className="text-sm opacity-90">{selectedStream.notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stream List */}
        <div className="space-y-4">
          {streams.map((stream) => (
            <Card key={stream.id} className="shadow-elegant hover:shadow-gold transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{stream.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {stream.start_time && (
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(stream.start_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(stream.start_time)}</span>
                          </div>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant={stream.status === 'live' ? 'default' : stream.status === 'upcoming' ? 'secondary' : 'outline'}
                      className={`text-xs ${stream.status === 'live' ? 'bg-red-500 animate-pulse' : ''}`}
                    >
                      {stream.status === 'live' ? 'LIVE' : stream.status === 'upcoming' ? 'Upcoming' : 'Offline'}
                    </Badge>
                    {stream.age_limit && (
                      <Badge variant="outline" className="text-xs">
                        {stream.age_limit}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {stream.notes && (
                  <p className="text-sm text-muted-foreground mb-3">{stream.notes}</p>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleWatchStream(stream)}
                    disabled={stream.status === 'offline'}
                    className={`flex-1 ${stream.status === 'live' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {stream.status === 'live' ? 'Watch Live' : stream.status === 'upcoming' ? 'Watch Soon' : 'Offline'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Streams Available */}
        {streams.length === 0 && (
          <Card className="shadow-elegant">
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-casino-charcoal mb-2">
                No Streams Available
              </h3>
              <p className="text-muted-foreground">
                Check back later for live Jai-Alai matches
              </p>
            </CardContent>
          </Card>
        )}

        {/* Jai-Alai Info */}
        <Card className="shadow-elegant bg-gradient-gold text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg">About Jai-Alai</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm opacity-90 mb-3">
              Experience the world's fastest ball sport live from Dania Beach. 
              Matches feature skilled pelotaris competing at incredible speeds.
            </p>
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="h-4 w-4" />
              <span>Dania Jai-Alai Fronton</span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Betting Info */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base">Match Schedule</CardTitle>
            <CardDescription>Regular live matches throughout the week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-casino-charcoal">Weekdays</div>
                <div className="text-muted-foreground">7:00 PM - 11:00 PM</div>
              </div>
              <div>
                <div className="font-medium text-casino-charcoal">Weekends</div>
                <div className="text-muted-foreground">1:00 PM - 11:00 PM</div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Full Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};