import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";

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
}

interface TicketCardProps {
  event: Event;
  onBuyTicket: (eventId: string) => void;
}

export const TicketCard = ({ event, onBuyTicket }: TicketCardProps) => {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'concert': return 'bg-casino-gold text-primary-foreground';
      case 'comedy': return 'bg-accent text-accent-foreground';
      case 'tribute': return 'bg-primary text-primary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Card className="shadow-elegant hover:shadow-gold transition-all duration-300 animate-fade-in">
      {event.hero_img && (
        <div className="relative overflow-hidden rounded-t-lg">
          <img 
            src={event.hero_img} 
            alt={event.title}
            className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2">
            <Badge className={getCategoryColor(event.category)}>
              {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              {event.inventory} left
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-casino-charcoal hover-scale">
          {event.title}
        </CardTitle>
        {event.description && (
          <CardDescription className="text-sm">
            {event.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Event Details */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">{formatDate(event.event_date)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">{formatTime(event.event_time)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">{event.venue}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-accent/20 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold text-casino-charcoal">
                {formatPrice(event.price)}
              </div>
              {event.fee > 0 && (
                <div className="text-xs text-muted-foreground">
                  + {formatPrice(event.fee)} fee
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-casino-charcoal">
                Total: {formatPrice(event.price + event.fee)}
              </div>
            </div>
          </div>
        </div>

        {/* Buy Button */}
        <Button 
          onClick={() => onBuyTicket(event.id)}
          className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold transition-all duration-300 hover-scale"
          disabled={event.inventory <= 0}
        >
          <Ticket className="h-4 w-4 mr-2" />
          {event.inventory <= 0 ? 'Sold Out' : 'Buy Tickets'}
        </Button>
      </CardContent>
    </Card>
  );
};