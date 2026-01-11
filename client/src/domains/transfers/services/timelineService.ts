
import { supabase } from '@/integrations/supabase/client';
import { EventType } from '@/components/EnhancedTeamTimeline';

export interface TimelineEventData {
  team_id: string;
  event_type: EventType;
  title: string;
  description: string;
  event_date: string;
  player_id?: string;
  match_id?: string;
  metadata?: any;
  is_pinned?: boolean;
}

export class TimelineService {
  
  // Auto-create timeline events for common actions
  static async createPlayerEvent(playerId: string, teamId: string, eventType: 'added' | 'promoted' | 'injured' | 'contract_extension', details: string) {
    try {
      const player = await this.getPlayerById(playerId);
      if (!player) return;

      const eventTitles = {
        added: 'New Player Added',
        promoted: 'Player Promoted',
        injured: 'Player Injury Update',
        contract_extension: 'Contract Extension'
      };

      const { error } = await supabase
        .from('timeline_events')
        .insert({
          team_id: teamId,
          event_type: 'player',
          title: eventTitles[eventType],
          description: `${player.full_name}: ${details}`,
          event_date: new Date().toISOString().split('T')[0],
          player_id: playerId,
          created_by: await this.getTeamProfileId(teamId)
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating player event:', error);
      return false;
    }
  }

  static async createMatchEvent(teamId: string, matchData: {
    opponent: string;
    result: string;
    date: string;
    competition?: string;
    videoId?: string;
  }) {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .insert({
          team_id: teamId,
          event_type: 'match',
          title: `Match vs ${matchData.opponent}`,
          description: `Result: ${matchData.result}${matchData.competition ? ` (${matchData.competition})` : ''}`,
          event_date: matchData.date,
          match_id: matchData.videoId,
          created_by: await this.getTeamProfileId(teamId),
          metadata: {
            opponent: matchData.opponent,
            result: matchData.result,
            competition: matchData.competition
          }
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating match event:', error);
      return false;
    }
  }

  static async createAchievementEvent(teamId: string, achievementData: {
    title: string;
    description: string;
    date: string;
    type?: 'trophy' | 'award' | 'milestone';
  }) {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .insert({
          team_id: teamId,
          event_type: 'achievement',
          title: achievementData.title,
          description: achievementData.description,
          event_date: achievementData.date,
          created_by: await this.getTeamProfileId(teamId),
          is_pinned: true, // Achievements are automatically pinned
          metadata: {
            achievement_type: achievementData.type || 'milestone'
          }
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating achievement event:', error);
      return false;
    }
  }

  static async createTeamUpdate(teamId: string, updateData: {
    title: string;
    description: string;
    date: string;
    type?: 'staff' | 'facility' | 'sponsorship' | 'announcement';
  }) {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .insert({
          team_id: teamId,
          event_type: 'team',
          title: updateData.title,
          description: updateData.description,
          event_date: updateData.date,
          created_by: await this.getTeamProfileId(teamId),
          metadata: {
            update_type: updateData.type || 'announcement'
          }
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating team update:', error);
      return false;
    }
  }

  // Export timeline as structured data
  static async exportTimelineData(teamId: string, filters?: {
    startDate?: string;
    endDate?: string;
    eventTypes?: EventType[];
  }) {
    try {
      let query = supabase
        .from('timeline_events')
        .select(`
          *,
          players (
            id,
            full_name,
            position,
            jersey_number
          ),
          timeline_comments (
            content,
            created_at,
            profiles (
              full_name,
              user_type
            )
          )
        `)
        .eq('team_id', teamId)
        .order('event_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('event_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('event_date', filters.endDate);
      }
      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        query = query.in('event_type', filters.eventTypes);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error exporting timeline data:', error);
      return null;
    }
  }

  // Helper methods
  private static async getPlayerById(playerId: string) {
    const { data } = await supabase
      .from('players')
      .select('id, full_name, position')
      .eq('id', playerId)
      .single();
    
    return data;
  }

  private static async getTeamProfileId(teamId: string) {
    const { data } = await supabase
      .from('teams')
      .select('profile_id')
      .eq('id', teamId)
      .single();
    
    return data?.profile_id;
  }

  // Integration methods for automatic event creation
  static async onPlayerAdded(playerId: string, teamId: string) {
    return this.createPlayerEvent(playerId, teamId, 'added', 'Successfully added to team roster');
  }

  static async onPlayerInjured(playerId: string, teamId: string, injuryDetails: string) {
    return this.createPlayerEvent(playerId, teamId, 'injured', injuryDetails);
  }

  static async onContractSigned(playerId: string, teamId: string, contractDetails: string) {
    return this.createPlayerEvent(playerId, teamId, 'contract_extension', contractDetails);
  }

  static async onMatchCompleted(teamId: string, opponent: string, result: string, date: string, competition?: string) {
    return this.createMatchEvent(teamId, {
      opponent,
      result,
      date,
      competition
    });
  }

  static async onTrophyWon(teamId: string, trophyName: string, date: string) {
    return this.createAchievementEvent(teamId, {
      title: `🏆 ${trophyName} Champions!`,
      description: `Team successfully won the ${trophyName}`,
      date,
      type: 'trophy'
    });
  }

  static async onCoachAppointed(teamId: string, coachName: string, date: string) {
    return this.createTeamUpdate(teamId, {
      title: 'New Head Coach Appointed',
      description: `${coachName} has been appointed as the new head coach`,
      date,
      type: 'staff'
    });
  }
}
