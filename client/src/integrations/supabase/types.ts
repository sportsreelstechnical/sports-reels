export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          user_type: "team" | "agent";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          user_type: "team" | "agent";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          user_type?: "team" | "agent";
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          team_name: string;
          logo_url: string | null;
          country: string;
          sport_type: string | null;
          profile_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_name: string;
          logo_url?: string | null;
          country: string;
          sport_type?: string | null;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_name?: string;
          logo_url?: string | null;
          country?: string;
          sport_type?: string | null;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          agency_name: string;
          license_number: string | null;
          profile_id: string;
          contact_email: string | null;
          specialization: string[] | null;
          verification_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_name: string;
          license_number?: string | null;
          profile_id: string;
          contact_email?: string | null;
          specialization?: string[] | null;
          verification_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_name?: string;
          license_number?: string | null;
          profile_id?: string;
          contact_email?: string | null;
          specialization?: string[] | null;
          verification_status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          full_name: string;
          position: string;
          citizenship: string;
          photo_url: string | null;
          date_of_birth: string | null;
          market_value: number | null;
          is_active: boolean;
          team_id: string | null;
          created_at: string;
          updated_at: string;
          age: number | null;
          height: number | null;
          weight: number | null;
          jersey_number: number | null;
          gender: string | null;
          foot: string | null;
          bio: string | null;
          place_of_birth: string | null;
          fifa_id: string | null;
          player_agent: string | null;
          current_club: string | null;
          joined_date: string | null;
          contract_expires: string | null;
          leagues_participated: string[] | null;
          titles_seasons: string[] | null;
          transfer_history: Json | null;
          international_duty: boolean | null;
          headshot_url: string | null;
          portrait_url: string | null;
          full_body_url: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          position: string;
          citizenship: string;
          photo_url?: string | null;
          date_of_birth?: string | null;
          market_value?: number | null;
          is_active?: boolean;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
          age?: number | null;
          height?: number | null;
          weight?: number | null;
          jersey_number?: number | null;
          gender?: string | null;
          foot?: string | null;
          bio?: string | null;
          place_of_birth?: string | null;
          fifa_id?: string | null;
          player_agent?: string | null;
          current_club?: string | null;
          joined_date?: string | null;
          contract_expires?: string | null;
          leagues_participated?: string[] | null;
          titles_seasons?: string[] | null;
          transfer_history?: Json | null;
          international_duty?: boolean | null;
          headshot_url?: string | null;
          portrait_url?: string | null;
          full_body_url?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          position?: string;
          citizenship?: string;
          photo_url?: string | null;
          date_of_birth?: string | null;
          market_value?: number | null;
          is_active?: boolean;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
          age?: number | null;
          height?: number | null;
          weight?: number | null;
          jersey_number?: number | null;
          gender?: string | null;
          foot?: string | null;
          bio?: string | null;
          place_of_birth?: string | null;
          fifa_id?: string | null;
          player_agent?: string | null;
          current_club?: string | null;
          joined_date?: string | null;
          contract_expires?: string | null;
          leagues_participated?: string[] | null;
          titles_seasons?: string[] | null;
          transfer_history?: Json | null;
          international_duty?: boolean | null;
          headshot_url?: string | null;
          portrait_url?: string | null;
          full_body_url?: string | null;
        };
      };
      videos: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          video_url: string;
          thumbnail_url: string | null;
          duration: number | null;
          player_id: string;
          team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          video_url: string;
          thumbnail_url?: string | null;
          duration?: number | null;
          player_id: string;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          video_url?: string;
          thumbnail_url?: string | null;
          duration?: number | null;
          player_id?: string;
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transfer_pitches: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          transfer_type: "permanent" | "loan";
          asking_price: number;
          currency: string;
          description: string;
          expires_at: string;
          status: "active" | "expired" | "completed" | "cancelled";
          view_count: number;
          message_count: number;
          shortlist_count: number;
          is_international: boolean;
          tagged_videos: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
          transfer_type: "permanent" | "loan";
          asking_price: number;
          currency: string;
          description: string;
          expires_at: string;
          status?: "active" | "expired" | "completed" | "cancelled";
          view_count?: number;
          message_count?: number;
          shortlist_count?: number;
          is_international?: boolean;
          tagged_videos?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          player_id?: string;
          transfer_type?: "permanent" | "loan";
          asking_price?: number;
          currency?: string;
          description?: string;
          expires_at?: string;
          status?: "active" | "expired" | "completed" | "cancelled";
          view_count?: number;
          message_count?: number;
          shortlist_count?: number;
          is_international?: boolean;
          tagged_videos?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shortlist: {
        Row: {
          id: string;
          agent_id: string;
          pitch_id: string;
          player_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          pitch_id: string;
          player_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          pitch_id?: string;
          player_id?: string;
          created_at?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          pitch_id: string;
          team_id: string;
          agent_id: string | null;
          status: string;
          deal_stage: string;
          contract_value: number;
          currency: string;
          terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pitch_id: string;
          team_id: string;
          agent_id?: string | null;
          status?: string;
          deal_stage?: string;
          contract_value: number;
          currency: string;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pitch_id?: string;
          team_id?: string;
          agent_id?: string | null;
          status?: string;
          deal_stage?: string;
          contract_value?: number;
          currency?: string;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      timeline_events: {
        Row: {
          id: string;
          pitch_id: string;
          event_type: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pitch_id: string;
          event_type: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pitch_id?: string;
          event_type?: string;
          description?: string;
          created_at?: string;
        };
      };
      agent_requests: {
        Row: {
          id: string;
          agent_id: string;
          title: string;
          player_name: string | null;
          position: string | null;
          sport_type: string;
          transfer_type: "permanent" | "loan";
          budget_min: number | null;
          budget_max: number | null;
          currency: string;
          description: string;
          is_public: boolean;
          expires_at: string;
          created_at: string;
          budget_range: string | null; // Keep for legacy if needed or remove
        };
        Insert: {
          id?: string;
          agent_id: string;
          title: string;
          player_name?: string | null;
          position?: string | null;
          sport_type?: string;
          transfer_type: "permanent" | "loan";
          budget_min?: number | null;
          budget_max?: number | null;
          currency?: string;
          description: string;
          is_public?: boolean;
          expires_at?: string;
          created_at?: string;
          budget_range?: string | null;
        };
        Update: {
          id?: string;
          agent_id?: string;
          title?: string;
          player_name?: string | null;
          position?: string | null;
          sport_type?: string;
          transfer_type?: "permanent" | "loan";
          budget_min?: number | null;
          budget_max?: number | null;
          currency?: string;
          description?: string;
          is_public?: boolean;
          expires_at?: string;
          created_at?: string;
          budget_range?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          pitch_id: string | null;
          player_id: string | null;
          content: string;
          message_type: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          pitch_id?: string | null;
          player_id?: string | null;
          content: string;
          message_type?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          pitch_id?: string | null;
          player_id?: string | null;
          content?: string;
          message_type?: string;
          read_at?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      agent_interest: {
        Row: {
          id: string;
          pitch_id: string;
          agent_id: string;
          status: "interested" | "requested" | "negotiating";
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pitch_id: string;
          agent_id: string;
          status?: "interested" | "requested" | "negotiating";
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pitch_id?: string;
          agent_id?: string;
          status?: "interested" | "requested" | "negotiating";
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_upload_history: {
        Row: {
          id: string;
          team_id: string;
          filename: string;
          file_path: string | null;
          file_size: number;
          file_type: string;
          total_players: number;
          success_count: number;
          error_count: number;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          filename: string;
          file_path?: string | null;
          file_size: number;
          file_type: string;
          total_players: number;
          success_count?: number;
          error_count?: number;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          filename?: string;
          file_path?: string | null;
          file_size?: number;
          file_type?: string;
          total_players?: number;
          success_count?: number;
          error_count?: number;
          details?: Json;
          created_at?: string;
        };
      };
      player_activities: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          performed_by: string;
          player_name: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          changed_fields: string[] | null;
          upload_session_id: string | null;
          details: string | null;
          performed_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
          performed_by: string;
          player_name: string;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          upload_session_id?: string | null;
          details?: string | null;
          performed_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          player_id?: string;
          performed_by?: string;
          player_name?: string;
          action?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          upload_session_id?: string | null;
          details?: string | null;
          performed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      sport_type: "football" | "basketball" | "volleyball" | "tennis" | "rugby";
      transfer_type: "permanent" | "loan";
      message_status: "sent" | "delivered" | "read";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;
