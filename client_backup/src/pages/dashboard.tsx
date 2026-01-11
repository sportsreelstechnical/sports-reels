import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import StatsCard from "@/components/StatsCard";
import PlayerCard from "@/components/PlayerCard";
import EmbassyVerificationTable from "@/components/EmbassyVerificationTable";
import ScoutingInquiryCard from "@/components/ScoutingInquiryCard";
import WorldMap from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileCheck, AlertTriangle, TrendingUp, Search, Plus, Bell } from "lucide-react";
import { mockPlayers, mockDashboardStats, mockEmbassyVerifications, mockScoutingInquiries } from "@/lib/mock-data";
import type { DashboardStats } from "@/lib/types";

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

export default function Dashboard() {
  const [, setLocation] = useLocation();
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

  const stats = statsData || mockDashboardStats;
  const recentPlayers = mockPlayers.slice(0, 4);
  const recentVerifications = verificationsData?.slice(0, 3) || mockEmbassyVerifications.slice(0, 3);
  const recentInquiries = inquiriesData?.slice(0, 2) || mockScoutingInquiries.slice(0, 2);

  const filteredPlayers = recentPlayers.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Player compliance and visa eligibility overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-search-dashboard"
            />
          </div>
          <Button onClick={() => setLocation("/players")} data-testid="button-add-player">
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatsCard 
              title="Total Players" 
              value={stats.totalPlayers} 
              icon={Users} 
              trend={12}
              description="In your database"
            />
            <StatsCard 
              title="Green Status" 
              value={stats.greenStatus} 
              icon={FileCheck} 
              trend={5}
              description="Visa eligible"
            />
            <StatsCard 
              title="Pending Verifications" 
              value={stats.pendingVerifications} 
              icon={AlertTriangle}
              description="Awaiting embassy"
            />
            <StatsCard 
              title="Active Inquiries" 
              value={stats.activeInquiries} 
              icon={TrendingUp} 
              trend={8}
              description="Transfer discussions"
            />
          </>
        )}
      </div>

      {/* World Map Visualization */}
      <WorldMap
        playerOrigins={mapData?.playerOrigins || []}
        transferDestinations={mapData?.transferDestinations || []}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Recent Players</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/players")} data-testid="button-view-all-players">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No players found</p>
                  <p className="text-sm">Add players to see them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onViewProfile={(id) => setLocation(`/players/${id}`)}
                      onGenerateReport={(id) => setLocation(`/reports?player=${id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Embassy Verifications
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/embassy")} data-testid="button-view-all-verifications">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentVerifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending verifications</p>
                </div>
              ) : (
                <EmbassyVerificationTable
                  verifications={recentVerifications}
                  onView={(id) => setLocation(`/embassy?id=${id}`)}
                  onApprove={(id) => console.log("Approve", id)}
                  onReject={(id) => console.log("Reject", id)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Eligibility Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Green (60%+)</span>
                  </div>
                  <span className="font-semibold">{stats.greenStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Yellow (35-59%)</span>
                  </div>
                  <span className="font-semibold">{stats.yellowStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Red (&lt;35%)</span>
                  </div>
                  <span className="font-semibold">{stats.redStatus}</span>
                </div>
              </div>
              <div className="mt-4 h-4 rounded-full overflow-hidden bg-muted flex">
                {stats.totalPlayers > 0 && (
                  <>
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(stats.greenStatus / stats.totalPlayers) * 100}%` }}
                    />
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(stats.yellowStatus / stats.totalPlayers) * 100}%` }}
                    />
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(stats.redStatus / stats.totalPlayers) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Scouting Inquiries</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/scouting")} data-testid="button-view-all-inquiries">
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentInquiries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active inquiries</p>
                </div>
              ) : (
                recentInquiries.map((inquiry) => {
                  const player = mockPlayers.find((p) => p.id === inquiry.playerId);
                  return (
                    <ScoutingInquiryCard
                      key={inquiry.id}
                      inquiry={inquiry}
                      playerName={player ? `${player.firstName} ${player.lastName}` : "Unknown"}
                      onViewDetails={(id) => setLocation(`/scouting?id=${id}`)}
                      onMessage={(id) => console.log("Message", id)}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
