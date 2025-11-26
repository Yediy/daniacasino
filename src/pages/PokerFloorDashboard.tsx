import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, TrendingUp } from "lucide-react";

interface PokerTable {
  id: string;
  name: string;
  game: string;
  stakes: string;
  status: string;
  floor_zone: string | null;
  players: number;
  open_seats: number;
  max_seats: number;
  wait_count: number;
  updated_at: string;
}

interface CashGameList {
  id: string;
  game: string;
  list_status: string;
  open_seats: number;
  wait_count: number;
  table_max: number;
}

import { TableBalancing } from "@/components/TableBalancing";

export default function PokerFloorDashboard() {
  const [tables, setTables] = useState<PokerTable[]>([]);
  const [cashGames, setCashGames] = useState<CashGameList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokerData();

    // Set up real-time subscriptions
    const tablesChannel = supabase
      .channel("poker-tables-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_tables",
        },
        () => {
          fetchPokerData();
        }
      )
      .subscribe();

    const cashGamesChannel = supabase
      .channel("cash-game-lists-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_game_lists",
        },
        () => {
          fetchPokerData();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPokerData, 30000);

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(cashGamesChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchPokerData = async () => {
    try {
      const [tablesRes, cashGamesRes] = await Promise.all([
        supabase
          .from("poker_tables")
          .select("*")
          .order("name"),
        supabase
          .from("cash_game_lists")
          .select("*")
          .order("game"),
      ]);

      if (tablesRes.data) setTables(tablesRes.data);
      if (cashGamesRes.data) setCashGames(cashGamesRes.data);
    } catch (error) {
      console.error("Error fetching poker data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPlayers = tables.reduce((sum, t) => sum + t.players, 0);
  const totalOpenSeats = tables.reduce((sum, t) => sum + t.open_seats, 0);
  const totalWaiting = cashGames.reduce((sum, g) => sum + g.wait_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading poker floor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Poker Floor Dashboard</h1>
          <p className="text-muted-foreground">Real-time table and queue monitoring</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Across {tables.length} tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Seats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpenSeats}</div>
            <p className="text-xs text-muted-foreground">Available now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWaiting}</div>
            <p className="text-xs text-muted-foreground">Waiting for seats</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Balancing Tool */}
      <TableBalancing />

      {/* Live Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Live Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{table.name}</CardTitle>
                    <Badge variant={table.status === "open" ? "default" : "secondary"}>
                      {table.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {table.game} - {table.stakes}
                  </p>
                  {table.floor_zone && (
                    <Badge variant="outline" className="w-fit">
                      {table.floor_zone}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Players:</span>
                    <span className="font-medium">
                      {table.players} / {table.max_seats}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Open Seats:</span>
                    <span className="font-medium">{table.open_seats}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Queue:</span>
                    <span className="font-medium">{table.wait_count}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cash Game Queues */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Game Queues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cashGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-semibold">{game.game}</h4>
                  <p className="text-sm text-muted-foreground">
                    {game.open_seats} / {game.table_max} seats available
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={game.list_status === "open" ? "default" : "secondary"}>
                    {game.list_status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {game.wait_count} waiting
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
