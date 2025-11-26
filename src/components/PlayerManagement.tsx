import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Award } from "lucide-react";

interface Profile {
  id: string;
  name: string;
  email: string;
  points: number;
  tier: string;
}

export const PlayerManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null);
  const [pointsChange, setPointsChange] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [newTier, setNewTier] = useState("");
  const [tierReason, setTierReason] = useState("");

  const searchPlayer = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, points, tier")
        .or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSelectedPlayer(data);
      } else {
        toast({
          title: "Not Found",
          description: "No player found with that email or name.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching player:", error);
      toast({
        title: "Error",
        description: "Failed to search for player.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const adjustPoints = async () => {
    if (!selectedPlayer || !pointsChange || !pointsReason) {
      toast({
        title: "Missing Information",
        description: "Please enter points change and reason.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("adjust_player_points", {
        p_user_id: selectedPlayer.id,
        p_points_change: parseInt(pointsChange),
        p_reason: pointsReason,
        p_admin_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Points Adjusted",
        description: `Successfully adjusted ${selectedPlayer.name}'s points by ${pointsChange}.`,
      });

      // Refresh player data
      setPointsChange("");
      setPointsReason("");
      searchPlayer();
    } catch (error: any) {
      console.error("Error adjusting points:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust points.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const adjustTier = async () => {
    if (!selectedPlayer || !newTier || !tierReason) {
      toast({
        title: "Missing Information",
        description: "Please select new tier and provide reason.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("adjust_player_tier", {
        p_user_id: selectedPlayer.id,
        p_new_tier: newTier as "Admin" | "Staff" | "User",
        p_reason: tierReason,
        p_admin_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Tier Adjusted",
        description: `Successfully updated ${selectedPlayer.name}'s tier to ${newTier}.`,
      });

      // Refresh player data
      setNewTier("");
      setTierReason("");
      searchPlayer();
    } catch (error: any) {
      console.error("Error adjusting tier:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust tier.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Player
          </CardTitle>
          <CardDescription>
            Search for a player by email or name to manage their account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchPlayer()}
            />
            <Button onClick={searchPlayer} disabled={loading}>
              Search
            </Button>
          </div>

          {selectedPlayer && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg">{selectedPlayer.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedPlayer.email}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-sm">
                  <strong>Points:</strong> {selectedPlayer.points}
                </span>
                <span className="text-sm">
                  <strong>Tier:</strong> {selectedPlayer.tier}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPlayer && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Adjust Loyalty Points
              </CardTitle>
              <CardDescription>
                Manually adjust player's loyalty points with audit trail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="points-change">Points Change</Label>
                <Input
                  id="points-change"
                  type="number"
                  placeholder="Enter positive or negative value"
                  value={pointsChange}
                  onChange={(e) => setPointsChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="points-reason">Reason</Label>
                <Textarea
                  id="points-reason"
                  placeholder="Explain why points are being adjusted..."
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                />
              </div>
              <Button onClick={adjustPoints} disabled={loading} className="w-full">
                Adjust Points
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Adjust Loyalty Tier
              </CardTitle>
              <CardDescription>
                Change player's loyalty tier with audit trail
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-tier">New Tier</Label>
                <Select value={newTier} onValueChange={setNewTier}>
                  <SelectTrigger id="new-tier">
                    <SelectValue placeholder="Select new tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="User">User</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tier-reason">Reason</Label>
                <Textarea
                  id="tier-reason"
                  placeholder="Explain why tier is being changed..."
                  value={tierReason}
                  onChange={(e) => setTierReason(e.target.value)}
                />
              </div>
              <Button onClick={adjustTier} disabled={loading} className="w-full">
                Adjust Tier
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
