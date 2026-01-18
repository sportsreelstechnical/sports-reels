import { PlayerTrackingData } from "@/components/PlayerTrackingVisualization";

export interface VideoEntity {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  video_type: "match" | "training" | "interview" | "highlight";
  description?: string;
  created_at: string;
}

export interface PlayerAction {
  timestamp: number;
  action: string;
  description: string;
  confidence: number;
  players: string[];
  zone?: string;
  outcome?: string;
}

export interface KeyMoment {
  timestamp: number;
  type: string;
  description: string;
  importance: "high" | "medium" | "low";
  source?: string;
  context?: string;
  participants?: string[];
  skillLevel?: number;
  marketability?: number;
  playerInvolved?: string;
  playerName?: string;
  position?: string;
  skillRating?: number;
  highlightMoments?: KeyMoment[];
  outcome?: string;
  fieldPosition?: string;
  confidence?: number;
}

export interface PlayerStat {
  name: string;
  position: string;
  rating: number;
  actions: number;
  keyPasses: number;
  goals: number;
}

export interface AnalysisTimelineItem {
  minute: number;
  events: string[];
}

export interface TacticalAnalysis {
  formationChanges: Array<{
    formation: string;
    positions: Array<{
      playerId: string;
      position: string;
      x: number;
      y: number;
    }>;
    confidence: number;
    timestamp: number;
  }>;
  pressingMoments: Array<{
    timestamp: number;
    duration: number;
    intensity: "low" | "medium" | "high";
    playersInvolved: string[];
    success: boolean;
  }>;
  buildUpPlay: Array<{
    timestamp: number;
    duration: number;
    playersInvolved: string[];
    passes: number;
    outcome: "successful" | "failed";
  }>;
  defensiveActions: Array<{
    timestamp: number;
    type: "tackle" | "interception" | "clearance" | "block";
    playerId: string;
    success: boolean;
    fieldPosition: string;
  }>;
  attackingPatterns: Array<{
    timestamp: number;
    type: "counter-attack" | "possession-play" | "set-piece" | "individual-run";
    playersInvolved: string[];
    outcome: "goal" | "shot" | "corner" | "failed";
  }>;
}

export interface MatchStatistics {
  possession: {
    home: number;
    away: number;
  };
  shots: {
    home: number;
    away: number;
  };
  passes: {
    home: number;
    away: number;
    accuracy: {
      home: number;
      away: number;
    };
  };
  goals: Array<{
    timestamp: number;
    playerId: string;
    team: "home" | "away";
    type: "open-play" | "penalty" | "free-kick" | "corner" | "own-goal";
    assistPlayerId?: string;
    fieldPosition: string;
  }>;
  cards: Array<{
    timestamp: number;
    playerId: string;
    team: "home" | "away";
    type: "yellow" | "red";
    reason: string;
  }>;
  substitutions: Array<{
    timestamp: number;
    playerOut: string;
    playerIn: string;
    team: "home" | "away";
    reason: "tactical" | "injury" | "performance";
  }>;
}

export interface PerformanceMetrics {
  overallTeamRating: number;
  individualRatings: unknown[];
  tacticalEffectiveness: number;
  physicalPerformance: number;
  technicalExecution: number;
}

export interface SportSpecificInsights {
  formation: string;
  tacticalStyle: string;
  keyStrengths: string[];
  areasForImprovement: string[];
  criticalMoments: unknown[];
  performanceMetrics: PerformanceMetrics;
}

export interface AnalysisData {
  playerActions: PlayerAction[];
  keyMoments: KeyMoment[];
  summary: string;
  insights: string[];
  performanceRating: number;
  heatmapData?: Record<string, unknown>[];
  playerStats?: PlayerStat[];
  timeline?: AnalysisTimelineItem[];
  playerTracking?: PlayerTrackingData[];
  tacticalAnalysis?: TacticalAnalysis;
  matchStatistics?: MatchStatistics;
  sportSpecificInsights?: SportSpecificInsights;
  recommendations?: string[];
  confidence?: number;
  processingTime?: number;
  [key: string]: unknown;
}
