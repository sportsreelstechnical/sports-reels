import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Clock, Globe, Award, TrendingUp, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VisaScore {
  score: number;
  status: "green" | "yellow" | "red";
  breakdown: {
    minutesScore: number;
    internationalScore: number;
    leagueScore: number;
    performanceScore: number;
  };
  recommendations: string[];
}

interface TransferEligibilityData {
  assessment: {
    id: string;
    playerId: string;
    totalMinutesVerified: number;
    overallStatus: string;
    calculatedAt: string;
  };
  player: {
    id: string;
    name: string;
    position: string;
    nationality: string;
    currentClub: string;
    marketValue: number;
  };
  minutesBreakdown: {
    club: number;
    international: number;
    video: number;
    total: number;
    minimum: number;
    needed: number;
  };
  visaScores: {
    schengen: VisaScore;
    o1: VisaScore;
    p1: VisaScore;
    ukGbe: VisaScore;
    esc: VisaScore;
  };
  overallStatus: "green" | "yellow" | "red";
  recommendations: string[];
  capsNeeded: number;
  leagueBandApplied: number;
}

interface TransferEligibilityDashboardProps {
  playerId: string;
}

function StatusBadge({ status }: { status: "green" | "yellow" | "red" }) {
  const config = {
    green: { label: "Eligible", variant: "default" as const, className: "bg-green-600 hover:bg-green-700 text-white" },
    yellow: { label: "Conditional", variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-black" },
    red: { label: "Ineligible", variant: "destructive" as const, className: "bg-red-600 hover:bg-red-700 text-white" },
  };
  
  const { label, className } = config[status];
  return <Badge className={className}>{label}</Badge>;
}

function StatusIcon({ status }: { status: "green" | "yellow" | "red" }) {
  switch (status) {
    case "green":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "yellow":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "red":
      return <XCircle className="h-5 w-5 text-red-600" />;
  }
}

function VisaCard({ name, visa, icon }: { name: string; visa: VisaScore; icon: React.ReactNode }) {
  const statusColors = {
    green: "border-green-500",
    yellow: "border-yellow-500",
    red: "border-red-500",
  };

  return (
    <Card className={`border-l-4 ${statusColors[visa.status]}`} data-testid={`card-visa-${name.toLowerCase()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{name}</CardTitle>
          </div>
          <StatusBadge status={visa.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{visa.score}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress value={visa.score} className="h-2" />
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minutes</span>
              <span>{Math.round(visa.breakdown.minutesScore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">International</span>
              <span>{Math.round(visa.breakdown.internationalScore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">League</span>
              <span>{Math.round(visa.breakdown.leagueScore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Performance</span>
              <span>{Math.round(visa.breakdown.performanceScore)}</span>
            </div>
          </div>

          {visa.recommendations.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Recommendations:</p>
              <ul className="text-xs space-y-1">
                {visa.recommendations.slice(0, 2).map((rec, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <TrendingUp className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TransferEligibilityDashboard({ playerId }: TransferEligibilityDashboardProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading, error } = useQuery<TransferEligibilityData>({
    queryKey: ["/api/players", playerId, "transfer-eligibility"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/transfer-eligibility`);
      if (!res.ok) throw new Error("Failed to fetch eligibility data");
      return res.json();
    },
    enabled: !!playerId,
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/players/${playerId}/transfer-eligibility/recalculate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId, "transfer-eligibility"] });
      toast({ title: "Success", description: "Eligibility scores recalculated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to recalculate scores", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-transfer-eligibility-loading">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Calculating eligibility scores...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="card-transfer-eligibility-error">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <p className="text-muted-foreground">Unable to load eligibility data</p>
          <Button variant="outline" onClick={() => recalculateMutation.mutate()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusColorClass = {
    green: "bg-green-600",
    yellow: "bg-yellow-500",
    red: "bg-red-600",
  };

  const minutesPercentage = Math.min(100, (data.minutesBreakdown.total / data.minutesBreakdown.minimum) * 100);

  return (
    <div className="space-y-6" data-testid="container-transfer-eligibility">
      <Card className="border-2" data-testid="card-eligibility-summary">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${statusColorClass[data.overallStatus]}`}>
                <StatusIcon status={data.overallStatus} />
              </div>
              <div>
                <CardTitle className="text-xl">Transfer Eligibility</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {data.player.name} - {data.player.position}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.overallStatus} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => recalculateMutation.mutate()}
                    disabled={recalculateMutation.isPending}
                    data-testid="button-recalculate"
                  >
                    <RefreshCw className={`h-4 w-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Recalculate eligibility</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total Verified Minutes
                </span>
                <span className="font-bold">{data.minutesBreakdown.total.toLocaleString()}</span>
              </div>
              <Progress value={minutesPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {data.minutesBreakdown.needed > 0 
                  ? `${data.minutesBreakdown.needed} more minutes needed (min: ${data.minutesBreakdown.minimum})`
                  : "Minimum threshold met"
                }
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Minutes Breakdown
              </p>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="h-6 bg-blue-500 rounded" 
                      style={{ width: `${Math.max(5, (data.minutesBreakdown.club / Math.max(data.minutesBreakdown.total, 1)) * 100)}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Club: {data.minutesBreakdown.club} mins</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="h-6 bg-green-500 rounded" 
                      style={{ width: `${Math.max(5, (data.minutesBreakdown.international / Math.max(data.minutesBreakdown.total, 1)) * 100)}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>International: {data.minutesBreakdown.international} mins</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="h-6 bg-purple-500 rounded" 
                      style={{ width: `${Math.max(5, (data.minutesBreakdown.video / Math.max(data.minutesBreakdown.total, 1)) * 100)}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Video: {data.minutesBreakdown.video} mins</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded" /> Club</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded" /> International</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded" /> Video</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Assessment Info
              </p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">League Band Applied:</span>
                  <Badge variant="outline" className="text-xs">Band {data.leagueBandApplied}</Badge>
                </div>
                {data.capsNeeded > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caps Needed:</span>
                    <span>{data.capsNeeded}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" data-testid="tab-overview">Visa Eligibility</TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <VisaCard 
              name="Schengen" 
              visa={data.visaScores.schengen} 
              icon={<Globe className="h-4 w-4 text-blue-500" />}
            />
            <VisaCard 
              name="O-1 (US)" 
              visa={data.visaScores.o1} 
              icon={<Award className="h-4 w-4 text-yellow-600" />}
            />
            <VisaCard 
              name="P-1 (US)" 
              visa={data.visaScores.p1} 
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            />
            <VisaCard 
              name="UK GBE" 
              visa={data.visaScores.ukGbe} 
              icon={<Globe className="h-4 w-4 text-indigo-500" />}
            />
            <VisaCard 
              name="ESC (UK)" 
              visa={data.visaScores.esc} 
              icon={<Award className="h-4 w-4 text-purple-500" />}
            />
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <Card data-testid="card-recommendations">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Steps to Improve Transfer Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {data.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md" data-testid={`recommendation-${index}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                  Player meets all eligibility requirements
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
