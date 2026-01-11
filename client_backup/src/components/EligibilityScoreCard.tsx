import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Globe, Shield, Flag, Plane, Building, Sun, Award } from "lucide-react";
import { getVisaStatus } from "./StatusBadge";

interface VisaScore {
  name: string;
  code: string;
  score: number;
  description: string;
  requirements: string;
  icon: typeof Globe;
  region: string;
}

interface EligibilityScoreCardProps {
  scores: {
    schengen: number;
    ukGbe: number;
    usP1: number;
    usO1: number;
    middleEast?: number;
    asia?: number;
    fifa?: number;
  };
  compact?: boolean;
}

export default function EligibilityScoreCard({ scores, compact = false }: EligibilityScoreCardProps) {
  const visaTypes: VisaScore[] = [
    { 
      name: "FIFA Transfer Rules", 
      code: "FIFA",
      score: scores.fifa ?? 0, 
      description: "FIFA International Transfer Regulations",
      requirements: "ITC eligibility, training compensation, solidarity mechanism, contract status",
      icon: Award,
      region: "Global"
    },
    { 
      name: "Schengen Sports", 
      code: "SCH",
      score: scores.schengen, 
      description: "EU sports person visa",
      requirements: "Requires professional contract, club invitation, and minimum playing time",
      icon: Globe,
      region: "EU"
    },
    { 
      name: "UK GBE Points", 
      code: "GBE",
      score: scores.ukGbe, 
      description: "UK Governing Body Endorsement",
      requirements: "Points-based on international caps, club level, and domestic league position",
      icon: Shield,
      region: "UK"
    },
    { 
      name: "US P-1 Athlete", 
      code: "P-1",
      score: scores.usP1, 
      description: "US athlete visa for events",
      requirements: "Internationally recognized athlete or team member",
      icon: Flag,
      region: "USA"
    },
    { 
      name: "US O-1 Extraordinary", 
      code: "O-1",
      score: scores.usO1, 
      description: "US extraordinary ability visa",
      requirements: "Sustained national or international acclaim",
      icon: Plane,
      region: "USA"
    },
    { 
      name: "Middle East Sports", 
      code: "MEA",
      score: scores.middleEast ?? 0, 
      description: "UAE/Saudi/Qatar Sports Visa",
      requirements: "Professional status, club contract, medical clearance, age eligibility",
      icon: Building,
      region: "UAE/Saudi"
    },
    { 
      name: "Asia Sports", 
      code: "ASIA",
      score: scores.asia ?? 0, 
      description: "Asian League Sports Visa",
      requirements: "Professional contract, skills assessment, club sponsorship",
      icon: Sun,
      region: "Asia"
    },
  ];

  const getProgressColor = (score: number) => {
    const status = getVisaStatus(score);
    switch (status) {
      case "green": return "bg-green-500";
      case "yellow": return "bg-yellow-500";
      case "red": return "bg-red-500";
    }
  };

  const getStatusLabel = (score: number) => {
    const status = getVisaStatus(score);
    switch (status) {
      case "green": return "Eligible";
      case "yellow": return "Conditional";
      case "red": return "At Risk";
    }
  };

  const getStatusTextColor = (score: number) => {
    const status = getVisaStatus(score);
    switch (status) {
      case "green": return "text-green-600 dark:text-green-400";
      case "yellow": return "text-yellow-600 dark:text-yellow-400";
      case "red": return "text-red-600 dark:text-red-400";
    }
  };

  if (compact) {
    return (
      <Card data-testid="card-eligibility-scores-compact">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Visa Eligibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {visaTypes.map((visa) => (
              <Tooltip key={visa.code}>
                <TooltipTrigger asChild>
                  <div 
                    className={`px-2 py-1 rounded-md text-xs font-medium cursor-help ${
                      getVisaStatus(visa.score) === "green" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : getVisaStatus(visa.score) === "yellow"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                    data-testid={`visa-badge-${visa.code.toLowerCase()}`}
                  >
                    {visa.code}: {visa.score}%
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{visa.name}</p>
                  <p className="text-xs">{visa.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-eligibility-scores">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5" />
          Visa Eligibility Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visaTypes.map((visa) => {
          const IconComponent = visa.icon;
          return (
            <div key={visa.code} className="space-y-2" data-testid={`visa-score-${visa.code.toLowerCase()}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{visa.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">({visa.region})</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium">{visa.description}</p>
                      <p className="text-xs mt-1">{visa.requirements}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium ${getStatusTextColor(visa.score)}`}>
                    {getStatusLabel(visa.score)}
                  </span>
                  <span className="text-sm font-semibold w-12 text-right">{visa.score}%</span>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className={`h-full transition-all ${getProgressColor(visa.score)}`}
                  style={{ width: `${visa.score}%` }}
                />
              </div>
            </div>
          );
        })}
        
        <div className="pt-4 border-t mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs">60%+ Eligible</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-xs">35-59% Conditional</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-xs">&lt;35% At Risk</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
