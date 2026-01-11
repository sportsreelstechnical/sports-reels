import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export interface RealTimeUpdate {
  type: 'pitch' | 'message' | 'contract' | 'shortlist' | 'request';
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: Date;
}

export class RealTimeUpdatesService {
  private static instance: RealTimeUpdatesService;
  private subscriptions: Map<string, any> = new Map();
  private listeners: Map<string, Set<(update: RealTimeUpdate) => void>> = new Map();

  static getInstance(): RealTimeUpdatesService {
    if (!RealTimeUpdatesService.instance) {
      RealTimeUpdatesService.instance = new RealTimeUpdatesService();
    }
    return RealTimeUpdatesService.instance;
  }

  // Subscribe to transfer pitch updates
  subscribeToPitchUpdates(userId: string, callback: (update: RealTimeUpdate) => void) {
    const subscription = supabase
      .channel(`pitch_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_pitches',
          filter: `team_id=eq.${userId}`
        },
        (payload) => {
          const update: RealTimeUpdate = {
            type: 'pitch',
            action: payload.eventType as any,
            data: payload.new || payload.old,
            timestamp: new Date()
          };

          this.notifyListeners('pitch', update);
          callback(update);

          // Show toast notification
          this.showUpdateNotification(update);
        }
      )
      .subscribe();

    this.subscriptions.set(`pitch_${userId}`, subscription);
    this.addListener('pitch', callback);
  }

  // Subscribe to message updates
  subscribeToMessageUpdates(userId: string, callback: (update: RealTimeUpdate) => void) {
    const subscription = supabase
      .channel(`message_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          const update: RealTimeUpdate = {
            type: 'message',
            action: 'created',
            data: payload.new,
            timestamp: new Date()
          };

          this.notifyListeners('message', update);
          callback(update);

          // Show toast notification for new messages
          this.showUpdateNotification(update);
        }
      )
      .subscribe();

    this.subscriptions.set(`message_${userId}`, subscription);
    this.addListener('message', callback);
  }

  // Subscribe to contract updates
  subscribeToContractUpdates(userId: string, callback: (update: RealTimeUpdate) => void) {
    const subscription = supabase
      .channel(`contract_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `created_by=eq.${userId}`
        },
        (payload) => {
          const update: RealTimeUpdate = {
            type: 'contract',
            action: payload.eventType as any,
            data: payload.new || payload.old,
            timestamp: new Date()
          };

          this.notifyListeners('contract', update);
          callback(update);

          // Show toast notification for contract updates
          this.showUpdateNotification(update);
        }
      )
      .subscribe();

    this.subscriptions.set(`contract_${userId}`, subscription);
    this.addListener('contract', callback);
  }

  // Subscribe to shortlist updates
  subscribeToShortlistUpdates(userId: string, callback: (update: RealTimeUpdate) => void) {
    const subscription = supabase
      .channel(`shortlist_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shortlist',
          filter: `agent_id=eq.${userId}`
        },
        (payload) => {
          const update: RealTimeUpdate = {
            type: 'shortlist',
            action: payload.eventType as any,
            data: payload.new || payload.old,
            timestamp: new Date()
          };

          this.notifyListeners('shortlist', update);
          callback(update);
        }
      )
      .subscribe();

    this.subscriptions.set(`shortlist_${userId}`, subscription);
    this.addListener('shortlist', callback);
  }

  // Subscribe to agent request updates
  subscribeToRequestUpdates(userId: string, callback: (update: RealTimeUpdate) => void) {
    const subscription = supabase
      .channel(`request_updates_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_requests',
          filter: `agent_id=eq.${userId}`
        },
        (payload) => {
          const update: RealTimeUpdate = {
            type: 'request',
            action: payload.eventType as any,
            data: payload.new || payload.old,
            timestamp: new Date()
          };

          this.notifyListeners('request', update);
          callback(update);
        }
      )
      .subscribe();

    this.subscriptions.set(`request_${userId}`, subscription);
    this.addListener('request', callback);
  }

  // Add listener for specific update type
  addListener(type: string, callback: (update: RealTimeUpdate) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  // Remove listener for specific update type
  removeListener(type: string, callback: (update: RealTimeUpdate) => void) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(callback);
    }
  }

  // Notify all listeners for a specific update type
  private notifyListeners(type: string, update: RealTimeUpdate) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in real-time update callback:', error);
        }
      });
    }
  }

  // Show toast notification for updates
  private showUpdateNotification(update: RealTimeUpdate) {
    let title = '';
    let description = '';

    switch (update.type) {
      case 'pitch':
        if (update.action === 'created') {
          title = 'New Transfer Pitch';
          description = 'A new transfer pitch has been created';
        } else if (update.action === 'updated') {
          title = 'Pitch Updated';
          description = 'A transfer pitch has been updated';
        }
        break;

      case 'message':
        if (update.action === 'created') {
          title = 'New Message';
          description = 'You have received a new message';
        }
        break;

      case 'contract':
        if (update.action === 'created') {
          title = 'New Contract';
          description = 'A new contract has been created';
        } else if (update.action === 'updated') {
          title = 'Contract Updated';
          description = 'A contract has been updated';
        }
        break;

      case 'shortlist':
        if (update.action === 'created') {
          title = 'Added to Shortlist';
          description = 'A player has been added to your shortlist';
        } else if (update.action === 'deleted') {
          title = 'Removed from Shortlist';
          description = 'A player has been removed from your shortlist';
        }
        break;

      case 'request':
        if (update.action === 'created') {
          title = 'New Request';
          description = 'A new agent request has been created';
        }
        break;
    }

    if (title && description) {
      toast({
        title,
        description,
        duration: 5000,
      });
    }
  }

  // Unsubscribe from all updates
  unsubscribe(userId: string) {
    const keys = [
      `pitch_${userId}`,
      `message_${userId}`,
      `contract_${userId}`,
      `shortlist_${userId}`,
      `request_${userId}`
    ];

    keys.forEach(key => {
      const subscription = this.subscriptions.get(key);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(key);
      }
    });

    // Clear all listeners
    this.listeners.clear();
  }

  // Unsubscribe from specific update type
  unsubscribeFromType(userId: string, type: string) {
    const key = `${type}_${userId}`;
    const subscription = this.subscriptions.get(key);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }

    // Remove listeners for this type
    this.listeners.delete(type);
  }

  // Get subscription status
  getSubscriptionStatus(userId: string): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    
    ['pitch', 'message', 'contract', 'shortlist', 'request'].forEach(type => {
      const key = `${type}_${userId}`;
      status[type] = this.subscriptions.has(key);
    });

    return status;
  }

  // Manually trigger an update (useful for testing)
  triggerManualUpdate(type: string, action: string, data: any) {
    const update: RealTimeUpdate = {
      type: type as any,
      action: action as any,
      data,
      timestamp: new Date()
    };

    this.notifyListeners(type, update);
  }
}

// Export singleton instance
export const realTimeUpdates = RealTimeUpdatesService.getInstance();

// Hook for using real-time updates
export const useRealTimeUpdates = (userId: string, types: string[] = []) => {
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const updateCallbacks: { [key: string]: (update: RealTimeUpdate) => void } = {};

    types.forEach(type => {
      updateCallbacks[type] = (update: RealTimeUpdate) => {
        setUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
      };

      switch (type) {
        case 'pitch':
          realTimeUpdates.subscribeToPitchUpdates(userId, updateCallbacks[type]);
          break;
        case 'message':
          realTimeUpdates.subscribeToMessageUpdates(userId, updateCallbacks[type]);
          break;
        case 'contract':
          realTimeUpdates.subscribeToContractUpdates(userId, updateCallbacks[type]);
          break;
        case 'shortlist':
          realTimeUpdates.subscribeToShortlistUpdates(userId, updateCallbacks[type]);
          break;
        case 'request':
          realTimeUpdates.subscribeToRequestUpdates(userId, updateCallbacks[type]);
          break;
      }
    });

    setIsConnected(true);

    return () => {
      types.forEach(type => {
        if (updateCallbacks[type]) {
          realTimeUpdates.removeListener(type, updateCallbacks[type]);
        }
      });
      realTimeUpdates.unsubscribe(userId);
      setIsConnected(false);
    };
  }, [userId, types.join(',')]);

  return {
    updates,
    isConnected,
    clearUpdates: () => setUpdates([])
  };
};
