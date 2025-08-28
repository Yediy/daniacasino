import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketCard } from "@/components/TicketCard";
import { TicketPurchaseDialog } from "@/components/TicketPurchaseDialog";
import { Calendar, Clock, MapPin, Search, Ticket, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time: string;
  venue: string;
  category: string;
  price: number;
  fee: number;
  inventory: number;
  onsale: boolean;
  hero_img?: string;
  created_at: string;
}

export const Tickets = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const categories = [
    { id: "all", label: "All Events" },
    { id: "comedy", label: "Comedy" },
    { id: "music", label: "Music" },
    { id: "special", label: "Special Events" },
    { id: "sports", label: "Sports" }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('onsale', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTicket = (event: Event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handlePurchaseSuccess = () => {
    toast({
      title: "Tickets Purchased!",
      description: "Check your wallet for your tickets",
    });
    setDialogOpen(false);
    fetchEvents(); // Refresh to update inventory
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.venue.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center">Loading events...</div>
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
            Events & Tickets
          </h2>
          <p className="text-muted-foreground">
            Live entertainment at Dania Beach
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events or venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="comedy" className="text-xs">Comedy</TabsTrigger>
            <TabsTrigger value="music" className="text-xs">Music</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {filteredEvents.length === 0 ? (
              <Card className="shadow-elegant">
                <CardContent className="p-6 text-center">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-casino-charcoal mb-2">
                    No Events Found
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms" : "No upcoming events at this time"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEvents.map((event) => (
                <TicketCard
                  key={event.id}
                  event={event}
                  onBuyTicket={handleBuyTicket}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="comedy" className="space-y-4 mt-6">
            {filteredEvents.filter(e => e.category === 'comedy').map((event) => (
              <TicketCard
                key={event.id}
                event={event}
                onBuyTicket={handleBuyTicket}
              />
            ))}
          </TabsContent>

          <TabsContent value="music" className="space-y-4 mt-6">
            {filteredEvents.filter(e => e.category === 'music').map((event) => (
              <TicketCard
                key={event.id}
                event={event}
                onBuyTicket={handleBuyTicket}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Ticket Purchase Info */}
        <Card className="shadow-elegant bg-accent/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Ticket className="h-5 w-5 text-primary" />
              <span>Ticket Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">All ticket sales are final</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Digital tickets sent to your wallet</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Show your barcode at the venue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Dialog */}
        <TicketPurchaseDialog
          event={selectedEvent}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handlePurchaseSuccess}
        />
      </div>
    </div>
  );
};