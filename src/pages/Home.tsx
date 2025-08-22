import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Utensils, Spade, Gift, Star } from "lucide-react";

export const Home = () => {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const upcomingEvents = [
    {
      title: "Comedy Night with Mike Johnson",
      date: "Tonight",
      time: "8:00 PM",
      venue: "Stage 954",
      ticketUrl: "#"
    },
    {
      title: "80s Tribute Band",
      date: "Friday",
      time: "9:00 PM", 
      venue: "Stage 954",
      ticketUrl: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Welcome to Dania Beach
          </h2>
          <p className="text-muted-foreground">
            {today}
          </p>
        </div>

        {/* Live Status Banner */}
        <div className="bg-gradient-gold p-4 rounded-lg shadow-gold">
          <div className="flex items-center justify-between text-primary-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="font-medium">Live DJs Tonight</span>
            </div>
            <span className="text-sm">Fri-Sat 8-11 PM</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-elegant hover:shadow-gold transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Tonight at Stage 954</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Live entertainment and events
              </p>
              <Badge variant="secondary" className="mt-2 text-xs">
                2 Shows Tonight
              </Badge>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-gold transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Spade className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Poker Room</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Tables, tournaments & schedule
              </p>
              <Badge variant="outline" className="mt-2 text-xs">
                Open Now
              </Badge>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-gold transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Promotions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Current offers and deals
              </p>
              <Badge variant="secondary" className="mt-2 text-xs">
                5 Active
              </Badge>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-gold transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Dining</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Restaurants and menus
              </p>
              <Badge variant="outline" className="mt-2 text-xs">
                Now Open
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-casino-charcoal">
            Upcoming Events
          </h3>
          
          {upcomingEvents.map((event, index) => (
            <Card key={index} className="shadow-elegant">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <CardDescription className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{event.date}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {event.venue}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <button className="text-sm text-primary font-medium hover:text-casino-gold-dark transition-colors">
                  Get Tickets →
                </button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">Quick Info</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">700+</div>
              <div className="text-xs text-muted-foreground">Slot Machines</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">18+</div>
              <div className="text-xs text-muted-foreground">Poker Age</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">21+</div>
              <div className="text-xs text-muted-foreground">Slots Age</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};