import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Music, Ticket, Star } from "lucide-react";

export const Entertainment = () => {
  const upcomingEvents = [
    {
      title: "Comedy Night with Mike Johnson",
      date: "2024-08-22",
      time: "8:00 PM",
      stage: "Stage 954",
      category: "Comedy",
      ticketUrl: "#",
      image: null,
      ageLimit: "21+",
      status: "Available"
    },
    {
      title: "80s Tribute Band - Totally Awesome",
      date: "2024-08-23",
      time: "9:00 PM",
      stage: "Stage 954",
      category: "Tribute",
      ticketUrl: "#",
      image: null,
      ageLimit: "18+",
      status: "Available"
    },
    {
      title: "Jazz Night with Local Artists",
      date: "2024-08-24",
      time: "7:30 PM",
      stage: "Stage 954",
      category: "Concerts",
      ticketUrl: "#",
      image: null,
      ageLimit: "21+",
      status: "Limited"
    },
    {
      title: "Stand-Up Comedy Showcase",
      date: "2024-08-25",
      time: "8:30 PM",
      stage: "Stage 954",
      category: "Comedy",
      ticketUrl: "#",
      image: null,
      ageLimit: "21+",
      status: "Available"
    }
  ];

  const djNights = [
    { day: "Friday", time: "8:00 PM - 11:00 PM", dj: "DJ Martinez" },
    { day: "Saturday", time: "8:00 PM - 11:00 PM", dj: "DJ Thompson" }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filterEventsByCategory = (category: string) => {
    if (category === "All") return upcomingEvents;
    return upcomingEvents.filter(event => event.category === category);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Entertainment
          </h2>
          <p className="text-muted-foreground">
            Stage 954 events and live music
          </p>
        </div>

        {/* DJ Nights Banner */}
        <div className="bg-gradient-gold p-4 rounded-lg shadow-gold">
          <div className="flex items-center space-x-3 text-primary-foreground">
            <Music className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Live DJs This Weekend</h3>
              <p className="text-sm opacity-90">Friday & Saturday 8-11 PM</p>
            </div>
          </div>
        </div>

        {/* Event Categories */}
        <Tabs defaultValue="All" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="All" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="Comedy" className="text-xs">Comedy</TabsTrigger>
            <TabsTrigger value="Tribute" className="text-xs">Tribute</TabsTrigger>
            <TabsTrigger value="Concerts" className="text-xs">Concerts</TabsTrigger>
          </TabsList>

          {["All", "Comedy", "Tribute", "Concerts"].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4 mt-4">
              {filterEventsByCategory(category).map((event, index) => (
                <Card key={index} className="shadow-elegant hover:shadow-gold transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base leading-tight">
                          {event.title}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-3 mt-2">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(event.date)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          {event.stage}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.ageLimit}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={event.status === "Available" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {event.status === "Available" ? "Tickets Available" : 
                         event.status === "Limited" ? "Limited Seats" : "Sold Out"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.category}
                      </Badge>
                    </div>

                    <Button 
                      className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold"
                      size="sm"
                      disabled={event.status === "Sold Out"}
                    >
                      <Ticket className="h-4 w-4 mr-2" />
                      {event.status === "Sold Out" ? "Sold Out" : "Get Tickets"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* DJ Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-casino-charcoal">
            Weekly DJ Schedule
          </h3>
          
          {djNights.map((night, index) => (
            <Card key={index} className="shadow-elegant">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-casino-charcoal">{night.day} Night</h4>
                      <p className="text-sm text-muted-foreground">{night.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-casino-charcoal">{night.dj}</p>
                    <Badge variant="secondary" className="text-xs mt-1">Live DJ</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stage 954 Info */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">Stage 954 Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-medium">300 Guests</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event Frequency</span>
              <span className="font-medium">3-4 Shows Weekly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Partner</span>
              <span className="font-medium">AXS Ticketing</span>
            </div>
          </div>
        </div>

        {/* Entertainment Notice */}
        <div className="bg-accent/50 p-4 rounded-lg border border-primary/20">
          <div className="flex items-start space-x-3">
            <Star className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-casino-charcoal">Event Updates</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Show times and performers subject to change. Check with venue for latest updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};