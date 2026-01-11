export type UserRole = "sporting_director" | "legal" | "scout" | "coach" | "admin";

export type VisaStatus = "green" | "yellow" | "red";

export type VisaType = 
  | "schengen_sports" 
  | "uk_gbe" 
  | "us_p1" 
  | "us_o1" 
  | "fifa_transfer" 
  | "middle_east" 
  | "asia_sports";

export type LeagueBand = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  dateOfBirth: string;
  position: string;
  currentClub: string;
  currentLeague: string;
  leagueBand: LeagueBand;
  leaguePosition: number;
  profileImageUrl?: string;
  nationalTeamCaps: number;
  nationalTeamDebut?: string;
  internationalCaps: number;
  continentalGames: number;
  currentSeasonMinutes: number;
  totalCareerMinutes: number;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  contractEndDate?: string;
  marketValue?: number;
  medicalDataAvailable: boolean;
  gpsDataAvailable: boolean;
  schengenScore: number;
  ukGbeScore: number;
  usP1Score: number;
  usO1Score: number;
  middleEastScore: number;
  asiaScore: number;
  fifaTransferScore: number;
  overallEligibilityScore: number;
  lastUpdated: string;
}

export interface PhysicalData {
  height: number;
  weight: number;
  restingHeartRate?: number;
  vo2Max?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  sprintSpeed?: number;
}

export interface BiometricData {
  id: string;
  playerId: string;
  recordDate: string;
  restingHeartRate?: number;
  vo2Max?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  hydrationLevel?: number;
  sleepQuality?: number;
  fatigueIndex?: number;
  gpsDataAvailable: boolean;
}

export interface MedicalRecord {
  id: string;
  playerId: string;
  recordDate: string;
  recordType: string;
  description?: string;
  fitnessLevel?: string;
  injuryHistory?: any[];
  clearanceStatus?: string;
  expiryDate?: string;
}

export interface PlayerMetrics {
  id: string;
  playerId: string;
  season: string;
  currentSeasonMinutes: number;
  totalCareerMinutes: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  passAccuracy?: number;
  tacklesWon: number;
  aerialDuelsWon: number;
  distanceCovered?: number;
  sprintSpeed?: number;
  clubLeaguePosition?: number;
}

export interface Video {
  id: string;
  playerId: string;
  title: string;
  source: "manual" | "wyscout" | "transfermarkt" | "veo";
  uploadDate: string;
  duration: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  matchDate?: string;
  competition?: string;
  opponent?: string;
  minutesPlayed?: number;
  processed: boolean;
}

export interface VideoInsights {
  id: string;
  videoId: string;
  playerId: string;
  minutesPlayed: number;
  distanceCovered?: number;
  sprintCount: number;
  passesAttempted: number;
  passesCompleted: number;
  shotsOnTarget: number;
  tackles: number;
  interceptions: number;
  duelsWon: number;
  aiAnalysis?: string;
}

export interface TeamSheet {
  id: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  players: string[];
}

export interface VisaEligibility {
  visaType: VisaType;
  visaName: string;
  score: number;
  status: VisaStatus;
  breakdown: EligibilityBreakdown[];
  leagueBandApplied: LeagueBand;
  recommendation: string;
}

export interface EligibilityBreakdown {
  criteria: string;
  points: number;
  maxPoints: number;
  description: string;
}

export interface VisaRule {
  id: string;
  visaType: VisaType;
  country: string;
  category: string;
  ruleName: string;
  description?: string;
  minPoints?: number;
  maxPoints?: number;
  criteria: any;
  leagueBandMultipliers: LeagueBandMultipliers;
  active: boolean;
}

export interface LeagueBandMultipliers {
  band1: number;
  band2: number;
  band3: number;
  band4: number;
  band5: number;
}

export interface ConsularSummary {
  id: string;
  playerId: string;
  generatedAt: string;
  generatedBy: string;
  dataRangeStart: string;
  dataRangeEnd: string;
  eligibilityScore: number;
  status: "draft" | "submitted" | "verified" | "rejected";
  embassyNotified: boolean;
}

export interface ComplianceOrder {
  id: string;
  playerId: string;
  teamId: string;
  requestedBy: string;
  visaType: VisaType;
  targetCountry?: string;
  status: "pending_payment" | "paid" | "processing" | "completed" | "failed";
  amount: number;
  currency: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface ComplianceDocument {
  id: string;
  orderId: string;
  playerId: string;
  documentType: string;
  generatedAt: string;
  generatedBy?: string;
  dataRangeStart?: string;
  dataRangeEnd?: string;
  fileUrl?: string;
  aiSummary?: string;
  playerProfile: PlayerProfile;
  physicalData: PhysicalData;
  performanceStats: PerformanceStats;
  eligibilityData: VisaEligibility[];
  status: "draft" | "generating" | "completed" | "failed";
}

export interface PlayerProfile {
  fullName: string;
  nationality: string;
  dateOfBirth: string;
  position: string;
  currentClub: string;
  currentLeague: string;
  leagueBand: LeagueBand;
  leaguePosition: number;
  contractEndDate?: string;
  marketValue?: number;
}

export interface PerformanceStats {
  totalMinutesPlayed: number;
  currentSeasonMinutes: number;
  gamesPlayed: number;
  goals: number;
  assists: number;
  nationalTeamCaps: number;
  internationalCaps: number;
  continentalGames: number;
  clubLeaguePosition: number;
}

export interface EmbassyVerification {
  id: string;
  documentId: string;
  playerId: string;
  playerName: string;
  clubName: string;
  submittedAt: string;
  status: "pending" | "under_review" | "approved" | "rejected";
  visaType: VisaType;
  targetCountry: string;
  verificationCode?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface ScoutingInquiry {
  id: string;
  playerId: string;
  buyingClub: string;
  sellingClub: string;
  status: "inquiry" | "negotiation" | "due_diligence" | "closed";
  complianceScore: number;
  createdAt: string;
  lastMessage?: string;
}

export interface DashboardStats {
  totalPlayers: number;
  greenStatus: number;
  yellowStatus: number;
  redStatus: number;
  pendingVerifications: number;
  activeInquiries: number;
  reportsGenerated: number;
}

export interface Team {
  id: string;
  name: string;
  clubName?: string;
  country?: string;
  leagueBand: LeagueBand;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  country: string;
  league: string;
  leagueBand: LeagueBand;
  leaguePosition?: number;
  continentalCompetition?: string;
  fifaRanking?: number;
}

export interface Payment {
  id: string;
  orderId: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded";
  createdAt: string;
  completedAt?: string;
}

export const VISA_TYPES: { type: VisaType; name: string; country: string }[] = [
  { type: "schengen_sports", name: "Schengen Sports Visa", country: "EU" },
  { type: "uk_gbe", name: "UK GBE Points System", country: "UK" },
  { type: "us_p1", name: "US P-1 Athlete Visa", country: "USA" },
  { type: "us_o1", name: "US O-1 Extraordinary Ability", country: "USA" },
  { type: "fifa_transfer", name: "FIFA Transfer Rules", country: "Global" },
  { type: "middle_east", name: "Middle East Sports Visa", country: "UAE/Saudi" },
  { type: "asia_sports", name: "Asia Sports Visa", country: "Asia" },
];

export const LEAGUE_BANDS: { band: LeagueBand; description: string; examples: string }[] = [
  { band: 1, description: "Top 5 European Leagues", examples: "EPL, La Liga, Bundesliga, Serie A, Ligue 1" },
  { band: 2, description: "Strong European Leagues", examples: "Eredivisie, Portuguese Liga, Belgian Pro League" },
  { band: 3, description: "Mid-tier European & Top Other", examples: "Scottish Prem, Turkish Super Lig, MLS" },
  { band: 4, description: "Developing Leagues", examples: "Championship, Liga MX, A-League" },
  { band: 5, description: "Emerging Markets", examples: "African Leagues, Asian Leagues, Lower divisions" },
];

export const COMPLIANCE_DOCUMENT_PRICE = 49.99;
