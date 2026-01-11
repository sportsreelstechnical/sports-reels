
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'message' | 'player_created' | 'transfer' | 'contract' | 'system' | 'general';
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

export class AppNotificationService {
  static async createNotification(data: NotificationData) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata || {},
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating notification:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in createNotification:', error);
      return { success: false, error };
    }
  }

  static async notifyNewMessage(recipientId: string, senderName: string, messagePreview: string) {
    return this.createNotification({
      user_id: recipientId,
      title: 'New Message',
      message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      type: 'message',
      metadata: {
        sender_name: senderName,
        message_preview: messagePreview
      }
    });
  }

  static async notifyPlayerCreated(teamId: string, playerName: string, creatorName: string) {
    return this.createNotification({
      user_id: teamId,
      title: 'New Player Added',
      message: `${playerName} has been added to your roster by ${creatorName}`,
      type: 'player_created',
      metadata: {
        player_name: playerName,
        creator_name: creatorName
      }
    });
  }

  static async notifyTransferActivity(userId: string, playerName: string, activityType: string, details: string) {
    return this.createNotification({
      user_id: userId,
      title: 'Transfer Update',
      message: `${playerName}: ${details}`,
      type: 'transfer',
      metadata: {
        player_name: playerName,
        activity_type: activityType,
        details
      },
      priority: 'high'
    });
  }

  static async notifyContractUpdate(userId: string, contractType: string, status: string, playerName?: string) {
    const title = playerName ? `Contract Update - ${playerName}` : 'Contract Update';
    const message = `${contractType} contract ${status}${playerName ? ` for ${playerName}` : ''}`;
    
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'contract',
      metadata: {
        contract_type: contractType,
        status,
        player_name: playerName
      },
      priority: 'high'
    });
  }

  static async notifySystemUpdate(userId: string, title: string, message: string, metadata?: Record<string, any>) {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'system',
      metadata: metadata || {},
      priority: 'medium'
    });
  }

  static async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return { success: false, error };
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return { success: false, error };
    }
  }

  static async getUserNotifications(userId: string, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching notifications:', error);
        return { success: false, error, data: [] };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return { success: false, error, data: [] };
    }
  }
}
