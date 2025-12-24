import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "./StatusBadge";
import { FileText, Share2, Clock, MapPin, Calendar, Activity } from "lucide-react";
import type { Player } from "@/lib/types";

interface PlayerProfileHeaderProps {
  player: Player;
  onGenerateReport?: () => void;
  onShare?: () => void;
}

export default function PlayerProfileHeader({ player, onGenerateReport, onShare }: PlayerProfileHeaderProps) {
  const initials = `${player.firstName[0]}${player.lastName[0]}`;
  const age = new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear();

  return (
    <Card data-testid="card-player-profile-header">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Avatar className="h-24 w-24 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{player.firstName} {player.lastName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary">{player.position}</Badge>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-muted-foreground">{age} years old</span>
                </div>
              </div>
              <StatusBadge score={player.overallEligibilityScore} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{player.nationality}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>{player.currentClub}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{player.currentSeasonMinutes} mins this season</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Updated {new Date(player.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {player.medicalDataAvailable && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Medical Data Available
                </Badge>
              )}
              {player.gpsDataAvailable && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  GPS Data Available
                </Badge>
              )}
              {player.nationalTeamCaps >= 10 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Full International
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 shrink-0">
            <Button onClick={onGenerateReport} data-testid="button-generate-report">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" onClick={onShare} data-testid="button-share-profile">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
