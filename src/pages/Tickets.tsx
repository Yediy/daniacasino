import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { TicketCard } from "@/components/TicketCard";
import { TicketPurchaseDialog } from "@/components/TicketPurchaseDialog";
import { Calendar, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";



interface Event {
  id: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  venue: string;
  price: number;
  fee: number;
  inventory: number;
  hero_img?: string;
  description?: string;
  onsale: boolean;
}

export const Tickets = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

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
      description: "Your tickets have been added to your wallet",
    });
    // Refresh events to update inventory
    fetchEvents();
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", "concert", "comedy", "tribute", "special"];

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
            Event Tickets
          </h2>
          <p className="text-muted-foreground">
            Live entertainment at Stage 954
          </p>
        </div>

        {/* Search and Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Events Grid */}
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <Card className="shadow-elegant">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-casino-charcoal mb-2">
                  No Events Found
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory !== "all" 
                    ? "Try adjusting your search or filter" 
                    : "Check back soon for upcoming events"}
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
        </div>

        {/* Info Card */}
        <Card className="shadow-elegant bg-accent/10">
          <CardHeader>
            <CardTitle className="text-base">Ticket Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Tickets are delivered instantly to your wallet</p>
            <p>• Present barcode at venue entrance</p>
            <p>• Refunds available up to 24 hours before event</p>
            <p>• Contact support for assistance</p>
          </CardContent>
        </Card>

        {/* Purchase Dialog */}
        <TicketPurchaseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          event={selectedEvent}
          onSuccess={handlePurchaseSuccess}
        />
      </div>
    </div>
  );
};