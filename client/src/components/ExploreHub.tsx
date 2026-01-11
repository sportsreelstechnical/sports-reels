import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Users, Search, Calendar, MapPin, Filter, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Updated interface to match the actual Supabase response
interface AgentProfile {
  full_name: string | null;
}

interface Agent {
  profile: AgentProfile | null;
}

interface CommentProfile {
  full_name: string | null;
  user_type: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  tagged_players: any[];
  profile: CommentProfile | null;
}

interface AgentRequest {
  id: string;
  agent_id: string;
  description: string;
  position: string;
  sport_type: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  created_at: string;
  expires_at: string;
  is_public: boolean;
  agent: Agent | null;
  comments: Comment[];
}

// Type for the raw database response - matching Supabase's actual response structure
interface AgentRequestResponse {
  id: string;
  agent_id: string;
  description: string;
  position: string;
  sport_type: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  created_at: string;
  expires_at: string;
  is_public: boolean;
  agent: Agent | null;
  comments: Comment[];
}

interface TransferPitch {
  id: string;
  players: {
    id: string;
    full_name: string;
    position: string;
    citizenship: string;
  };
  teams: {
    team_name: string;
    country: string;
  };
  asking_price: number;
  currency: string;
}

// Helper function to safely parse tagged_players
const parseTaggedPlayers = (taggedPlayers: any): any[] => {
  if (Array.isArray(taggedPlayers)) {
    return taggedPlayers;
  }
  if (typeof taggedPlayers === 'string') {
    try {
      const parsed = JSON.parse(taggedPlayers);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse tagged_players:', e);
      return [];
    }
  }
  return [];
};

const ExploreHub: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AgentRequestResponse[]>([]);
  const [pitches, setPitches] = useState<TransferPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [commentText, setCommentText] = useState('');
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_requests')
        .select(`
          *,
          agent:agents!inner(
            profile:profiles!inner(
              full_name
            )
          ),
          comments:agent_request_comments(
            id,
            content,
            created_at,
            tagged_players,
            profile:profiles!inner(
              full_name,
              user_type
            )
          )
        `)
        .eq('is_public', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Safe type conversion with proper error handling
      const typedData: AgentRequestResponse[] = (data || []).map(item => {
        // Handle potential errors in nested data
        let agentProfile = null;
        try {
          if (item.agent && typeof item.agent === 'object' && 'profile' in item.agent) {
            agentProfile = {
              full_name: item.agent.profile?.full_name || null
            };
          }
        } catch (e) {
          console.warn('Error parsing agent profile:', e);
        }

        const comments = (item.comments || []).map(comment => {
          let commentProfile = null;
          try {
            if (comment.profile && typeof comment.profile === 'object') {
              commentProfile = {
                full_name: comment.profile.full_name || null,
                user_type: comment.profile.user_type || 'unknown'
              };
            }
          } catch (e) {
            console.warn('Error parsing comment profile:', e);
          }

          return {
            ...comment,
            tagged_players: parseTaggedPlayers(comment.tagged_players),
            profile: commentProfile
          };
        });

        return {
          ...item,
          agent: agentProfile ? { profile: agentProfile } : null,
          comments
        };
      });

      setRequests(typedData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load agent requests",
        variant: "destructive"
      });
    }
  };

  const fetchPitches = async () => {
    try {
      const { data, error } = await supabase
        .from('transfer_pitches')
        .select(`
          id,
          asking_price,
          currency,
          players:players!transfer_pitches_player_id_fkey(
            id,
            full_name,
            position,
            citizenship
          ),
          teams:teams(
            team_name,
            country
          )
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(20);

      if (error) throw error;
      setPitches(data || []);
    } catch (error) {
      console.error('Error fetching pitches:', error);
    }
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSubmitComment = async (requestId: string) => {
    if (!commentText.trim() || !profile?.user_id) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', profile.user_id)
        .single();

      if (!profileData) return;

      const commentData = {
        request_id: requestId,
        profile_id: profileData.id,
        content: commentText,
        tagged_players: selectedPlayers.map(playerId => {
          const pitch = pitches.find(p => p.players.id === playerId);
          return {
            player_id: playerId,
            player_name: pitch?.players.full_name,
            pitch_id: pitch?.id,
            team_name: pitch?.teams.team_name
          };
        })
      };

      const { error } = await supabase
        .from('agent_request_comments')
        .insert(commentData);

      if (error) throw error;

      setCommentText('');
      setSelectedPlayers([]);
      setActiveComment(null);

      toast({
        title: "Comment posted",
        description: selectedPlayers.length > 0
          ? `Comment posted with ${selectedPlayers.length} tagged player${selectedPlayers.length > 1 ? 's' : ''}`
          : "Comment posted successfully"
      });

      // Refresh requests to show new comment
      fetchRequests();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    }
  };

  const filteredRequests = requests.filter(request =>
    request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.sport_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchPitches()]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-gray-700">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-16 bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-polysans font-bold text-white">Explore Requests</h1>
          <p className="text-gray-400 mt-1">Discover agent requests and tag your players</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <Badge variant="outline" className="text-white border-white">
            {filteredRequests.length} Active
          </Badge>
        </div>
      </div>

      {/* Player Selection Panel */}
      {selectedPlayers.length > 0 && (
        <Card className="border-blue-500 bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Selected Players ({selectedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map(playerId => {
                const pitch = pitches.find(p => p.players.id === playerId);
                return pitch ? (
                  <Badge
                    key={playerId}
                    variant="secondary"
                    className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                    onClick={() => handlePlayerToggle(playerId)}
                  >
                    {pitch.players.full_name} ×
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Players */}
      {profile?.user_type === 'team' && pitches.length > 0 && (
        <Card className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-lg text-white">Your Available Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pitches.slice(0, 6).map(pitch => (
                <Button
                  key={pitch.players.id}
                  variant={selectedPlayers.includes(pitch.players.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePlayerToggle(pitch.players.id)}
                  className={selectedPlayers.includes(pitch.players.id)
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                  }
                >
                  {pitch.players.full_name} - {pitch.players.position}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests */}
      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <Card className="border-gray-700">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Active Requests
              </h3>
              <p className="text-gray-400">
                No agent requests match your search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="border-gray-700 bg-gray-800/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {request.agent?.profile?.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {request.position} - {request.sport_type}
                      </CardTitle>
                      <p className="text-sm text-gray-400">
                        by {request.agent?.profile?.full_name || 'Unknown Agent'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-400">Position:</span>
                    <p className="text-white font-medium">{request.position}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Budget:</span>
                    <p className="text-white font-medium">
                      {request.currency} {request.budget_min.toLocaleString()} - {request.budget_max.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Sport Type:</span>
                    <p className="text-white font-medium">{request.sport_type}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-300">{request.description}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {request.comments?.length || 0} comments
                  </div>
                </div>

                {/* Comments */}
                {request.comments && request.comments.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Comments</h4>
                    <div className="space-y-3">
                      {request.comments.map(comment => (
                        <div key={comment.id} className="bg-gray-700/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">
                              {comment.profile?.full_name || 'Anonymous User'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {comment.profile?.user_type || 'Unknown'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{comment.content}</p>

                          {comment.tagged_players && comment.tagged_players.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {comment.tagged_players.map((player: any, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {player.player_name}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comment Form */}
                <div className="border-t border-gray-700 pt-4">
                  {activeComment === request.id ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Share your thoughts or tag players..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                        rows={3}
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-400">
                          {selectedPlayers.length > 0 && (
                            <span>{selectedPlayers.length} player{selectedPlayers.length > 1 ? 's' : ''} selected</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveComment(null);
                              setCommentText('');
                              setSelectedPlayers([]);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitComment(request.id)}
                            disabled={!commentText.trim()}
                            className="bg-rosegold hover:bg-rosegold/90"
                          >
                            Post Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveComment(request.id)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Add Comment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ExploreHub;