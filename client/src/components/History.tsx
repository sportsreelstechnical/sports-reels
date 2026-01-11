
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, User, FileText, ArrowRight, TrendingUp, Users, Video, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HistoryItem {
  id: string;
  type: 'player_created' | 'transfer_pitch' | 'player_transferred' | 'message_sent' | 'video_uploaded';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

const History = () => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    playersCreated: 0,
    transferPitches: 0,
    messagesExchanged: 0,
    videosUploaded: 0
  });

  useEffect(() => {
    if (profile) {
      fetchHistory();
      fetchStats();
    }
  }, [profile]);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredHistory(history);
    } else {
      setFilteredHistory(history.filter(item => item.type === filterType));
    }
  }, [history, filterType]);

  const fetchHistory = async () => {
    if (!profile) return;

    try {
      const historyItems: HistoryItem[] = [];

      // Fetch player creation history for teams
      if (profile.user_type === 'team') {
        const { data: players } = await supabase
          .from('players')
          .select('id, full_name, position, created_at')
          .eq('team_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (players) {
          players.forEach(player => {
            historyItems.push({
              id: `player_${player.id}`,
              type: 'player_created',
              title: 'Player Created',
              description: `Added ${player.full_name} (${player.position}) to your roster`,
              timestamp: player.created_at,
              metadata: { playerId: player.id, playerName: player.full_name }
            });
          });
        }

        // Fetch video upload history
        const { data: videos } = await supabase
          .from('videos')
          .select('id, title, created_at')
          .eq('team_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (videos) {
          videos.forEach(video => {
            historyItems.push({
              id: `video_${video.id}`,
              type: 'video_uploaded',
              title: 'Video Uploaded',
              description: `Uploaded "${video.title}"`,
              timestamp: video.created_at,
              metadata: { videoId: video.id }
            });
          });
        }

        // Fetch transfer pitch history
        const { data: pitches } = await supabase
          .from('transfer_pitches')
          .select(`
            id, 
            asking_price, 
            status, 
            created_at,
            players!transfer_pitches_player_id_fkey(full_name)
          `)
          .eq('team_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (pitches) {
          pitches.forEach(pitch => {
            historyItems.push({
              id: `pitch_${pitch.id}`,
              type: 'transfer_pitch',
              title: 'Transfer Pitch Created',
              description: `Listed ${pitch.players?.full_name} for $${pitch.asking_price?.toLocaleString()}`,
              timestamp: pitch.created_at,
              metadata: { pitchId: pitch.id, status: pitch.status }
            });
          });
        }
      }

      // Fetch message history for both agents and teams
      const { data: messages } = await supabase
        .from('messages')
        .select('id, subject, created_at, receiver_id, sender_id')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messages) {
        messages.forEach(message => {
          historyItems.push({
            id: `message_${message.id}`,
            type: 'message_sent',
            title: message.sender_id === profile.id ? 'Message Sent' : 'Message Received',
            description: message.subject || 'Message exchange',
            timestamp: message.created_at,
            metadata: { messageId: message.id }
          });
        });
      }

      // Sort all items by timestamp
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setHistory(historyItems);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!profile) return;

    try {
      const newStats = { ...stats };

      if (profile.user_type === 'team') {
        // Count players
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', profile.id);

        // Count transfer pitches
        const { count: pitchCount } = await supabase
          .from('transfer_pitches')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', profile.id);

        // Count videos
        const { count: videoCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', profile.id);

        newStats.playersCreated = playerCount || 0;
        newStats.transferPitches = pitchCount || 0;
        newStats.videosUploaded = videoCount || 0;
      }

      // Count messages for both types
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

      newStats.messagesExchanged = messageCount || 0;

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'player_created':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'transfer_pitch':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'message_sent':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'video_uploaded':
        return <Video className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'player_created':
        return 'Player';
      case 'transfer_pitch':
        return 'Transfer';
      case 'message_sent':
        return 'Message';
      case 'video_uploaded':
        return 'Video';
      default:
        return 'Activity';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Activity History</h1>
        <p className="text-sm sm:text-base text-gray-400">Track your recent activities and achievements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {profile?.user_type === 'team' && (
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium">Players Created</p>
                  <p className="text-2xl font-bold text-white">{stats.playersCreated}</p>
                </div>
                <Users className="w-8 h-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {profile?.user_type === 'team' && (
          <Card className="bg-green-500/10 border-green-500/20 rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium">Transfer Pitches</p>
                  <p className="text-2xl font-bold text-white">{stats.transferPitches}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-purple-500/10 border-purple-500/20 rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm font-medium">Messages</p>
                <p className="text-2xl font-bold text-white">{stats.messagesExchanged}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>

        {profile?.user_type === 'team' && (
          <Card className="bg-red-500/10 border-red-500/20 rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-200 text-sm font-medium">Videos Uploaded</p>
                  <p className="text-2xl font-bold text-white">{stats.videosUploaded}</p>
                </div>
                <Video className="w-8 h-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter */}
      <Card className="border border-gray-800 bg-[#0f0f0f] rounded-xl">
        <CardContent className="p-4 sm:p-5">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48 bg-[#111111] border border-gray-700 text-white h-10 text-sm">
              <SelectValue placeholder="Filter activities" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border border-gray-700 text-sm">
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="player_created">Player Creation</SelectItem>
              <SelectItem value="transfer_pitch">Transfer Pitches</SelectItem>
              <SelectItem value="message_sent">Messages</SelectItem>
              <SelectItem value="video_uploaded">Video Uploads</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* History Timeline */}
      <div className="space-y-3 sm:space-y-4">
        {filteredHistory.length === 0 ? (
          <Card className="border border-gray-800 bg-[#0f0f0f] rounded-xl">
            <CardContent className="p-10 text-center space-y-3">
              <Clock className="w-12 h-12 text-gray-500 mx-auto" />
              <h3 className="text-lg sm:text-xl font-semibold text-white">No activity found</h3>
              <p className="text-sm sm:text-base text-gray-400">Your recent activities will appear here</p>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((item) => (
            <Card key={item.id} className="border border-gray-800 bg-[#111111] rounded-xl hover:border-blue-500/40 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-white text-sm sm:text-base">{item.title}</h3>
                          <Badge variant="outline" className="border-0 bg-gray-500/10 text-gray-300 text-xs sm:text-sm">
                            {getTypeLabel(item.type)}
                          </Badge>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{item.description}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(item.timestamp)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 text-rosegold hover:text-white hover:bg-rosegold/20"
                      >
                        <ArrowRight className="w-4 h-4 mx-auto" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
