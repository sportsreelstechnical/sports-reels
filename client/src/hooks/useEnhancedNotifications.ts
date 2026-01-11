
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EnhancedNotificationService, EnhancedNotification, NotificationPreferences } from '@/domains/notifications/services/enhancedNotificationService';

export const useEnhancedNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    by_type: {} as Record<string, number>
  });

  // Fetch notifications
  const fetchNotifications = useCallback(async (limit = 50, offset = 0, type?: string) => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      console.log('Fetching notifications for user:', profile.user_id);
      const data = await EnhancedNotificationService.getUserNotifications(profile.user_id, limit, offset, type);
      console.log('Fetched notifications:', data);
      setNotifications(data);
      
      // Update stats
      const notificationStats = await EnhancedNotificationService.getNotificationStats(profile.user_id);
      console.log('Notification stats:', notificationStats);
      setStats(notificationStats);
      setUnreadCount(notificationStats.unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, toast]);

  // Fetch notification preferences
  const fetchPreferences = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      let prefs = await EnhancedNotificationService.getNotificationPreferences(profile.user_id);
      
      // Create default preferences if none exist
      if (!prefs) {
        await EnhancedNotificationService.createDefaultPreferences(profile.user_id);
        prefs = await EnhancedNotificationService.getNotificationPreferences(profile.user_id);
      }
      
      setPreferences(prefs);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, [profile?.user_id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const success = await EnhancedNotificationService.markAsRead(notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      const success = await EnhancedNotificationService.markAllAsRead(profile.user_id);
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        setStats(prev => ({ ...prev, unread: 0 }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [profile?.user_id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const success = await EnhancedNotificationService.deleteNotification(notificationId);
      if (success) {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update stats
        if (deletedNotification) {
          setStats(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1),
            unread: deletedNotification.is_read ? prev.unread : Math.max(0, prev.unread - 1),
            by_type: {
              ...prev.by_type,
              [deletedNotification.type]: Math.max(0, (prev.by_type[deletedNotification.type] || 0) - 1)
            }
          }));
          
          if (!deletedNotification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!profile?.user_id) return;

    try {
      const success = await EnhancedNotificationService.updateNotificationPreferences(profile.user_id, newPreferences);
      if (success) {
        setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
        toast({
          title: "Success",
          description: "Notification preferences updated",
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
    }
  }, [profile?.user_id, toast]);

  // Create notification (for testing or programmatic creation)
  const createNotification = useCallback(async (notificationData: {
    title: string;
    message: string;
    type: string;
    action_url?: string;
    action_text?: string;
    metadata?: any;
  }) => {
    if (!profile?.user_id) return;

    try {
      const newNotification = await EnhancedNotificationService.createNotification({
        ...notificationData,
        user_id: profile.user_id
      });
      
      setNotifications(prev => [newNotification, ...prev]);
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        unread: prev.unread + 1,
        by_type: {
          ...prev.by_type,
          [newNotification.type]: (prev.by_type[newNotification.type] || 0) + 1
        }
      }));
      setUnreadCount(prev => prev + 1);
      
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, [profile?.user_id]);

  // Filter notifications by type
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Initialize data
  useEffect(() => {
    if (!profile?.user_id) return;

    fetchNotifications();
    fetchPreferences();
  }, [profile?.user_id]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    preferences,
    stats,
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    createNotification,
    
    // Filters
    getNotificationsByType,
    
    // Refresh
    refresh: () => fetchNotifications()
  };
};
