import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search, User, Globe, Award, ChevronRight, Plus, Trash2, Star,
  AlertCircle, CheckCircle, Coins, SlidersHorizontal, ChevronDown,
  ChevronUp, X, TrendingUp, Eye, BarChart3, Users, Filter
} from "lucide-react";
import type { Player, EligibilityScore, ScoutShortlist } from "@shared/schema";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCheckTokens, useSpendTokens } from "@/hooks/use-tokens";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface PlayerWithScores extends Player {
  eligibilityScores: EligibilityScore[];
  hasEligibilityData: boolean;
}

interface ShortlistEntry extends ScoutShortlist {
  player: Player;
}

interface AdvancedFilters {
  nationality: string;
  position: string;
  ageMin: number;
  ageMax: number;
  eligibilityMin: number;
  eligibilityMax: number;
  capsMin: number;
  complianceStatus: string;
}

const defaultFilters: AdvancedFilters = {
  nationality: "all",
  position: "all",
  ageMin: 0,
  ageMax: 45,
  eligibilityMin: 0,
  eligibilityMax: 100,
  capsMin: 0,
  complianceStatus: "all",
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

const statusColors: Record<string, string> = {
  green: "border-green-500/30 text-green-500 bg-green-500/5",
  yellow: "border-yellow-500/30 text-yellow-500 bg-yellow-500/5",
  red: "border-red-500/30 text-red-500 bg-red-500/5",
  pending: "border-muted text-muted-foreground bg-muted/30",
};

const statusLabels: Record<string, string> = {
  green: "Eligible",
  yellow: "Conditional",
  red: "Needs Work",
  pending: "Pending",
};

const priorityConfig = {
  amber: { label: "Highest", color: "border-amber-500/30 text-amber-500 bg-amber-500/5", dotColor: "bg-amber-500", icon: Star },
  green: { label: "Medium", color: "border-green-500/30 text-green-500 bg-green-500/5", dotColor: "bg-green-500", icon: CheckCircle },
  red: { label: "Lowest", color: "border-red-500/30 text-red-500 bg-red-500/5", dotColor: "bg-red-500", icon: AlertCircle },
};

export default function ScoutDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultFilters);
  const [tokenConfirmOpen, setTokenConfirmOpen] = useState(false);
  const [pendingShortlistPlayer, setPendingShortlistPlayer] = useState<{ playerId: string; priority: string } | null>(null);
  const { toast } = useToast();
  const { balance, canAfford, getCost } = useCheckTokens();
  const spendTokensMutation = useSpendTokens();

  const { data: players = [], isLoading: playersLoading } = useQuery<PlayerWithScores[]>({
    queryKey: ["/api/scout/players"],
  });

  const { data: shortlist = [], isLoading: shortlistLoading } = useQuery<ShortlistEntry[]>({
    queryKey: ["/api/scout/shortlist"],
  });

  const addToShortlistMutation = useMutation({
    mutationFn: async (data: { playerId: string; priority: string }) => {
      const response = await apiRequest("POST", "/api/scout/shortlist", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout/shortlist"] });
      toast({ title: "Added to shortlist" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const response = await apiRequest("PATCH", `/api/scout/shortlist/${id}`, { priority });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout/shortlist"] });
      toast({ title: "Priority updated" });
    },
  });

  const removeFromShortlistMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/scout/shortlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scout/shortlist"] });
      toast({ title: "Removed from shortlist" });
    },
  });

  const shortlistPlayerIds = new Set(shortlist.map(s => s.playerId));

  const nationalities = useMemo(() =>
    Array.from(new Set(players.map(p => p.nationality))).filter(Boolean).sort(),
    [players]
  );

  const positions = useMemo(() =>
    Array.from(new Set(players.map(p => p.position))).filter(Boolean).sort(),
    [players]
  );

  const getOverallStatus = (scores: EligibilityScore[]) => {
    if (scores.length === 0) return "pending";
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    if (avgScore >= 60) return "green";
    if (avgScore >= 35) return "yellow";
    return "red";
  };

  const getAverageScore = (scores: EligibilityScore[]) => {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.nationality !== "all") count++;
    if (advancedFilters.position !== "all") count++;
    if (advancedFilters.ageMin !== 0 || advancedFilters.ageMax !== 45) count++;
    if (advancedFilters.eligibilityMin !== 0 || advancedFilters.eligibilityMax !== 100) count++;
    if (advancedFilters.capsMin !== 0) count++;
    if (advancedFilters.complianceStatus !== "all") count++;
    return count;
  }, [advancedFilters]);

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.nationality.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.currentClubName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesNationality = advancedFilters.nationality === "all" || player.nationality === advancedFilters.nationality;
      const matchesPosition = advancedFilters.position === "all" || player.position === advancedFilters.position;
      const age = calculateAge(player.dateOfBirth);
      const matchesAge = age === null || (age >= advancedFilters.ageMin && age <= advancedFilters.ageMax);
      const avgScore = getAverageScore(player.eligibilityScores);
      const matchesEligibility = avgScore >= advancedFilters.eligibilityMin && avgScore <= advancedFilters.eligibilityMax;
      const matchesCaps = (player.nationalTeamCaps || 0) >= advancedFilters.capsMin;
      const status = getOverallStatus(player.eligibilityScores);
      const matchesComplianceStatus = advancedFilters.complianceStatus === "all" || status === advancedFilters.complianceStatus;
      return matchesSearch && matchesNationality && matchesPosition && matchesAge && matchesEligibility && matchesCaps && matchesComplianceStatus;
    });
  }, [players, searchTerm, advancedFilters]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setAdvancedFilters(defaultFilters);
  };

  const groupedShortlist = {
    amber: shortlist.filter(s => s.priority === "amber"),
    green: shortlist.filter(s => s.priority === "green"),
    red: shortlist.filter(s => s.priority === "red"),
  };

  const handleShortlistClick = (playerId: string, priority: string = "green") => {
    if (!canAfford("shortlist")) {
      toast({
        title: "Insufficient Tokens",
        description: `You need ${getCost("shortlist")} token to add to shortlist. Current balance: ${balance}`,
        variant: "destructive",
      });
      return;
    }
    setPendingShortlistPlayer({ playerId, priority });
    setTokenConfirmOpen(true);
  };

  const confirmShortlistWithTokens = async () => {
    if (!pendingShortlistPlayer) return;
    try {
      await spendTokensMutation.mutateAsync({ action: "shortlist", playerId: pendingShortlistPlayer.playerId });
      await addToShortlistMutation.mutateAsync(pendingShortlistPlayer);
    } catch (error) {
      console.error("Error shortlisting player:", error);
    }
    setTokenConfirmOpen(false);
    setPendingShortlistPlayer(null);
  };

  // Stats
  const statusCounts = {
    green: players.filter(p => getOverallStatus(p.eligibilityScores) === "green").length,
    yellow: players.filter(p => getOverallStatus(p.eligibilityScores) === "yellow").length,
    red: players.filter(p => getOverallStatus(p.eligibilityScores) === "red").length,
  };

  if (playersLoading || shortlistLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Scout Network</p>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Player Discovery</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-card border border-border/30">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{players.length}</span>
              <span className="text-muted-foreground text-xs">available</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold tabular-nums">{shortlist.length}</span>
              <span className="text-muted-foreground text-xs">shortlisted</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold tabular-nums">{balance ?? 0}</span>
              <span className="text-muted-foreground text-xs">tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/30 border-l-2 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{statusCounts.green}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eligible</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30 border-l-2 border-l-yellow-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{statusCounts.yellow}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conditional</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30 border-l-2 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingUp className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{statusCounts.red}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Needs Work</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="players" className="space-y-4">
        <TabsList className="bg-card border border-border/30">
          <TabsTrigger value="players" data-testid="tab-players" className="gap-2">
            <Eye className="h-3.5 w-3.5" />
            All Players
            <Badge variant="secondary" className="text-[10px] ml-1">{players.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="shortlist" data-testid="tab-shortlist" className="gap-2">
            <Star className="h-3.5 w-3.5" />
            My Shortlist
            {shortlist.length > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">{shortlist.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          {/* Search + Filter Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, nationality, position, club..."
                className="pl-10 bg-card border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-players"
              />
            </div>
            <Button
              variant={isAdvancedOpen ? "secondary" : "outline"}
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="gap-2 shrink-0"
              data-testid="button-advanced-filters"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="destructive" className="text-[10px] ml-1">{activeFilterCount}</Badge>
              )}
              {isAdvancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleContent>
              <Card className="border-border/30 mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Advanced Filters</CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7 gap-1" data-testid="button-clear-filters">
                      <X className="h-3 w-3" /> Clear All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs">Position</Label>
                      <Select value={advancedFilters.position} onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, position: v }))}>
                        <SelectTrigger data-testid="filter-position" className="bg-card"><SelectValue placeholder="All positions" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Positions</SelectItem>
                          {positions.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Nationality</Label>
                      <Select value={advancedFilters.nationality} onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, nationality: v }))}>
                        <SelectTrigger data-testid="filter-nationality" className="bg-card"><SelectValue placeholder="All nationalities" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Nationalities</SelectItem>
                          {nationalities.map(nat => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Compliance Status</Label>
                      <Select value={advancedFilters.complianceStatus} onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, complianceStatus: v }))}>
                        <SelectTrigger data-testid="filter-compliance" className="bg-card"><SelectValue placeholder="All statuses" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="green">Eligible</SelectItem>
                          <SelectItem value="yellow">Conditional</SelectItem>
                          <SelectItem value="red">Needs Work</SelectItem>
                          <SelectItem value="pending">Pending Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Age Range</Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{advancedFilters.ageMin} – {advancedFilters.ageMax} yrs</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input type="number" value={advancedFilters.ageMin} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, ageMin: Math.max(0, Math.min(parseInt(e.target.value) || 0, prev.ageMax)) }))} min={0} max={45} className="w-20 bg-card" data-testid="filter-age-min" />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input type="number" value={advancedFilters.ageMax} onChange={(e) => setAdvancedFilters(prev => ({ ...prev, ageMax: Math.max(prev.ageMin, Math.min(parseInt(e.target.value) || 45, 45)) }))} min={15} max={45} className="w-20 bg-card" data-testid="filter-age-max" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Eligibility Score</Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{advancedFilters.eligibilityMin}% – {advancedFilters.eligibilityMax}%</span>
                      </div>
                      <Slider value={[advancedFilters.eligibilityMin, advancedFilters.eligibilityMax]} onValueChange={([min, max]) => setAdvancedFilters(prev => ({ ...prev, eligibilityMin: min, eligibilityMax: max }))} min={0} max={100} step={5} data-testid="filter-eligibility-slider" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Min. International Caps</Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{advancedFilters.capsMin}+</span>
                      </div>
                      <Slider value={[advancedFilters.capsMin]} onValueChange={([val]) => setAdvancedFilters(prev => ({ ...prev, capsMin: val }))} min={0} max={50} step={1} data-testid="filter-caps-slider" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Active Filter Badges */}
          {(searchTerm || activeFilterCount > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  "{searchTerm}" <button onClick={() => setSearchTerm("")}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {advancedFilters.position !== "all" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {advancedFilters.position} <button onClick={() => setAdvancedFilters(prev => ({ ...prev, position: "all" }))}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {advancedFilters.nationality !== "all" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {advancedFilters.nationality} <button onClick={() => setAdvancedFilters(prev => ({ ...prev, nationality: "all" }))}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {advancedFilters.complianceStatus !== "all" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {advancedFilters.complianceStatus} <button onClick={() => setAdvancedFilters(prev => ({ ...prev, complianceStatus: "all" }))}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {(advancedFilters.ageMin !== 0 || advancedFilters.ageMax !== 45) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Age: {advancedFilters.ageMin}-{advancedFilters.ageMax} <button onClick={() => setAdvancedFilters(prev => ({ ...prev, ageMin: 0, ageMax: 45 }))}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {(advancedFilters.eligibilityMin !== 0 || advancedFilters.eligibilityMax !== 100) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Score: {advancedFilters.eligibilityMin}-{advancedFilters.eligibilityMax}% <button onClick={() => setAdvancedFilters(prev => ({ ...prev, eligibilityMin: 0, eligibilityMax: 100 }))}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {advancedFilters.capsMin > 0 && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Caps: {advancedFilters.capsMin}+ <button onClick={() => setAdvancedFilters(prev => ({ ...prev, capsMin: 0 }))}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
                {filteredPlayers.length} of {players.length}
              </span>
            </div>
          )}

          {/* Player Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => {
              const status = getOverallStatus(player.eligibilityScores);
              const avgScore = Math.round(getAverageScore(player.eligibilityScores));
              const topScore = player.eligibilityScores.length > 0 ? Math.round(Math.max(...player.eligibilityScores.map(s => s.score))) : null;
              const isInShortlist = shortlistPlayerIds.has(player.id);
              const age = calculateAge(player.dateOfBirth);

              return (
                <Card key={player.id} className="border-border/30 hover:border-primary/20 transition-all group" data-testid={`card-player-${player.id}`}>
                  <CardContent className="p-4">
                    {/* Player Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {player.profileImageUrl ? (
                          <img src={player.profileImageUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-primary">
                            {player.firstName?.[0]}{player.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{player.firstName} {player.lastName}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{player.position}</span>
                          {age && (
                            <>
                              <span className="text-border">·</span>
                              <span>{age} yrs</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[status]}`}>
                        {statusLabels[status]}
                      </Badge>
                    </div>

                    {/* Player Details */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{player.nationality}</span>
                      </div>
                      {player.currentClubName && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{player.currentClubName}</span>
                        </div>
                      )}
                      {player.nationalTeamCaps && player.nationalTeamCaps > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Award className="h-3.5 w-3.5 shrink-0" />
                          <span>{player.nationalTeamCaps} caps</span>
                        </div>
                      )}
                    </div>

                    {/* Eligibility Bar */}
                    {topScore !== null && (
                      <div className="mb-3 p-2.5 rounded-md bg-muted/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg. Eligibility</span>
                          <span className="text-xs font-bold tabular-nums">{avgScore}%</span>
                        </div>
                        <Progress value={avgScore} className="h-1.5" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link to={`/dashboard/scout/player/${player.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1" data-testid={`button-view-player-${player.id}`}>
                          View Profile <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      {!isInShortlist ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleShortlistClick(player.id, "green")}
                          disabled={addToShortlistMutation.isPending || spendTokensMutation.isPending}
                          className="text-xs gap-1 shrink-0"
                          data-testid={`button-add-shortlist-${player.id}`}
                        >
                          <Plus className="h-3 w-3" />
                          <Coins className="h-3 w-3" /> 1
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 shrink-0">
                          <Star className="h-3 w-3 mr-1" /> Listed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPlayers.length === 0 && (
            <Card className="border-border/30">
              <CardContent className="py-16 text-center">
                <User className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                {searchTerm || activeFilterCount > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">No players match your filters</p>
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">Clear all filters</Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">No published players available</p>
                    <p className="text-xs text-muted-foreground mt-1">Clubs publish player profiles to make them visible on the scout network.</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shortlist" className="space-y-6">
          {shortlist.length === 0 ? (
            <Card className="border-border/30">
              <CardContent className="py-16 text-center">
                <Star className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Your shortlist is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Add players from the All Players tab to start tracking them.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(priorityConfig).map(([priority, config]) => {
              const priorityShortlist = groupedShortlist[priority as keyof typeof groupedShortlist];
              if (priorityShortlist.length === 0) return null;
              const Icon = config.icon;

              return (
                <div key={priority} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                    <h3 className="text-sm font-semibold">{config.label} Priority</h3>
                    <Badge variant="secondary" className="text-[10px]">{priorityShortlist.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {priorityShortlist.map((entry) => (
                      <Card key={entry.id} className="border-border/30 hover:border-primary/20 transition-all" data-testid={`card-shortlist-${entry.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {entry.player.firstName?.[0]}{entry.player.lastName?.[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{entry.player.firstName} {entry.player.lastName}</p>
                              <p className="text-xs text-muted-foreground">{entry.player.position}</p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Globe className="h-3.5 w-3.5" />
                            <span>{entry.player.nationality}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link to={`/dashboard/scout/player/${entry.playerId}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full text-xs gap-1" data-testid={`button-view-shortlist-${entry.id}`}>
                                Profile <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                            <Select value={entry.priority} onValueChange={(value) => updatePriorityMutation.mutate({ id: entry.id, priority: value })}>
                              <SelectTrigger className="w-24 h-8 text-xs" data-testid={`select-priority-${entry.id}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amber">Highest</SelectItem>
                                <SelectItem value="green">Medium</SelectItem>
                                <SelectItem value="red">Lowest</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromShortlistMutation.mutate(entry.id)} data-testid={`button-remove-shortlist-${entry.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={tokenConfirmOpen} onOpenChange={setTokenConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Confirm Token Spend
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adding this player to your shortlist will cost 1 token. Your current balance is {balance} tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmShortlistWithTokens}>Spend 1 Token</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
