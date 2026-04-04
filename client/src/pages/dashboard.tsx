import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, FileCheck, AlertTriangle, TrendingUp, Search, Plus,
  ArrowRight, Globe, Activity, Eye, Clock, ChevronRight,
  Shield, Video, Coins, BarChart3, User, Flag
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar
} from "recharts";
import { mockDashboardStats, mockEmbassyVerifications, mockScoutingInquiries } from "@/lib/mock-data";
import type { DashboardStats } from "@/lib/types";
import type { Player as SchemaPlayer } from "@shared/schema";
import WorldMap from "@/components/WorldMap";

interface MapData {
  playerOrigins: Array<{
    country: string;
    count: number;
    players: Array<{ id: string; name: string }>;
  }>;
  transferDestinations: Array<{
    fromCountry: string;
    toCountry: string;
    playerName: string;
    playerId: string;
  }>;
}

const CHART_COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  rosegold: "hsl(340, 30%, 65%)",
  muted: "hsl(0, 0%, 25%)",
};

function calculateAge(dateOfBirth: string | Date | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: statsData, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: verificationsData } = useQuery<any[]>({
    queryKey: ["/api/embassy/verifications"],
  });

  const { data: inquiriesData } = useQuery<any[]>({
    queryKey: ["/api/scouting/inquiries"],
  });

  const { data: mapData } = useQuery<MapData>({
    queryKey: ["/api/dashboard/map-data"],
  });

  const { data: apiPlayers, isLoading: playersLoading } = useQuery<SchemaPlayer[]>({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const response = await fetch("/api/players", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch players");
      return response.json();
    },
  });

  const stats = statsData || mockDashboardStats;
  const allPlayers = apiPlayers || [];
  const recentVerifications = verificationsData?.slice(0, 3) || mockEmbassyVerifications.slice(0, 3);
  const recentInquiries = inquiriesData?.slice(0, 3) || mockScoutingInquiries.slice(0, 3);

  const filteredPlayers = allPlayers
    .filter((p) =>
      !searchQuery ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 5);

  // Position distribution for chart
  const positionCounts = allPlayers.reduce((acc, p) => {
    const pos = p.position || "Unknown";
    acc[pos] = (acc[pos] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const positionData = Object.entries(positionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Eligibility distribution donut
  const eligibilityDonut = [
    { name: "Eligible", value: stats.greenStatus, color: CHART_COLORS.green },
    { name: "Conditional", value: stats.yellowStatus, color: CHART_COLORS.yellow },
    { name: "Needs Work", value: stats.redStatus, color: CHART_COLORS.red },
  ].filter((d) => d.value > 0);

  // Nationality distribution
  const nationalityCounts = allPlayers.reduce((acc, p) => {
    const nat = p.nationality || "Unknown";
    acc[nat] = (acc[nat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topNationalities = Object.entries(nationalityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalEligibility = stats.greenStatus + stats.yellowStatus + stats.redStatus;
  const greenPct = totalEligibility > 0 ? Math.round((stats.greenStatus / totalEligibility) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Overview</p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-card border-border/50"
              data-testid="input-search-dashboard"
            />
          </div>
          <Button onClick={() => navigate("/players")} data-testid="button-add-player" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <Card className="group relative overflow-hidden border-border/30 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate("/players")}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Players</span>
                </div>
                <p className="text-3xl font-bold tabular-nums">{stats.totalPlayers}</p>
                <p className="text-xs text-muted-foreground mt-1">In your squad</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-border/30 hover:border-green-500/30 transition-colors cursor-pointer" onClick={() => navigate("/players")}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -translate-y-8 translate-x-8" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileCheck className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Eligible</span>
                </div>
                <p className="text-3xl font-bold tabular-nums text-green-500">{stats.greenStatus}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={greenPct} className="h-1 flex-1" />
                  <span className="text-xs text-muted-foreground">{greenPct}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-border/30 hover:border-yellow-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full -translate-y-8 translate-x-8" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</span>
                </div>
                <p className="text-3xl font-bold tabular-nums text-yellow-500">{stats.pendingVerifications}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden border-border/30 hover:border-blue-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8" />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inquiries</span>
                </div>
                <p className="text-3xl font-bold tabular-nums text-blue-500">{stats.activeInquiries}</p>
                <p className="text-xs text-muted-foreground mt-1">Active discussions</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* World Map */}
          <WorldMap
            playerOrigins={mapData?.playerOrigins || []}
            transferDestinations={mapData?.transferDestinations || []}
          />

          {/* Player Roster */}
          <Card className="border-border/30">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Squad Roster</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{allPlayers.length} players registered</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/players")} className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {playersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No players found</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/players")}>
                    <Plus className="h-3 w-3 mr-1" /> Add your first player
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPlayers.map((player) => {
                    const age = calculateAge(player.dateOfBirth);
                    return (
                      <div
                        key={player.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/players/${player.id}`)}
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {player.profileImageUrl ? (
                            <img src={player.profileImageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-primary">
                              {player.firstName?.[0]}{player.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {player.firstName} {player.lastName}
                            </p>
                            {player.jerseyNumber && (
                              <span className="text-[10px] font-bold text-muted-foreground">#{player.jerseyNumber}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{player.position}</span>
                            <span className="text-border">|</span>
                            <span>{player.nationality}</span>
                            {age && (
                              <>
                                <span className="text-border">|</span>
                                <span>{age} yrs</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {player.isPublishedToScouts && (
                            <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-500 bg-green-500/5">
                              <Eye className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          )}
                          {player.currentClubName && (
                            <span className="text-xs text-muted-foreground hidden md:block">{player.currentClubName}</span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification & Inquiries Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/30">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Verifications</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/embassy")} className="text-xs h-7 px-2">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentVerifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No pending verifications</p>
                ) : (
                  <div className="space-y-3">
                    {recentVerifications.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            v.status === "approved" ? "bg-green-500" :
                            v.status === "rejected" ? "bg-red-500" : "bg-yellow-500"
                          }`} />
                          <span className="truncate text-xs">{v.playerName || "Unknown Player"}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {v.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/30">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Scout Inquiries</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/scouting")} className="text-xs h-7 px-2">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentInquiries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No active inquiries</p>
                ) : (
                  <div className="space-y-3">
                    {recentInquiries.map((inq: any) => {
                      const player = allPlayers.find((p) => p.id === inq.playerId);
                      return (
                        <div key={inq.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {player ? `${player.firstName} ${player.lastName}` : "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{inq.buyingClubName || "Club inquiry"}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 border-blue-500/30 text-blue-400">
                            Active
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Eligibility Donut */}
          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Eligibility Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {totalEligibility > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-28 h-28 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={eligibilityDonut}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {eligibilityDonut.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {eligibilityDonut.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No eligibility data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Position Breakdown */}
          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">By Position</CardTitle>
            </CardHeader>
            <CardContent>
              {positionData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={positionData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: 11, fill: "hsl(0, 0%, 65%)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey="value" fill={CHART_COLORS.rosegold} radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Add players to see distribution</p>
              )}
            </CardContent>
          </Card>

          {/* Top Nationalities */}
          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Nationalities</CardTitle>
            </CardHeader>
            <CardContent>
              {topNationalities.length > 0 ? (
                <div className="space-y-3">
                  {topNationalities.map((nat, i) => (
                    <div key={nat.name} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Flag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{nat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(nat.count / allPlayers.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-6 text-right">{nat.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No nationality data</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start text-xs gap-2 h-9" onClick={() => navigate("/players")}>
                <Users className="h-3.5 w-3.5" /> Players
              </Button>
              <Button variant="outline" size="sm" className="justify-start text-xs gap-2 h-9" onClick={() => navigate("/videos")}>
                <Video className="h-3.5 w-3.5" /> Videos
              </Button>
              <Button variant="outline" size="sm" className="justify-start text-xs gap-2 h-9" onClick={() => navigate("/reports")}>
                <BarChart3 className="h-3.5 w-3.5" /> Reports
              </Button>
              <Button variant="outline" size="sm" className="justify-start text-xs gap-2 h-9" onClick={() => navigate("/token-bank")}>
                <Coins className="h-3.5 w-3.5" /> Tokens
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
