import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  User, Globe, Clock, Activity, Ruler, Weight, Flag, 
  CheckCircle, AlertCircle, XCircle, Trophy, Video, 
  Lock, Play, UserPlus
} from "lucide-react";
import sportsReelsLogo from "@assets/WhatsApp_Image_2025-12-17_at_12.49.33_1766595809165.jpeg";

interface SharedPlayerProfileProps {
  params?: { token?: string };
}

interface VideoPreview {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: string | null;
  videoType: string | null;
}

interface EligibilityScoreData {
  id: string;
  visaType: string;
  score: number;
  status: string;
}

interface SharedPlayerData {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nationality: string;
    secondNationality?: string;
    position: string;
    secondaryPosition?: string;
    currentClubName?: string;
    profileImageUrl?: string;
    height?: number;
    heightUnit?: string;
    weight?: number;
    weightUnit?: string;
    nationalTeamCaps?: number;
    nationalTeamGoals?: number;
    clubMinutesCurrentSeason?: number;
    internationalMinutesCurrentSeason?: number;
  };
  eligibilityScores: EligibilityScoreData[];
  videos: VideoPreview[];
  videoCount: number;
  shareLink: {
    expiresAt: string;
    viewCount: number;
  };
}

function getStatusInfo(score: number) {
  if (score >= 60) return { color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", icon: CheckCircle, label: "Eligible" };
  if (score >= 35) return { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: AlertCircle, label: "Conditional" };
  return { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", icon: XCircle, label: "Ineligible" };
}

export default function SharedPlayerProfile({ params }: SharedPlayerProfileProps) {
  const token = params?.token || "";

  const { data, isLoading, error } = useQuery<SharedPlayerData>({
    queryKey: ["/api/shared", token],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${token}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load profile");
      }
      return res.json();
    },
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="page-shared-profile">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">This share link is not valid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="page-shared-profile">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="page-shared-profile">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Profile Unavailable</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "This share link may have expired or been revoked."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { player, eligibilityScores, videos } = data;

  return (
    <div className="min-h-screen bg-background" data-testid="page-shared-profile">
      {/* Header with Sports Reels Branding */}
      <header className="border-b bg-card">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={sportsReelsLogo} 
              alt="Sports Reels" 
              className="h-10 w-10 rounded-md object-cover"
            />
            <div>
              <h1 className="font-bold text-lg">Sports Reels</h1>
              <p className="text-xs text-muted-foreground">Player Compliance Platform</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = "/auth/login"} data-testid="button-signup">
            <UserPlus className="h-4 w-4 mr-2" />
            Sign Up for Full Access
          </Button>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Player Header */}
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
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
            <h2 className="text-3xl font-bold" data-testid="text-player-name">
              {player.firstName} {player.lastName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant="secondary">{player.position}</Badge>
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
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Ruler className="h-4 w-4" />
              <span className="text-xs">Height</span>
            </div>
            <p className="text-xl font-bold">
              {player.height ? `${player.height} ${player.heightUnit || 'cm'}` : '-'}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Weight className="h-4 w-4" />
              <span className="text-xs">Weight</span>
            </div>
            <p className="text-xl font-bold">
              {player.weight ? `${player.weight} ${player.weightUnit || 'kg'}` : '-'}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Globe className="h-4 w-4" />
              <span className="text-xs">Nat'l Caps</span>
            </div>
            <p className="text-xl font-bold text-primary">
              {player.nationalTeamCaps || 0}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Goals</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {player.nationalTeamGoals || 0}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Club Mins</span>
            </div>
            <p className="text-xl font-bold">
              {player.clubMinutesCurrentSeason || 0}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Intl Mins</span>
            </div>
            <p className="text-xl font-bold">
              {player.internationalMinutesCurrentSeason || 0}
            </p>
          </Card>
        </div>

        {/* Eligibility Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Transfer Eligibility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibilityScores.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No eligibility data available</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {eligibilityScores.map((score) => {
                  const status = getStatusInfo(score.score);
                  const StatusIcon = status.icon;
                  return (
                    <div key={score.id} className={`p-4 rounded-md ${status.bg}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-5 w-5 ${status.color}`} />
                          <span className="font-medium">{score.visaType}</span>
                        </div>
                        <Badge variant="outline" className={status.color}>
                          {score.score}%
                        </Badge>
                      </div>
                      <Progress value={score.score} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {status.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Videos Section - Limited Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Performance Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No videos available</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {videos.slice(0, 3).map((video, index) => (
                  <div key={video.id} className="relative group">
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Play className="h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <Lock className="h-8 w-8 text-white mb-2" />
                        <p className="text-white text-sm font-medium">Sign up to watch</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.videoType || video.duration}</p>
                  </div>
                ))}
                {videos.length > 3 && (
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">+{videos.length - 3}</p>
                      <p className="text-sm text-muted-foreground">More Videos</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA Banner */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src={sportsReelsLogo} 
                  alt="Sports Reels" 
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div>
                  <h3 className="text-xl font-bold">Get Full Access with Sports Reels</h3>
                  <p className="text-primary-foreground/80">
                    Watch all videos, download reports, and track transfer eligibility
                  </p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => window.location.href = "/auth/login"}
                data-testid="button-cta-signup"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Free Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-4 border-t">
          <p>Powered by Sports Reels - Player Compliance & Visa Eligibility Platform</p>
          <p className="text-xs mt-1">This is a shared player profile. Some features are limited.</p>
        </footer>
      </main>
    </div>
  );
}
