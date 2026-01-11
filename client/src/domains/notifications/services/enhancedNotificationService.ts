
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  action_text?: string;
  metadata?: any;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  message_notifications: boolean;
  transfer_updates: boolean;
  profile_changes: boolean;
  login_notifications: boolean;
  newsletter_subscription: boolean;
  created_at: string;
  updated_at: string;
}

export class EnhancedNotificationService {
  // Get user notifications
  static async getUserNotifications(userId: string, limit = 50, offset = 0, type?: string): Promise<EnhancedNotification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(notification => ({
        id: notification.id,
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: notification.is_read || false,
        action_url: notification.action_url,
        action_text: notification.action_text,
        metadata: notification.metadata ? 
          (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata) : 
          null,
        created_at: notification.created_at
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Create notification
  static async createNotification(notificationData: {
    user_id: string;
    title: string;
    message: string;
    type: string;
    action_url?: string;
    action_text?: string;
    metadata?: any;
  }): Promise<EnhancedNotification> {
    try {
      const notificationPayload = {
        user_id: notificationData.user_id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        action_url: notificationData.action_url,
        action_text: notificationData.action_text,
        metadata: notificationData.metadata ? JSON.stringify(notificationData.metadata) : null,
        is_read: false,
        created_at: new Date().toISOString()
      };

      console.log('Creating notification for:', notificationData.title);

      // Use database function to bypass RLS for system notifications
      const { data: functionResult, error: functionError } = await supabase
        .rpc('create_system_notification', {
          target_user_id: notificationData.user_id,
          notification_title: notificationData.title,
          notification_message: notificationData.message,
          notification_type: notificationData.type,
          notification_action_url: notificationData.action_url,
          notification_action_text: notificationData.action_text,
          notification_metadata: notificationData.metadata || {}
        });

      if (functionError) {
        console.error('Database function error creating notification:', functionError);
        throw functionError;
      }

      console.log('✅ Notification created with ID:', functionResult);

      // Return the notification data without fetching it back (to avoid RLS issues)
      // We have all the data we need from the original payload
      return {
        id: functionResult,
        user_id: notificationData.user_id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        is_read: false,
        action_url: notificationData.action_url,
        action_text: notificationData.action_text,
        metadata: notificationData.metadata,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create message notification
  static async createMessageNotification(userId: string, messageData: {
    sender_name: string;
    message_type: string;
    pitch_id?: string;
    player_id?: string;
    message_id: string;
  }): Promise<EnhancedNotification> {
    const title = 'New Message Received';
    const message = `You have received a new ${messageData.message_type} message from ${messageData.sender_name}`;
    
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'message',
      action_url: `/messages/${messageData.message_id}`,
      action_text: 'View Message',
      metadata: {
        message_id: messageData.message_id,
        sender_name: messageData.sender_name,
        message_type: messageData.message_type,
        pitch_id: messageData.pitch_id,
        player_id: messageData.player_id
      }
    });
  }

  // Create contract notification
  static async createContractNotification(userId: string, contractData: {
    sender_name: string;
    contract_type: string;
    pitch_id?: string;
    player_id?: string;
    contract_id: string;
  }): Promise<EnhancedNotification> {
    const title = 'New Contract Received';
    const message = `You have received a new ${contractData.contract_type} contract from ${contractData.sender_name}`;
    
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'contract',
      action_url: `/contracts/${contractData.contract_id}`,
      action_text: 'Review Contract',
      metadata: {
        contract_id: contractData.contract_id,
        sender_name: contractData.sender_name,
        contract_type: contractData.contract_type,
        pitch_id: contractData.pitch_id,
        player_id: contractData.player_id
      }
    });
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  // Get notification preferences
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  // Create default notification preferences
  static async createDefaultPreferences(userId: string): Promise<boolean> {
    try {
      const defaultPreferences = {
        user_id: userId,
        email_notifications: true,
        in_app_notifications: true,
        message_notifications: true,
        transfer_updates: true,
        profile_changes: true,
        login_notifications: true,
        newsletter_subscription: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_preferences')
        .insert(defaultPreferences);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating default preferences:', error);
      return false;
    }
  }

  // Get notification statistics
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    by_type: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, is_read')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total: data.length,
        unread: data.filter(n => !n.is_read).length,
        by_type: {} as Record<string, number>
      };

      data.forEach(notification => {
        stats.by_type[notification.type] = (stats.by_type[notification.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total: 0,
        unread: 0,
        by_type: {}
      };
    }
  }
}
