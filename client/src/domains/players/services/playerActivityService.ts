import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type DatabasePlayer = Tables<'players'>;

export interface PlayerActivityData {
  team_id: string;
  player_id: string;
  action: 'created' | 'updated' | 'deleted' | 'bulk_uploaded';
  old_values?: Partial<DatabasePlayer>;
  new_values?: Partial<DatabasePlayer>;
  changed_fields?: string[];
  upload_session_id?: string;
  details?: string;
}

export class PlayerActivityService {
  private teamId: string;

  constructor(teamId: string) {
    this.teamId = teamId;
  }

  /**
   * Log player activity
   */
  async logActivity(data: Omit<PlayerActivityData, 'team_id'>): Promise<void> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // For now, just log to console until database tables are created
      console.log('Player Activity:', {
        team_id: this.teamId,
        ...data,
        performed_by: user?.id,
        timestamp: new Date().toISOString()
      });

      // Try to insert into database if table exists
      const { data: insertData, error } = await supabase
        .from('player_activities')
        .insert({
          team_id: this.teamId,
          player_id: data.player_id,
          performed_by: user?.id,
          player_name: data.new_values?.full_name || data.old_values?.full_name || 'Unknown Player',
          action: data.action,
          old_data: data.old_values,
          new_data: data.new_values,
          changed_fields: data.changed_fields,
          upload_session_id: data.upload_session_id,
          details: data.details
        })
        .select();

      if (error) {
        console.error('Error inserting activity log:', error);
        console.warn('Activity log table not available, logged to console only:', error.message);
        
        // Additional debugging
        console.log('Insert data that failed:', {
          team_id: this.teamId,
          player_id: data.player_id,
          performed_by: user?.id,
          ...data
        });
      } else {
        console.log('✅ Activity logged to database successfully:', insertData);
      }
    } catch (error) {
      console.error('Error logging player activity:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log player creation
   */
  async logPlayerCreated(player: DatabasePlayer, uploadSessionId?: string): Promise<void> {
    await this.logActivity({
      player_id: player.id,
      action: 'created',
      new_values: player,
      upload_session_id: uploadSessionId,
      details: PlayerActivityService.generateActivityDetails('created', undefined, player)
    });
  }

  /**
   * Log player update
   */
  async logPlayerUpdated(
    playerId: string, 
    oldValues: Partial<DatabasePlayer>, 
    newValues: Partial<DatabasePlayer>,
    changedFields: string[]
  ): Promise<void> {
    console.log('Player update detected:', {
      player_id: playerId,
      player_name: oldValues.full_name || newValues.full_name,
      changed_fields: changedFields,
      old_values_sample: {
        full_name: oldValues.full_name,
        age: oldValues.age,
        position: oldValues.position
      },
      new_values_sample: {
        full_name: newValues.full_name,
        age: newValues.age,
        position: newValues.position
      }
    });

    await this.logActivity({
      player_id: playerId,
      action: 'updated',
      old_values: oldValues,
      new_values: newValues,
      changed_fields: changedFields,
      details: PlayerActivityService.generateActivityDetails('updated', oldValues, newValues, changedFields)
    });
  }

  /**
   * Log player deletion
   */
  async logPlayerDeleted(player: DatabasePlayer): Promise<void> {
    console.log('Logging player deletion:', {
      player_id: player.id,
      player_name: player.full_name,
      team_id: this.teamId
    });

    // Store the player data before deletion for historical reference
    const playerSnapshot = {
      id: player.id,
      full_name: player.full_name,
      position: player.position,
      age: player.age,
      citizenship: player.citizenship,
      jersey_number: player.jersey_number,
      market_value: player.market_value,
      deleted_at: new Date().toISOString()
    };

    await this.logActivity({
      player_id: player.id,
      action: 'deleted',
      old_values: playerSnapshot,
      details: PlayerActivityService.generateActivityDetails('deleted', player)
    });
  }

  /**
   * Log bulk upload session
   */
  async logBulkUploadSession(
    uploadSessionId: string, 
    players: DatabasePlayer[]
  ): Promise<void> {
    // Log each player as bulk uploaded
    for (const player of players) {
      await this.logActivity({
        player_id: player.id,
        action: 'bulk_uploaded',
        upload_session_id: uploadSessionId,
        details: `Uploaded via bulk upload session ${uploadSessionId}`
      });
    }
  }

  /**
   * Get player activity for a specific player
   */
  async getPlayerActivity(playerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('player_activities')
        .select('*')
        .eq('player_id', playerId)
        .order('performed_at', { ascending: false });

      if (error) {
        console.warn('Activity log table not available:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching player activity:', error);
      return [];
    }
  }

  /**
   * Get all team activity
   */
  async getTeamActivity(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('player_activities')
        .select('*')
        .eq('team_id', this.teamId)
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Activity log table not available:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching team activity:', error);
      return [];
    }
  }

  /**
   * Get activity by upload session
   */
  async getUploadSessionActivity(uploadSessionId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('player_activities')
        .select('*')
        .eq('upload_session_id', uploadSessionId)
        .order('performed_at', { ascending: false });

      if (error) {
        console.warn('Activity log table not available:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching upload session activity:', error);
      return [];
    }
  }

  /**
   * Compare two player objects to find changed fields
   */
  static getChangedFields(oldPlayer: Partial<DatabasePlayer>, newPlayer: Partial<DatabasePlayer>): string[] {
    const changedFields: string[] = [];
    
    // Only check fields that exist in both objects and are user-editable
    const userEditableFields = new Set([
      'full_name', 'position', 'age', 'height', 'weight', 'citizenship', 
      'jersey_number', 'market_value', 'bio', 'date_of_birth', 'place_of_birth',
      'foot', 'fifa_id', 'player_agent', 'current_club', 'joined_date', 
      'contract_expires', 'gender', 'photo_url', 'headshot_url', 'portrait_url', 
      'full_body_url', 'leagues_participated', 'titles_seasons', 'transfer_history', 
      'international_duty'
    ]);

    for (const key of userEditableFields) {
      const oldValue = oldPlayer[key as keyof DatabasePlayer];
      const newValue = newPlayer[key as keyof DatabasePlayer];

      // Skip if both values are undefined/null (field not present)
      if (oldValue === undefined && newValue === undefined) continue;
      if (oldValue === null && newValue === null) continue;

      // Handle different data types
      let hasChanged = false;
      
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        // For arrays, compare sorted JSON strings
        const oldSorted = JSON.stringify([...oldValue].sort());
        const newSorted = JSON.stringify([...newValue].sort());
        hasChanged = oldSorted !== newSorted;
      } else if (oldValue !== newValue) {
        // For primitive values, direct comparison
        hasChanged = true;
      }

      if (hasChanged) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Generate meaningful activity details
   */
  static generateActivityDetails(action: string, oldPlayer?: Partial<DatabasePlayer>, newPlayer?: Partial<DatabasePlayer>, changedFields?: string[]): string {
    switch (action) {
      case 'created':
        return `Player ${newPlayer?.full_name || 'Unknown'} was added to the roster`;
      
      case 'updated':
        if (!changedFields || changedFields.length === 0) {
          return `Player ${oldPlayer?.full_name || 'Unknown'} was updated`;
        }
        
        // Only show fields that were actually changed and are meaningful
        const meaningfulChanges = changedFields.filter(field => {
          // Filter out system fields and fields that might be auto-updated
          const systemFields = ['ai_analysis', 'created_at', 'updated_at', 'id', 'team_id', 'is_active'];
          return !systemFields.includes(field);
        });
        
        if (meaningfulChanges.length === 0) {
          return `Player ${oldPlayer?.full_name || 'Unknown'} was updated`;
        }
        
        // Generate specific change descriptions
        const changeDescriptions = meaningfulChanges.map(field => {
          switch (field) {
            case 'full_name': return 'name';
            case 'position': return 'position';
            case 'age': return 'age';
            case 'height': return 'height';
            case 'weight': return 'weight';
            case 'citizenship': return 'citizenship';
            case 'jersey_number': return 'jersey number';
            case 'market_value': return 'market value';
            case 'bio': return 'bio';
            case 'date_of_birth': return 'date of birth';
            case 'place_of_birth': return 'place of birth';
            case 'foot': return 'preferred foot';
            case 'fifa_id': return 'FIFA ID';
            case 'player_agent': return 'player agent';
            case 'current_club': return 'current club';
            case 'joined_date': return 'joined date';
            case 'contract_expires': return 'contract expiry';
            case 'gender': return 'gender';
            case 'photo_url': return 'photo';
            case 'headshot_url': return 'headshot';
            case 'portrait_url': return 'portrait';
            case 'full_body_url': return 'full body photo';
            case 'leagues_participated': return 'leagues participated';
            case 'titles_seasons': return 'titles and seasons';
            case 'transfer_history': return 'transfer history';
            case 'international_duty': return 'international duty';
            default: return field.replace(/_/g, ' ');
          }
        });
        
        // Create a more natural sentence
        if (changeDescriptions.length === 1) {
          return `Updated ${changeDescriptions[0]} for ${oldPlayer?.full_name || 'Unknown'}`;
        } else if (changeDescriptions.length === 2) {
          return `Updated ${changeDescriptions[0]} and ${changeDescriptions[1]} for ${oldPlayer?.full_name || 'Unknown'}`;
        } else {
          const lastItem = changeDescriptions.pop();
          return `Updated ${changeDescriptions.join(', ')} and ${lastItem} for ${oldPlayer?.full_name || 'Unknown'}`;
        }
      
      case 'deleted':
        return `Player ${oldPlayer?.full_name || 'Unknown'} was removed from the roster`;
      
      case 'bulk_uploaded':
        return `Player ${newPlayer?.full_name || 'Unknown'} was added via bulk upload`;
      
      default:
        return `Player activity: ${action}`;
    }
  }
}
