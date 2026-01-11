import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationCounts {
  total: number;
  agent_interest: number;
  contract_update: number;
  message: number;
  system: number;
}

export const useNotificationCounts = () => {
  const { profile } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    agent_interest: 0,
    contract_update: 0,
    message: 0,
    system: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      
      console.log('🔍 NOTIFICATION DEBUG: Fetching counts for user:', {
        user_id: profile.user_id,
        profile_id: profile.id,
        full_name: profile.full_name,
        user_type: profile.user_type
      });
      
      // Get unread notification counts by type
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, created_at, metadata')
        .eq('user_id', profile.user_id)
        .eq('is_read', false);

      if (error) throw error;

      console.log('🔍 NOTIFICATION DEBUG: Raw notifications found:', data);
      console.log('🔍 NOTIFICATION DEBUG: Agent interest notifications:', 
        data?.filter(n => n.type === 'agent_interest'));
      
      // Log each agent_interest notification in detail
      data?.filter(n => n.type === 'agent_interest').forEach(notification => {
        console.log('🔍 AGENT INTEREST NOTIFICATION:', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          created_at: notification.created_at,
          metadata: notification.metadata,
          recipient_user_id: profile.user_id,
          recipient_profile_type: profile.user_type,
          recipient_name: profile.full_name
        });
      });

      const newCounts: NotificationCounts = {
        total: data?.length || 0,
        agent_interest: 0,
        contract_update: 0,
        message: 0,
        system: 0
      };

      // Count notifications by type
      data?.forEach((notification) => {
        const type = notification.type as keyof NotificationCounts;
        if (type in newCounts && type !== 'total') {
          newCounts[type]++;
        }
      });

      // Only log if counts changed
      if (JSON.stringify(newCounts) !== JSON.stringify(counts)) {
        console.log('📊 Notification counts updated:', newCounts);
      }
      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!profile?.user_id) return;

    fetchCounts();

    // Poll for notification count updates every 10 seconds (reduced frequency)
    const interval = setInterval(() => {
      fetchCounts();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [profile?.user_id]);

  return {
    counts,
    loading,
    refresh: fetchCounts
  };
};
