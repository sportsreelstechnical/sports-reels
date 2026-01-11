import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  Plus,
  Target,
  MessageCircle,
  Download,
  Share2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TimelineEventCard from './timeline/TimelineEventCard';
import SeasonSeparator from './timeline/SeasonSeparator';
import TransferTimelineMessaging from './TransferTimelineMessaging';
import { exportTimelineToPDF } from '@/utils/pdfExport';

export type EventType = 'match' | 'transfer' | 'player' | 'team' | 'achievement';

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

interface TimelineComment {
  id: string;
  event_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    user_type: string;
  };
}

const EnhancedTeamTimeline = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  // State management
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // New event form
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<EventType>('team');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventPlayerId, setNewEventPlayerId] = useState('');

  // Comments
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [comments, setComments] = useState<TimelineComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  // Edit/Delete functionality
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<TimelineEvent | null>(null);

  // Messaging integration
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState<any>(null);

  // Players for filtering/selection
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchTimelineEvents();
      fetchTeamPlayers();
    }
  }, [profile]);

  useEffect(() => {
    filterEvents();
  }, [events, activeTab, dateFilter, selectedPlayer, searchTerm]);

  const fetchTimelineEvents = async () => {
    try {
      setLoading(true);

      const { data: teamData } = await supabase
        .from('teams')
        .select('id, team_name')
        .eq('profile_id', profile?.id)
        .single();

      if (!teamData) return;

      setTeamName(teamData.team_name || 'Your Team');

      const { data, error } = await supabase
        .from('timeline_events')
        .select(`
          *,
          players (
            id,
            full_name,
            photo_url
          )
        `)
        .eq('team_id', teamData.id)
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData: TimelineEvent[] = (data || []).map(item => ({
        ...item,
        event_type: item.event_type as EventType,
        players: item.players as { id: string; full_name: string; photo_url?: string; } | undefined
      }));

      setEvents(transformedData);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      toast({
        title: "Error",
        description: "Failed to load timeline events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async () => {
    try {
      // Get team ID first
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!teamData) return;

      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, photo_url')
        .eq('team_id', teamData.id)
        .order('full_name');

      if (error) throw error;
      setTeamPlayers(data || []);
    } catch (error) {
      console.error('Error fetching team players:', error);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Filter by tab/event type
    if (activeTab !== 'all') {
      filtered = filtered.filter(event => event.event_type === activeTab);
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
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

      filtered = filtered.filter(event =>
        new Date(event.event_date) >= filterDate
      );
    }

    // Filter by player
    if (selectedPlayer !== 'all') {
      filtered = filtered.filter(event =>
        event.player_id === selectedPlayer
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort: pinned events first, then by date
    filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });

    setFilteredEvents(filtered);
  };

  const createEvent = async () => {
    if (!newEventTitle.trim() || !newEventDescription.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get team ID first
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!teamData) return;

      const { error } = await supabase
        .from('timeline_events')
        .insert({
          team_id: teamData.id,
          event_type: newEventType,
          title: newEventTitle,
          description: newEventDescription,
          event_date: newEventDate,
          player_id: newEventPlayerId || null,
          created_by: profile?.id || '',
          is_pinned: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully"
      });

      // Reset form
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventType('team');
      setNewEventPlayerId('');
      setNewEventDate(new Date().toISOString().split('T')[0]);
      setShowCreateEvent(false);

      // Refresh events
      fetchTimelineEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    }
  };

  const groupEventsBySeason = (events: TimelineEvent[]) => {
    return events.reduce((acc, event) => {
      const eventDate = new Date(event.event_date);
      const year = eventDate.getFullYear();
      const month = eventDate.getMonth();

      // Football seasons typically run from August to May
      // So 2023/2024 season would be Aug 2023 to May 2024
      const seasonYear = month >= 7 ? year : year - 1;
      const seasonKey = `${seasonYear}/${seasonYear + 1}`;

      if (!acc[seasonKey]) {
        acc[seasonKey] = [];
      }
      acc[seasonKey].push(event);
      return acc;
    }, {} as Record<string, TimelineEvent[]>);
  };

  const handleExportPDF = () => {
    const currentSeason = dateFilter === 'season' ?
      Object.keys(groupEventsBySeason(events))[0] : undefined;

    exportTimelineToPDF(
      filteredEvents.map(event => ({
        id: event.id,
        event_type: event.event_type,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        created_at: event.created_at,
        is_pinned: event.is_pinned,
        players: event.players
      })),
      teamName,
      currentSeason
    );

    toast({
      title: "Success",
      description: "Timeline exported as PDF"
    });
  };

  const togglePin = async (eventId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({ is_pinned: !currentPinned })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.map(event =>
        event.id === eventId ? { ...event, is_pinned: !currentPinned } : event
      ));

      toast({
        title: "Success",
        description: currentPinned ? "Event unpinned" : "Event pinned"
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive"
      });
    }
  };

  const fetchComments = async (eventId: string) => {
    try {
      // First get the profiles separately to avoid relation issues
      const { data: commentData, error } = await supabase
        .from('timeline_comments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Then get profile details for each comment
      const commentsWithProfiles: TimelineComment[] = [];
      for (const comment of commentData || []) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, user_type')
          .eq('id', comment.profile_id)
          .single();

        commentsWithProfiles.push({
          ...comment,
          profiles: profileData || { full_name: 'Unknown User', user_type: 'user' }
        });
      }

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedEventId) return;

    try {
      const { error } = await supabase
        .from('timeline_comments')
        .insert({
          event_id: selectedEventId,
          profile_id: profile?.id || '',
          content: newComment
        });

      if (error) throw error;

      setNewComment('');
      fetchComments(selectedEventId);

      toast({
        title: "Success",
        description: "Comment added"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const openComments = (eventId: string) => {
    setSelectedEventId(eventId);
    fetchComments(eventId);
    setShowComments(true);
  };

  // Edit event functionality
  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent(event);
    setNewEventType(event.event_type);
    setNewEventTitle(event.title);
    setNewEventDescription(event.description);
    setNewEventDate(event.event_date);
    setNewEventPlayerId(event.player_id || '');
    setShowEditForm(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !newEventTitle.trim() || !newEventDescription.trim()) return;

    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({
          title: newEventTitle,
          description: newEventDescription,
          event_type: newEventType,
          event_date: newEventDate,
          player_id: newEventPlayerId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      // Update local state
      setEvents(prev =>
        prev.map(event =>
          event.id === editingEvent.id
            ? {
              ...event,
              title: newEventTitle,
              description: newEventDescription,
              event_type: newEventType,
              event_date: newEventDate,
              player_id: newEventPlayerId || undefined
            }
            : event
        )
      );

      setShowEditForm(false);
      setEditingEvent(null);
      resetForm();

      toast({
        title: "Success",
        description: "Event updated successfully"
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive"
      });
    }
  };

  // Delete event functionality
  const handleDeleteEvent = (event: TimelineEvent) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', eventToDelete.id);

      if (error) throw error;

      // Remove from local state
      setEvents(prev => prev.filter(event => event.id !== eventToDelete.id));

      setShowDeleteConfirm(false);
      setEventToDelete(null);

      toast({
        title: "Success",
        description: "Event deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setNewEventType('team');
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventDate(new Date().toISOString().split('T')[0]);
    setNewEventPlayerId('');
  };

  // Messaging integration
  const openMessaging = async (event: TimelineEvent) => {
    if (event.event_type === 'transfer' && event.metadata?.pitch_id) {
      try {
        // Fetch pitch details
        const { data: pitchData } = await supabase
          .from('transfer_pitches')
          .select(`
            *,
            players:players!transfer_pitches_player_id_fkey(
              id,
              full_name
            ),
            teams:teams(
              id,
              team_name
            )
          `)
          .eq('id', event.metadata.pitch_id)
          .single();

        if (pitchData) {
          setSelectedPitch(pitchData);
          setShowMessaging(true);
        }
      } catch (error) {
        console.error('Error fetching pitch details:', error);
        toast({
          title: "Error",
          description: "Failed to load pitch details",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rosegold mx-auto mb-4"></div>
          <p className="text-gray-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  const eventsBySeason = groupEventsBySeason(filteredEvents);
  const seasons = Object.keys(eventsBySeason).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-polysans">Team Timeline</h1>
          <p className="text-sm sm:text-base text-gray-400 font-poppins">Complete history of your team's journey</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
            <DialogTrigger asChild>
              <Button className="bg-rosegold hover:bg-rosegold/90 text-white font-polysans w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Event</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Add a new event to your team timeline
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={newEventType} onValueChange={(value: EventType) => setNewEventType(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="match">Match Event</SelectItem>
                    <SelectItem value="transfer">Transfer Event</SelectItem>
                    <SelectItem value="player">Player Event</SelectItem>
                    <SelectItem value="team">Team Update</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Event title"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />

                <Textarea
                  placeholder="Event description"
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />

                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />

                {(newEventType === 'player' || newEventType === 'transfer') && (
                  <Select value={newEventPlayerId} onValueChange={setNewEventPlayerId}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select player (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {teamPlayers.map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateEvent(false)}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createEvent}
                    className="bg-rosegold hover:bg-rosegold/90 text-white"
                  >
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-gray-700 bg-gray-800/50">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 sm:gap-4 lg:items-center">
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-64 bg-gray-700 border-gray-600 text-white h-10 sm:h-11 text-sm sm:text-base"
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-gray-700 border-gray-600 text-white h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="season">This Season</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger className="w-full sm:w-48 bg-gray-700 border-gray-600 text-white h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Filter by player" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600 max-h-64">
                  <SelectItem value="all">All Players</SelectItem>
                  {teamPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="self-start lg:ml-auto text-sm sm:text-base px-3 py-1.5">
              {filteredEvents.length} events
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800 border-gray-700 overflow-x-auto flex flex-wrap gap-2 p-1 h-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-sm sm:text-base px-3 py-2.5">
            All Events
          </TabsTrigger>
          <TabsTrigger value="match" className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-sm sm:text-base px-3 py-2.5">
            Matches
          </TabsTrigger>
          <TabsTrigger value="transfer" className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-sm sm:text-base px-3 py-2.5">
            Transfers
          </TabsTrigger>
          <TabsTrigger value="player" className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-sm sm:text-base px-3 py-2.5">
            Players
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-sm sm:text-base px-3 py-2.5">
            Announcements
          </TabsTrigger>
          <TabsTrigger value="achievement" className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-sm sm:text-base px-3 py-2.5">
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredEvents.length === 0 ? (
            <Card className="border-gray-700">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold text-white mb-2">No Events Found</h3>
                <p className="text-gray-400 mb-6">
                  {activeTab === 'all'
                    ? "Start adding events to build your team's timeline"
                    : `No ${activeTab} events found with current filters`
                  }
                </p>
                <Button
                  onClick={() => setShowCreateEvent(true)}
                  className="bg-rosegold hover:bg-rosegold/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {seasons.map((season) => {
                const seasonEvents = eventsBySeason[season];
                const achievementCount = seasonEvents.filter(e => e.event_type === 'achievement').length;

                return (
                  <div key={season}>
                    <SeasonSeparator
                      season={season}
                      eventCount={seasonEvents.length}
                      achievements={achievementCount}
                    />

                    <div className="space-y-4 pl-4 sm:pl-6 border-l border-gray-800">
                      {seasonEvents.map((event) => (
                        <TimelineEventCard
                          key={event.id}
                          event={event}
                          onTogglePin={togglePin}
                          onOpenComments={openComments}
                          onEditEvent={handleEditEvent}
                          onDeleteEvent={handleDeleteEvent}
                          onOpenMessaging={openMessaging}
                          canEdit={true}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Event Comments</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add notes and comments about this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{comment.profiles?.full_name || 'Unknown User'}</span>
                    <Badge variant="outline" className="text-xs">
                      {comment.profiles?.user_type || 'user'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(comment.created_at))} ago
                    </span>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <Button
              onClick={addComment}
              className="bg-rosegold hover:bg-rosegold/90 text-white"
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Event</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the event details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newEventType} onValueChange={(value: EventType) => setNewEventType(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="match">Match Event</SelectItem>
                <SelectItem value="transfer">Transfer Event</SelectItem>
                <SelectItem value="player">Player Event</SelectItem>
                <SelectItem value="team">Team Update</SelectItem>
                <SelectItem value="achievement">Achievement</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Event title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />

            <Textarea
              placeholder="Event description"
              value={newEventDescription}
              onChange={(e) => setNewEventDescription(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />

            <Input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />

            {(newEventType === 'player' || newEventType === 'transfer') && (
              <Select value={newEventPlayerId} onValueChange={setNewEventPlayerId}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue placeholder="Select player (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {teamPlayers.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditForm(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateEvent}
                className="bg-rosegold hover:bg-rosegold/90 text-white"
              >
                Update Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Event</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteEvent}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Messaging Dialog */}
      <Dialog open={showMessaging} onOpenChange={setShowMessaging}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Transfer Timeline Messaging</DialogTitle>
            <DialogDescription className="text-gray-400">
              Communicate with other teams about this transfer
            </DialogDescription>
          </DialogHeader>
          {selectedPitch && (
            <TransferTimelineMessaging
              pitchId={selectedPitch.id}
              playerId={selectedPitch.player_id}
              teamId={selectedPitch.team_id}
              playerName={selectedPitch.players?.full_name || 'Unknown Player'}
              teamName={selectedPitch.teams?.team_name || 'Unknown Team'}
              onMessageSent={() => {
                // Refresh messages or update UI as needed
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedTeamTimeline;
