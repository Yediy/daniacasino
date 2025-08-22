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
          <h2 className="text-3xl font-bold casino-heading">
            Welcome to Dania Beach
          </h2>
          <p className="text-muted-foreground text-lg">
            {today}
          </p>
        </div>

        {/* Live Status Banner */}
        <div className="bg-gradient-casino-primary p-4 rounded-lg shadow-gold-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-gold-radial opacity-50"></div>
          <div className="relative flex items-center justify-between text-primary-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-casino-emerald rounded-full animate-ambient-pulse shadow-gold-glow" />
              <span className="font-bold status-live pl-4">Live DJs Tonight</span>
            </div>
            <span className="text-sm font-medium">Fri-Sat 8-11 PM</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="card-luxury chip-animation cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-gradient-casino-primary rounded-xl flex items-center justify-center mb-2 shadow-gold">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-sm font-bold text-casino-charcoal">Tonight at Stage 954</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Live entertainment and events
              </p>
              <Badge variant="secondary" className="text-xs bg-casino-emerald/10 text-casino-emerald border-casino-emerald/20">
                2 Shows Tonight
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-luxury card-animation cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-gradient-casino-primary rounded-xl flex items-center justify-center mb-2 shadow-gold">
                <Spade className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-sm font-bold text-casino-charcoal">Poker Room</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Tables, tournaments & schedule
              </p>
              <Badge variant="outline" className="text-xs border-casino-gold text-casino-gold">
                Open Now
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-luxury chip-animation cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-gradient-casino-primary rounded-xl flex items-center justify-center mb-2 shadow-gold">
                <Gift className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-sm font-bold text-casino-charcoal">Promotions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Current offers and deals
              </p>
              <Badge variant="secondary" className="text-xs bg-casino-ruby/10 text-casino-ruby border-casino-ruby/20">
                5 Active
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-luxury slot-animation cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-gradient-casino-primary rounded-xl flex items-center justify-center mb-2 shadow-gold">
                <Utensils className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-sm font-bold text-casino-charcoal">Dining</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Restaurants and menus
              </p>
              <Badge variant="outline" className="text-xs border-casino-gold text-casino-gold">
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