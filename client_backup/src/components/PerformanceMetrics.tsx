import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, Globe, Activity, Heart, MapPin } from "lucide-react";
import type { Player } from "@/lib/types";

interface PerformanceMetricsProps {
  player: Player;
}

export default function PerformanceMetrics({ player }: PerformanceMetricsProps) {
  const metrics = [
    { 
      label: "National Team Caps", 
      value: player.nationalTeamCaps, 
      icon: Trophy,
      description: player.nationalTeamDebut 
        ? `Debut: ${new Date(player.nationalTeamDebut).toLocaleDateString()}`
        : "No debut recorded"
    },
    { 
      label: "Continental Games", 
      value: player.continentalGames, 
      icon: Globe,
      description: "CAF/CONMEBOL/AFC competitions"
    },
    { 
      label: "Season Minutes", 
      value: player.currentSeasonMinutes.toLocaleString(), 
      icon: Clock,
      description: `${player.currentLeague}`
    },
    { 
      label: "Career Minutes", 
      value: player.totalCareerMinutes.toLocaleString(), 
      icon: Activity,
      description: "Total professional minutes"
    },
    { 
      label: "Medical Data", 
      value: player.medicalDataAvailable ? "Available" : "Unavailable", 
      icon: Heart,
      description: "Biometric verification"
    },
    { 
      label: "GPS Data", 
      value: player.gpsDataAvailable ? "Available" : "Unavailable", 
      icon: MapPin,
      description: "Performance tracking"
    },
  ];

  return (
    <Card data-testid="card-performance-metrics">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Performance Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div 
              key={metric.label} 
              className="p-4 bg-muted/50 rounded-md space-y-1"
              data-testid={`metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {metric.label}
                </span>
              </div>
              <p className="text-xl font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
