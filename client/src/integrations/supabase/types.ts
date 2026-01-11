export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          user_type: 'team' | 'agent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          user_type: 'team' | 'agent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          user_type?: 'team' | 'agent'
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          team_name: string
          logo_url: string | null
          country: string
          sport_type: string | null
          profile_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_name: string
          logo_url?: string | null
          country: string
          sport_type?: string | null
          profile_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_name?: string
          logo_url?: string | null
          country?: string
          sport_type?: string | null
          profile_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          agency_name: string
          license_number: string | null
          profile_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_name: string
          license_number?: string | null
          profile_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_name?: string
          license_number?: string | null
          profile_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: string
          full_name: string
          position: string
          citizenship: string
          photo_url: string | null
          date_of_birth: string | null
          market_value: number | null
          is_active: boolean
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          position: string
          citizenship: string
          photo_url?: string | null
          date_of_birth?: string | null
          market_value?: number | null
          is_active?: boolean
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          position?: string
          citizenship?: string
          photo_url?: string | null
          date_of_birth?: string | null
          market_value?: number | null
          is_active?: boolean
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          title: string
          description: string | null
          video_url: string
          thumbnail_url: string | null
          duration: number | null
          player_id: string
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url: string
          thumbnail_url?: string | null
          duration?: number | null
          player_id: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string
          thumbnail_url?: string | null
          duration?: number | null
          player_id?: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transfer_pitches: {
        Row: {
          id: string
          team_id: string
          player_id: string
          transfer_type: 'permanent' | 'loan'
          asking_price: number
          currency: string
          description: string
          expires_at: string
          status: 'active' | 'expired' | 'completed' | 'cancelled'
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          transfer_type: 'permanent' | 'loan'
          asking_price: number
          currency: string
          description: string
          expires_at: string
          status?: 'active' | 'expired' | 'completed' | 'cancelled'
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          transfer_type?: 'permanent' | 'loan'
          asking_price?: number
          currency?: string
          description?: string
          expires_at?: string
          status?: 'active' | 'expired' | 'completed' | 'cancelled'
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      shortlist: {
        Row: {
          id: string
          agent_id: string
          pitch_id: string
          player_id: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          pitch_id: string
          player_id: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          pitch_id?: string
          player_id?: string
          created_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          pitch_id: string
          team_id: string
          agent_id: string | null
          status: string
          deal_stage: string
          contract_value: number
          currency: string
          terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pitch_id: string
          team_id: string
          agent_id?: string | null
          status?: string
          deal_stage?: string
          contract_value: number
          currency: string
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pitch_id?: string
          team_id?: string
          agent_id?: string | null
          status?: string
          deal_stage?: string
          contract_value?: number
          currency?: string
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      timeline_events: {
        Row: {
          id: string
          pitch_id: string
          event_type: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          pitch_id: string
          event_type: string
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          pitch_id?: string
          event_type?: string
          description?: string
          created_at?: string
        }
      }
      agent_requests: {
        Row: {
          id: string
          agent_id: string
          player_name: string
          position: string
          transfer_type: 'permanent' | 'loan'
          budget_range: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          player_name: string
          position: string
          transfer_type: 'permanent' | 'loan'
          budget_range: string
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          player_name?: string
          position?: string
          transfer_type?: 'permanent' | 'loan'
          budget_range?: string
          description?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          pitch_id: string | null
          player_id: string | null
          content: string
          message_type: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          pitch_id?: string | null
          player_id?: string | null
          content: string
          message_type?: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          pitch_id?: string | null
          player_id?: string | null
          content?: string
          message_type?: string
          read_at?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
        }
      }
      agent_interest: {
        Row: {
          id: string
          pitch_id: string
          agent_id: string
          status: 'interested' | 'requested' | 'negotiating'
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pitch_id: string
          agent_id: string
          status?: 'interested' | 'requested' | 'negotiating'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pitch_id?: string
          agent_id?: string
          status?: 'interested' | 'requested' | 'negotiating'
          message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sport_type: 'football' | 'basketball' | 'volleyball' | 'tennis' | 'rugby'
      transfer_type: 'permanent' | 'loan'
      message_status: 'sent' | 'delivered' | 'read'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
