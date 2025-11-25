import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Trophy, Utensils, Coins, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/AuthGuard";

interface RewardItem {
  id: string;
  title: string;
  description: string;
  reward_type: string;
  points_cost: number;
  monetary_value: number | null;
  min_tier: string | null;
  image: string | null;
  stock_qty: number | null;
  active: boolean;
}

interface UserProfile {
  points: number;
  tier: string;
}

export const RewardsShop = () => {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();

    // Set up realtime subscription for rewards catalog
    const rewardsChannel = supabase
      .channel('rewards-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rewards_catalog'
      }, () => {
        fetchRewards();
      })
      .subscribe();

    // Subscribe to profile points updates
    const profileChannel = supabase
      .channel('profile-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rewardsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchRewards(), fetchProfile()]);
    setLoading(false);
  };

  const fetchRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards_catalog')
        .select('*')
        .eq('active', true)
        .order('points_cost');

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('points, tier')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (!profile) return;

    if (profile.points < reward.points_cost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.points_cost - profile.points} more points`,
        variant: "destructive",
      });
      return;
    }

    if (reward.min_tier && profile.tier !== reward.min_tier && profile.tier !== 'Admin') {
      toast({
        title: "Tier Required",
        description: `This reward requires ${reward.min_tier} tier or higher`,
        variant: "destructive",
      });
      return;
    }

    if (reward.stock_qty !== null && reward.stock_qty <= 0) {
      toast({
        title: "Out of Stock",
        description: "This reward is currently unavailable",
        variant: "destructive",
      });
      return;
    }

    setRedeeming(reward.id);

    try {
      const { data, error } = await supabase.functions.invoke('redeem-reward', {
        body: { rewardId: reward.id }
      });

      if (error) throw error;

      toast({
        title: "Reward Redeemed!",
        description: `Successfully redeemed ${reward.title}`,
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        title: "Redemption Failed",
        description: "Unable to redeem reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRedeeming(null);
    }
  };

  const canAfford = (cost: number) => profile && profile.points >= cost;
  const meetsMinTier = (minTier: string | null) => {
    if (!profile || !minTier) return true;
    return profile.tier === minTier || profile.tier === 'Admin';
  };

  const rewardsByType = {
    food: rewards.filter(r => r.reward_type === 'food_voucher'),
    tournament: rewards.filter(r => r.reward_type === 'tournament_entry'),
    chip: rewards.filter(r => r.reward_type === 'chip_voucher'),
    other: rewards.filter(r => !['food_voucher', 'tournament_entry', 'chip_voucher'].includes(r.reward_type))
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">Loading rewards...</div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Header with Points Balance */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              🎁 Rewards Shop
            </h2>
            <p className="text-muted-foreground">
              Redeem your loyalty points for exclusive rewards
            </p>
          </div>

          {/* Points Balance Card */}
          <Card className="shadow-elegant bg-gradient-gold">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Coins className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Available Points</span>
              </div>
              <div className="text-4xl font-bold text-foreground">
                {profile?.points?.toLocaleString() || 0}
              </div>
              {profile?.tier && (
                <Badge variant="secondary" className="mt-2">
                  {profile.tier} Tier
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Rewards Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="food">
                <Utensils className="h-4 w-4 mr-2" />
                Food
              </TabsTrigger>
              <TabsTrigger value="tournament">
                <Trophy className="h-4 w-4 mr-2" />
                Tournaments
              </TabsTrigger>
              <TabsTrigger value="chips">
                <Gift className="h-4 w-4 mr-2" />
                Chips
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {rewards.map(reward => {
                const affordable = canAfford(reward.points_cost);
                const tierOk = meetsMinTier(reward.min_tier);
                const inStock = reward.stock_qty === null || reward.stock_qty > 0;
                const canRedeem = affordable && tierOk && inStock;

                return (
                  <Card key={reward.id} className="shadow-elegant">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{reward.title}</CardTitle>
                          <CardDescription className="mt-1">{reward.description}</CardDescription>
                        </div>
                        {reward.image && (
                          <img 
                            src={reward.image} 
                            alt={reward.title} 
                            className="w-16 h-16 object-cover rounded-lg ml-4"
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Coins className="h-4 w-4 text-primary" />
                            <span className="text-lg font-bold text-foreground">
                              {reward.points_cost.toLocaleString()} pts
                            </span>
                          </div>
                          {reward.monetary_value && (
                            <div className="text-sm text-muted-foreground">
                              Value: ${(reward.monetary_value / 100).toFixed(2)}
                            </div>
                          )}
                          {reward.min_tier && (
                            <Badge variant="outline" className="text-xs">
                              {reward.min_tier}+ required
                            </Badge>
                          )}
                          {reward.stock_qty !== null && (
                            <div className="text-xs text-muted-foreground">
                              {reward.stock_qty} left
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => handleRedeem(reward)}
                          disabled={!canRedeem || redeeming === reward.id}
                          className="shadow-gold"
                        >
                          {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                      {!affordable && (
                        <div className="text-xs text-destructive mt-2">
                          Need {(reward.points_cost - (profile?.points || 0)).toLocaleString()} more points
                        </div>
                      )}
                      {!tierOk && (
                        <div className="text-xs text-destructive mt-2">
                          {reward.min_tier} tier required
                        </div>
                      )}
                      {!inStock && (
                        <div className="text-xs text-destructive mt-2">
                          Currently out of stock
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="food" className="space-y-4 mt-6">
              {rewardsByType.food.map(reward => {
                const affordable = canAfford(reward.points_cost);
                const tierOk = meetsMinTier(reward.min_tier);
                const inStock = reward.stock_qty === null || reward.stock_qty > 0;
                const canRedeem = affordable && tierOk && inStock;

                return (
                  <Card key={reward.id} className="shadow-elegant">
                    <CardHeader>
                      <CardTitle className="text-lg">{reward.title}</CardTitle>
                      <CardDescription>{reward.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Coins className="h-4 w-4 text-primary" />
                          <span className="text-lg font-bold">{reward.points_cost.toLocaleString()} pts</span>
                        </div>
                        <Button
                          onClick={() => handleRedeem(reward)}
                          disabled={!canRedeem || redeeming === reward.id}
                        >
                          {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="tournament" className="space-y-4 mt-6">
              {rewardsByType.tournament.map(reward => {
                const affordable = canAfford(reward.points_cost);
                const tierOk = meetsMinTier(reward.min_tier);
                const inStock = reward.stock_qty === null || reward.stock_qty > 0;
                const canRedeem = affordable && tierOk && inStock;

                return (
                  <Card key={reward.id} className="shadow-elegant">
                    <CardHeader>
                      <CardTitle className="text-lg">{reward.title}</CardTitle>
                      <CardDescription>{reward.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Coins className="h-4 w-4 text-primary" />
                          <span className="text-lg font-bold">{reward.points_cost.toLocaleString()} pts</span>
                        </div>
                        <Button
                          onClick={() => handleRedeem(reward)}
                          disabled={!canRedeem || redeeming === reward.id}
                        >
                          {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="chips" className="space-y-4 mt-6">
              {rewardsByType.chip.map(reward => {
                const affordable = canAfford(reward.points_cost);
                const tierOk = meetsMinTier(reward.min_tier);
                const inStock = reward.stock_qty === null || reward.stock_qty > 0;
                const canRedeem = affordable && tierOk && inStock;

                return (
                  <Card key={reward.id} className="shadow-elegant">
                    <CardHeader>
                      <CardTitle className="text-lg">{reward.title}</CardTitle>
                      <CardDescription>{reward.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Coins className="h-4 w-4 text-primary" />
                          <span className="text-lg font-bold">{reward.points_cost.toLocaleString()} pts</span>
                        </div>
                        <Button
                          onClick={() => handleRedeem(reward)}
                          disabled={!canRedeem || redeeming === reward.id}
                        >
                          {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};
