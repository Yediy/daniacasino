import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Menu, Wine, Coffee } from "lucide-react";

export const Dining = () => {
  const diningOptions = [
    {
      venue: "The Grill",
      hours: "11:00 AM - 11:00 PM",
      weekendHours: "11:00 AM - 12:00 AM",
      happyHour: "3:00 PM - 6:00 PM",
      location: "Main Gaming Floor",
      type: "Full Service Restaurant",
      icon: Wine,
      specialties: ["Steaks", "Seafood", "Cocktails", "Wine Selection"],
      isOpen: true
    },
    {
      venue: "Café 954",
      hours: "6:00 AM - 2:00 AM",
      weekendHours: "24 Hours",
      happyHour: null,
      location: "Near Poker Room",
      type: "Casual Dining",
      icon: Coffee,
      specialties: ["Breakfast", "Sandwiches", "Coffee", "Light Bites"],
      isOpen: true
    },
    {
      venue: "Sports Bar",
      hours: "12:00 PM - 2:00 AM",
      weekendHours: "12:00 PM - 3:00 AM",
      happyHour: "4:00 PM - 7:00 PM",
      location: "Stage 954 Area",
      type: "Sports Bar & Grill",
      icon: Menu,
      specialties: ["Wings", "Burgers", "Draft Beer", "Game Viewing"],
      isOpen: true
    }
  ];

  const currentHour = new Date().getHours();
  const isWeekend = [0, 6].includes(new Date().getDay());

  const isVenueOpen = (venue: typeof diningOptions[0]) => {
    // Simplified logic - in real app would check actual times
    return venue.isOpen;
  };

  const isHappyHour = (venue: typeof diningOptions[0]) => {
    if (!venue.happyHour) return false;
    return currentHour >= 15 && currentHour < 19; // 3 PM - 7 PM
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Dining Options
          </h2>
          <p className="text-muted-foreground">
            Restaurants, bars, and casual dining
          </p>
        </div>

        {/* Quick Status */}
        <div className="bg-accent/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="font-medium text-casino-charcoal">All Venues Open</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {isWeekend ? 'Weekend Hours' : 'Weekday Hours'}
            </Badge>
          </div>
        </div>

        {/* Dining Venues */}
        <div className="space-y-4">
          {diningOptions.map((venue, index) => {
            const Icon = venue.icon;
            const isOpen = isVenueOpen(venue);
            const happyHourActive = isHappyHour(venue);
            
            return (
              <Card key={index} className="shadow-elegant hover:shadow-gold transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{venue.venue}</CardTitle>
                        <CardDescription className="text-xs">{venue.type}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Badge variant={isOpen ? "default" : "secondary"} className="text-xs">
                        {isOpen ? "Open Now" : "Closed"}
                      </Badge>
                      {happyHourActive && venue.happyHour && (
                        <Badge variant="outline" className="text-xs bg-primary/5">
                          Happy Hour
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Hours */}
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium text-casino-charcoal">
                        {isWeekend ? venue.weekendHours : venue.hours}
                      </div>
                      {venue.happyHour && (
                        <div className="text-xs text-muted-foreground">
                          Happy Hour: {venue.happyHour}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{venue.location}</span>
                  </div>

                  {/* Specialties */}
                  <div className="grid grid-cols-2 gap-2">
                    {venue.specialties.map((specialty, idx) => (
                      <div key={idx} className="text-xs text-center bg-accent/30 py-1 px-2 rounded">
                        {specialty}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      View Menu
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      Locate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dining Hours Info */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">General Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Venues</span>
              <span className="font-medium">3 Dining Options</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extended Hours</span>
              <span className="font-medium">Until 3 AM Weekends</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reservations</span>
              <span className="font-medium">Recommended</span>
            </div>
          </div>
        </div>

        {/* Special Offers */}
        <Card className="shadow-elegant bg-gradient-gold text-primary-foreground">
          <CardContent className="p-4 text-center">
            <h4 className="font-semibold mb-2">Dining Specials</h4>
            <p className="text-sm opacity-90 mb-3">
              Happy hour specials and weekend brunch available
            </p>
            <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 border-white/20">
              View Current Offers
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};