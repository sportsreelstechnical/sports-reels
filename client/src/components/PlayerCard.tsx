import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatusBadge from "./StatusBadge";
import { FileText, Eye, Clock, Trophy, MapPin } from "lucide-react";
import type { Player } from "@/lib/types";

interface PlayerCardProps {
  player: Player;
  onViewProfile?: (id: string) => void;
  onGenerateReport?: (id: string) => void;
}

export default function PlayerCard({ player, onViewProfile, onGenerateReport }: PlayerCardProps) {
  const initials = `${player.firstName[0]}${player.lastName[0]}`;

  return (
    <Card className="hover-elevate" data-testid={`card-player-${player.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{player.firstName} {player.lastName}</h3>
            <p className="text-sm text-muted-foreground truncate">{player.position}</p>
          </div>
        </div>
        <StatusBadge score={player.overallEligibilityScore} size="sm" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{player.nationality}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span>{player.nationalTeamCaps} caps</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{player.currentSeasonMinutes} min</span>
          </div>
          <div className="text-muted-foreground truncate">
            {player.currentClub}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewProfile?.(player.id)}
            data-testid={`button-view-player-${player.id}`}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onGenerateReport?.(player.id)}
            data-testid={`button-report-player-${player.id}`}
          >
            <FileText className="h-4 w-4 mr-1" />
            Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
