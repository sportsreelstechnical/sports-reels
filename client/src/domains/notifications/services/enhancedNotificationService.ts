import { apiRequest } from "@/lib/queryClient";

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
  static async getUserNotifications(
    userId: string,
    limit = 50,
    offset = 0,
    type?: string,
  ): Promise<EnhancedNotification[]> {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (type) {
        queryParams.append("type", type);
      }

      const response = await apiRequest(
        "GET",
        `/api/notifications?${queryParams.toString()}`,
      );
      if (!response.ok) throw new Error("Failed to fetch notifications");

      return await response.json();
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await apiRequest(
        "GET",
        "/api/notifications/unread-count",
      );
      if (!response.ok) throw new Error("Failed to fetch unread count");

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/notifications/${notificationId}/read`,
      );
      return response.ok;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const response = await apiRequest("PATCH", "/api/notifications/read-all");
      return response.ok;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
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
      const response = await apiRequest(
        "POST",
        "/api/notifications",
        notificationData,
      );
      if (!response.ok) throw new Error("Failed to create notification");
      return await response.json();
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Create message notification
  static async createMessageNotification(
    userId: string,
    messageData: {
      sender_name: string;
      message_type: string;
      pitch_id?: string;
      player_id?: string;
      message_id: string;
    },
  ): Promise<EnhancedNotification> {
    const title = "New Message Received";
    const message = `You have received a new ${messageData.message_type} message from ${messageData.sender_name}`;

    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: "message",
      action_url: `/messages/${messageData.message_id}`,
      action_text: "View Message",
      metadata: {
        message_id: messageData.message_id,
        sender_name: messageData.sender_name,
        message_type: messageData.message_type,
        pitch_id: messageData.pitch_id,
        player_id: messageData.player_id,
      },
    });
  }

  // Create contract notification
  static async createContractNotification(
    userId: string,
    contractData: {
      sender_name: string;
      contract_type: string;
      pitch_id?: string;
      player_id?: string;
      contract_id: string;
    },
  ): Promise<EnhancedNotification> {
    const title = "New Contract Received";
    const message = `You have received a new ${contractData.contract_type} contract from ${contractData.sender_name}`;

    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: "contract",
      action_url: `/contracts/${contractData.contract_id}`,
      action_text: "Review Contract",
      metadata: {
        contract_id: contractData.contract_id,
        sender_name: contractData.sender_name,
        contract_type: contractData.contract_type,
        pitch_id: contractData.pitch_id,
        player_id: contractData.player_id,
      },
    });
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/notifications/${notificationId}`,
      );
      return response.ok;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  // Get notification preferences
  static async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const response = await apiRequest("GET", "/api/notification-preferences");
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch preferences");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      return null;
    }
  }

  // Update notification preferences
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<boolean> {
    try {
      const response = await apiRequest(
        "PATCH",
        "/api/notification-preferences",
        preferences,
      );
      return response.ok;
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      return false;
    }
  }

  // Create default notification preferences
  static async createDefaultPreferences(userId: string): Promise<boolean> {
    try {
      const defaultPreferences = {
        email_notifications: true,
        in_app_notifications: true,
        message_notifications: true,
        transfer_updates: true,
        profile_changes: true,
        login_notifications: true,
        newsletter_subscription: true,
      };

      const response = await apiRequest(
        "POST",
        "/api/notification-preferences",
        defaultPreferences,
      );
      return response.ok;
    } catch (error) {
      console.error("Error creating default preferences:", error);
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
      const response = await apiRequest("GET", "/api/notifications/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return await response.json();
    } catch (error) {
      console.error("Error getting notification stats:", error);
      return {
        total: 0,
        unread: 0,
        by_type: {},
      };
    }
  }
}
