import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Phone, Car, Navigation, Info, Shield, Utensils } from "lucide-react";

export const Visit = () => {
  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 10 && currentHour < 4; // 10 AM to 4 AM

  const parkingOptions = [
    { type: "Self Park", price: "Free", spaces: "500+ spots", distance: "Adjacent" },
    { type: "Valet", price: "$10", spaces: "Available", distance: "Front entrance" },
    { type: "VIP Parking", price: "$20", spaces: "Reserved", distance: "Premium spots" }
  ];

  const amenities = [
    { icon: Utensils, name: "Dining", count: "3 venues", description: "Full service to casual" },
    { icon: Car, name: "Parking", count: "500+ spots", description: "Free self parking" },
    { icon: Shield, name: "Security", count: "24/7", description: "Professional staff" },
    { icon: Phone, name: "Guest Services", count: "Available", description: "Assistance desk" }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold casino-heading">
            Visit Dania+
          </h2>
          <p className="text-muted-foreground">
            Plan your visit with essential information
          </p>
        </div>

        {/* Current Status */}
        <Card className={`shadow-elegant ${isOpen ? 'bg-gradient-gold text-primary-foreground' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                <div>
                  <div className="font-semibold">
                    {isOpen ? 'Currently Open' : 'Currently Closed'}
                  </div>
                  <div className={`text-sm ${isOpen ? 'opacity-90' : 'text-muted-foreground'}`}>
                    Open 10:00 AM - 4:00 AM Daily
                  </div>
                </div>
              </div>
              <Badge variant={isOpen ? "secondary" : "outline"} className="bg-white/20">
                24/7 Gaming
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Location & Contact */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              Location & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium text-casino-charcoal">Address</div>
              <div className="text-sm text-muted-foreground">
                301 E Dania Beach Blvd<br/>
                Dania Beach, FL 33004
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="font-medium text-casino-charcoal">Contact</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>(954) 927-2841</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Guest Services available 24/7
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hours of Operation */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              Hours of Operation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-casino-charcoal">Gaming Floor</span>
                <span className="text-sm">10:00 AM - 4:00 AM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-casino-charcoal">Jai-Alai</span>
                <span className="text-sm">Seasonal Schedule</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-casino-charcoal">Dining</span>
                <span className="text-sm">Varies by Venue</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-casino-charcoal">Guest Services</span>
                <span className="text-sm">24/7</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-accent/20 rounded-lg">
              <div className="text-sm font-medium text-casino-charcoal mb-1">Special Hours</div>
              <div className="text-xs text-muted-foreground">
                Hours may vary during holidays and special events. 
                Call ahead to confirm current operating hours.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parking Information */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Car className="h-5 w-5 mr-2 text-primary" />
              Parking Options
            </CardTitle>
            <CardDescription>Multiple convenient parking options available</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parkingOptions.map((option, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-accent/10 rounded-lg">
                  <div>
                    <div className="font-medium text-casino-charcoal">{option.type}</div>
                    <div className="text-sm text-muted-foreground">{option.spaces} • {option.distance}</div>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    {option.price}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <div className="text-sm font-medium text-casino-charcoal mb-1">
                <Shield className="h-4 w-4 inline mr-1" />
                Security & Safety
              </div>
              <div className="text-xs text-muted-foreground">
                All parking areas are well-lit and monitored by security cameras. 
                Security patrols are available 24/7.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg">Amenities & Services</CardTitle>
            <CardDescription>Everything you need for a great visit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {amenities.map((amenity, index) => {
                const Icon = amenity.icon;
                return (
                  <div key={index} className="p-3 bg-accent/10 rounded-lg text-center">
                    <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="font-medium text-casino-charcoal text-sm">{amenity.name}</div>
                    <div className="text-xs text-muted-foreground">{amenity.count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="shadow-elegant bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Info className="h-5 w-5 mr-2 text-primary" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium text-casino-charcoal mb-1">Age Requirement</div>
              <div className="text-muted-foreground">Must be 18+ to enter gaming areas</div>
            </div>
            
            <div className="text-sm">
              <div className="font-medium text-casino-charcoal mb-1">Valid ID Required</div>
              <div className="text-muted-foreground">Government-issued photo ID must be presented</div>
            </div>
            
            <div className="text-sm">
              <div className="font-medium text-casino-charcoal mb-1">Dress Code</div>
              <div className="text-muted-foreground">Casual attire welcome, no tank tops or flip-flops</div>
            </div>
            
            <div className="text-sm">
              <div className="font-medium text-casino-charcoal mb-1">Responsible Gaming</div>
              <div className="text-muted-foreground">
                Florida Council on Compulsive Gambling: 1-888-ADMIT-IT
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Getting Here */}
        <Card className="shadow-elegant bg-gradient-gold text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-lg">Getting to Dania+</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm opacity-90">
              <div>• 5 minutes from Fort Lauderdale Airport</div>
              <div>• Easy access from I-95 and US-1</div>
              <div>• Public transportation available</div>
              <div>• Rideshare pickup/dropoff areas</div>
            </div>
            <Button variant="secondary" size="sm" className="mt-4 bg-white/10 hover:bg-white/20 border-white/20">
              Plan Your Route
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};