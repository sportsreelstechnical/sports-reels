import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("scout"),
  teamId: varchar("team_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clubName: text("club_name"),
  country: text("country"),
  leagueBand: integer("league_band").default(3),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  country: text("country").notNull(),
  league: text("league").notNull(),
  leagueBand: integer("league_band").notNull().default(3),
  leaguePosition: integer("league_position"),
  continentalCompetition: text("continental_competition"),
  fifaRanking: integer("fifa_ranking"),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  nationality: text("nationality").notNull(),
  secondNationality: text("second_nationality"),
  dateOfBirth: text("date_of_birth"),
  birthPlace: text("birth_place"),
  position: text("position").notNull(),
  secondaryPosition: text("secondary_position"),
  currentClubId: varchar("current_club_id"),
  currentClubName: text("current_club_name"),
  profileImageUrl: text("profile_image_url"),
  nationalTeamCaps: integer("national_team_caps").default(0),
  nationalTeamDebut: text("national_team_debut"),
  nationalTeamGoals: integer("national_team_goals").default(0),
  continentalGames: integer("continental_games").default(0),
  internationalCaps: integer("international_caps").default(0),
  internationalGoals: integer("international_goals").default(0),
  height: integer("height"),
  heightUnit: text("height_unit").default("cm"),
  weight: integer("weight"),
  weightUnit: text("weight_unit").default("kg"),
  wingspan: integer("wingspan"),
  preferredFoot: text("preferred_foot"),
  bmi: doublePrecision("bmi"),
  contractEndDate: text("contract_end_date"),
  marketValue: doublePrecision("market_value"),
  jerseyNumber: integer("jersey_number"),
  agentName: text("agent_name"),
  agentContact: text("agent_contact"),
  clubMinutesCurrentSeason: integer("club_minutes_current_season").default(0),
  clubMinutesLast12Months: integer("club_minutes_last_12_months").default(0),
  internationalMinutesCurrentSeason: integer("international_minutes_current_season").default(0),
  internationalMinutesLast12Months: integer("international_minutes_last_12_months").default(0),
  totalCareerMinutes: integer("total_career_minutes").default(0),
  profileDocumentUrl: text("profile_document_url"),
  teamId: varchar("team_id"),
  isPublishedToScouts: boolean("is_published_to_scouts").default(false),
  publishedAt: timestamp("published_at"),
  publishExpiresAt: timestamp("publish_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playerMetrics = pgTable("player_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  season: text("season").notNull(),
  currentSeasonMinutes: integer("current_season_minutes").default(0),
  totalCareerMinutes: integer("total_career_minutes").default(0),
  gamesPlayed: integer("games_played").default(0),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCards: integer("red_cards").default(0),
  passAccuracy: doublePrecision("pass_accuracy"),
  tacklesWon: integer("tackles_won").default(0),
  aerialDuelsWon: integer("aerial_duels_won").default(0),
  distanceCovered: doublePrecision("distance_covered"),
  sprintSpeed: doublePrecision("sprint_speed"),
  clubLeaguePosition: integer("club_league_position"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicalRecords = pgTable("medical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  recordDate: timestamp("record_date").defaultNow(),
  recordType: text("record_type").notNull(),
  description: text("description"),
  fitnessLevel: text("fitness_level"),
  injuryHistory: jsonb("injury_history"),
  clearanceStatus: text("clearance_status"),
  expiryDate: text("expiry_date"),
});

export const biometricData = pgTable("biometric_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  recordDate: timestamp("record_date").defaultNow(),
  restingHeartRate: integer("resting_heart_rate"),
  vo2Max: doublePrecision("vo2_max"),
  bodyFatPercentage: doublePrecision("body_fat_percentage"),
  muscleMass: doublePrecision("muscle_mass"),
  hydrationLevel: doublePrecision("hydration_level"),
  sleepQuality: doublePrecision("sleep_quality"),
  fatigueIndex: doublePrecision("fatigue_index"),
  gpsDataAvailable: boolean("gps_data_available").default(false),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  title: text("title").notNull(),
  source: text("source").notNull().default("manual"),
  uploadDate: timestamp("upload_date").defaultNow(),
  duration: text("duration"),
  fileUrl: text("file_url"),
  thumbnailUrl: text("thumbnail_url"),
  matchDate: text("match_date"),
  competition: text("competition"),
  opponent: text("opponent"),
  minutesPlayed: integer("minutes_played"),
  processed: boolean("processed").default(false),
  teamId: varchar("team_id"),
  teamSheetId: varchar("team_sheet_id"),
});

export const videoInsights = pgTable("video_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  playerId: varchar("player_id").notNull(),
  minutesPlayed: integer("minutes_played").default(0),
  distanceCovered: doublePrecision("distance_covered"),
  sprintCount: integer("sprint_count").default(0),
  passesAttempted: integer("passes_attempted").default(0),
  passesCompleted: integer("passes_completed").default(0),
  shotsOnTarget: integer("shots_on_target").default(0),
  tackles: integer("tackles").default(0),
  interceptions: integer("interceptions").default(0),
  duelsWon: integer("duels_won").default(0),
  heatmapData: jsonb("heatmap_data"),
  aiAnalysis: text("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visaRules = pgTable("visa_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visaType: text("visa_type").notNull(),
  country: text("country").notNull(),
  category: text("category").notNull(),
  ruleName: text("rule_name").notNull(),
  description: text("description"),
  minPoints: integer("min_points"),
  maxPoints: integer("max_points"),
  criteria: jsonb("criteria"),
  leagueBandMultipliers: jsonb("league_band_multipliers"),
  active: boolean("active").default(true),
});

export const eligibilityScores = pgTable("eligibility_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  visaType: text("visa_type").notNull(),
  score: doublePrecision("score").notNull(),
  status: text("status").notNull(),
  breakdown: jsonb("breakdown"),
  leagueBandApplied: integer("league_band_applied"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  validUntil: timestamp("valid_until"),
});

export const transferEligibilityAssessments = pgTable("transfer_eligibility_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  totalMinutesVerified: integer("total_minutes_verified").default(0),
  clubMinutes: integer("club_minutes").default(0),
  internationalMinutes: integer("international_minutes").default(0),
  videoMinutes: integer("video_minutes").default(0),
  totalCaps: integer("total_caps").default(0),
  seniorCaps: integer("senior_caps").default(0),
  continentalAppearances: integer("continental_appearances").default(0),
  overallStatus: text("overall_status").notNull().default("red"),
  schengenScore: doublePrecision("schengen_score").default(0),
  schengenStatus: text("schengen_status").default("red"),
  o1Score: doublePrecision("o1_score").default(0),
  o1Status: text("o1_status").default("red"),
  p1Score: doublePrecision("p1_score").default(0),
  p1Status: text("p1_status").default("red"),
  ukGbeScore: doublePrecision("uk_gbe_score").default(0),
  ukGbeStatus: text("uk_gbe_status").default("red"),
  escScore: doublePrecision("esc_score").default(0),
  escStatus: text("esc_status").default("red"),
  escEligible: boolean("esc_eligible").default(false),
  minutesNeeded: integer("minutes_needed").default(0),
  capsNeeded: integer("caps_needed").default(0),
  recommendations: jsonb("recommendations"),
  visaBreakdown: jsonb("visa_breakdown"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  validUntil: timestamp("valid_until"),
});

export const transferReports = pgTable("transfer_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  generatedBy: varchar("generated_by"),
  generatedByName: text("generated_by_name"),
  reportType: text("report_type").notNull().default("comprehensive"),
  status: text("status").notNull().default("draft"),
  dataRangeStart: timestamp("data_range_start"),
  dataRangeEnd: timestamp("data_range_end"),
  playerProfile: jsonb("player_profile"),
  internationalCareer: jsonb("international_career"),
  performanceStats: jsonb("performance_stats"),
  eligibilityScores: jsonb("eligibility_scores"),
  videosIncluded: jsonb("videos_included"),
  documentsIncluded: jsonb("documents_included"),
  invitationLetters: jsonb("invitation_letters"),
  embassyVerifications: jsonb("embassy_verifications"),
  totalMinutesVerified: integer("total_minutes_verified").default(0),
  overallEligibilityStatus: text("overall_eligibility_status"),
  recommendations: jsonb("recommendations"),
  fileUrl: text("file_url"),
  verificationCode: text("verification_code"),
  embassyNotified: boolean("embassy_notified").default(false),
  embassyNotifiedAt: timestamp("embassy_notified_at"),
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until"),
});

export const complianceOrders = pgTable("compliance_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  visaType: text("visa_type").notNull(),
  targetCountry: text("target_country"),
  status: text("status").notNull().default("pending_payment"),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").default("USD"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const complianceDocuments = pgTable("compliance_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  playerId: varchar("player_id").notNull(),
  documentType: text("document_type").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: varchar("generated_by"),
  dataRangeStart: text("data_range_start"),
  dataRangeEnd: text("data_range_end"),
  fileUrl: text("file_url"),
  aiSummary: text("ai_summary"),
  playerProfile: jsonb("player_profile"),
  physicalData: jsonb("physical_data"),
  performanceStats: jsonb("performance_stats"),
  eligibilityData: jsonb("eligibility_data"),
  status: text("status").default("draft"),
});

export const embassyVerifications = pgTable("embassy_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  playerId: varchar("player_id").notNull(),
  embassyCountry: text("embassy_country").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  status: text("status").default("pending"),
  verificationCode: text("verification_code"),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
});

export const scoutingInquiries = pgTable("scouting_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  buyingClubId: varchar("buying_club_id"),
  sellingClubId: varchar("selling_club_id"),
  buyingClubName: text("buying_club_name").notNull(),
  sellingClubName: text("selling_club_name").notNull(),
  status: text("status").default("inquiry"),
  complianceScore: doublePrecision("compliance_score"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCustomerId: text("stripe_customer_id"),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").default("USD"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const embassyProfiles = pgTable("embassy_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: text("country").notNull(),
  jurisdiction: text("jurisdiction"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  userId: varchar("user_id"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invitationLetters = pgTable("invitation_letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  fromTeamId: varchar("from_team_id").notNull(),
  targetClubName: text("target_club_name").notNull(),
  targetClubAddress: text("target_club_address"),
  targetLeague: text("target_league").notNull(),
  targetLeagueBand: integer("target_league_band").notNull(),
  targetCountry: text("target_country").notNull(),
  trialStartDate: text("trial_start_date"),
  trialEndDate: text("trial_end_date"),
  offerType: text("offer_type").default("trial"),
  scoutAgentName: text("scout_agent_name"),
  scoutAgentId: varchar("scout_agent_id"),
  fileUrl: text("file_url"),
  federationLetterRequestId: varchar("federation_letter_request_id"),
  federationLetterDocumentUrl: text("federation_letter_document_url"),
  status: text("status").default("pending"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: varchar("uploaded_by"),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  recalculatedEligibility: jsonb("recalculated_eligibility"),
  consularReportGenerated: boolean("consular_report_generated").default(false),
  consularReportUrl: text("consular_report_url"),
  qrCodeData: text("qr_code_data"),
  embassyAccessible: boolean("embassy_accessible").default(false),
  embassyNotifiedAt: timestamp("embassy_notified_at"),
  embassyNotificationStatus: text("embassy_notification_status").default("not_notified"),
  embassyNotifiedBy: varchar("embassy_notified_by"),
  embassyNotificationTokensSpent: integer("embassy_notification_tokens_spent"),
});

export const consularReports = pgTable("consular_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitationLetterId: varchar("invitation_letter_id").notNull(),
  playerId: varchar("player_id").notNull(),
  playerProfile: jsonb("player_profile"),
  playerStats: jsonb("player_stats"),
  eligibilityScores: jsonb("eligibility_scores"),
  videoQrCodes: jsonb("video_qr_codes"),
  proofOfPlaySummary: text("proof_of_play_summary"),
  targetClubDetails: jsonb("target_club_details"),
  verificationCode: varchar("verification_code").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until"),
  accessedByEmbassy: boolean("accessed_by_embassy").default(false),
  embassyAccessLogs: jsonb("embassy_access_logs"),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"),
  playerId: varchar("player_id"),
  inquiryId: varchar("inquiry_id"),
  type: text("type").notNull().default("general"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"),
  readBy: jsonb("read_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const embassyDocumentAccess = pgTable("embassy_document_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  embassyProfileId: varchar("embassy_profile_id").notNull(),
  accessedAt: timestamp("accessed_at").defaultNow(),
  accessedBy: varchar("accessed_by"),
  accessType: text("access_type").default("view"),
  ipAddress: text("ip_address"),
});

export const sharedVideos = pgTable("shared_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  sharedWithUserId: varchar("shared_with_user_id"),
  sharedWithRole: text("shared_with_role"),
  sharedByUserId: varchar("shared_by_user_id").notNull(),
  playerId: varchar("player_id").notNull(),
  accessLevel: text("access_level").default("view"),
  sharedAt: timestamp("shared_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const videoTags = pgTable("video_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  tagType: text("tag_type").notNull(),
  tagValue: text("tag_value").notNull(),
  timestamp: text("timestamp"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const actionLogs = pgTable("action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userRole: text("user_role"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const transferTargets = pgTable("transfer_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  complianceOrderId: varchar("compliance_order_id").notNull(),
  playerId: varchar("player_id").notNull(),
  targetClubName: text("target_club_name").notNull(),
  targetLeague: text("target_league").notNull(),
  targetCountry: text("target_country").notNull(),
  targetLeagueBand: integer("target_league_band").notNull(),
  invitationLetterId: varchar("invitation_letter_id"),
  scoutAgentId: varchar("scout_agent_id"),
  proposedTransferFee: doublePrecision("proposed_transfer_fee"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoPlayerTags = pgTable("video_player_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  playerId: varchar("player_id").notNull(),
  minutesPlayed: integer("minutes_played").default(0),
  position: text("position"),
  performanceRating: doublePrecision("performance_rating"),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  passesCompleted: integer("passes_completed").default(0),
  passesAttempted: integer("passes_attempted").default(0),
  tackles: integer("tackles").default(0),
  interceptions: integer("interceptions").default(0),
  saves: integer("saves").default(0),
  shotsOnTarget: integer("shots_on_target").default(0),
  distanceCovered: doublePrecision("distance_covered"),
  sprintCount: integer("sprint_count").default(0),
  duelsWon: integer("duels_won").default(0),
  duelsLost: integer("duels_lost").default(0),
  aiAnalysis: text("ai_analysis"),
  positionalMetrics: jsonb("positional_metrics"),
  keyMoments: jsonb("key_moments"),
  strengths: text("strengths").array(),
  areasToImprove: text("areas_to_improve").array(),
  analyzed: boolean("analyzed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerInternationalRecords = pgTable("player_international_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  nationalTeam: text("national_team").notNull(),
  teamLevel: text("team_level").default("senior"),
  caps: integer("caps").default(0),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  debutDate: text("debut_date"),
  lastAppearance: text("last_appearance"),
  competitionLevel: text("competition_level"),
  majorTournaments: text("major_tournaments").array(),
  documentUrl: text("document_url"),
  verificationStatus: text("verification_status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamSheets = pgTable("team_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  title: text("title").notNull(),
  matchDate: text("match_date").notNull(),
  kickoffTime: text("kickoff_time"),
  competition: text("competition").notNull(),
  competitionType: text("competition_type").default("league"),
  stadium: text("stadium"),
  homeTeam: text("home_team"),
  awayTeam: text("away_team"),
  isHome: boolean("is_home").default(true),
  referee: text("referee"),
  assistantReferees: text("assistant_referees"),
  fourthOfficial: text("fourth_official"),
  formation: text("formation").default("4-3-3"),
  matchResult: text("match_result"),
  notes: text("notes"),
  videoId: varchar("video_id"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamSheetPlayers = pgTable("team_sheet_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamSheetId: varchar("team_sheet_id").notNull(),
  playerId: varchar("player_id").notNull(),
  role: text("role").notNull().default("starting"),
  shirtNumber: integer("shirt_number"),
  position: text("position"),
  positionOrder: integer("position_order"),
  minutesPlayed: integer("minutes_played").default(0),
  substituteIn: integer("substitute_in"),
  substituteOut: integer("substitute_out"),
  goals: integer("goals").default(0),
  assists: integer("assists").default(0),
  yellowCards: integer("yellow_cards").default(0),
  redCard: boolean("red_card").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerDocuments = pgTable("player_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  documentType: text("document_type").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  storageKey: text("storage_key").notNull(),
  objectPath: text("object_path"),
  verificationStatus: text("verification_status").default("pending"),
  verifiedBy: varchar("verified_by"),
  verifiedAt: timestamp("verified_at"),
  expiryDate: text("expiry_date"),
  documentNumber: text("document_number"),
  issuingCountry: text("issuing_country"),
  notes: text("notes"),
  uploadedBy: varchar("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const federationLetterRequests = pgTable("federation_letter_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: text("request_number").notNull(),
  teamId: varchar("team_id").notNull(),
  playerId: varchar("player_id").notNull(),
  federationId: varchar("federation_id"),
  passportDocumentId: varchar("passport_document_id"),
  status: text("status").notNull().default("pending"),
  federationName: text("federation_name"),
  federationCountry: text("federation_country"),
  athleteFullName: text("athlete_full_name").notNull(),
  athleteNationality: text("athlete_nationality").notNull(),
  athleteDateOfBirth: text("athlete_date_of_birth"),
  athletePosition: text("athlete_position"),
  targetClubName: text("target_club_name").notNull(),
  targetClubCountry: text("target_club_country").notNull(),
  transferType: text("transfer_type").notNull(),
  invitationLetterStorageKey: text("invitation_letter_storage_key"),
  invitationLetterObjectPath: text("invitation_letter_object_path"),
  invitationLetterOriginalName: text("invitation_letter_original_name"),
  requestPurpose: text("request_purpose"),
  additionalNotes: text("additional_notes"),
  feeAmount: doublePrecision("fee_amount").default(0),
  serviceCharge: doublePrecision("service_charge").default(0),
  totalAmount: doublePrecision("total_amount").default(0),
  paymentStatus: text("payment_status").default("unpaid"),
  paymentId: varchar("payment_id"),
  paymentConfirmedAt: timestamp("payment_confirmed_at"),
  submittedBy: varchar("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  issuedDocumentStorageKey: text("issued_document_storage_key"),
  issuedDocumentObjectPath: text("issued_document_object_path"),
  issuedDocumentOriginalName: text("issued_document_original_name"),
  issuedAt: timestamp("issued_at"),
  issuedBy: varchar("issued_by"),
  rejectionReason: text("rejection_reason"),
  notificationsSent: jsonb("notifications_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scoutShortlists = pgTable("scout_shortlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scoutId: varchar("scout_id").notNull(),
  playerId: varchar("player_id").notNull(),
  priority: text("priority").notNull().default("green"),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  teamId: true,
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  clubName: true,
  country: true,
  leagueBand: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({ id: true });

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPlayerMetricsSchema = createInsertSchema(playerMetrics).omit({ id: true, updatedAt: true });

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true });

export const insertBiometricDataSchema = createInsertSchema(biometricData).omit({ id: true });

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, uploadDate: true });

export const insertVideoInsightsSchema = createInsertSchema(videoInsights).omit({ id: true, createdAt: true });

export const insertVisaRuleSchema = createInsertSchema(visaRules).omit({ id: true });

export const insertEligibilityScoreSchema = createInsertSchema(eligibilityScores).omit({ id: true, calculatedAt: true });

export const insertTransferEligibilityAssessmentSchema = createInsertSchema(transferEligibilityAssessments).omit({ id: true, calculatedAt: true });

export const insertTransferReportSchema = createInsertSchema(transferReports).omit({ id: true, generatedAt: true });

export const insertComplianceOrderSchema = createInsertSchema(complianceOrders).omit({ id: true, createdAt: true });

export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({ id: true, generatedAt: true });

export const insertEmbassyVerificationSchema = createInsertSchema(embassyVerifications).omit({ id: true, submittedAt: true });

export const insertScoutingInquirySchema = createInsertSchema(scoutingInquiries).omit({ id: true, createdAt: true, updatedAt: true });

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });

export const insertEmbassyProfileSchema = createInsertSchema(embassyProfiles).omit({ id: true, createdAt: true });

export const insertInvitationLetterSchema = createInsertSchema(invitationLetters).omit({ id: true, uploadedAt: true });

export const insertConsularReportSchema = createInsertSchema(consularReports).omit({ id: true, generatedAt: true });

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({ id: true, joinedAt: true });

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export const insertEmbassyDocumentAccessSchema = createInsertSchema(embassyDocumentAccess).omit({ id: true, accessedAt: true });

export const insertSharedVideoSchema = createInsertSchema(sharedVideos).omit({ id: true, sharedAt: true });

export const insertVideoTagSchema = createInsertSchema(videoTags).omit({ id: true, createdAt: true });

export const insertActionLogSchema = createInsertSchema(actionLogs).omit({ id: true, timestamp: true });

export const insertTransferTargetSchema = createInsertSchema(transferTargets).omit({ id: true, createdAt: true });

export const insertVideoPlayerTagSchema = createInsertSchema(videoPlayerTags).omit({ id: true, createdAt: true });

export const insertPlayerInternationalRecordSchema = createInsertSchema(playerInternationalRecords).omit({ id: true, createdAt: true, updatedAt: true });

export const insertTeamSheetSchema = createInsertSchema(teamSheets).omit({ id: true, createdAt: true, updatedAt: true });

export const insertTeamSheetPlayerSchema = createInsertSchema(teamSheetPlayers).omit({ id: true, createdAt: true });

export const insertPlayerDocumentSchema = createInsertSchema(playerDocuments).omit({ id: true, uploadedAt: true });

export const insertFederationLetterRequestSchema = createInsertSchema(federationLetterRequests).omit({ id: true, createdAt: true, updatedAt: true });

export const insertScoutShortlistSchema = createInsertSchema(scoutShortlists).omit({ id: true, addedAt: true, updatedAt: true });

export const federationProfiles = pgTable("federation_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  website: text("website"),
  logoUrl: text("logo_url"),
  defaultFee: doublePrecision("default_fee").default(150),
  platformServiceCharge: doublePrecision("platform_service_charge").default(25),
  isActive: boolean("is_active").default(true),
  totalDocumentsProcessed: integer("total_documents_processed").default(0),
  totalRevenueReceived: doublePrecision("total_revenue_received").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const federationFeeSchedules = pgTable("federation_fee_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  federationId: varchar("federation_id").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  baseFee: doublePrecision("base_fee").notNull(),
  platformServiceCharge: doublePrecision("platform_service_charge").default(25),
  currency: text("currency").default("USD"),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const federationRequestActivities = pgTable("federation_request_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(),
  federationId: varchar("federation_id"),
  actorId: varchar("actor_id"),
  actorName: text("actor_name"),
  actorRole: text("actor_role"),
  activityType: text("activity_type").notNull(),
  description: text("description"),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const federationRequestMessages = pgTable("federation_request_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull(),
  senderPortal: text("sender_portal").notNull(),
  recipientPortal: text("recipient_portal").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  attachmentStorageKey: text("attachment_storage_key"),
  attachmentOriginalName: text("attachment_original_name"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const federationIssuedDocuments = pgTable("federation_issued_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number"),
  storageKey: text("storage_key").notNull(),
  objectPath: text("object_path"),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  issuedBy: varchar("issued_by").notNull(),
  issuedByName: text("issued_by_name"),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  notes: text("notes"),
  downloadCount: integer("download_count").default(0),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFederationProfileSchema = createInsertSchema(federationProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFederationFeeScheduleSchema = createInsertSchema(federationFeeSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFederationRequestActivitySchema = createInsertSchema(federationRequestActivities).omit({ id: true, timestamp: true });
export const insertFederationRequestMessageSchema = createInsertSchema(federationRequestMessages).omit({ id: true, createdAt: true });
export const insertFederationIssuedDocumentSchema = createInsertSchema(federationIssuedDocuments).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayerMetrics = z.infer<typeof insertPlayerMetricsSchema>;
export type PlayerMetrics = typeof playerMetrics.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertBiometricData = z.infer<typeof insertBiometricDataSchema>;
export type BiometricData = typeof biometricData.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideoInsights = z.infer<typeof insertVideoInsightsSchema>;
export type VideoInsights = typeof videoInsights.$inferSelect;
export type InsertVisaRule = z.infer<typeof insertVisaRuleSchema>;
export type VisaRule = typeof visaRules.$inferSelect;
export type InsertEligibilityScore = z.infer<typeof insertEligibilityScoreSchema>;
export type EligibilityScore = typeof eligibilityScores.$inferSelect;
export type InsertTransferEligibilityAssessment = z.infer<typeof insertTransferEligibilityAssessmentSchema>;
export type TransferEligibilityAssessment = typeof transferEligibilityAssessments.$inferSelect;
export type InsertTransferReport = z.infer<typeof insertTransferReportSchema>;
export type TransferReport = typeof transferReports.$inferSelect;
export type InsertComplianceOrder = z.infer<typeof insertComplianceOrderSchema>;
export type ComplianceOrder = typeof complianceOrders.$inferSelect;
export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertEmbassyVerification = z.infer<typeof insertEmbassyVerificationSchema>;
export type EmbassyVerification = typeof embassyVerifications.$inferSelect;
export type InsertScoutingInquiry = z.infer<typeof insertScoutingInquirySchema>;
export type ScoutingInquiry = typeof scoutingInquiries.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertEmbassyProfile = z.infer<typeof insertEmbassyProfileSchema>;
export type EmbassyProfile = typeof embassyProfiles.$inferSelect;
export type InsertInvitationLetter = z.infer<typeof insertInvitationLetterSchema>;
export type InvitationLetter = typeof invitationLetters.$inferSelect;
export type InsertConsularReport = z.infer<typeof insertConsularReportSchema>;
export type ConsularReport = typeof consularReports.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertEmbassyDocumentAccess = z.infer<typeof insertEmbassyDocumentAccessSchema>;
export type EmbassyDocumentAccess = typeof embassyDocumentAccess.$inferSelect;
export type InsertSharedVideo = z.infer<typeof insertSharedVideoSchema>;
export type SharedVideo = typeof sharedVideos.$inferSelect;
export type InsertVideoTag = z.infer<typeof insertVideoTagSchema>;
export type VideoTag = typeof videoTags.$inferSelect;
export type InsertActionLog = z.infer<typeof insertActionLogSchema>;
export type ActionLog = typeof actionLogs.$inferSelect;
export type InsertTransferTarget = z.infer<typeof insertTransferTargetSchema>;
export type TransferTarget = typeof transferTargets.$inferSelect;
export type InsertVideoPlayerTag = z.infer<typeof insertVideoPlayerTagSchema>;
export type VideoPlayerTag = typeof videoPlayerTags.$inferSelect;
export type InsertPlayerInternationalRecord = z.infer<typeof insertPlayerInternationalRecordSchema>;
export type PlayerInternationalRecord = typeof playerInternationalRecords.$inferSelect;
export type InsertTeamSheet = z.infer<typeof insertTeamSheetSchema>;
export type TeamSheet = typeof teamSheets.$inferSelect;
export type InsertTeamSheetPlayer = z.infer<typeof insertTeamSheetPlayerSchema>;
export type TeamSheetPlayer = typeof teamSheetPlayers.$inferSelect;
export type InsertPlayerDocument = z.infer<typeof insertPlayerDocumentSchema>;
export type PlayerDocument = typeof playerDocuments.$inferSelect;
export type InsertFederationLetterRequest = z.infer<typeof insertFederationLetterRequestSchema>;
export type FederationLetterRequest = typeof federationLetterRequests.$inferSelect;
export type InsertFederationProfile = z.infer<typeof insertFederationProfileSchema>;
export type FederationProfile = typeof federationProfiles.$inferSelect;
export type InsertFederationFeeSchedule = z.infer<typeof insertFederationFeeScheduleSchema>;
export type FederationFeeSchedule = typeof federationFeeSchedules.$inferSelect;
export type InsertFederationRequestActivity = z.infer<typeof insertFederationRequestActivitySchema>;
export type FederationRequestActivity = typeof federationRequestActivities.$inferSelect;
export type InsertFederationRequestMessage = z.infer<typeof insertFederationRequestMessageSchema>;
export type FederationRequestMessage = typeof federationRequestMessages.$inferSelect;
export type InsertFederationIssuedDocument = z.infer<typeof insertFederationIssuedDocumentSchema>;
export type FederationIssuedDocument = typeof federationIssuedDocuments.$inferSelect;
export type InsertScoutShortlist = z.infer<typeof insertScoutShortlistSchema>;
export type ScoutShortlist = typeof scoutShortlists.$inferSelect;

// Token System Tables
export const tokenBalances = pgTable("token_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0),
  lifetimePurchased: integer("lifetime_purchased").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tokenTransactions = pgTable("token_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'credit' | 'debit'
  action: text("action").notNull(), // 'purchase', 'welcome_bonus', 'view_profile', 'shortlist', 'video_analysis', 'watch_video', 'contact_request', 'expired'
  description: text("description"),
  playerId: varchar("player_id"),
  videoId: varchar("video_id"),
  packId: varchar("pack_id"),
  balanceAfter: integer("balance_after").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tokenPacks = pgTable("token_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tokens: integer("tokens").notNull(),
  priceUsd: integer("price_usd").notNull(), // stored in cents
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tokenPurchases = pgTable("token_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  packId: varchar("pack_id").notNull(),
  tokens: integer("tokens").notNull(),
  amountPaid: integer("amount_paid").notNull(), // in cents
  currency: text("currency").default("USD"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerShareLinks = pgTable("player_share_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  shareToken: text("share_token").notNull().unique(),
  createdBy: varchar("created_by").notNull(),
  tokensSpent: integer("tokens_spent").notNull().default(10),
  viewCount: integer("view_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTokenBalanceSchema = createInsertSchema(tokenBalances).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({ id: true, createdAt: true });
export const insertTokenPackSchema = createInsertSchema(tokenPacks).omit({ id: true, createdAt: true });
export const insertTokenPurchaseSchema = createInsertSchema(tokenPurchases).omit({ id: true, createdAt: true });
export const insertPlayerShareLinkSchema = createInsertSchema(playerShareLinks).omit({ id: true, createdAt: true });

export type InsertTokenBalance = z.infer<typeof insertTokenBalanceSchema>;
export type TokenBalance = typeof tokenBalances.$inferSelect;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenPack = z.infer<typeof insertTokenPackSchema>;
export type TokenPack = typeof tokenPacks.$inferSelect;
export type InsertTokenPurchase = z.infer<typeof insertTokenPurchaseSchema>;
export type TokenPurchase = typeof tokenPurchases.$inferSelect;
export type InsertPlayerShareLink = z.infer<typeof insertPlayerShareLinkSchema>;
export type PlayerShareLink = typeof playerShareLinks.$inferSelect;

// Embassy Notifications and Document Verification
export const embassyNotifications = pgTable("embassy_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitationLetterId: varchar("invitation_letter_id").notNull(),
  playerId: varchar("player_id").notNull(),
  teamId: varchar("team_id").notNull(),
  embassyCountry: text("embassy_country").notNull(),
  status: text("status").notNull().default("pending"),
  tokensSpent: integer("tokens_spent").notNull().default(4),
  notifiedBy: varchar("notified_by"),
  viewedAt: timestamp("viewed_at"),
  viewedBy: varchar("viewed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentVerifications = pgTable("document_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: text("document_type").notNull(),
  documentId: varchar("document_id").notNull(),
  sourceType: text("source_type").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"),
  aiVerdict: text("ai_verdict"),
  aiConfidence: doublePrecision("ai_confidence"),
  aiAnalysis: text("ai_analysis"),
  isSystemVerified: boolean("is_system_verified").default(false),
  systemVerificationNote: text("system_verification_note"),
  lastCheckedAt: timestamp("last_checked_at").defaultNow(),
  checkedBy: varchar("checked_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmbassyNotificationSchema = createInsertSchema(embassyNotifications).omit({ id: true, createdAt: true });
export const insertDocumentVerificationSchema = createInsertSchema(documentVerifications).omit({ id: true, createdAt: true });

export type InsertEmbassyNotification = z.infer<typeof insertEmbassyNotificationSchema>;
export type EmbassyNotification = typeof embassyNotifications.$inferSelect;
export type InsertDocumentVerification = z.infer<typeof insertDocumentVerificationSchema>;
export type DocumentVerification = typeof documentVerifications.$inferSelect;

// Document Version Control - tracks all versions of player documents
export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  storageKey: text("storage_key").notNull(),
  objectPath: text("object_path"),
  changeReason: text("change_reason"),
  uploadedBy: varchar("uploaded_by"),
  isCurrent: boolean("is_current").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Audit Logs - tracks all actions on documents for compliance
export const documentAuditLogs = pgTable("document_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").notNull(),
  playerId: varchar("player_id"),
  teamId: varchar("team_id"),
  action: text("action").notNull(), // 'created', 'viewed', 'downloaded', 'updated', 'verified', 'rejected', 'deleted', 'restored', 'version_created'
  actorId: varchar("actor_id"),
  actorName: text("actor_name"),
  actorRole: text("actor_role"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({ id: true, createdAt: true });
export const insertDocumentAuditLogSchema = createInsertSchema(documentAuditLogs).omit({ id: true, timestamp: true });

export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentAuditLog = z.infer<typeof insertDocumentAuditLogSchema>;
export type DocumentAuditLog = typeof documentAuditLogs.$inferSelect;

// ==================== PLATFORM ADMIN PORTAL TABLES ====================

// Password Reset Tokens - for secure password recovery
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Message Inbox - receives scout-to-player messages for offline processing
export const adminMessageInbox = pgTable("admin_message_inbox", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalMessageId: varchar("original_message_id").notNull(),
  conversationId: varchar("conversation_id").notNull(),
  playerId: varchar("player_id"),
  playerName: text("player_name"),
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name"),
  senderRole: text("sender_role").notNull(),
  recipientTeamId: varchar("recipient_team_id"),
  recipientTeamName: text("recipient_team_name"),
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").notNull().default("unread"), // 'unread', 'read', 'replied', 'archived', 'flagged'
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Platform Analytics Metrics - stores daily aggregated platform usage data
export const platformMetrics = pgTable("platform_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricDate: text("metric_date").notNull(),
  activeUsersDaily: integer("active_users_daily").default(0),
  activeUsersMonthly: integer("active_users_monthly").default(0),
  newUsersDaily: integer("new_users_daily").default(0),
  totalUsers: integer("total_users").default(0),
  totalTeams: integer("total_teams").default(0),
  totalPlayers: integer("total_players").default(0),
  totalScouts: integer("total_scouts").default(0),
  totalEmbassyUsers: integer("total_embassy_users").default(0),
  totalFederationUsers: integer("total_federation_users").default(0),
  videoUploadsDaily: integer("video_uploads_daily").default(0),
  videoViewsDaily: integer("video_views_daily").default(0),
  messagesDaily: integer("messages_daily").default(0),
  federationRequestsDaily: integer("federation_requests_daily").default(0),
  paymentsDaily: integer("payments_daily").default(0),
  revenueDaily: doublePrecision("revenue_daily").default(0),
  tokensPurchasedDaily: integer("tokens_purchased_daily").default(0),
  tokensSpentDaily: integer("tokens_spent_daily").default(0),
  avgSessionDuration: doublePrecision("avg_session_duration"),
  bounceRate: doublePrecision("bounce_rate"),
  featureEngagement: jsonb("feature_engagement"),
  retentionCohort: jsonb("retention_cohort"),
  createdAt: timestamp("created_at").defaultNow(),
});

// GDPR Privacy Requests - manages data privacy and compliance requests
export const gdprRequests = pgTable("gdpr_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  requestType: text("request_type").notNull(), // 'data_export', 'data_deletion', 'consent_update', 'access_request'
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'rejected'
  requestDetails: text("request_details"),
  dataCategories: text("data_categories").array(),
  exportFileUrl: text("export_file_url"),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  completionNotes: text("completion_notes"),
  rejectionReason: text("rejection_reason"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Consent Records - tracks user consent for GDPR compliance
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  consentType: text("consent_type").notNull(), // 'terms_of_service', 'privacy_policy', 'marketing', 'analytics', 'data_sharing'
  consentGiven: boolean("consent_given").notNull(),
  version: text("version").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentedAt: timestamp("consented_at").defaultNow(),
  withdrawnAt: timestamp("withdrawn_at"),
});

// Platform Audit Logs - comprehensive audit trail for all platform activities
export const platformAuditLogs = pgTable("platform_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // 'user_management', 'payment', 'federation', 'document', 'security', 'gdpr', 'system'
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  actorId: varchar("actor_id"),
  actorName: text("actor_name"),
  actorRole: text("actor_role"),
  actorEmail: text("actor_email"),
  description: text("description"),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: text("severity").default("info"), // 'debug', 'info', 'warning', 'error', 'critical'
  timestamp: timestamp("timestamp").defaultNow(),
});

// User Sessions - for analytics and security tracking
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  location: text("location"),
  startedAt: timestamp("started_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(true),
});

// Federation Payment History - aggregate view of all federation-related payments
export const federationPaymentHistory = pgTable("federation_payment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  federationId: varchar("federation_id").notNull(),
  federationName: text("federation_name"),
  federationCountry: text("federation_country"),
  requestId: varchar("request_id"),
  teamId: varchar("team_id"),
  teamName: text("team_name"),
  feeType: text("fee_type").notNull(), // 'federation_fee', 'service_charge', 'processing_fee'
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").default("USD"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'refunded'
  paymentMethod: text("payment_method"),
  transactionRef: text("transaction_ref"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertAdminMessageInboxSchema = createInsertSchema(adminMessageInbox).omit({ id: true, createdAt: true });
export const insertPlatformMetricsSchema = createInsertSchema(platformMetrics).omit({ id: true, createdAt: true });
export const insertGdprRequestSchema = createInsertSchema(gdprRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserConsentSchema = createInsertSchema(userConsents).omit({ id: true, consentedAt: true });
export const insertPlatformAuditLogSchema = createInsertSchema(platformAuditLogs).omit({ id: true, timestamp: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true, startedAt: true });
export const insertFederationPaymentHistorySchema = createInsertSchema(federationPaymentHistory).omit({ id: true, createdAt: true });

// Types
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertAdminMessageInbox = z.infer<typeof insertAdminMessageInboxSchema>;
export type AdminMessageInbox = typeof adminMessageInbox.$inferSelect;
export type InsertPlatformMetrics = z.infer<typeof insertPlatformMetricsSchema>;
export type PlatformMetrics = typeof platformMetrics.$inferSelect;
export type InsertGdprRequest = z.infer<typeof insertGdprRequestSchema>;
export type GdprRequest = typeof gdprRequests.$inferSelect;
export type InsertUserConsent = z.infer<typeof insertUserConsentSchema>;
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertPlatformAuditLog = z.infer<typeof insertPlatformAuditLogSchema>;
export type PlatformAuditLog = typeof platformAuditLogs.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertFederationPaymentHistory = z.infer<typeof insertFederationPaymentHistorySchema>;
export type FederationPaymentHistory = typeof federationPaymentHistory.$inferSelect;
