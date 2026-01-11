import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useNotificationToasts = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const lastNotificationCheck = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.user_id) return;

    console.log('🔔 Setting up notification toast system for user:', profile.user_id);

    // Check for new notifications every 5 seconds
    const checkForNewNotifications = async () => {
      try {
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('id, title, message, type, created_at, metadata')
          .eq('user_id', profile.user_id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error checking for new notifications:', error);
          return;
        }

        if (notifications && notifications.length > 0) {
          // Get the most recent notification
          const latestNotification = notifications[0];
          
          // Only show toast if this is a new notification (different from last check)
          if (lastNotificationCheck.current !== latestNotification.id) {
            lastNotificationCheck.current = latestNotification.id;
            
            // Show toast based on notification type and content
            const showToastForNotification = (notification: any) => {
              const action = notification.metadata?.action;
              
              // Determine toast style based on notification type and action
              let toastConfig = {
                title: notification.title,
                description: notification.message,
                duration: 5000,
              };

              // Customize toast based on action type
              if (notification.type === 'agent_interest') {
                switch (action) {
                  case 'expressed_interest':
                    toastConfig = {
                      title: "🎯 New Agent Interest!",
                      description: notification.message,
                      duration: 6000,
                    };
                    break;
                  case 'withdrawn_interest':
                    toastConfig = {
                      title: "🚫 Interest Withdrawn",
                      description: notification.message,
                      duration: 5000,
                    };
                    break;
                  case 'rejected_interest':
                    toastConfig = {
                      title: "❌ Interest Rejected",
                      description: notification.message,
                      duration: 5000,
                    };
                    break;
                  case 'negotiation_started':
                    toastConfig = {
                      title: "🚀 Negotiation Started!",
                      description: notification.message,
                      duration: 6000,
                    };
                    break;
                  case 'status_updated':
                    toastConfig = {
                      title: "📋 Status Updated",
                      description: notification.message,
                      duration: 4000,
                    };
                    break;
                  default:
                    toastConfig = {
                      title: notification.title,
                      description: notification.message,
                      duration: 5000,
                    };
                }
              } else if (notification.type === 'contract_update') {
                toastConfig = {
                  title: "📄 Contract Update",
                  description: notification.message,
                  duration: 6000,
                };
              }

              toast(toastConfig);
              
              console.log('🔔 Toast notification shown:', {
                type: notification.type,
                action: action,
                title: toastConfig.title,
                recipient: profile.user_type
              });
            };

            // Show toast for the latest notification
            showToastForNotification(latestNotification);
          }
        }
      } catch (error) {
        console.error('Error in notification toast system:', error);
      }
    };

    // Initial check
    setTimeout(checkForNewNotifications, 2000);

    // Set up polling for new notifications
    const interval = setInterval(checkForNewNotifications, 5000);

    return () => {
      console.log('🧹 Cleaning up notification toast system');
      clearInterval(interval);
    };
  }, [profile?.user_id, profile?.user_type, toast]);

  return {
    // This hook doesn't return anything, it just sets up the toast system
  };
};
