import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Heart, MessageSquare, Eye, Clock, DollarSign,
  MapPin, User, Trash2, Star, Filter, Search,
  Play, BarChart3, Download, Share, AlertCircle,
  Calendar, TrendingUp, FileText, Settings,
  Bookmark, Tag, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EnhancedVideoAnalysis from '@/domains/video/components/EnhancedVideoAnalysis';
import { usePlayerData } from '@/domains/players/hooks/usePlayerData';
import { useNavigate } from 'react-router-dom';

interface ShortlistItem {
  id: string;
  notes: string;
  created_at: string;
  priority_level?: 'high' | 'medium' | 'low';
  player: {
    id: string;
    full_name: string;
    position: string;
    age: number;
    photo_url?: string;
    headshot_url?: string;
    market_value?: number;
    citizenship: string;
    date_of_birth: string;
  };
  pitch: {
    id: string;
    expires_at: string;
    asking_price?: number;
    currency: string;
    transfer_type: string;
    deal_stage: string;
    view_count: number;
    message_count: number;
    shortlist_count: number;
    team: {
      id: string;
      team_name: string;
      country: string;
      logo_url?: string;
    };
    tagged_videos?: string[];
  };
}

interface ShortlistStats {
  totalPlayers: number;
  expiringThisWeek: number;
  averagePrice: number;
  topPosition: string;
  recentActivity: number;
}

const AgentShortlistEnhanced = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // All hooks must be declared before any conditional returns
  const [shortlistItems, setShortlistItems] = useState<ShortlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTransferType, setFilterTransferType] = useState('all');
  const [filterExpiring, setFilterExpiring] = useState('all');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [stats, setStats] = useState<ShortlistStats>({
    totalPlayers: 0,
    expiringThisWeek: 0,
    averagePrice: 0,
    topPosition: '',
    recentActivity: 0
  });


  // Function definitions must be before useEffect hooks
  const fetchShortlist = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agentData) return;

      const { data, error } = await supabase
        .from('shortlist')
        .select(`
          *,
          pitch:transfer_pitches!inner(
            id,
            expires_at,
            asking_price,
            currency,
            transfer_type,
            deal_stage,
            view_count,
            message_count,
            shortlist_count,
            tagged_videos,
            player_id,
            team_id,
            player:players!transfer_pitches_player_id_fkey(
              id,
              full_name,
              position,
              date_of_birth,
              photo_url,
              headshot_url,
              market_value,
              citizenship
            ),
            team:teams!transfer_pitches_team_id_fkey(
              id,
              team_name,
              country,
              logo_url
            )
          )
        `)
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shortlist:', error);
        toast({
          title: "Error",
          description: "Failed to fetch shortlist items",
          variant: "destructive",
        });
        return;
      }

      // Process data to match the expected structure
      const processedData: ShortlistItem[] = (data || []).map(item => ({
        ...item,
        player: item.pitch.player,
        pitch: {
          ...item.pitch,
          team: item.pitch.team
        }
      }));

      setShortlistItems(processedData);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterShortlist = () => {
    let filtered = [...shortlistItems];

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.player.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pitch.team.team_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterPosition && filterPosition !== 'all') {
      filtered = filtered.filter(item => item.player.position === filterPosition);
    }

    if (filterPriority && filterPriority !== 'all') {
      filtered = filtered.filter(item => item.priority_level === filterPriority);
    }

    if (filterTransferType && filterTransferType !== 'all') {
      filtered = filtered.filter(item => item.pitch.transfer_type === filterTransferType);
    }

    if (filterExpiring === 'expiring') {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => {
        const expiryDate = new Date(item.pitch.expires_at);
        return expiryDate <= sevenDaysFromNow && expiryDate >= now;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_at_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_at_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'expires_asc':
          return new Date(a.pitch.expires_at).getTime() - new Date(b.pitch.expires_at).getTime();
        case 'expires_desc':
          return new Date(b.pitch.expires_at).getTime() - new Date(a.pitch.expires_at).getTime();
        case 'price_asc':
          return (a.pitch.asking_price || 0) - (b.pitch.asking_price || 0);
        case 'price_desc':
          return (b.pitch.asking_price || 0) - (a.pitch.asking_price || 0);
        case 'name_asc':
          return a.player.full_name.localeCompare(b.player.full_name);
        case 'name_desc':
          return b.player.full_name.localeCompare(a.player.full_name);
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  };

  const calculateStats = () => {
    if (shortlistItems.length === 0) return;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringThisWeek = shortlistItems.filter(item => {
      const expiryDate = new Date(item.pitch.expires_at);
      return expiryDate <= sevenDaysFromNow && expiryDate >= now;
    }).length;

    const totalPrice = shortlistItems.reduce((sum, item) => sum + (item.pitch.asking_price || 0), 0);
    const averagePrice = shortlistItems.length > 0 ? totalPrice / shortlistItems.length : 0;

    const positionCounts = shortlistItems.reduce((acc, item) => {
      acc[item.player.position] = (acc[item.player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPosition = Object.entries(positionCounts).reduce((a, b) => 
      positionCounts[a[0]] > positionCounts[b[0]] ? a : b, ['', 0]
    )[0];

    const recentActivity = shortlistItems.filter(item => {
      const createdDate = new Date(item.created_at);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      return createdDate >= threeDaysAgo;
    }).length;

    setStats({
      totalPlayers: shortlistItems.length,
      expiringThisWeek,
      averagePrice,
      topPosition,
      recentActivity
    });
  };

  const updateNotes = async (shortlistId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('shortlist')
        .update({ notes })
        .eq('id', shortlistId);

      if (error) throw error;

      // Update local state
      setShortlistItems(prev => prev.map(item =>
        item.id === shortlistId ? { ...item, notes } : item
      ));

      toast({
        title: "Success",
        description: "Notes updated successfully",
      });
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive"
      });
    }
  };

  const removeFromShortlist = async (shortlistId: string) => {
    if (!confirm('Remove this player from your shortlist?')) return;

    try {
      const { error } = await supabase
        .from('shortlist')
        .delete()
        .eq('id', shortlistId);

      if (error) throw error;

      // Update local state
      setShortlistItems(prev => prev.filter(item => item.id !== shortlistId));

      toast({
        title: "Success",
        description: "Player removed from shortlist",
      });
    } catch (error) {
      console.error('Error removing from shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove player from shortlist",
        variant: "destructive"
      });
    }
  };

  const handleVideoAnalysis = (videoId: string, teamId: string) => {
    setSelectedVideo({ id: videoId, team_id: teamId });
    setShowVideoAnalysis(true);
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return expiryDate <= sevenDaysFromNow && expiryDate > new Date();
  };

  // All useEffect hooks must be declared before any conditional returns
  useEffect(() => {
    fetchShortlist();
  }, [profile]);

  useEffect(() => {
    filterShortlist();
    calculateStats();
  }, [shortlistItems, searchTerm, filterPosition, filterPriority, filterTransferType, filterExpiring, sortBy]);

  // Check if user is an agent - now after all hooks are declared
  if (profile?.user_type !== 'agent') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
        <p className="text-gray-400">
          This page is only accessible to agents. Please log in with an agent account.
        </p>
      </div>
    );
  }

  if (showVideoAnalysis && selectedVideo) {
    return (
      <EnhancedVideoAnalysis
        videoId={selectedVideo.id}
        teamId={selectedVideo.team_id}
        onAnalysisComplete={() => {
          setShowVideoAnalysis(false);
          setSelectedVideo(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-bright-pink flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400">Total Players</p>
                <p className="text-lg sm:text-xl font-bold text-white">{stats.totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400">Expiring Soon</p>
                <p className="text-lg sm:text-xl font-bold text-white">{stats.expiringThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400">Avg Price</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  ${(stats.averagePrice / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400">Top Position</p>
                <p className="text-lg sm:text-xl font-bold text-white">{stats.topPosition}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-2 sm:p-3 lg:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400">Recent</p>
                <p className="text-lg sm:text-xl font-bold text-white">{stats.recentActivity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search players, teams, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                  <SelectItem value="Defender">Defender</SelectItem>
                  <SelectItem value="Midfielder">Midfielder</SelectItem>
                  <SelectItem value="Forward">Forward</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTransferType} onValueChange={setFilterTransferType}>
                <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Transfer Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="free">Free Transfer</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterExpiring} onValueChange={setFilterExpiring}>
                <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">Newest First</SelectItem>
                  <SelectItem value="created_at_asc">Oldest First</SelectItem>
                  <SelectItem value="expires_asc">Expires Soon</SelectItem>
                  <SelectItem value="expires_desc">Expires Later</SelectItem>
                  <SelectItem value="price_asc">Price Low-High</SelectItem>
                  <SelectItem value="price_desc">Price High-Low</SelectItem>
                  <SelectItem value="name_asc">Name A-Z</SelectItem>
                  <SelectItem value="name_desc">Name Z-A</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shortlist Items */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bright-pink"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Players in Shortlist</h3>
            <p className="text-gray-400">Start building your shortlist by exploring available players.</p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredItems.map((item) => (
            <Card key={item.id} className="bg-gray-800 border-gray-700 hover:border-bright-pink/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                      {item.player.photo_url ? (
                        <img
                          src={item.player.photo_url}
                          alt={item.player.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.player.full_name}</h3>
                      <p className="text-sm text-gray-400">{item.player.position} • {item.player.age} years</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        item.priority_level === 'high' ? 'border-red-500 text-red-400' :
                        item.priority_level === 'medium' ? 'border-yellow-500 text-yellow-400' :
                        'border-green-500 text-green-400'
                      }
                    >
                      {item.priority_level || 'medium'}
                    </Badge>
                    {isExpiringSoon(item.pitch.expires_at) && (
                      <Badge variant="outline" className="border-orange-500 text-orange-400">
                        Expiring Soon
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Team</span>
                    <span className="text-white">{item.pitch.team.team_name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Asking Price</span>
                    <span className="text-white font-semibold">
                      {item.pitch.asking_price ? `$${(item.pitch.asking_price / 1000000).toFixed(1)}M` : 'Not specified'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Expires</span>
                    <span className="text-white">
                      {formatDistanceToNow(new Date(item.pitch.expires_at), { addSuffix: true })}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 mb-1">Notes</p>
                      <p className="text-sm text-white bg-gray-700 p-2 rounded">{item.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {item.pitch.view_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {item.pitch.message_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {item.pitch.shortlist_count}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/player/${item.player.id}`)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                    {item.pitch.tagged_videos && item.pitch.tagged_videos.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVideoAnalysis(item.pitch.tagged_videos[0], item.pitch.team.id)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Analyze
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromShortlist(item.id)}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
};

export default AgentShortlistEnhanced;
