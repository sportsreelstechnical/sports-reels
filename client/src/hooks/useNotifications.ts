import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notificationService, NotificationData } from '@/domains/notifications/services/notificationService';

export const useNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Set up toast for notification service
  useEffect(() => {
    notificationService.setToast(toast);
  }, [toast]);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      const [notificationsData, unreadCountData] = await Promise.all([
        notificationService.getUserNotifications(profile.user_id),
        notificationService.getUnreadCount(profile.user_id)
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      
      // If there's a network error, try again after a short delay
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('Network error detected, retrying in 2 seconds...');
        setTimeout(() => {
          loadNotifications();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Recalculate unread count whenever notifications change
  useEffect(() => {
    const calculatedUnreadCount = notifications.filter(n => !n.read).length;
    setUnreadCount(calculatedUnreadCount);
  }, [notifications, lastUpdate]);

  // Polling fallback to ensure data stays in sync (every 30 seconds)
  useEffect(() => {
    if (!profile?.user_id) return;

    const pollInterval = setInterval(async () => {
      try {
        const [notificationsData, unreadCountData] = await Promise.all([
          notificationService.getUserNotifications(profile.user_id),
          notificationService.getUnreadCount(profile.user_id)
        ]);
        
        // Only update if there are actual changes to avoid unnecessary re-renders
        setNotifications(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(notificationsData)) {
            return notificationsData;
          }
          return prev;
        });
        
        setUnreadCount(prev => {
          if (prev !== unreadCountData) {
            return unreadCountData;
          }
          return prev;
        });
      } catch (error) {
        console.error('Error during polling:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [profile?.user_id]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = notificationService.subscribeToUserNotifications(
      profile.user_id,
      (notification) => {
        setNotifications(prev => {
          // Check if this is a deletion
          if ((notification as any)._deleted) {
            // Remove the deleted notification
            return prev.filter(n => n.id !== notification.id);
          }
          
          // Check if this is an update to an existing notification
          const existingIndex = prev.findIndex(n => n.id === notification.id);
          
          if (existingIndex >= 0) {
            // Update existing notification
            const updated = [...prev];
            updated[existingIndex] = notification;
            return updated;
          } else {
            // Add new notification
            const updated = [notification, ...prev];
            return updated;
          }
        });
        
        // Force immediate re-render by updating a timestamp
        setLastUpdate(Date.now());
      }
    );

    return () => {
      notificationService.unsubscribe(`user-notifications-${profile.user_id}`);
    };
  }, [profile?.user_id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Update UI immediately for better responsiveness
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Force immediate re-render
      setLastUpdate(Date.now());
      
      // Then update the database
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      
      // Revert the UI change if database update failed
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: false }
            : notification
        )
      );
      setLastUpdate(Date.now());
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update UI immediately for better responsiveness
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Force immediate re-render
      setLastUpdate(Date.now());
      
      // Then update the database
      await Promise.all(
        unreadNotifications.map(notification => 
          notificationService.markAsRead(notification.id)
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      
      // Revert the UI change if database update failed
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: false }))
      );
      setLastUpdate(Date.now());
    }
  }, [notifications, profile?.user_id]);

  // Create a notification
  const createNotification = useCallback(async (
    type: NotificationData['type'],
    title: string,
    description: string,
    data?: any
  ) => {
    if (!profile?.user_id) return;

    try {
      const notification = await notificationService.createNotification({
        type,
        title,
        description,
        data,
        user_id: profile.user_id
      });
      
      setNotifications(prev => [notification, ...prev]);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, [profile?.user_id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const success = await notificationService.deleteNotification(notificationId);
      if (success) {
        // Remove notification from local state
        setNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        );
        
        // Force immediate re-render
        setLastUpdate(Date.now());
      }
      return success;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    refreshNotifications: loadNotifications
  };
};

// Hook for contract-specific notifications
export const useContractNotifications = (contractId: string) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!contractId || !profile?.user_id) return;

    // Subscribe to contract messages
    const messageChannel = notificationService.subscribeToContractMessages(
      contractId,
      (message) => {
        // Only show notification if message is not from current user
        if (message.sender_id !== profile.id) {
          toast({
            title: "New Message",
            description: "You have a new message in the contract discussion",
            duration: 3000,
          });
        }
      }
    );

    // Subscribe to contract updates
    const updateChannel = notificationService.subscribeToContractUpdates(
      contractId,
      (contract) => {
        toast({
          title: "Contract Updated",
          description: "The contract has been updated",
          duration: 3000,
        });
      }
    );

    // Check connection status
    const checkConnection = () => {
      setIsConnected(true);
    };

    checkConnection();

    return () => {
      notificationService.unsubscribe(`contract-messages-${contractId}`);
      notificationService.unsubscribe(`contract-updates-${contractId}`);
    };
  }, [contractId, profile?.user_id, profile?.id, toast]);

  return {
    isConnected
  };
};

// Hook for transfer-specific notifications
export const useTransferNotifications = (transferId: string) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!transferId || !profile?.user_id) return;

    // Subscribe to transfer updates
    const channel = notificationService.subscribeToTransferUpdates(
      transferId,
      (transfer) => {
        toast({
          title: "Transfer Update",
          description: "A transfer you're involved in has been updated",
          duration: 3000,
        });
      }
    );

    setIsConnected(true);

    return () => {
      notificationService.unsubscribe(`transfer-updates-${transferId}`);
    };
  }, [transferId, profile?.user_id, toast]);

  return {
    isConnected
  };
};