
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EventType } from '@/components/EnhancedTeamTimeline';

interface TimelineEvent {
  id: string;
  team_id: string;
  event_type: EventType;
  title: string;
  description: string;
  event_date: string;
  created_at: string;
  metadata?: any;
  is_pinned: boolean;
  player_id?: string;
  match_id?: string;
  created_by: string;
  reactions_count: number;
  comments_count: number;
  players?: {
    id: string;
    full_name: string;
    photo_url?: string;
  };
}

interface UseTimelineOptions {
  eventType?: EventType | 'all';
  playerId?: string;
  dateRange?: 'week' | 'month' | 'season' | 'all';
  searchTerm?: string;
}

export const useTimeline = (options: UseTimelineOptions = {}) => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!profile?.id || profile.user_type !== 'team') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('timeline_events')
        .select(`
          *,
          players (
            id,
            full_name,
            photo_url
          )
        `)
        .eq('team_id', profile.id);

      // Apply filters
      if (options.eventType && options.eventType !== 'all') {
        query = query.eq('event_type', options.eventType);
      }

      if (options.playerId) {
        query = query.eq('player_id', options.playerId);
      }

      if (options.dateRange && options.dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (options.dateRange) {
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case 'season':
            filterDate.setMonth(now.getMonth() - 12);
            break;
        }
        
        query = query.gte('event_date', filterDate.toISOString().split('T')[0]);
      }

      query = query.order('is_pinned', { ascending: false })
                   .order('event_date', { ascending: false })
                   .order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let filteredData = data || [];

      // Apply search filter
      if (options.searchTerm) {
        const searchLower = options.searchTerm.toLowerCase();
        filteredData = filteredData.filter(event =>
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.players?.full_name.toLowerCase().includes(searchLower)
        );
      }

      // Transform the data to match our interface
      const transformedData: TimelineEvent[] = filteredData.map(item => ({
        ...item,
        event_type: item.event_type as EventType,
        players: item.players as { id: string; full_name: string; photo_url?: string; } | undefined
      }));

      setEvents(transformedData);
    } catch (err) {
      console.error('Error fetching timeline events:', err);
      setError('Failed to load timeline events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: {
    event_type: EventType;
    title: string;
    description: string;
    event_date: string;
    player_id?: string;
    match_id?: string;
    metadata?: any;
  }) => {
    if (!profile?.id) return false;

    try {
      const { error } = await supabase
        .from('timeline_events')
        .insert({
          team_id: profile.id,
          created_by: profile.id,
          ...eventData
        });

      if (error) throw error;

      // Refresh events
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error creating event:', err);
      return false;
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<TimelineEvent>) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(events.map(event =>
        event.id === eventId ? { ...event, ...updates } : event
      ));
      return true;
    } catch (err) {
      console.error('Error updating event:', err);
      return false;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Update local state
      setEvents(events.filter(event => event.id !== eventId));
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      return false;
    }
  };

  const togglePin = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return false;

    return updateEvent(eventId, { is_pinned: !event.is_pinned });
  };

  const addReaction = async (eventId: string, reactionType: 'like' | 'important' | 'flag') => {
    if (!profile?.id) return false;

    try {
      const { error } = await supabase
        .from('timeline_reactions')
        .insert({
          event_id: eventId,
          profile_id: profile.id,
          reaction_type: reactionType
        });

      if (error) {
        // Handle duplicate reaction (user already reacted)
        if (error.code === '23505') {
          return true; // Already reacted
        }
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Error adding reaction:', err);
      return false;
    }
  };

  const removeReaction = async (eventId: string, reactionType: 'like' | 'important' | 'flag') => {
    if (!profile?.id) return false;

    try {
      const { error } = await supabase
        .from('timeline_reactions')
        .delete()
        .eq('event_id', eventId)
        .eq('profile_id', profile.id)
        .eq('reaction_type', reactionType);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      return false;
    }
  };

  const exportTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select(`
          *,
          players (
            id,
            full_name,
            position,
            jersey_number
          ),
          timeline_comments (
            content,
            created_at,
            profiles (
              full_name,
              user_type
            )
          )
        `)
        .eq('team_id', profile?.id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error exporting timeline:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [profile?.id, options.eventType, options.playerId, options.dateRange, options.searchTerm]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('timeline_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `team_id=eq.${profile.id}`
        },
        () => {
          fetchEvents(); // Refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    togglePin,
    addReaction,
    removeReaction,
    exportTimeline,
    refetch: fetchEvents
  };
};
