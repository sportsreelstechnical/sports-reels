
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Send, User, Clock, Building } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PlayerTagging } from './PlayerTagging';

interface Comment {
  id: string;
  content: string;
  tagged_players: string[];
  created_at: string;
  profiles: {
    full_name: string;
    user_type: string;
  };
  agent_name?: string;
  team_name?: string;
}

interface TaggedPlayer {
  id: string;
  player_name: string;
  player_position: string;
  team_name: string;
  asking_price: number;
  currency: string;
}

interface RequestCommentsProps {
  requestId: string;
  isPublic: boolean;
  onPlayerClick?: (playerId: string, playerName: string) => void;
}

export const RequestComments: React.FC<RequestCommentsProps> = ({
  requestId,
  isPublic,
  onPlayerClick
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [taggedPlayers, setTaggedPlayers] = useState<string[]>([]);
  const [commentTaggedPlayers, setCommentTaggedPlayers] = useState<{ [commentId: string]: TaggedPlayer[] }>({});

  useEffect(() => {
    if (isPublic) {
      fetchComments();
    }
  }, [requestId, isPublic]);

  useEffect(() => {
    if (comments.length > 0) {
      fetchCommentTaggedPlayers();
    }
  }, [comments]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_request_comments')
        .select(`
          id,
          content,
          tagged_players,
          created_at,
          profiles!inner(
            full_name,
            user_type
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process the data to handle the typed_players and get agent/team names
      const processedComments = await Promise.all((data || []).map(async (comment: any) => {
        let agent_name = '';
        let team_name = '';

        // Get agent or team name based on user type
        if (comment.profiles.user_type === 'agent') {
          const { data: agentData } = await supabase
            .from('agents')
            .select('agency_name')
            .eq('profile_id', comment.profile_id)
            .single();
          agent_name = agentData?.agency_name || '';
        } else if (comment.profiles.user_type === 'team') {
          const { data: teamData } = await supabase
            .from('teams')
            .select('team_name')
            .eq('profile_id', comment.profile_id)
            .single();
          team_name = teamData?.team_name || '';
        }

        return {
          ...comment,
          tagged_players: Array.isArray(comment.tagged_players) ? comment.tagged_players : [],
          agent_name,
          team_name
        };
      }));

      setComments(processedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchCommentTaggedPlayers = async () => {
    try {
      // Get all unique player IDs from all comments
      const allPlayerIds = new Set<string>();
      comments.forEach(comment => {
        if (comment.tagged_players && Array.isArray(comment.tagged_players)) {
          comment.tagged_players.forEach(playerId => allPlayerIds.add(playerId));
        }
      });

      if (allPlayerIds.size === 0) {
        setCommentTaggedPlayers({});
        return;
      }

      const playerIdsArray = Array.from(allPlayerIds);

      // Fetch player details for all tagged players
      const { data, error } = await supabase
        .from('transfer_pitches')
        .select(`
          player_id,
          asking_price,
          currency,
          players!transfer_pitches_player_id_fkey(
            full_name,
            position
          ),
          teams(
            team_name
          )
        `)
        .in('player_id', playerIdsArray)
        .eq('status', 'active');

      if (error) throw error;

      // Create a map of player details
      const playerMap = new Map();
      (data || []).forEach((pitch: any) => {
        playerMap.set(pitch.player_id, {
          id: pitch.player_id,
          player_name: pitch.players?.full_name || '',
          player_position: pitch.players?.position || '',
          team_name: pitch.teams?.team_name || '',
          asking_price: pitch.asking_price || 0,
          currency: pitch.currency || 'USD'
        });
      });

      // Create a map of comment ID to tagged players
      const commentTaggedMap: { [commentId: string]: TaggedPlayer[] } = {};
      comments.forEach(comment => {
        if (comment.tagged_players && Array.isArray(comment.tagged_players)) {
          commentTaggedMap[comment.id] = comment.tagged_players
            .map(playerId => playerMap.get(playerId))
            .filter(Boolean);
        }
      });

      setCommentTaggedPlayers(commentTaggedMap);
    } catch (error) {
      console.error('Error fetching comment tagged players:', error);
    }
  };

  const submitComment = async () => {
    if (!profile || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('agent_request_comments')
        .insert({
          request_id: requestId,
          profile_id: profile.id,
          content: newComment,
          tagged_players: taggedPlayers
        });

      if (error) throw error;

      setNewComment('');
      setTaggedPlayers([]);
      fetchComments();
      
      toast({
        title: "Success",
        description: "Comment posted successfully"
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (player: TaggedPlayer) => {
    if (onPlayerClick) {
      onPlayerClick(player.id, player.player_name);
    }
  };

  if (!isPublic) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-rosegold" />
          <h3 className="text-lg font-semibold text-white">
            Discussion ({comments.length})
          </h3>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="bg-gray-700/30 border-gray-600/50 hover:border-gray-600 transition-colors">
              <CardContent className="p-4">
                {/* Comment Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white text-sm">
                        {comment.agent_name || comment.team_name || comment.profiles.full_name}
                      </span>
                      <Badge variant="outline" className="text-xs border-gray-600">
                        {comment.profiles.user_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(comment.created_at))} ago
                    </div>
                  </div>
                </div>
                
                {/* Comment Content */}
                <div className="ml-13 space-y-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                  
                  {/* Tagged Players */}
                  {commentTaggedPlayers[comment.id] && commentTaggedPlayers[comment.id].length > 0 && (
                    <div className="bg-gray-600/30 rounded-lg p-3 border border-gray-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-rosegold" />
                        <span className="text-sm font-medium text-rosegold">
                          Tagged Players ({commentTaggedPlayers[comment.id].length})
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {commentTaggedPlayers[comment.id].map((player) => (
                          <div 
                            key={player.id} 
                            className="flex items-center justify-between p-3 bg-gray-500/20 rounded-lg border border-gray-500/30 hover:border-rosegold/50 transition-colors cursor-pointer group"
                            onClick={() => handlePlayerClick(player)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-rosegold/20 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-rosegold" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-white group-hover:text-rosegold transition-colors">
                                  {player.player_name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{player.player_position}</span>
                                  <span>•</span>
                                  <span>{player.team_name}</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-rosegold/20 text-rosegold border-rosegold/30 text-xs">
                              ${player.asking_price?.toLocaleString()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Comment Form - Only for authenticated users */}
      {profile && (
        <Card className="bg-gray-700/20 border-gray-600">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-rosegold/20 to-rosegold/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-rosegold" />
                </div>
                <span className="text-sm font-medium text-white">Add a comment</span>
              </div>
              
              <Textarea
                placeholder="Share your thoughts or ask questions about this request..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="bg-gray-600 border-gray-500 text-white placeholder:text-gray-400 resize-none focus:border-rosegold/50"
              />
              
              {/* Player Tagging Component */}
              <PlayerTagging
                selectedPlayers={taggedPlayers}
                onPlayersChange={setTaggedPlayers}
              />
              
              <div className="flex justify-end">
                <Button
                  onClick={submitComment}
                  disabled={loading || !newComment.trim()}
                  className="bg-rosegold hover:bg-rosegold/90 text-white px-6"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RequestComments;
