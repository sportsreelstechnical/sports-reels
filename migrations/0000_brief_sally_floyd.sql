CREATE TABLE "action_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"user_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar,
	"details" jsonb,
	"ip_address" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "biometric_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"record_date" timestamp DEFAULT now(),
	"resting_heart_rate" integer,
	"vo2_max" double precision,
	"body_fat_percentage" double precision,
	"muscle_mass" double precision,
	"hydration_level" double precision,
	"sleep_quality" double precision,
	"fatigue_index" double precision,
	"gps_data_available" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"league" text NOT NULL,
	"league_band" integer DEFAULT 3 NOT NULL,
	"league_position" integer,
	"continental_competition" text,
	"fifa_ranking" integer
);
--> statement-breakpoint
CREATE TABLE "compliance_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"document_type" text NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"generated_by" varchar,
	"data_range_start" text,
	"data_range_end" text,
	"file_url" text,
	"ai_summary" text,
	"player_profile" jsonb,
	"physical_data" jsonb,
	"performance_stats" jsonb,
	"eligibility_data" jsonb,
	"status" text DEFAULT 'draft'
);
--> statement-breakpoint
CREATE TABLE "compliance_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"requested_by" varchar NOT NULL,
	"visa_type" text NOT NULL,
	"target_country" text,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text DEFAULT 'USD',
	"stripe_payment_intent_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consular_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_letter_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"player_profile" jsonb,
	"player_stats" jsonb,
	"eligibility_scores" jsonb,
	"video_qr_codes" jsonb,
	"proof_of_play_summary" text,
	"target_club_details" jsonb,
	"verification_code" varchar NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	"valid_until" timestamp,
	"accessed_by_embassy" boolean DEFAULT false,
	"embassy_access_logs" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"player_id" varchar,
	"inquiry_id" varchar,
	"type" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" text NOT NULL,
	"document_id" varchar NOT NULL,
	"source_type" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"ai_verdict" text,
	"ai_confidence" double precision,
	"ai_analysis" text,
	"is_system_verified" boolean DEFAULT false,
	"system_verification_note" text,
	"last_checked_at" timestamp DEFAULT now(),
	"checked_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eligibility_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"visa_type" text NOT NULL,
	"score" double precision NOT NULL,
	"status" text NOT NULL,
	"breakdown" jsonb,
	"league_band_applied" integer,
	"calculated_at" timestamp DEFAULT now(),
	"valid_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "embassy_document_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"embassy_profile_id" varchar NOT NULL,
	"accessed_at" timestamp DEFAULT now(),
	"accessed_by" varchar,
	"access_type" text DEFAULT 'view',
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "embassy_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_letter_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"embassy_country" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tokens_spent" integer DEFAULT 4 NOT NULL,
	"notified_by" varchar,
	"viewed_at" timestamp,
	"viewed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "embassy_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" text NOT NULL,
	"jurisdiction" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"user_id" varchar,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "embassy_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"embassy_country" text NOT NULL,
	"submitted_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'pending',
	"verification_code" text,
	"verified_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "federation_fee_schedules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"federation_id" varchar NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"base_fee" double precision NOT NULL,
	"platform_service_charge" double precision DEFAULT 25,
	"currency" text DEFAULT 'USD',
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "federation_issued_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text,
	"storage_key" text NOT NULL,
	"object_path" text,
	"original_name" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"issued_by" varchar NOT NULL,
	"issued_by_name" text,
	"valid_from" timestamp DEFAULT now(),
	"valid_to" timestamp,
	"notes" text,
	"download_count" integer DEFAULT 0,
	"last_downloaded_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "federation_letter_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_number" text NOT NULL,
	"team_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"federation_id" varchar,
	"passport_document_id" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"federation_name" text,
	"federation_country" text,
	"athlete_full_name" text NOT NULL,
	"athlete_nationality" text NOT NULL,
	"athlete_date_of_birth" text,
	"athlete_position" text,
	"target_club_name" text NOT NULL,
	"target_club_country" text NOT NULL,
	"transfer_type" text NOT NULL,
	"invitation_letter_storage_key" text,
	"invitation_letter_object_path" text,
	"invitation_letter_original_name" text,
	"request_purpose" text,
	"additional_notes" text,
	"fee_amount" double precision DEFAULT 0,
	"service_charge" double precision DEFAULT 0,
	"total_amount" double precision DEFAULT 0,
	"payment_status" text DEFAULT 'unpaid',
	"payment_id" varchar,
	"payment_confirmed_at" timestamp,
	"submitted_by" varchar,
	"submitted_at" timestamp,
	"processed_by" varchar,
	"processed_at" timestamp,
	"issued_document_storage_key" text,
	"issued_document_object_path" text,
	"issued_document_original_name" text,
	"issued_at" timestamp,
	"issued_by" varchar,
	"rejection_reason" text,
	"notifications_sent" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "federation_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"website" text,
	"logo_url" text,
	"default_fee" double precision DEFAULT 150,
	"platform_service_charge" double precision DEFAULT 25,
	"is_active" boolean DEFAULT true,
	"total_documents_processed" integer DEFAULT 0,
	"total_revenue_received" double precision DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "federation_request_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar NOT NULL,
	"federation_id" varchar,
	"actor_id" varchar,
	"actor_name" text,
	"actor_role" text,
	"activity_type" text NOT NULL,
	"description" text,
	"previous_status" text,
	"new_status" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "federation_request_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_name" text NOT NULL,
	"sender_role" text NOT NULL,
	"sender_portal" text NOT NULL,
	"recipient_portal" text NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"attachment_storage_key" text,
	"attachment_original_name" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invitation_letters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"from_team_id" varchar NOT NULL,
	"target_club_name" text NOT NULL,
	"target_club_address" text,
	"target_league" text NOT NULL,
	"target_league_band" integer NOT NULL,
	"target_country" text NOT NULL,
	"trial_start_date" text,
	"trial_end_date" text,
	"offer_type" text DEFAULT 'trial',
	"scout_agent_name" text,
	"scout_agent_id" varchar,
	"file_url" text,
	"federation_letter_request_id" varchar,
	"federation_letter_document_url" text,
	"status" text DEFAULT 'pending',
	"uploaded_at" timestamp DEFAULT now(),
	"uploaded_by" varchar,
	"verified_at" timestamp,
	"expires_at" timestamp,
	"recalculated_eligibility" jsonb,
	"consular_report_generated" boolean DEFAULT false,
	"consular_report_url" text,
	"qr_code_data" text,
	"embassy_accessible" boolean DEFAULT false,
	"embassy_notified_at" timestamp,
	"embassy_notification_status" text DEFAULT 'not_notified',
	"embassy_notified_by" varchar,
	"embassy_notification_tokens_spent" integer
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"record_date" timestamp DEFAULT now(),
	"record_type" text NOT NULL,
	"description" text,
	"fitness_level" text,
	"injury_history" jsonb,
	"clearance_status" text,
	"expiry_date" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_role" text NOT NULL,
	"content" text NOT NULL,
	"attachment_url" text,
	"attachment_type" text,
	"read_by" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"amount" double precision NOT NULL,
	"currency" text DEFAULT 'USD',
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "player_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"document_type" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"storage_key" text NOT NULL,
	"object_path" text,
	"verification_status" text DEFAULT 'pending',
	"verified_by" varchar,
	"verified_at" timestamp,
	"expiry_date" text,
	"document_number" text,
	"issuing_country" text,
	"notes" text,
	"uploaded_by" varchar,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_international_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"national_team" text NOT NULL,
	"team_level" text DEFAULT 'senior',
	"caps" integer DEFAULT 0,
	"goals" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"debut_date" text,
	"last_appearance" text,
	"competition_level" text,
	"major_tournaments" text[],
	"document_url" text,
	"verification_status" text DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"season" text NOT NULL,
	"current_season_minutes" integer DEFAULT 0,
	"total_career_minutes" integer DEFAULT 0,
	"games_played" integer DEFAULT 0,
	"goals" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"yellow_cards" integer DEFAULT 0,
	"red_cards" integer DEFAULT 0,
	"pass_accuracy" double precision,
	"tackles_won" integer DEFAULT 0,
	"aerial_duels_won" integer DEFAULT 0,
	"distance_covered" double precision,
	"sprint_speed" double precision,
	"club_league_position" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_share_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"share_token" text NOT NULL,
	"created_by" varchar NOT NULL,
	"tokens_spent" integer DEFAULT 10 NOT NULL,
	"view_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "player_share_links_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nationality" text NOT NULL,
	"second_nationality" text,
	"date_of_birth" text,
	"birth_place" text,
	"position" text NOT NULL,
	"secondary_position" text,
	"current_club_id" varchar,
	"current_club_name" text,
	"profile_image_url" text,
	"national_team_caps" integer DEFAULT 0,
	"national_team_debut" text,
	"national_team_goals" integer DEFAULT 0,
	"continental_games" integer DEFAULT 0,
	"international_caps" integer DEFAULT 0,
	"international_goals" integer DEFAULT 0,
	"height" integer,
	"height_unit" text DEFAULT 'cm',
	"weight" integer,
	"weight_unit" text DEFAULT 'kg',
	"wingspan" integer,
	"preferred_foot" text,
	"bmi" double precision,
	"contract_end_date" text,
	"market_value" double precision,
	"jersey_number" integer,
	"agent_name" text,
	"agent_contact" text,
	"club_minutes_current_season" integer DEFAULT 0,
	"club_minutes_last_12_months" integer DEFAULT 0,
	"international_minutes_current_season" integer DEFAULT 0,
	"international_minutes_last_12_months" integer DEFAULT 0,
	"total_career_minutes" integer DEFAULT 0,
	"profile_document_url" text,
	"team_id" varchar,
	"is_published_to_scouts" boolean DEFAULT false,
	"published_at" timestamp,
	"publish_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scout_shortlists" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scout_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"priority" text DEFAULT 'green' NOT NULL,
	"notes" text,
	"added_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scouting_inquiries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"buying_club_id" varchar,
	"selling_club_id" varchar,
	"buying_club_name" text NOT NULL,
	"selling_club_name" text NOT NULL,
	"status" text DEFAULT 'inquiry',
	"compliance_score" double precision,
	"message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shared_videos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" varchar NOT NULL,
	"shared_with_user_id" varchar,
	"shared_with_role" text,
	"shared_by_user_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"access_level" text DEFAULT 'view',
	"shared_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_sheet_players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_sheet_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"role" text DEFAULT 'starting' NOT NULL,
	"shirt_number" integer,
	"position" text,
	"position_order" integer,
	"minutes_played" integer DEFAULT 0,
	"substitute_in" integer,
	"substitute_out" integer,
	"goals" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"yellow_cards" integer DEFAULT 0,
	"red_card" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_sheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar NOT NULL,
	"title" text NOT NULL,
	"match_date" text NOT NULL,
	"kickoff_time" text,
	"competition" text NOT NULL,
	"competition_type" text DEFAULT 'league',
	"stadium" text,
	"home_team" text,
	"away_team" text,
	"is_home" boolean DEFAULT true,
	"referee" text,
	"assistant_referees" text,
	"fourth_official" text,
	"formation" text DEFAULT '4-3-3',
	"match_result" text,
	"notes" text,
	"video_id" varchar,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"club_name" text,
	"country" text,
	"league_band" integer DEFAULT 3,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_purchased" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "token_balances_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "token_packs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tokens" integer NOT NULL,
	"price_usd" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"pack_id" varchar NOT NULL,
	"tokens" integer NOT NULL,
	"amount_paid" integer NOT NULL,
	"currency" text DEFAULT 'USD',
	"payment_method" text,
	"payment_reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"player_id" varchar,
	"video_id" varchar,
	"pack_id" varchar,
	"balance_after" integer NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transfer_eligibility_assessments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"total_minutes_verified" integer DEFAULT 0,
	"club_minutes" integer DEFAULT 0,
	"international_minutes" integer DEFAULT 0,
	"video_minutes" integer DEFAULT 0,
	"total_caps" integer DEFAULT 0,
	"senior_caps" integer DEFAULT 0,
	"continental_appearances" integer DEFAULT 0,
	"overall_status" text DEFAULT 'red' NOT NULL,
	"schengen_score" double precision DEFAULT 0,
	"schengen_status" text DEFAULT 'red',
	"o1_score" double precision DEFAULT 0,
	"o1_status" text DEFAULT 'red',
	"p1_score" double precision DEFAULT 0,
	"p1_status" text DEFAULT 'red',
	"uk_gbe_score" double precision DEFAULT 0,
	"uk_gbe_status" text DEFAULT 'red',
	"esc_score" double precision DEFAULT 0,
	"esc_status" text DEFAULT 'red',
	"esc_eligible" boolean DEFAULT false,
	"minutes_needed" integer DEFAULT 0,
	"caps_needed" integer DEFAULT 0,
	"recommendations" jsonb,
	"visa_breakdown" jsonb,
	"calculated_at" timestamp DEFAULT now(),
	"valid_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "transfer_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"generated_by" varchar,
	"generated_by_name" text,
	"report_type" text DEFAULT 'comprehensive' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data_range_start" timestamp,
	"data_range_end" timestamp,
	"player_profile" jsonb,
	"international_career" jsonb,
	"performance_stats" jsonb,
	"eligibility_scores" jsonb,
	"videos_included" jsonb,
	"documents_included" jsonb,
	"invitation_letters" jsonb,
	"embassy_verifications" jsonb,
	"total_minutes_verified" integer DEFAULT 0,
	"overall_eligibility_status" text,
	"recommendations" jsonb,
	"file_url" text,
	"verification_code" text,
	"embassy_notified" boolean DEFAULT false,
	"embassy_notified_at" timestamp,
	"generated_at" timestamp DEFAULT now(),
	"valid_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "transfer_targets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compliance_order_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"target_club_name" text NOT NULL,
	"target_league" text NOT NULL,
	"target_country" text NOT NULL,
	"target_league_band" integer NOT NULL,
	"invitation_letter_id" varchar,
	"scout_agent_id" varchar,
	"proposed_transfer_fee" double precision,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'scout' NOT NULL,
	"team_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "video_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"minutes_played" integer DEFAULT 0,
	"distance_covered" double precision,
	"sprint_count" integer DEFAULT 0,
	"passes_attempted" integer DEFAULT 0,
	"passes_completed" integer DEFAULT 0,
	"shots_on_target" integer DEFAULT 0,
	"tackles" integer DEFAULT 0,
	"interceptions" integer DEFAULT 0,
	"duels_won" integer DEFAULT 0,
	"heatmap_data" jsonb,
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_player_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"minutes_played" integer DEFAULT 0,
	"position" text,
	"performance_rating" double precision,
	"goals" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"passes_completed" integer DEFAULT 0,
	"passes_attempted" integer DEFAULT 0,
	"tackles" integer DEFAULT 0,
	"interceptions" integer DEFAULT 0,
	"saves" integer DEFAULT 0,
	"shots_on_target" integer DEFAULT 0,
	"distance_covered" double precision,
	"sprint_count" integer DEFAULT 0,
	"duels_won" integer DEFAULT 0,
	"duels_lost" integer DEFAULT 0,
	"ai_analysis" text,
	"positional_metrics" jsonb,
	"key_moments" jsonb,
	"strengths" text[],
	"areas_to_improve" text[],
	"analyzed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" varchar NOT NULL,
	"tag_type" text NOT NULL,
	"tag_value" text NOT NULL,
	"timestamp" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"title" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"upload_date" timestamp DEFAULT now(),
	"duration" text,
	"file_url" text,
	"thumbnail_url" text,
	"match_date" text,
	"competition" text,
	"opponent" text,
	"minutes_played" integer,
	"processed" boolean DEFAULT false,
	"team_id" varchar,
	"team_sheet_id" varchar
);
--> statement-breakpoint
CREATE TABLE "visa_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visa_type" text NOT NULL,
	"country" text NOT NULL,
	"category" text NOT NULL,
	"rule_name" text NOT NULL,
	"description" text,
	"min_points" integer,
	"max_points" integer,
	"criteria" jsonb,
	"league_band_multipliers" jsonb,
	"active" boolean DEFAULT true
);
