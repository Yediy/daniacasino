import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Gamepad2, Trophy, Calendar } from "lucide-react";

export const Gaming = () => {
  const gamingOptions = [
    {
      category: "Slot Machines",
      icon: Coins,
      count: "700+",
      description: "Latest video slots, classic reels, and progressive jackpots",
      highlights: ["Mega Jackpots", "Video Poker", "Classic Slots", "Progressive Slots"]
    },
    {
      category: "Electronic Table Games",
      icon: Gamepad2,
      count: "24",
      description: "Digital versions of your favorite table games",
      highlights: ["Electronic Blackjack", "Roulette", "Baccarat", "Craps"]
    },
    {
      category: "Jai-Alai",
      icon: Trophy,
      count: "Live",
      description: "Traditional Basque sport betting and live action",
      highlights: ["Live Games", "Betting Windows", "Player Stats", "Match Schedule"]
    },
    {
      category: "Simulcast Racing",
      icon: Calendar,
      count: "Daily",
      description: "Horse and greyhound racing from tracks nationwide",
      highlights: ["Live Racing", "Daily Schedule", "Betting Odds", "Track Info"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-casino-charcoal">
            Gaming Floor
          </h2>
          <p className="text-muted-foreground">
            Slots, table games, and live action
          </p>
        </div>

        {/* Age Requirement */}
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
          <div className="text-center">
            <Badge variant="default" className="mb-2">21+ Required</Badge>
            <p className="text-sm text-muted-foreground">
              Must be 21 years or older for all gaming activities
            </p>
          </div>
        </div>

        {/* Gaming Categories */}
        <div className="space-y-4">
          {gamingOptions.map((option, index) => {
            const Icon = option.icon;
            
            return (
              <Card key={index} className="shadow-elegant hover:shadow-gold transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{option.category}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {option.count} Available
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>{option.description}</CardDescription>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {option.highlights.map((highlight, idx) => (
                      <div key={idx} className="text-xs text-center bg-accent/30 py-1 px-2 rounded">
                        {highlight}
                      </div>
                    ))}
                  </div>

                  {option.category === "Jai-Alai" && (
                    <div className="mt-3 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                      >
                        View Game Rules & Schedule
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                      >
                        View Simulcast Calendar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gaming Floor Info */}
        <div className="bg-card p-4 rounded-lg shadow-elegant">
          <h4 className="font-semibold text-casino-charcoal mb-3">Gaming Floor Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Machines</span>
              <span className="font-medium">700+ Slots</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Electronic Tables</span>
              <span className="font-medium">24 Games</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Denominations</span>
              <span className="font-medium">$0.01 - $100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Jackpot</span>
              <span className="font-medium">Progressive</span>
            </div>
          </div>
        </div>

        {/* Promotions Teaser */}
        <Card className="shadow-elegant bg-gradient-gold text-primary-foreground">
          <CardContent className="p-4 text-center">
            <h4 className="font-semibold mb-2">Gaming Promotions</h4>
            <p className="text-sm opacity-90 mb-3">
              Check out our latest slot tournaments and jackpot specials
            </p>
            <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 border-white/20">
              View Promotions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};