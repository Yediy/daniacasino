import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Clock, Users, AlertCircle } from "lucide-react";
import { TournamentSchedule } from "@/components/TournamentSchedule";
import TournamentBracket from "@/components/TournamentBracket";

export const Poker = () => {
  const [selectedTourneyId, setSelectedTourneyId] = useState<string | null>(null);
  const pokerSchedule = [
    { day: "Monday", open: "11:00 AM", close: "3:00 AM", tournaments: "7:00 PM - No Limit Hold'em" },
    { day: "Tuesday", open: "11:00 AM", close: "3:00 AM", tournaments: "7:00 PM - Omaha Hi-Lo" },
    { day: "Wednesday", open: "11:00 AM", close: "4:00 AM", tournaments: "7:00 PM - No Limit Hold'em" },
    { day: "Thursday", open: "11:00 AM", close: "4:00 AM", tournaments: "7:00 PM - Mixed Games" },
    { day: "Friday", open: "11:00 AM", close: "4:00 AM", tournaments: "7:00 PM - Tournament Series" },
    { day: "Saturday", open: "11:00 AM", close: "4:00 AM", tournaments: "2:00 PM & 7:00 PM - Daily Events" },
    { day: "Sunday", open: "11:00 AM", close: "3:00 AM", tournaments: "2:00 PM - Sunday Special" },
  ];

  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Poker Room
          </h2>
          <p className="text-muted-foreground">
            Live action tables and tournaments
          </p>
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Room Schedule</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">{/* ... keep existing code */}

        {/* Age Requirements */}
        <div className="bg-accent/50 p-4 rounded-lg border border-primary/20">
          <div className="flex items-center space-x-2 text-primary mb-2">
            <Users className="h-4 w-4" />
            <span className="font-semibold">Age Requirement: 18+</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Must be 18 years or older to enter the poker room
          </p>
        </div>

        {/* Contact Info */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-primary" />
              <span>Call Ahead</span>
            </CardTitle>
            <CardDescription>
              Check table availability and tournament status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold">
              <Phone className="h-4 w-4 mr-2" />
              Call Poker Room
            </Button>
          </CardContent>
        </Card>

        {/* Late Night Alert */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-casino-charcoal">Late Night Tables</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Extended hours until 3-4 AM Wednesday through Saturday
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-casino-charcoal">
            Weekly Schedule
          </h3>
          
          {pokerSchedule.map((schedule, index) => {
            const isToday = schedule.day === currentDay;
            const isLateNight = schedule.close === "3:00 AM" || schedule.close === "4:00 AM";
            
            return (
              <Card key={index} className={`shadow-elegant ${isToday ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <span>{schedule.day}</span>
                      {isToday && <Badge variant="default" className="text-xs">Today</Badge>}
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-sm font-medium text-casino-charcoal">
                        {schedule.open} - {schedule.close}
                      </div>
                      {isLateNight && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Late Night
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start space-x-2">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-casino-charcoal">Tournament</p>
                      <p className="text-sm text-muted-foreground">{schedule.tournaments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Info */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">Room Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Games Offered</span>
              <span className="font-medium">Hold'em, Omaha, Mixed</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Table Count</span>
              <span className="font-medium">12 Tables</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Limits</span>
              <span className="font-medium">$1/$2 - $5/$10</span>
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="tournaments">
            <TournamentSchedule onSelectTournament={setSelectedTourneyId} />
          </TabsContent>

          <TabsContent value="bracket">
            {selectedTourneyId ? (
              <TournamentBracket tourneyId={selectedTourneyId} />
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <p>Select a tournament from the Tournaments tab to view its bracket</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};