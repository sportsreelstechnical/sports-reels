import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedNotificationService } from '@/domains/notifications/services/enhancedNotificationService';

export const useAutoMarkNotificationsRead = (isActive: boolean, notificationType?: string) => {
  const { profile } = useAuth();

  useEffect(() => {
    if (!isActive || !profile?.user_id) return;

    // Auto-mark notifications as read when the tab becomes active
    const markNotificationsRead = async () => {
      try {
        console.log(`📖 Auto-marking ${notificationType || 'all'} notifications as read for user:`, profile.user_id);
        
        if (notificationType) {
          // Mark specific type notifications as read
          const notifications = await EnhancedNotificationService.getUserNotifications(
            profile.user_id,
            50,
            0,
            notificationType
          );

          const unreadNotifications = notifications.filter(n => !n.is_read);
          
          console.log(`Found ${unreadNotifications.length} unread ${notificationType} notifications`);
          
          for (const notification of unreadNotifications) {
            await EnhancedNotificationService.markAsRead(notification.id);
            console.log(`✅ Marked notification ${notification.id} as read`);
          }

          if (unreadNotifications.length > 0) {
            console.log(`✅ Successfully marked ${unreadNotifications.length} ${notificationType} notifications as read`);
          }
        } else {
          // Mark all unread notifications as read
          await EnhancedNotificationService.markAllAsRead(profile.user_id);
          console.log('✅ Marked all notifications as read');
        }
      } catch (error) {
        console.error('Error auto-marking notifications as read:', error);
      }
    };

    // Delay to ensure the user has actually viewed the content
    const timeout = setTimeout(markNotificationsRead, 2000);

    return () => clearTimeout(timeout);
  }, [isActive, profile?.user_id, notificationType]);
};
