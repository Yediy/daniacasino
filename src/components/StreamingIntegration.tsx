import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Eye, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TournamentStream {
  id: string;
  platform: string;
  stream_url: string;
  status: string;
  viewer_count: number;
  started_at: string | null;
}

interface StreamingIntegrationProps {
  tourneyId: string;
}

export function StreamingIntegration({ tourneyId }: StreamingIntegrationProps) {
  const [streams, setStreams] = useState<TournamentStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStream, setNewStream] = useState({
    platform: 'twitch',
    stream_url: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStreams();

    const channel = supabase
      .channel(`tournament-streams-${tourneyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_streams',
          filter: `tourney_id=eq.${tourneyId}`
        },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tourneyId]);

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_streams')
        .select('*')
        .eq('tourney_id', tourneyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading streams",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createStream = async () => {
    if (!newStream.stream_url) {
      toast({
        title: "Missing stream URL",
        description: "Please enter a stream URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tournament_streams')
        .insert({
          tourney_id: tourneyId,
          platform: newStream.platform,
          stream_url: newStream.stream_url,
          status: 'scheduled',
        });

      if (error) throw error;

      toast({
        title: "Stream added",
        description: "Stream link has been added to the tournament",
      });

      setNewStream({ platform: 'twitch', stream_url: '' });
      fetchStreams();
    } catch (error: any) {
      toast({
        title: "Error adding stream",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateStreamStatus = async (streamId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'live' && !streams.find(s => s.id === streamId)?.started_at) {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tournament_streams')
        .update(updateData)
        .eq('id', streamId);

      if (error) throw error;

      toast({
        title: "Stream status updated",
        description: `Stream is now ${status}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating stream",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="destructive">LIVE</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'ended':
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Loading streams...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Live Streaming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {streams.map((stream) => (
          <div key={stream.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusBadge(stream.status)}
                <Badge variant="outline">{stream.platform}</Badge>
              </div>
              {stream.status === 'live' && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  {stream.viewer_count.toLocaleString()} viewers
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href={stream.stream_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Watch Stream
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex gap-2">
              {stream.status === 'scheduled' && (
                <Button
                  size="sm"
                  onClick={() => updateStreamStatus(stream.id, 'live')}
                >
                  Go Live
                </Button>
              )}
              {stream.status === 'live' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStreamStatus(stream.id, 'ended')}
                >
                  End Stream
                </Button>
              )}
            </div>
          </div>
        ))}

        <div className="border-t pt-4 space-y-3">
          <div className="font-semibold">Add New Stream</div>
          
          <div>
            <Label htmlFor="platform">Platform</Label>
            <Select
              value={newStream.platform}
              onValueChange={(value) => setNewStream({ ...newStream, platform: value })}
            >
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twitch">Twitch</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="stream-url">Stream URL</Label>
            <Input
              id="stream-url"
              placeholder={newStream.platform === 'twitch' ? 'https://twitch.tv/channel' : 'https://youtube.com/watch?v=...'}
              value={newStream.stream_url}
              onChange={(e) => setNewStream({ ...newStream, stream_url: e.target.value })}
            />
          </div>

          <Button onClick={createStream} className="w-full">
            Add Stream
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
