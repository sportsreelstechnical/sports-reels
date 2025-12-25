import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlayerInternationalRecords from "@/components/PlayerInternationalRecords";
import PlayerProfileEditor from "@/components/PlayerProfileEditor";
import TransferEligibilityDashboard from "@/components/TransferEligibilityDashboard";
import PlayerDocumentManager from "@/components/PlayerDocumentManager";
import VideoPlayer from "@/components/VideoPlayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Globe, Clock, Activity, Ruler, Weight, Flag, CheckCircle, FileText, Video, Play, Calendar, Share2, Eye, Coins, Link2, Copy, ExternalLink, Download, Award } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCheckTokens } from "@/hooks/use-tokens";
import type { Player, Video as VideoType, PlayerShareLink, FederationLetterRequest } from "@shared/schema";

interface PlayerProfileProps {
  params?: { id?: string };
  isScoutView?: boolean;
}

export default function PlayerProfile({ params, isScoutView }: PlayerProfileProps) {
  const [location, setLocation] = useLocation();
  const playerId = params?.id || "";
  
  // Detect if we're in scout view based on the current path
  const isScout = isScoutView || location.startsWith("/scout/");
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const { toast } = useToast();
  const { balance } = useCheckTokens();

  // Get auth data to check if user is embassy
  const { data: authData } = useQuery<{ user: any }>({
    queryKey: ["/api/auth/me"],
  });
  const isEmbassy = authData?.user?.role === "embassy";

  const { data: playerData, isLoading } = useQuery<{
    player: Player;
    metrics: any[];
    eligibilityScores: any[];
    medicalRecords: any[];
    biometricData: any[];
    videos: VideoType[];
  }>({
    queryKey: ["/api/players", playerId],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}`);
      if (!res.ok) throw new Error("Failed to fetch player");
      return res.json();
    },
    enabled: !!playerId,
  });

  const { data: shareLinks = [] } = useQuery<PlayerShareLink[]>({
    queryKey: ["/api/players", playerId, "share-links"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/share-links`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!playerId,
  });

  const { data: issuedFederationLetters = [] } = useQuery<FederationLetterRequest[]>({
    queryKey: ["/api/players", playerId, "issued-federation-letters"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/issued-federation-letters`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!playerId && !isScout,
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const res = await apiRequest("POST", `/api/players/${playerId}/publish`, { publish });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      toast({ 
        title: data.published ? "Player Published" : "Player Unpublished",
        description: data.published 
          ? `Profile visible to scouts for 30 days. ${data.tokensSpent} tokens spent.`
          : "Profile removed from scout network."
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/players/${playerId}/share`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId, "share-links"] });
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

  const videos = playerData?.videos || [];

  if (!playerId) {
    return (
      <div className="p-6" data-testid="page-player-profile">
        <Button variant="ghost" onClick={() => setLocation(isScout ? "/scout-dashboard" : "/players")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isScout ? "Back to Dashboard" : "Back to Players"}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p>No player selected</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6" data-testid="page-player-profile">
        <Button variant="ghost" onClick={() => setLocation(isScout ? "/scout-dashboard" : "/players")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isScout ? "Back to Dashboard" : "Back to Players"}
        </Button>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const player = playerData?.player;

  if (!player) {
    return (
      <div className="p-6" data-testid="page-player-profile">
        <Button variant="ghost" onClick={() => setLocation(isScout ? "/scout-dashboard" : "/players")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isScout ? "Back to Dashboard" : "Back to Players"}
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p>Player not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-player-profile">
      <Button variant="ghost" onClick={() => setLocation(isScout ? "/scout-dashboard" : "/players")} data-testid="button-back">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {isScout ? "Back to Dashboard" : "Back to Players"}
      </Button>

      <div className="flex items-start gap-6">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
          {player.profileImageUrl ? (
            <img 
              src={player.profileImageUrl} 
              alt={`${player.firstName} ${player.lastName}`}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <User className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-player-name">
                {player.firstName} {player.lastName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="secondary" data-testid="badge-position">{player.position}</Badge>
                {player.secondaryPosition && (
                  <Badge variant="outline">{player.secondaryPosition}</Badge>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Flag className="h-4 w-4" />
                  {player.nationality}
                  {player.secondNationality && ` / ${player.secondNationality}`}
                </span>
                {player.currentClubName && (
                  <span className="text-muted-foreground">{player.currentClubName}</span>
                )}
                {player.jerseyNumber && (
                  <Badge variant="outline">#{player.jerseyNumber}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Ruler className="h-4 w-4" />
            <span className="text-xs">Height</span>
          </div>
          <p className="text-xl font-bold" data-testid="text-height">
            {player.height ? `${player.height} ${player.heightUnit || 'cm'}` : '-'}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Weight className="h-4 w-4" />
            <span className="text-xs">Weight</span>
          </div>
          <p className="text-xl font-bold" data-testid="text-weight">
            {player.weight ? `${player.weight} ${player.weightUnit || 'kg'}` : '-'}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Globe className="h-4 w-4" />
            <span className="text-xs">Nat&apos;l Caps</span>
          </div>
          <p className="text-xl font-bold text-primary" data-testid="text-national-caps">
            {player.nationalTeamCaps || 0}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Activity className="h-4 w-4" />
            <span className="text-xs">Goals</span>
          </div>
          <p className="text-xl font-bold text-green-600" data-testid="text-national-goals">
            {player.nationalTeamGoals || 0}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Club Mins</span>
          </div>
          <p className="text-xl font-bold" data-testid="text-club-minutes">
            {player.clubMinutesCurrentSeason || 0}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Intl Mins</span>
          </div>
          <p className="text-xl font-bold" data-testid="text-intl-minutes">
            {player.internationalMinutesCurrentSeason || 0}
          </p>
        </Card>
      </div>

      {/* Scout Network Publishing Card - Only visible to team members, not scouts or embassy */}
      {!isScout && !isEmbassy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5" />
              Scout Network Visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium">Publish to Scout Network</p>
                <p className="text-sm text-muted-foreground">
                  Make this player visible to scouts for 30 days. 
                  <span className="font-medium ml-1">Cost: 4 tokens/month</span>
                </p>
                {player.isPublishedToScouts && player.publishExpiresAt && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Visible until {new Date(player.publishExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={player.isPublishedToScouts || false}
                  onCheckedChange={(checked) => publishMutation.mutate(checked)}
                  disabled={publishMutation.isPending || (!player.isPublishedToScouts && (balance ?? 0) < 4)}
                  data-testid="switch-publish-player"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">Create Shareable Link</p>
                  <p className="text-sm text-muted-foreground">
                    Generate a tokenized link to share this player profile externally.
                    <span className="font-medium ml-1">Cost: 10 tokens per link</span>
                  </p>
                </div>
                <Button
                  onClick={() => shareMutation.mutate()}
                  disabled={shareMutation.isPending || (balance ?? 0) < 10}
                  data-testid="button-create-share-link"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {shareMutation.isPending ? "Creating..." : "Create Link"}
                </Button>
              </div>

              {shareLinks.length > 0 && (
                <div className="mt-4 space-y-2">
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
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/shared/player/${link.shareToken}`);
                            toast({ title: "Link Copied", description: "Share link copied to clipboard." });
                          }}
                          data-testid={`button-copy-link-${link.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/shared/player/${link.shareToken}`, '_blank')}
                          data-testid={`button-open-link-${link.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Coins className="h-5 w-5 text-amber-500" />
              <span className="text-sm">Your Balance: <span className="font-bold">{balance ?? 0} tokens</span></span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="eligibility" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="eligibility" data-testid="tab-eligibility">
            <CheckCircle className="h-4 w-4 mr-2" />
            Transfer Eligibility
          </TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="international" data-testid="tab-international">International Career</TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Video className="h-4 w-4 mr-2" />
            Videos ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eligibility" className="mt-6">
          <TransferEligibilityDashboard playerId={player.id} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <PlayerProfileEditor player={player} />
        </TabsContent>

        <TabsContent value="international" className="mt-6">
          <PlayerInternationalRecords 
            playerId={player.id} 
            playerName={`${player.firstName} ${player.lastName}`} 
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          {videos.length === 0 ? (
            <Card className="p-8 text-center">
              <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No videos tagged to this player yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Videos uploaded or tracked for this player will appear here.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-visible" data-testid={`card-video-${video.id}`}>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-muted">
                          <Play className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm leading-tight">{video.title}</h4>
                          <p className="text-xs text-muted-foreground">{video.source}</p>
                        </div>
                      </div>
                      {video.processed && (
                        <Badge variant="secondary" className="text-xs">Analyzed</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {video.matchDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {video.matchDate}
                        </span>
                      )}
                      {video.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.duration}
                        </span>
                      )}
                      {video.minutesPlayed && (
                        <Badge variant="outline" className="text-xs">
                          {video.minutesPlayed} mins played
                        </Badge>
                      )}
                    </div>

                    {video.competition && (
                      <p className="text-xs text-muted-foreground">
                        {video.competition}
                        {video.opponent && ` vs ${video.opponent}`}
                      </p>
                    )}

                    <Button 
                      size="sm" 
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        setSelectedVideo(video);
                        setIsVideoPlayerOpen(true);
                      }}
                      data-testid={`button-play-video-${video.id}`}
                    >
                      <Play className="h-3 w-3 mr-2" />
                      Watch Video
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="space-y-6">
            <PlayerDocumentManager 
              playerId={player.id} 
              playerName={`${player.firstName} ${player.lastName}`} 
            />
            
            {!isScout && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Issued Federation Letters
                  </h3>
                  
                  {issuedFederationLetters.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Award className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No federation letters have been issued for this player.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Federation letters will appear here once approved and issued.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {issuedFederationLetters.map((letter) => (
                        <Card key={letter.id} data-testid={`card-federation-letter-${letter.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                  <Award className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{letter.requestNumber}</CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    {letter.federationName || "Federation"} - {letter.federationCountry || "Unknown"}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Issued
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Target Club</p>
                                <p className="font-medium">{letter.targetClubName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Country</p>
                                <p className="font-medium">{letter.targetClubCountry}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Transfer Type</p>
                                <p className="font-medium capitalize">{letter.transferType?.replace(/_/g, ' ')}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Issued Date</p>
                                <p className="font-medium">
                                  {letter.issuedAt ? new Date(letter.issuedAt).toLocaleDateString() : "N/A"}
                                </p>
                              </div>
                            </div>
                            
                            {letter.issuedDocumentObjectPath && (
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(letter.issuedDocumentObjectPath!, '_blank')}
                                  data-testid={`button-view-letter-${letter.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Document
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = letter.issuedDocumentObjectPath!;
                                    link.download = letter.issuedDocumentOriginalName || `Federation_Letter_${letter.requestNumber}.pdf`;
                                    link.click();
                                  }}
                                  data-testid={`button-download-letter-${letter.id}`}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <VideoPlayer 
        video={selectedVideo}
        isOpen={isVideoPlayerOpen}
        onClose={() => {
          setIsVideoPlayerOpen(false);
          setSelectedVideo(null);
        }}
      />
    </div>
  );
}
