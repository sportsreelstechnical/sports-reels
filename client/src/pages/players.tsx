import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  Search, Plus, Filter, Grid, List, User, ChevronDown, ChevronUp, X, SlidersHorizontal,
  Eye, Share2, Link2, Copy, ExternalLink, Coins, CheckCircle, Video, Upload
} from "lucide-react";

import { getVisaStatus } from "@/components/StatusBadge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCheckTokens } from "@/hooks/use-tokens";
import { useAuth } from "@/contexts/AuthContext";
import type { Player as SchemaPlayer, PlayerShareLink } from "@shared/schema";
import type { Player as DomainPlayer, LeagueBand } from "@/lib/types";


// Roles that can add/manage players (team-side roles)
const TEAM_ROLES = ['sporting_director', 'coach', 'admin', 'legal'] as const;
type TeamRole = typeof TEAM_ROLES[number];

function canManagePlayers(role: string | undefined): boolean {
  if (!role) return false;
  return TEAM_ROLES.includes(role as TeamRole);
}



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

const DEFAULT_FILTERS: AdvancedFilters = {
  nationality: "all",
  position: "all",
  ageMin: 15,
  ageMax: 45,
  eligibilityMin: 0,
  eligibilityMax: 100,
  capsMin: 0,
  preferredFoot: "all",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  // Check for invalid date
  if (isNaN(birthDate.getTime())) return null;

  // Check for future dates (invalid birth date)
  if (birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Return null for negative or unreasonable ages
  if (age < 0 || age > 100) return null;

  return age;
}

// Transform API player data to view model - DRY principle
function transformPlayerToViewModel(player: SchemaPlayer): DomainPlayer {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth || "",
    position: player.position,
    currentClub: player.currentClubName || player.currentClubId || "Unknown Club",
    currentLeague: "Unknown League",
    leagueBand: 5 as LeagueBand,
    leaguePosition: 0,
    nationalTeamCaps: player.nationalTeamCaps || 0,
    internationalCaps: player.internationalCaps || 0,
    continentalGames: player.continentalGames || 0,
    currentSeasonMinutes: 0,
    totalCareerMinutes: 0,
    height: player.height ?? undefined,
    weight: player.weight ?? undefined,
    preferredFoot: player.preferredFoot ?? undefined,
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
    lastUpdated: player.updatedAt ? new Date(player.updatedAt).toISOString() : new Date().toISOString(),
    // Scout network fields
    isPublishedToScouts: player.isPublishedToScouts || false,
    publishExpiresAt: player.publishExpiresAt ? new Date(player.publishExpiresAt).toISOString() : undefined,
  };
}

// ============================================================================
// SCOUT NETWORK ACTION DIALOGS - Reusable Components (DRY)
// ============================================================================

interface ScoutNetworkDialogProps {
  player: DomainPlayer & { isPublishedToScouts?: boolean; publishExpiresAt?: string };
  isOpen: boolean;
  onClose: () => void;
  balance: number | undefined;
}

function PublishToScoutsDialog({ player, isOpen, onClose, balance }: ScoutNetworkDialogProps) {
  const { toast } = useToast();

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const res = await apiRequest("POST", `/api/players/${player.id}/publish`, { publish });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      toast({
        title: data.published ? "Player Published" : "Player Unpublished",
        description: data.published
          ? `Profile visible to scouts for 30 days. ${data.tokensSpent} tokens spent.`
          : "Profile removed from scout network."
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isPublished = player.isPublishedToScouts;
  const cost = 4;
  const canAfford = (balance ?? 0) >= cost;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {isPublished ? "Manage Scout Visibility" : "Publish to Scout Network"}
          </DialogTitle>
          <DialogDescription>
            {isPublished
              ? `${player.firstName} ${player.lastName} is currently visible to scouts.`
              : `Make ${player.firstName} ${player.lastName} visible to scouts worldwide.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isPublished ? (
            <div className="p-4 bg-green-500/10 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Currently Published</span>
              </div>
              {player.publishExpiresAt && (
                <p className="text-sm text-muted-foreground">
                  Visible until {new Date(player.publishExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Publishing makes this player visible to scouts for 30 days.
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Coins className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Cost: <span className="font-bold">{cost} tokens</span></span>
              </div>
              {!canAfford && (
                <p className="text-sm text-destructive">
                  Insufficient tokens. You need {cost} tokens but have {balance ?? 0}.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => publishMutation.mutate(!isPublished)}
            disabled={publishMutation.isPending || (!isPublished && !canAfford)}
            variant={isPublished ? "destructive" : "default"}
          >
            {publishMutation.isPending ? "Processing..." : (isPublished ? "Unpublish" : "Publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ShareLinkDialogProps {
  player: DomainPlayer;
  isOpen: boolean;
  onClose: () => void;
  balance: number | undefined;
}

function ShareLinkDialog({ player, isOpen, onClose, balance }: ShareLinkDialogProps) {
  const { toast } = useToast();

  const { data: shareLinks = [] } = useQuery<PlayerShareLink[]>({
    queryKey: ["/api/players", player.id, "share-links"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${player.id}/share-links`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/players/${player.id}/share`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", player.id, "share-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Share Link Created",
        description: `Link copied to clipboard. ${data.tokensSpent} tokens spent.`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cost = 10;
  const canAfford = (balance ?? 0) >= cost;

  const copyLink = useCallback((token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/shared/player/${token}`);
    toast({ title: "Link Copied", description: "Share link copied to clipboard." });
  }, [toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Create Shareable Link
          </DialogTitle>
          <DialogDescription>
            Generate a unique link to share {player.firstName} {player.lastName}'s profile externally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Coins className="h-5 w-5 text-amber-500" />
              <span className="text-sm">Cost: <span className="font-bold">{cost} tokens per link</span></span>
            </div>
            {!canAfford && (
              <p className="text-sm text-destructive">
                Insufficient tokens. You need {cost} tokens but have {balance ?? 0}.
              </p>
            )}
          </div>

          {shareLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Active Share Links</p>
              {shareLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
                  <div className="flex-1 min-w-0">
                    <code className="text-xs truncate block">/shared/player/{link.shareToken}</code>
                    <p className="text-xs text-muted-foreground">
                      {link.viewCount} views | Expires {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(link.shareToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/shared/player/${link.shareToken}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending || !canAfford}
          >
            <Link2 className="h-4 w-4 mr-2" />
            {shareMutation.isPending ? "Creating..." : "Create New Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// VIDEO UPLOAD DIALOG
// ============================================================================

interface VideoUploadDialogProps {
  player: DomainPlayer;
  isOpen: boolean;
  onClose: () => void;
}

function VideoUploadDialog({ player, isOpen, onClose }: VideoUploadDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload Video for {player.firstName}
          </DialogTitle>
          <DialogDescription>
            Upload match videos or highlights for this player.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Video uploads for individual players are managed through the Video Management section.
            You can tag this player in any uploaded video.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                navigate(`/videos?upload=true&playerId=${player.id}`);
                onClose();
              }}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Go to Video Management
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigate(`/players/${player.id}`);
                onClose();
              }}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Player Profile
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ENHANCED PLAYER CARD WITH ACTIONS
// ============================================================================

interface EnhancedPlayerCardProps {
  player: DomainPlayer & { isPublishedToScouts?: boolean; publishExpiresAt?: string };
  onViewProfile: (id: string) => void;
  onGenerateReport: (id: string) => void;
  balance: number | undefined;
}

function EnhancedPlayerCard({ player, onViewProfile, onGenerateReport, balance }: EnhancedPlayerCardProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-player-${player.id}`}>
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {player.firstName[0]}{player.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{player.firstName} {player.lastName}</h3>
                {player.isPublishedToScouts && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Published
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{player.position}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              {player.nationality}
            </div>
            <div className="text-muted-foreground">
              {player.nationalTeamCaps} caps
            </div>
          </div>

          {/* Scout Network Section */}
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Scout Network</span>
            </div>
            <Switch
              checked={player.isPublishedToScouts || false}
              onCheckedChange={() => setShowPublishDialog(true)}
              data-testid={`switch-publish-${player.id}`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onViewProfile(player.id)}
              data-testid={`button-view-player-${player.id}`}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareDialog(true)}
              data-testid={`button-share-${player.id}`}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoDialog(true)}
              data-testid={`button-upload-video-${player.id}`}
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PublishToScoutsDialog
        player={player}
        isOpen={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        balance={balance}
      />
      <ShareLinkDialog
        player={player}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        balance={balance}
      />
      <VideoUploadDialog
        player={player}
        isOpen={showVideoDialog}
        onClose={() => setShowVideoDialog(false)}
      />
    </>
  );
}

// ============================================================================
// MAIN PLAYERS COMPONENT
// ============================================================================

export default function Players() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const { toast } = useToast();
  const { balance } = useCheckTokens();
  const { user } = useAuth();

  // Check if current user can add players (team roles only)
  const userCanAddPlayers = canManagePlayers(user?.role);

  // Fetch players (same-origin /api via Vite proxy in dev so session cookies are sent)
  const { data: apiPlayers, isLoading, error, refetch } = useQuery<SchemaPlayer[]>({
    queryKey: ["/api/players"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/players");
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Form setup
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

  // Create player mutation
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add player",
        variant: "destructive",
      });
    },
  });

  // Transform players to view model
  const players = useMemo(() => {
    if (!apiPlayers || apiPlayers.length === 0) return [];
    return apiPlayers.map(transformPlayerToViewModel);
  }, [apiPlayers]);

  // Extract unique values for filters
  const nationalities = useMemo(() =>
    Array.from(new Set(players.map((p) => p.nationality))).filter(Boolean).sort(),
    [players]
  );

  const positions = useMemo(() =>
    Array.from(new Set(players.map((p) => p.position))).filter(Boolean).sort(),
    [players]
  );

  // Count active filters
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

  // Filter players - simplified to just search
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return players; // No search = show all players
    }

    const query = searchQuery.toLowerCase();
    return players.filter((player) =>
      player.firstName.toLowerCase().includes(query) ||
      player.lastName.toLowerCase().includes(query) ||
      player.nationality.toLowerCase().includes(query) ||
      player.position.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setAdvancedFilters(DEFAULT_FILTERS);
  }, []);

  // Form submission
  const onSubmit = (data: PlayerFormData) => {
    createPlayerMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-players">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Roster</p>
          <h1 className="text-3xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground">Manage player profiles and compliance data</p>
        </div>

        {/* Token Balance Display */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{balance ?? 0} tokens</span>
          </div>

          {userCanAddPlayers && (
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
          )}
        </div>
      </div>

      {/* Search and Filters Bar */}
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

      {/* Advanced Filters Panel */}
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

      {/* Active Filters Display */}
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

      {/* Players Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            {error.message?.includes("401") ? "Please sign in to view players." : "Could not load players."}
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
            {error.message?.includes("401") && (
              <Button variant="default" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All ({filteredPlayers.length})</TabsTrigger>
            <TabsTrigger value="green" data-testid="tab-green">
              Green ({filteredPlayers.filter((p) => getVisaStatus(p.overallEligibilityScore) === "green").length})
            </TabsTrigger>
            <TabsTrigger value="yellow" data-testid="tab-yellow">
              Yellow ({filteredPlayers.filter((p) => getVisaStatus(p.overallEligibilityScore) === "yellow").length})
            </TabsTrigger>
            <TabsTrigger value="red" data-testid="tab-red">
              Red ({filteredPlayers.filter((p) => getVisaStatus(p.overallEligibilityScore) === "red").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
            }>
              {filteredPlayers.map((player) => (
                <EnhancedPlayerCard
                  key={player.id}
                  player={player as DomainPlayer & { isPublishedToScouts?: boolean; publishExpiresAt?: string }}
                  onViewProfile={(id) => navigate(`/players/${id}`)}
                  onGenerateReport={(id) => navigate(`/reports?player=${id}`)}
                  balance={balance}
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
                  .filter((p) => getVisaStatus(p.overallEligibilityScore) === status)
                  .map((player) => (
                    <EnhancedPlayerCard
                      key={player.id}
                      player={player as DomainPlayer & { isPublishedToScouts?: boolean; publishExpiresAt?: string }}
                      onViewProfile={(id) => navigate(`/players/${id}`)}
                      onGenerateReport={(id) => navigate(`/reports?player=${id}`)}
                      balance={balance}
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
