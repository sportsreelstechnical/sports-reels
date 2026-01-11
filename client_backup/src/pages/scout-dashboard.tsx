import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, User, Globe, Award, ChevronRight, Plus, Trash2, Star, AlertCircle, CheckCircle, Coins, SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Player, EligibilityScore, ScoutShortlist } from "@shared/schema";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCheckTokens, useSpendTokens } from "@/hooks/use-tokens";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  ageMin: 15,
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
  return age;
}

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
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    if (advancedFilters.ageMin !== 15 || advancedFilters.ageMax !== 45) count++;
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

      const matchesNationality = advancedFilters.nationality === "all" || 
        player.nationality === advancedFilters.nationality;

      const matchesPosition = advancedFilters.position === "all" || 
        player.position === advancedFilters.position;

      const age = calculateAge(player.dateOfBirth);
      const matchesAge = age === null || 
        (age >= advancedFilters.ageMin && age <= advancedFilters.ageMax);

      const avgScore = getAverageScore(player.eligibilityScores);
      const matchesEligibility = 
        avgScore >= advancedFilters.eligibilityMin &&
        avgScore <= advancedFilters.eligibilityMax;

      const matchesCaps = (player.nationalTeamCaps || 0) >= advancedFilters.capsMin;

      const status = getOverallStatus(player.eligibilityScores);
      const matchesComplianceStatus = advancedFilters.complianceStatus === "all" || 
        status === advancedFilters.complianceStatus;

      return matchesSearch && matchesNationality && matchesPosition && 
             matchesAge && matchesEligibility && matchesCaps && matchesComplianceStatus;
    });
  }, [players, searchTerm, advancedFilters]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setAdvancedFilters(defaultFilters);
  };

  const statusColors = {
    green: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800",
    yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-800",
    red: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800",
    pending: "bg-muted text-muted-foreground",
  };

  const priorityConfig = {
    amber: { label: "Highest", color: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800", icon: Star },
    green: { label: "Medium", color: "bg-green-500/10 text-green-600 border-green-200 dark:border-green-800", icon: CheckCircle },
    red: { label: "Lowest", color: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800", icon: AlertCircle },
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
      await spendTokensMutation.mutateAsync({
        action: "shortlist",
        playerId: pendingShortlistPlayer.playerId,
      });
      await addToShortlistMutation.mutateAsync(pendingShortlistPlayer);
    } catch (error) {
    }
    setTokenConfirmOpen(false);
    setPendingShortlistPlayer(null);
  };

  if (playersLoading || shortlistLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Scout Dashboard</h1>
          <p className="text-muted-foreground">Discover players and manage your shortlist</p>
        </div>
      </div>

      <Tabs defaultValue="players" className="space-y-4">
        <TabsList>
          <TabsTrigger value="players" data-testid="tab-players">All Players</TabsTrigger>
          <TabsTrigger value="shortlist" data-testid="tab-shortlist">
            My Shortlist
            {shortlist.length > 0 && (
              <Badge variant="secondary" className="ml-2">{shortlist.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, nationality, position, club..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-players"
              />
            </div>
            <Button
              variant={isAdvancedOpen ? "secondary" : "outline"}
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              data-testid="button-advanced-filters"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
              )}
              {isAdvancedOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleContent>
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base">Advanced Filters</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAllFilters}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select 
                        value={advancedFilters.position} 
                        onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, position: v }))}
                      >
                        <SelectTrigger data-testid="filter-position">
                          <SelectValue placeholder="All positions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Positions</SelectItem>
                          {positions.map(pos => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nationality</Label>
                      <Select 
                        value={advancedFilters.nationality} 
                        onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, nationality: v }))}
                      >
                        <SelectTrigger data-testid="filter-nationality">
                          <SelectValue placeholder="All nationalities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Nationalities</SelectItem>
                          {nationalities.map(nat => (
                            <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Compliance Status</Label>
                      <Select 
                        value={advancedFilters.complianceStatus} 
                        onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, complianceStatus: v }))}
                      >
                        <SelectTrigger data-testid="filter-compliance">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="green">Green (Eligible)</SelectItem>
                          <SelectItem value="yellow">Yellow (Conditional)</SelectItem>
                          <SelectItem value="red">Red (Needs Work)</SelectItem>
                          <SelectItem value="pending">Pending Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Age Range</Label>
                        <span className="text-sm text-muted-foreground">
                          {advancedFilters.ageMin} - {advancedFilters.ageMax} years
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={advancedFilters.ageMin}
                          onChange={(e) => setAdvancedFilters(prev => ({ 
                            ...prev, 
                            ageMin: Math.max(15, Math.min(parseInt(e.target.value) || 15, prev.ageMax))
                          }))}
                          min={15}
                          max={45}
                          className="w-20"
                          data-testid="filter-age-min"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="number"
                          value={advancedFilters.ageMax}
                          onChange={(e) => setAdvancedFilters(prev => ({ 
                            ...prev, 
                            ageMax: Math.max(prev.ageMin, Math.min(parseInt(e.target.value) || 45, 45))
                          }))}
                          min={15}
                          max={45}
                          className="w-20"
                          data-testid="filter-age-max"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Eligibility Score</Label>
                        <span className="text-sm text-muted-foreground">
                          {advancedFilters.eligibilityMin}% - {advancedFilters.eligibilityMax}%
                        </span>
                      </div>
                      <Slider
                        value={[advancedFilters.eligibilityMin, advancedFilters.eligibilityMax]}
                        onValueChange={([min, max]) => setAdvancedFilters(prev => ({ 
                          ...prev, 
                          eligibilityMin: min,
                          eligibilityMax: max
                        }))}
                        min={0}
                        max={100}
                        step={5}
                        data-testid="filter-eligibility-slider"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Min. International Caps</Label>
                        <span className="text-sm text-muted-foreground">
                          {advancedFilters.capsMin}+
                        </span>
                      </div>
                      <Slider
                        value={[advancedFilters.capsMin]}
                        onValueChange={([val]) => setAdvancedFilters(prev => ({ ...prev, capsMin: val }))}
                        min={0}
                        max={50}
                        step={1}
                        data-testid="filter-caps-slider"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {(searchTerm || activeFilterCount > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {advancedFilters.position !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {advancedFilters.position}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, position: "all" }))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {advancedFilters.nationality !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {advancedFilters.nationality}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, nationality: "all" }))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {advancedFilters.complianceStatus !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {advancedFilters.complianceStatus}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, complianceStatus: "all" }))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(advancedFilters.ageMin !== 15 || advancedFilters.ageMax !== 45) && (
                <Badge variant="secondary" className="gap-1">
                  Age: {advancedFilters.ageMin}-{advancedFilters.ageMax}
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, ageMin: 15, ageMax: 45 }))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(advancedFilters.eligibilityMin !== 0 || advancedFilters.eligibilityMax !== 100) && (
                <Badge variant="secondary" className="gap-1">
                  Eligibility: {advancedFilters.eligibilityMin}-{advancedFilters.eligibilityMax}%
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, eligibilityMin: 0, eligibilityMax: 100 }))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {advancedFilters.capsMin > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Caps: {advancedFilters.capsMin}+
                  <button onClick={() => setAdvancedFilters(prev => ({ ...prev, capsMin: 0 }))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <span className="text-sm text-muted-foreground ml-2">
                {filteredPlayers.length} of {players.length} players
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => {
              const status = getOverallStatus(player.eligibilityScores);
              const topScore = player.eligibilityScores.length > 0
                ? Math.max(...player.eligibilityScores.map(s => s.score))
                : null;
              const isInShortlist = shortlistPlayerIds.has(player.id);
              const age = calculateAge(player.dateOfBirth);

              return (
                <Card key={player.id} className="hover-elevate" data-testid={`card-player-${player.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {player.firstName} {player.lastName}
                          </CardTitle>
                          <CardDescription>{player.position}</CardDescription>
                        </div>
                      </div>
                      <Badge className={statusColors[status]} variant="outline">
                        {status === "pending" ? "No Data" : status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span>{player.nationality}</span>
                      {age && <span className="text-xs">({age} yrs)</span>}
                    </div>
                    {player.currentClubName && (
                      <div className="text-sm text-muted-foreground">
                        {player.currentClubName}
                      </div>
                    )}
                    {player.nationalTeamCaps && player.nationalTeamCaps > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span>{player.nationalTeamCaps} international caps</span>
                      </div>
                    )}
                    {topScore !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Top Eligibility:</span>
                        <span className="font-medium">{topScore.toFixed(0)}%</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Link href={`/scout/player/${player.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-player-${player.id}`}>
                          View Profile
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                      {!isInShortlist && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleShortlistClick(player.id, "green")}
                          disabled={addToShortlistMutation.isPending || spendTokensMutation.isPending}
                          data-testid={`button-add-shortlist-${player.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          <Coins className="h-3 w-3 mr-1" />
                          1 Token
                        </Button>
                      )}
                      {isInShortlist && (
                        <Badge variant="outline" className="bg-primary/10">In Shortlist</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPlayers.length === 0 && !playersLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {searchTerm || activeFilterCount > 0 ? (
                  <>
                    <p className="text-muted-foreground">No players found matching your filters.</p>
                    <Button variant="ghost" onClick={clearAllFilters} className="mt-2">
                      Clear all filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No published players available.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Clubs publish player profiles to make them visible on the scout network.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shortlist" className="space-y-6">
          {shortlist.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Your shortlist is empty.</p>
                <p className="text-sm text-muted-foreground mt-2">Add players from the All Players tab to start tracking them.</p>
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
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold">{config.label} Priority</h3>
                    <Badge variant="secondary">{priorityShortlist.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {priorityShortlist.map((entry) => (
                      <Card key={entry.id} className="hover-elevate" data-testid={`card-shortlist-${entry.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {entry.player.firstName} {entry.player.lastName}
                                </CardTitle>
                                <CardDescription>{entry.player.position}</CardDescription>
                              </div>
                            </div>
                            <Badge className={config.color} variant="outline">
                              {config.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            <span>{entry.player.nationality}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Link href={`/scout/player/${entry.playerId}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-shortlist-${entry.id}`}>
                                View Profile
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                            <Select
                              value={entry.priority}
                              onValueChange={(value) => updatePriorityMutation.mutate({ id: entry.id, priority: value })}
                            >
                              <SelectTrigger className="w-[120px]" data-testid={`select-priority-${entry.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amber">Highest</SelectItem>
                                <SelectItem value="green">Medium</SelectItem>
                                <SelectItem value="red">Lowest</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromShortlistMutation.mutate(entry.id)}
                              data-testid={`button-remove-shortlist-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
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
              Adding this player to your shortlist will cost 1 token. 
              Your current balance is {balance} tokens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmShortlistWithTokens}>
              Spend 1 Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
