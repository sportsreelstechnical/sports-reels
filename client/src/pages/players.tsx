import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PlayerCard from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Plus, Filter, Grid, List, User, ChevronDown, ChevronUp, X, SlidersHorizontal } from "lucide-react";
import { mockPlayers } from "@/lib/mock-data";
import { getVisaStatus } from "@/components/StatusBadge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@/lib/types";

const playerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  nationality: z.string().min(1, "Nationality is required"),
  dateOfBirth: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  currentClubId: z.string().optional(),
  nationalTeamCaps: z.coerce.number().min(0).default(0),
  internationalCaps: z.coerce.number().min(0).default(0),
  continentalGames: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  preferredFoot: z.string().optional(),
});

type PlayerFormData = z.infer<typeof playerFormSchema>;

interface AdvancedFilters {
  nationality: string;
  position: string;
  ageMin: number;
  ageMax: number;
  eligibilityMin: number;
  eligibilityMax: number;
  capsMin: number;
  preferredFoot: string;
}

const defaultFilters: AdvancedFilters = {
  nationality: "all",
  position: "all",
  ageMin: 15,
  ageMax: 45,
  eligibilityMin: 0,
  eligibilityMax: 100,
  capsMin: 0,
  preferredFoot: "all",
};

function calculateAge(dateOfBirth: string | null | undefined): number | null {
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

export default function Players() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultFilters);
  const { toast } = useToast();

  const { data: apiPlayers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/players"],
  });

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nationality: "",
      position: "",
      nationalTeamCaps: 0,
      internationalCaps: 0,
      continentalGames: 0,
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (data: PlayerFormData) => {
      return apiRequest("POST", "/api/players", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Player added",
        description: "The player has been added to your database.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add player",
        variant: "destructive",
      });
    },
  });

  const players = (apiPlayers && apiPlayers.length > 0) 
    ? apiPlayers.map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        nationality: p.nationality,
        dateOfBirth: p.dateOfBirth,
        position: p.position,
        currentClub: p.currentClubId || "Unknown Club",
        currentLeague: "Unknown League",
        leagueBand: 5 as const,
        leaguePosition: 0,
        nationalTeamCaps: p.nationalTeamCaps || 0,
        internationalCaps: p.internationalCaps || 0,
        continentalGames: p.continentalGames || 0,
        currentSeasonMinutes: 0,
        totalCareerMinutes: 0,
        height: p.height,
        weight: p.weight,
        preferredFoot: p.preferredFoot,
        medicalDataAvailable: false,
        gpsDataAvailable: false,
        schengenScore: 50,
        ukGbeScore: 50,
        usP1Score: 50,
        usO1Score: 50,
        middleEastScore: 50,
        asiaScore: 50,
        fifaTransferScore: 50,
        overallEligibilityScore: 50,
        lastUpdated: p.updatedAt || new Date().toISOString(),
      }))
    : mockPlayers;

  const nationalities = useMemo(() => 
    Array.from(new Set(players.map((p: Player) => p.nationality))).filter(Boolean).sort(),
    [players]
  );

  const positions = useMemo(() => 
    Array.from(new Set(players.map((p: Player) => p.position))).filter(Boolean).sort(),
    [players]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.nationality !== "all") count++;
    if (advancedFilters.position !== "all") count++;
    if (advancedFilters.ageMin !== 15 || advancedFilters.ageMax !== 45) count++;
    if (advancedFilters.eligibilityMin !== 0 || advancedFilters.eligibilityMax !== 100) count++;
    if (advancedFilters.capsMin !== 0) count++;
    if (advancedFilters.preferredFoot !== "all") count++;
    return count;
  }, [advancedFilters]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player: Player) => {
      const matchesSearch =
        player.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.currentClub.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.nationality.toLowerCase().includes(searchQuery.toLowerCase());

      const status = getVisaStatus(player.overallEligibilityScore);
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      const matchesNationality = advancedFilters.nationality === "all" || 
        player.nationality === advancedFilters.nationality;

      const matchesPosition = advancedFilters.position === "all" || 
        player.position === advancedFilters.position;

      const age = calculateAge(player.dateOfBirth);
      const matchesAge = age === null || 
        (age >= advancedFilters.ageMin && age <= advancedFilters.ageMax);

      const matchesEligibility = 
        player.overallEligibilityScore >= advancedFilters.eligibilityMin &&
        player.overallEligibilityScore <= advancedFilters.eligibilityMax;

      const matchesCaps = player.nationalTeamCaps >= advancedFilters.capsMin;

      const matchesFoot = advancedFilters.preferredFoot === "all" || 
        player.preferredFoot === advancedFilters.preferredFoot;

      return matchesSearch && matchesStatus && matchesNationality && 
             matchesPosition && matchesAge && matchesEligibility && 
             matchesCaps && matchesFoot;
    });
  }, [players, searchQuery, statusFilter, advancedFilters]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAdvancedFilters(defaultFilters);
  };

  const onSubmit = (data: PlayerFormData) => {
    createPlayerMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-players">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Players</h1>
          <p className="text-muted-foreground">Manage player profiles and compliance data</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-player">
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Add New Player
              </DialogTitle>
              <DialogDescription>
                Enter the player's basic information. You can add more details later.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Emmanuel" data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Okonkwo" data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationality</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nigeria" data-testid="input-nationality" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-position">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Defender">Defender</SelectItem>
                            <SelectItem value="Midfielder">Midfielder</SelectItem>
                            <SelectItem value="Winger">Winger</SelectItem>
                            <SelectItem value="Striker">Striker</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-dob" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="nationalTeamCaps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National Caps</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-nat-caps" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internationalCaps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Int'l Caps</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-intl-caps" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="continentalGames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Continental</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-continental" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preferredFoot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Foot</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-foot">
                            <SelectValue placeholder="Select foot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Right">Right</SelectItem>
                          <SelectItem value="Left">Left</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-height" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-weight" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPlayerMutation.isPending} data-testid="button-submit-player">
                    {createPlayerMutation.isPending ? "Adding..." : "Add Player"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, club, nationality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-players"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="green">Green (Eligible)</SelectItem>
            <SelectItem value="yellow">Yellow (Conditional)</SelectItem>
            <SelectItem value="red">Red (Ineligible)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={isAdvancedOpen ? "secondary" : "outline"}
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          data-testid="button-advanced-filters"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Advanced
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
          )}
          {isAdvancedOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
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
                  <Label>Preferred Foot</Label>
                  <Select 
                    value={advancedFilters.preferredFoot} 
                    onValueChange={(v) => setAdvancedFilters(prev => ({ ...prev, preferredFoot: v }))}
                  >
                    <SelectTrigger data-testid="filter-foot">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Right">Right</SelectItem>
                      <SelectItem value="Left">Left</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
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
                    <Label>Min. National Caps</Label>
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

      {(searchQuery || statusFilter !== "all" || activeFilterCount > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchQuery}"
              <button onClick={() => setSearchQuery("")} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter("all")} className="ml-1">
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
          {advancedFilters.position !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {advancedFilters.position}
              <button onClick={() => setAdvancedFilters(prev => ({ ...prev, position: "all" }))} className="ml-1">
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
          {advancedFilters.preferredFoot !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {advancedFilters.preferredFoot} foot
              <button onClick={() => setAdvancedFilters(prev => ({ ...prev, preferredFoot: "all" }))} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <span className="text-sm text-muted-foreground ml-2">
            {filteredPlayers.length} of {players.length} players
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All ({filteredPlayers.length})</TabsTrigger>
            <TabsTrigger value="green" data-testid="tab-green">
              Green ({filteredPlayers.filter((p: Player) => getVisaStatus(p.overallEligibilityScore) === "green").length})
            </TabsTrigger>
            <TabsTrigger value="yellow" data-testid="tab-yellow">
              Yellow ({filteredPlayers.filter((p: Player) => getVisaStatus(p.overallEligibilityScore) === "yellow").length})
            </TabsTrigger>
            <TabsTrigger value="red" data-testid="tab-red">
              Red ({filteredPlayers.filter((p: Player) => getVisaStatus(p.overallEligibilityScore) === "red").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "space-y-4"
            }>
              {filteredPlayers.map((player: Player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onViewProfile={(id) => setLocation(`/players/${id}`)}
                  onGenerateReport={(id) => setLocation(`/reports?player=${id}`)}
                />
              ))}
            </div>
            {filteredPlayers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No players found matching your criteria.</p>
                <p className="text-sm mt-2">Try adjusting your filters or add a new player.</p>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" onClick={clearAllFilters} className="mt-2">
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {["green", "yellow", "red"].map((status) => (
            <TabsContent key={status} value={status} className="mt-6">
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-4"
              }>
                {filteredPlayers
                  .filter((p: Player) => getVisaStatus(p.overallEligibilityScore) === status)
                  .map((player: Player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onViewProfile={(id) => setLocation(`/players/${id}`)}
                      onGenerateReport={(id) => setLocation(`/reports?player=${id}`)}
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
