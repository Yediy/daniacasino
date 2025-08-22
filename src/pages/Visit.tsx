import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Car, Plane, Clock, Phone, Shield, ExternalLink } from "lucide-react";

export const Visit = () => {
  const casinoInfo = {
    address: "301 E Dania Beach Blvd, Dania Beach, FL 33004",
    phone: "(954) 927-2841",
    generalHours: "24 Hours Daily",
    smokeFree: true
  };

  const parkingInfo = {
    onSite: "Free self-parking available",
    valet: "Valet parking available daily",
    fllPartner: "Special FLL parking partner rates available"
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Visit Us
          </h2>
          <p className="text-muted-foreground">
            Location, parking, and visitor information
          </p>
        </div>

        {/* Address & Contact */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-casino-charcoal mb-1">
                The Casino @ Dania Beach
              </p>
              <p className="text-sm text-muted-foreground">
                {casinoInfo.address}
              </p>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium">{casinoInfo.phone}</span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">{casinoInfo.generalHours}</span>
            </div>

            <div className="flex space-x-2 pt-2">
              <Button className="flex-1 bg-gradient-gold hover:bg-casino-gold-dark shadow-gold" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Open in Maps
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Directions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Parking Information */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-primary" />
              <span>Parking</span>
            </CardTitle>
            <CardDescription>
              Multiple parking options available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div>
                  <p className="font-medium text-casino-charcoal text-sm">Self Parking</p>
                  <p className="text-xs text-muted-foreground">{parkingInfo.onSite}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div>
                  <p className="font-medium text-casino-charcoal text-sm">Valet Service</p>
                  <p className="text-xs text-muted-foreground">{parkingInfo.valet}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                <div>
                  <p className="font-medium text-casino-charcoal text-sm">FLL Airport Partnership</p>
                  <p className="text-xs text-muted-foreground">{parkingInfo.fllPartner}</p>
                </div>
              </div>
            </div>

            <Badge variant="secondary" className="w-full justify-center py-2">
              <Plane className="h-3 w-3 mr-1" />
              FLL Shuttle Partner Available
            </Badge>
          </CardContent>
        </Card>

        {/* Operating Hours by Department */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Hours of Operation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-casino-charcoal">Gaming Floor</span>
                <span className="text-sm text-muted-foreground">24 Hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-casino-charcoal">Poker Room</span>
                <span className="text-sm text-muted-foreground">11 AM - 4 AM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-casino-charcoal">Restaurants</span>
                <span className="text-sm text-muted-foreground">Varies by venue</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-casino-charcoal">Stage 954</span>
                <span className="text-sm text-muted-foreground">Event dependent</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policies & Guidelines */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Policies & Guidelines</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-accent/30 rounded-lg">
                <div className="text-lg font-bold text-primary">21+</div>
                <div className="text-xs text-muted-foreground">Slots & ETGs</div>
              </div>
              <div className="text-center p-3 bg-accent/30 rounded-lg">
                <div className="text-lg font-bold text-primary">18+</div>
                <div className="text-xs text-muted-foreground">Poker Room</div>
              </div>
            </div>

            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-center py-2">
                <Shield className="h-3 w-3 mr-1" />
                Smoke-Free Casino Environment
              </Badge>
              
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Responsible Gaming Resources
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transportation */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">Getting Here</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">From I-95</span>
              <span className="font-medium">Exit 23 - Dania Beach Blvd</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From FLL Airport</span>
              <span className="font-medium">10 minutes via shuttle</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Public Transit</span>
              <span className="font-medium">Broward County Transit</span>
            </div>
          </div>
        </div>

        {/* Contact & Emergency */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
          <h4 className="font-medium text-casino-charcoal mb-2">Need Assistance?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Our guest services team is available 24/7 to help with directions, parking, and general information.
          </p>
          <Button variant="outline" size="sm" className="w-full">
            <Phone className="h-4 w-4 mr-2" />
            Contact Guest Services
          </Button>
        </div>
      </div>
    </div>
  );
};