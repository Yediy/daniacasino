import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Star, TrendingUp, Gift } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TierBenefit {
  id: string;
  tier: string;
  benefit_type: string;
  benefit_name: string;
  benefit_description: string | null;
}

interface Achievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  icon: string | null;
  points_awarded: number;
  earned_at: string;
}

const TIER_REQUIREMENTS = {
  User: { points: 0, color: "bg-gray-500" },
  Staff: { points: 10000, color: "bg-blue-500" },
  Admin: { points: 50000, color: "bg-purple-500" }
};

export default function LoyaltyProgression() {
  const [currentTier, setCurrentTier] = useState<string>("User");
  const [points, setPoints] = useState(0);
  const [benefits, setBenefits] = useState<TierBenefit[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchBenefits();
    fetchAchievements();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("tier, points")
      .eq("id", user.id)
      .single();

    if (data) {
      setCurrentTier(data.tier || "User");
      setPoints(data.points || 0);
    }
  };

  const fetchBenefits = async () => {
    const { data } = await supabase
      .from("tier_benefits")
      .select("*")
      .eq("is_active", true)
      .order("tier", { ascending: true });

    if (data) {
      setBenefits(data);
    }
  };

  const fetchAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("player_achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });

    if (data) {
      setAchievements(data);
    }
  };

  const getNextTier = () => {
    const tiers = Object.keys(TIER_REQUIREMENTS);
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  };

  const getProgressToNextTier = () => {
    const nextTier = getNextTier();
    if (!nextTier) return 100;

    const currentReq = TIER_REQUIREMENTS[currentTier as keyof typeof TIER_REQUIREMENTS].points;
    const nextReq = TIER_REQUIREMENTS[nextTier as keyof typeof TIER_REQUIREMENTS].points;
    const progress = ((points - currentReq) / (nextReq - currentReq)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const benefitsByTier = benefits.reduce((acc, benefit) => {
    if (!acc[benefit.tier]) acc[benefit.tier] = [];
    acc[benefit.tier].push(benefit);
    return acc;
  }, {} as Record<string, TierBenefit[]>);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Your Tier Progress
          </CardTitle>
          <CardDescription>
            Current Tier: <Badge className="ml-2">{currentTier}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{points.toLocaleString()} Points</span>
              {getNextTier() && (
                <span className="text-sm text-muted-foreground">
                  {TIER_REQUIREMENTS[getNextTier() as keyof typeof TIER_REQUIREMENTS].points - points} more to{" "}
                  {getNextTier()}
                </span>
              )}
            </div>
            {getNextTier() && (
              <div>
                <Progress value={getProgressToNextTier()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {getProgressToNextTier().toFixed(0)}% to next tier
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="benefits">Tier Benefits</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Exclusive Benefits
              </CardTitle>
              <CardDescription>Perks available at each tier level</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {Object.entries(benefitsByTier).map(([tier, tierBenefits]) => {
                    const isUnlocked = TIER_REQUIREMENTS[tier as keyof typeof TIER_REQUIREMENTS].points <= points;
                    return (
                      <div key={tier} className={`${!isUnlocked && "opacity-50"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={isUnlocked ? "default" : "outline"}>{tier}</Badge>
                          {isUnlocked && <Badge variant="secondary">Unlocked</Badge>}
                        </div>
                        <div className="space-y-2 ml-4">
                          {tierBenefits.map((benefit) => (
                            <Card key={benefit.id}>
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <TrendingUp className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold">{benefit.benefit_name}</div>
                                    {benefit.benefit_description && (
                                      <p className="text-sm text-muted-foreground">
                                        {benefit.benefit_description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(benefitsByTier).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tier benefits configured yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Achievements
              </CardTitle>
              <CardDescription>Badges and milestones you've earned</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <Card key={achievement.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{achievement.icon || "🏆"}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{achievement.achievement_name}</div>
                            {achievement.achievement_description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {achievement.achievement_description}
                              </p>
                            )}
                            <div className="flex justify-between items-center">
                              <Badge variant="secondary">+{achievement.points_awarded} pts</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(achievement.earned_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {achievements.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No achievements yet</p>
                      <p className="text-sm">Start playing to earn badges!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
