
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  pitch_id?: string;
  player_id?: string;
  content: string;
  message_type: string;
  subject?: string;
  contract_file_url?: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  is_flagged?: boolean;
  sender_profile?: {
    full_name: string;
    user_type: string;
    logo_url?: string;
  };
  receiver_profile?: {
    full_name: string;
    user_type: string;
    logo_url?: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface ContractTemplate {
  id: string;
  template_name: string;
  template_type: string;
  sport_type: string;
  template_content: string;
  variables: Record<string, string>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class EnhancedMessagingService {
  // Fetch messages for a specific pitch or player
  static async getMessages(pitchId?: string, playerId?: string, limit = 50): Promise<EnhancedMessage[]> {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(
            full_name,
            user_type
          ),
          receiver_profile:profiles!messages_receiver_id_fkey(
            full_name,
            user_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (pitchId) {
        query = query.eq('pitch_id', pitchId);
      }
      if (playerId) {
        query = query.eq('player_id', playerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        pitch_id: msg.pitch_id,
        player_id: msg.player_id,
        content: msg.content,
        message_type: msg.message_type || 'general',
        subject: msg.subject,
        contract_file_url: msg.contract_file_url,
        created_at: msg.created_at,
        status: 'sent' as const,
        is_flagged: msg.is_flagged || false,
        sender_profile: msg.sender_profile ? {
          full_name: msg.sender_profile.full_name || 'Unknown',
          user_type: msg.sender_profile.user_type || 'user',
          logo_url: undefined
        } : undefined,
        receiver_profile: msg.receiver_profile ? {
          full_name: msg.receiver_profile.full_name || 'Unknown',
          user_type: msg.receiver_profile.user_type || 'user',
          logo_url: undefined
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Send a new message
  static async sendMessage(messageData: {
    receiver_id: string;
    pitch_id?: string;
    player_id?: string;
    content: string;
    message_type?: string;
    subject?: string;
    contract_file_url?: string;
  }): Promise<EnhancedMessage> {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const messagePayload = {
        sender_id: profile.id,
        receiver_id: messageData.receiver_id,
        pitch_id: messageData.pitch_id,
        player_id: messageData.player_id,
        content: messageData.content,
        message_type: messageData.message_type || 'general',
        subject: messageData.subject,
        contract_file_url: messageData.contract_file_url,
        is_contract_message: messageData.message_type === 'contract',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messagePayload)
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(
            full_name,
            user_type
          ),
          receiver_profile:profiles!messages_receiver_id_fkey(
            full_name,
            user_type
          )
        `)
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        pitch_id: data.pitch_id,
        player_id: data.player_id,
        content: data.content,
        message_type: data.message_type || 'general',
        subject: data.subject,
        contract_file_url: data.contract_file_url,
        created_at: data.created_at,
        status: 'sent' as const,
        is_flagged: data.is_flagged || false,
        sender_profile: data.sender_profile ? {
          full_name: data.sender_profile.full_name || 'Unknown',
          user_type: data.sender_profile.user_type || 'user',
          logo_url: undefined
        } : undefined,
        receiver_profile: data.receiver_profile ? {
          full_name: data.receiver_profile.full_name || 'Unknown',
          user_type: data.receiver_profile.user_type || 'user',
          logo_url: undefined
        } : undefined
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Mark message as read
  static async markAsRead(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  // Get contract templates
  static async getContractTemplates(sportType?: string): Promise<ContractTemplate[]> {
    try {
      let query = supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (sportType) {
        query = query.eq('sport_type', sportType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(template => ({
        id: template.id,
        template_name: template.name,
        template_type: template.template_type,
        sport_type: template.sport_type || 'unspecified',
        template_content: template.template_content || template.content,
        variables: typeof template.variables === 'string' ? JSON.parse(template.variables) : (template.variables || {}),
        is_active: template.is_active,
        created_by: template.created_by || '',
        created_at: template.created_at || '',
        updated_at: template.updated_at || ''
      }));
    } catch (error) {
      console.error('Error fetching contract templates:', error);
      throw error;
    }
  }

  // Get unread message count
  static async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Delete message
  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // Update message
  static async updateMessage(messageId: string, updates: Partial<EnhancedMessage>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating message:', error);
      return false;
    }
  }
}
