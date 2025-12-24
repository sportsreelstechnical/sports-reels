import type { Player, PlayerMetrics, Video, VideoInsights, PlayerInternationalRecord, InvitationLetter } from "@shared/schema";

const MINIMUM_MINUTES_REQUIRED = 800;
const GREEN_THRESHOLD = 800;
const YELLOW_THRESHOLD = 600;

export type AmberStatus = "green" | "yellow" | "red";

export interface VisaScoreResult {
  score: number;
  status: AmberStatus;
  breakdown: {
    minutesScore: number;
    internationalScore: number;
    leagueScore: number;
    performanceScore: number;
  };
  recommendations: string[];
}

export interface TransferEligibilityResult {
  totalMinutesVerified: number;
  clubMinutes: number;
  internationalMinutes: number;
  videoMinutes: number;
  totalCaps: number;
  seniorCaps: number;
  continentalAppearances: number;
  overallStatus: AmberStatus;
  schengen: VisaScoreResult;
  o1: VisaScoreResult;
  p1: VisaScoreResult;
  ukGbe: VisaScoreResult;
  esc: VisaScoreResult;
  escEligible: boolean;
  minutesNeeded: number;
  capsNeeded: number;
  recommendations: string[];
}

interface ScoringData {
  player: Player;
  metrics: PlayerMetrics[];
  videos: Video[];
  videoInsights: VideoInsights[];
  internationalRecords: PlayerInternationalRecord[];
  invitationLetters: InvitationLetter[];
  leagueBand: number;
}

function getStatus(score: number): AmberStatus {
  if (score >= 60) return "green";
  if (score >= 35) return "yellow";
  return "red";
}

function getMinutesStatus(minutes: number): AmberStatus {
  if (minutes >= GREEN_THRESHOLD) return "green";
  if (minutes >= YELLOW_THRESHOLD) return "yellow";
  return "red";
}

function calculateClubMinutes(player: Player, metrics: PlayerMetrics[]): number {
  const playerMinutes = (player.clubMinutesCurrentSeason || 0) + (player.clubMinutesLast12Months || 0);
  const metricsMinutes = metrics.reduce((sum, m) => sum + (m.currentSeasonMinutes || 0), 0);
  return Math.max(playerMinutes, metricsMinutes);
}

function calculateInternationalMinutes(player: Player, records: PlayerInternationalRecord[]): number {
  const playerMinutes = (player.internationalMinutesCurrentSeason || 0) + (player.internationalMinutesLast12Months || 0);
  const recordsCaps = records.reduce((sum, r) => sum + (r.caps || 0), 0);
  const estimatedFromCaps = recordsCaps * 45;
  return Math.max(playerMinutes, estimatedFromCaps);
}

function calculateVideoMinutes(videos: Video[], insights: VideoInsights[]): number {
  const videoMinutesFromVideos = videos.reduce((sum, v) => sum + (v.minutesPlayed || 0), 0);
  const videoMinutesFromInsights = insights.reduce((sum, i) => sum + (i.minutesPlayed || 0), 0);
  return Math.max(videoMinutesFromVideos, videoMinutesFromInsights);
}

function calculateTotalCaps(records: PlayerInternationalRecord[]): { total: number; senior: number } {
  let total = 0;
  let senior = 0;
  for (const record of records) {
    const caps = record.caps || 0;
    total += caps;
    if (record.teamLevel === "senior") {
      senior += caps;
    }
  }
  return { total, senior };
}

function getLeagueBandMultiplier(band: number): number {
  switch (band) {
    case 1: return 1.0;
    case 2: return 0.9;
    case 3: return 0.75;
    case 4: return 0.5;
    case 5: return 0.25;
    default: return 0.5;
  }
}

export function calculateSchengenScore(data: ScoringData): VisaScoreResult {
  const { player, metrics, videos, videoInsights, internationalRecords, leagueBand } = data;
  
  const clubMinutes = calculateClubMinutes(player, metrics);
  const intlMinutes = calculateInternationalMinutes(player, internationalRecords);
  const videoMins = calculateVideoMinutes(videos, videoInsights);
  const totalMinutes = clubMinutes + intlMinutes + videoMins;
  const { total: totalCaps } = calculateTotalCaps(internationalRecords);
  
  const minutesScore = Math.min(40, (totalMinutes / MINIMUM_MINUTES_REQUIRED) * 40);
  const internationalScore = Math.min(30, totalCaps * 3);
  const leagueMultiplier = getLeagueBandMultiplier(leagueBand);
  const leagueScore = 20 * leagueMultiplier;
  const performanceMetrics = metrics[0];
  const performanceScore = performanceMetrics 
    ? Math.min(10, ((performanceMetrics.goals || 0) + (performanceMetrics.assists || 0)) * 0.5)
    : 0;
  
  const totalScore = Math.round(minutesScore + internationalScore + leagueScore + performanceScore);
  const status = getStatus(totalScore);
  
  const recommendations: string[] = [];
  if (totalMinutes < MINIMUM_MINUTES_REQUIRED) {
    recommendations.push(`Play ${MINIMUM_MINUTES_REQUIRED - totalMinutes} more minutes to reach minimum threshold`);
  }
  if (totalCaps < 5) {
    recommendations.push(`Earn ${5 - totalCaps} more international caps to strengthen application`);
  }
  
  return {
    score: totalScore,
    status,
    breakdown: { minutesScore, internationalScore, leagueScore, performanceScore },
    recommendations,
  };
}

export function calculateO1Score(data: ScoringData): VisaScoreResult {
  const { player, metrics, videos, videoInsights, internationalRecords, leagueBand } = data;
  
  const clubMinutes = calculateClubMinutes(player, metrics);
  const intlMinutes = calculateInternationalMinutes(player, internationalRecords);
  const videoMins = calculateVideoMinutes(videos, videoInsights);
  const totalMinutes = clubMinutes + intlMinutes + videoMins;
  const { senior: seniorCaps } = calculateTotalCaps(internationalRecords);
  
  const hasRecognition = (player.marketValue || 0) > 1000000;
  const recognitionScore = hasRecognition ? 35 : Math.min(35, (player.marketValue || 0) / 50000);
  
  const intlScore = Math.min(30, seniorCaps * 2 + (player.continentalGames || 0) * 3);
  
  const marketPercentile = Math.min(20, ((player.marketValue || 0) / 5000000) * 20);
  
  const aiAnalysisCount = videoInsights.filter(i => i.aiAnalysis).length;
  const performanceScore = Math.min(15, aiAnalysisCount * 2 + (totalMinutes >= MINIMUM_MINUTES_REQUIRED ? 5 : 0));
  
  const totalScore = Math.round(recognitionScore + intlScore + marketPercentile + performanceScore);
  const status = getStatus(totalScore);
  
  const recommendations: string[] = [];
  if (!hasRecognition) {
    recommendations.push("Increase market value or obtain recognition/awards for extraordinary ability");
  }
  if (seniorCaps < 10) {
    recommendations.push(`Earn ${10 - seniorCaps} more senior international caps`);
  }
  if (totalMinutes < MINIMUM_MINUTES_REQUIRED) {
    recommendations.push(`Record ${MINIMUM_MINUTES_REQUIRED - totalMinutes} more verified minutes`);
  }
  
  return {
    score: totalScore,
    status,
    breakdown: { 
      minutesScore: performanceScore, 
      internationalScore: intlScore, 
      leagueScore: marketPercentile, 
      performanceScore: recognitionScore 
    },
    recommendations,
  };
}

export function calculateP1Score(data: ScoringData): VisaScoreResult {
  const { player, metrics, videos, videoInsights, internationalRecords, leagueBand } = data;
  
  const clubMinutes = calculateClubMinutes(player, metrics);
  const intlMinutes = calculateInternationalMinutes(player, internationalRecords);
  const videoMins = calculateVideoMinutes(videos, videoInsights);
  const totalMinutes = clubMinutes + intlMinutes + videoMins;
  
  const minutesScore = Math.min(40, (totalMinutes / MINIMUM_MINUTES_REQUIRED) * 40);
  
  const leagueMultiplier = getLeagueBandMultiplier(leagueBand);
  const leagueScore = 25 * leagueMultiplier;
  
  const videoPerformance = videos.length > 0 ? Math.min(20, videos.length * 4) : 0;
  
  const hasAgent = !!player.agentName;
  const hasContract = !!player.contractEndDate;
  const validationScore = (hasAgent ? 7.5 : 0) + (hasContract ? 7.5 : 0);
  
  const totalScore = Math.round(minutesScore + leagueScore + videoPerformance + validationScore);
  const status = getStatus(totalScore);
  
  const recommendations: string[] = [];
  if (totalMinutes < MINIMUM_MINUTES_REQUIRED) {
    recommendations.push(`Record ${MINIMUM_MINUTES_REQUIRED - totalMinutes} more professional minutes`);
  }
  if (!hasAgent) {
    recommendations.push("Register an agent contact for validation");
  }
  if (videos.length < 5) {
    recommendations.push(`Upload ${5 - videos.length} more performance videos`);
  }
  
  return {
    score: totalScore,
    status,
    breakdown: { 
      minutesScore, 
      internationalScore: 0, 
      leagueScore, 
      performanceScore: videoPerformance + validationScore 
    },
    recommendations,
  };
}

export function calculateUKGBEScore(data: ScoringData): VisaScoreResult {
  const { player, internationalRecords, metrics, videos, videoInsights, leagueBand } = data;
  
  const clubMinutes = calculateClubMinutes(player, metrics);
  const intlMinutes = calculateInternationalMinutes(player, internationalRecords);
  const videoMins = calculateVideoMinutes(videos, videoInsights);
  const totalMinutes = clubMinutes + intlMinutes + videoMins;
  const { senior: seniorCaps, total: totalCaps } = calculateTotalCaps(internationalRecords);
  
  let nationalTeamPoints = 0;
  if (seniorCaps >= 75) nationalTeamPoints = 15;
  else if (seniorCaps >= 50) nationalTeamPoints = 12;
  else if (seniorCaps >= 30) nationalTeamPoints = 10;
  else if (seniorCaps >= 15) nationalTeamPoints = 8;
  else if (seniorCaps >= 5) nationalTeamPoints = 5;
  else if (seniorCaps >= 1) nationalTeamPoints = 3;
  
  let clubLeaguePoints = 0;
  switch (leagueBand) {
    case 1: clubLeaguePoints = 15; break;
    case 2: clubLeaguePoints = 12; break;
    case 3: clubLeaguePoints = 8; break;
    case 4: clubLeaguePoints = 4; break;
    default: clubLeaguePoints = 2;
  }
  
  const continentalApps = player.continentalGames || 0;
  let continentalPoints = 0;
  if (continentalApps >= 20) continentalPoints = 10;
  else if (continentalApps >= 10) continentalPoints = 7;
  else if (continentalApps >= 5) continentalPoints = 4;
  else if (continentalApps >= 1) continentalPoints = 2;
  
  let minutesPoints = 0;
  const domesticMinutes = clubMinutes;
  if (domesticMinutes >= 1800) minutesPoints = 10;
  else if (domesticMinutes >= 1200) minutesPoints = 7;
  else if (domesticMinutes >= 600) minutesPoints = 4;
  else if (domesticMinutes >= 300) minutesPoints = 2;
  
  const gbePoints = nationalTeamPoints + clubLeaguePoints + continentalPoints + minutesPoints;
  
  let status: AmberStatus;
  if (gbePoints >= 15) status = "green";
  else if (gbePoints >= 10) status = "yellow";
  else status = "red";
  
  const normalizedScore = Math.round((gbePoints / 50) * 100);
  
  const recommendations: string[] = [];
  if (gbePoints < 15) {
    const pointsNeeded = 15 - gbePoints;
    recommendations.push(`Need ${pointsNeeded} more GBE points to qualify automatically`);
    
    if (seniorCaps < 5) {
      recommendations.push(`Earn ${5 - seniorCaps} senior international caps (+${5 - seniorCaps > 0 ? 5 : 0} points)`);
    }
    if (domesticMinutes < 600) {
      recommendations.push(`Play ${600 - domesticMinutes} more domestic league minutes (+4 points at 600 mins)`);
    }
    if (totalMinutes < MINIMUM_MINUTES_REQUIRED) {
      recommendations.push(`Record ${MINIMUM_MINUTES_REQUIRED - totalMinutes} more verified minutes`);
    }
  }
  
  return {
    score: normalizedScore,
    status,
    breakdown: { 
      minutesScore: minutesPoints * 2.5, 
      internationalScore: nationalTeamPoints * 2, 
      leagueScore: clubLeaguePoints * 2.5, 
      performanceScore: continentalPoints * 2.5 
    },
    recommendations,
  };
}

export function calculateESCScore(data: ScoringData, gbeResult: VisaScoreResult): VisaScoreResult {
  const { player, metrics, videos, videoInsights, internationalRecords } = data;
  
  const clubMinutes = calculateClubMinutes(player, metrics);
  const intlMinutes = calculateInternationalMinutes(player, internationalRecords);
  const videoMins = calculateVideoMinutes(videos, videoInsights);
  const totalMinutes = clubMinutes + intlMinutes + videoMins;
  const { senior: seniorCaps } = calculateTotalCaps(internationalRecords);
  
  const gbeStatus = gbeResult.status;
  const escEligible = gbeStatus === "yellow";
  
  if (!escEligible) {
    return {
      score: gbeStatus === "green" ? 100 : 0,
      status: gbeStatus === "green" ? "green" : "red",
      breakdown: gbeResult.breakdown,
      recommendations: gbeStatus === "green" 
        ? ["Player qualifies via standard GBE route"] 
        : ["Player must first reach GBE yellow zone (10+ points) for ESC consideration"],
    };
  }
  
  let escScore = 50;
  
  if (seniorCaps >= 3) escScore += 15;
  else if (seniorCaps >= 1) escScore += 10;
  
  if (totalMinutes >= MINIMUM_MINUTES_REQUIRED) escScore += 15;
  else if (totalMinutes >= 500) escScore += 10;
  
  const videoEvidence = videos.length;
  if (videoEvidence >= 10) escScore += 10;
  else if (videoEvidence >= 5) escScore += 7;
  else if (videoEvidence >= 3) escScore += 4;
  
  const performanceMetrics = metrics[0];
  if (performanceMetrics) {
    const goalsAssists = (performanceMetrics.goals || 0) + (performanceMetrics.assists || 0);
    if (goalsAssists >= 15) escScore += 10;
    else if (goalsAssists >= 10) escScore += 7;
    else if (goalsAssists >= 5) escScore += 4;
  }
  
  escScore = Math.min(100, escScore);
  const status = getStatus(escScore);
  
  const recommendations: string[] = [];
  if (seniorCaps < 3) {
    recommendations.push(`Earn ${3 - seniorCaps} more senior caps to strengthen ESC case`);
  }
  if (totalMinutes < MINIMUM_MINUTES_REQUIRED) {
    recommendations.push(`Record ${MINIMUM_MINUTES_REQUIRED - totalMinutes} more verified minutes`);
  }
  if (videoEvidence < 5) {
    recommendations.push(`Upload ${5 - videoEvidence} more video evidence clips`);
  }
  
  return {
    score: escScore,
    status,
    breakdown: gbeResult.breakdown,
    recommendations,
  };
}

export function calculateTransferEligibility(data: ScoringData): TransferEligibilityResult {
  const { player, metrics, videos, videoInsights, internationalRecords } = data;
  
  const clubMinutes = calculateClubMinutes(player, metrics);
  const internationalMinutes = calculateInternationalMinutes(player, internationalRecords);
  const videoMinutes = calculateVideoMinutes(videos, videoInsights);
  const totalMinutesVerified = clubMinutes + internationalMinutes + videoMinutes;
  
  const { total: totalCaps, senior: seniorCaps } = calculateTotalCaps(internationalRecords);
  const continentalAppearances = player.continentalGames || 0;
  
  const schengen = calculateSchengenScore(data);
  const o1 = calculateO1Score(data);
  const p1 = calculateP1Score(data);
  const ukGbe = calculateUKGBEScore(data);
  const esc = calculateESCScore(data, ukGbe);
  
  const scores = [schengen.score, o1.score, p1.score, ukGbe.score, esc.score];
  const maxScore = Math.max(...scores);
  
  let overallStatus: AmberStatus;
  if (totalMinutesVerified >= GREEN_THRESHOLD && maxScore >= 60) {
    overallStatus = "green";
  } else if (totalMinutesVerified >= YELLOW_THRESHOLD || maxScore >= 35) {
    overallStatus = "yellow";
  } else {
    overallStatus = "red";
  }
  
  const minutesNeeded = Math.max(0, MINIMUM_MINUTES_REQUIRED - totalMinutesVerified);
  
  let capsNeeded = 0;
  if (ukGbe.status !== "green" && seniorCaps < 5) {
    capsNeeded = 5 - seniorCaps;
  }
  
  const recommendations: string[] = [];
  
  if (minutesNeeded > 0) {
    recommendations.push(`Play ${minutesNeeded} more minutes to reach minimum ${MINIMUM_MINUTES_REQUIRED} minutes`);
  }
  
  if (capsNeeded > 0) {
    recommendations.push(`Earn ${capsNeeded} more senior international caps for UK GBE eligibility`);
  }
  
  const allRecommendations = Array.from(new Set([
    ...schengen.recommendations,
    ...o1.recommendations,
    ...p1.recommendations,
    ...ukGbe.recommendations,
    ...esc.recommendations,
  ]));
  
  for (let i = 0; i < allRecommendations.length; i++) {
    const rec = allRecommendations[i];
    if (!recommendations.includes(rec)) {
      recommendations.push(rec);
    }
  }
  
  return {
    totalMinutesVerified,
    clubMinutes,
    internationalMinutes,
    videoMinutes,
    totalCaps,
    seniorCaps,
    continentalAppearances,
    overallStatus,
    schengen,
    o1,
    p1,
    ukGbe,
    esc,
    escEligible: ukGbe.status === "yellow",
    minutesNeeded,
    capsNeeded,
    recommendations: recommendations.slice(0, 5),
  };
}
