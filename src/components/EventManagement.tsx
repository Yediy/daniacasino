import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, DollarSign, Users, Plus, Edit } from "lucide-react";

interface Event {
  id: string;
  title: string;
  category: string;
  event_date: string;
  event_time: string;
  venue: string;
  price: number;
  fee: number | null;
  inventory: number;
  onsale: boolean | null;
  description: string | null;
  hero_img: string | null;
}

export const EventManagement = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'concert',
    event_date: '',
    event_time: '',
    venue: '',
    price: 0,
    fee: 0,
    inventory: 100,
    onsale: true,
    description: '',
    hero_img: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

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

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'concert',
      event_date: '',
      event_time: '',
      venue: '',
      price: 0,
      fee: 0,
      inventory: 100,
      onsale: true,
      description: '',
      hero_img: '',
    });
    setEditingEvent(null);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      category: event.category,
      event_date: event.event_date,
      event_time: event.event_time,
      venue: event.venue,
      price: event.price,
      fee: event.fee || 0,
      inventory: event.inventory,
      onsale: event.onsale || false,
      description: event.description || '',
      hero_img: event.hero_img || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(formData)
          .eq('id', editingEvent.id);

        if (error) throw error;

        toast({
          title: "Event Updated",
          description: "Event has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('events')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "Event Created",
          description: "New event has been added",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    }
  };

  const toggleEventStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ onsale: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Event ${!currentStatus ? 'enabled' : 'disabled'} for sale`,
      });

      fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Event Management</CardTitle>
            <CardDescription>Create and manage entertainment events</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                <DialogDescription>Add event details and pricing</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Event Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Summer Concert Series"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="concert, sports, comedy"
                    />
                  </div>
                  <div>
                    <Label>Venue</Label>
                    <Input
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="Main Stage"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Fee ($)</Label>
                    <Input
                      type="number"
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Inventory</Label>
                    <Input
                      type="number"
                      value={formData.inventory}
                      onChange={(e) => setFormData({ ...formData, inventory: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Event description..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Hero Image URL</Label>
                  <Input
                    value={formData.hero_img}
                    onChange={(e) => setFormData({ ...formData, hero_img: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.onsale}
                    onCheckedChange={(checked) => setFormData({ ...formData, onsale: checked })}
                  />
                  <Label>On Sale</Label>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-lg">{event.title}</div>
                  <div className="text-sm text-muted-foreground">{event.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={event.onsale ? 'default' : 'secondary'}>
                    {event.onsale ? 'On Sale' : 'Off Sale'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(event)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.event_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {event.venue}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  ${event.price} + ${event.fee || 0}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {event.inventory} tickets
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <Button
                  onClick={() => toggleEventStatus(event.id, event.onsale || false)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {event.onsale ? 'Take Off Sale' : 'Put On Sale'}
                </Button>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No events created yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};