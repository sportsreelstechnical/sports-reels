import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Filter,
  Plus,
  Users,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  MessageCircle,
  Star,
  Clock,
  Target,
  Globe,
  Briefcase,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AgentRequest {
  id: string;
  title: string;
  description: string;
  position: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  sport_type: string;
  transfer_type: string;
  expires_at: string;
  is_public: boolean;
  tagged_players: string[];
  created_at: string;
  agent: {
    full_name: string;
    country: string;
  };
}

interface RequestComment {
  id: string;
  content: string;
  created_at: string;
  profile_id: string;
  tagged_players: string[];
  profile: {
    full_name: string;
  };
}

const EnhancedAgentExploreHub: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    position: 'all',
    sport: 'all',
    budget: '',
    transferType: 'all',
    location: ''
  });
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    position: '',
    sport_type: 'football' as const,
    transfer_type: 'permanent' as const,
    budget_min: 0,
    budget_max: 0,
    currency: 'USD',
    expires_at: '',
    is_public: true
  });

  useEffect(() => {
    fetchRequests();
    fetchComments();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('agent_requests')
        .select(`
          *,
          agent:profiles!agent_id (
            full_name,
            country
          )
        `)
        .eq('is_public', true);

      if (filters.sport && filters.sport !== 'all') {
        query = query.eq('sport_type', filters.sport as any);
      }

      if (filters.transferType && filters.transferType !== 'all') {
        query = query.eq('transfer_type', filters.transferType as any);
      }

      if (filters.position && filters.position !== 'all') {
        query = query.ilike('position', `%${filters.position}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to ensure proper typing
      const mappedRequests: AgentRequest[] = (data || []).map(request => ({
        id: request.id,
        title: request.title,
        description: request.description,
        position: request.position,
        budget_min: request.budget_min,
        budget_max: request.budget_max,
        currency: request.currency,
        sport_type: request.sport_type,
        transfer_type: request.transfer_type,
        expires_at: request.expires_at,
        is_public: request.is_public,
        tagged_players: Array.isArray(request.tagged_players) ? 
          request.tagged_players.map((player: any) => String(player)) : 
          [],
        created_at: request.created_at,
        agent: Array.isArray(request.agent) && request.agent.length > 0 ? {
          full_name: request.agent[0].full_name || 'Unknown Agent',
          country: request.agent[0].country || 'Unknown'
        } : {
          full_name: 'Unknown Agent',
          country: 'Unknown'
        }
      }));

      setRequests(mappedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load agent requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_request_comments')
        .select(`
          id,
          content,
          created_at,
          profile_id,
          tagged_players,
          profile:profiles!profile_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Map the data to ensure proper typing
      const mappedComments: RequestComment[] = (data || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        profile_id: comment.profile_id,
        tagged_players: Array.isArray(comment.tagged_players) ? 
          comment.tagged_players.map((player: any) => String(player)) : 
          [],
        profile: {
          full_name: comment.profile?.full_name || 'Anonymous'
        }
      }));

      setComments(mappedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleCreateRequest = async () => {
    if (!profile) return;

    try {
      const expirationDate = newRequest.expires_at || 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('agent_requests')
        .insert({
          agent_id: profile.id,
          title: newRequest.title,
          description: newRequest.description,
          position: newRequest.position,
          sport_type: newRequest.sport_type,
          transfer_type: newRequest.transfer_type,
          budget_min: newRequest.budget_min,
          budget_max: newRequest.budget_max,
          currency: newRequest.currency,
          expires_at: expirationDate,
          is_public: newRequest.is_public
        });

      if (error) throw error;

      toast({
        title: "Request Created",
        description: "Your player request has been published successfully"
      });

      setIsCreateModalOpen(false);
      setNewRequest({
        title: '',
        description: '',
        position: '',
        sport_type: 'football',
        transfer_type: 'permanent',
        budget_min: 0,
        budget_max: 0,
        currency: 'USD',
        expires_at: '',
        is_public: true
      });
      
      fetchRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create request",
        variant: "destructive"
      });
    }
  };

  const filteredRequests = requests.filter(request =>
    request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatBudget = (min: number, max: number, currency: string) => {
    const formatNumber = (num: number) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
      return num.toString();
    };
    
    return `${currency} ${formatNumber(min)} - ${formatNumber(max)}`;
  };

  const getDaysRemaining = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-bright-pink/20 rounded-lg">
                  <Users className="w-6 h-6 text-bright-pink" />
                </div>
                Agent Explore Hub
              </CardTitle>
              <p className="text-gray-300 mt-2">
                Discover and connect with player transfer requests
              </p>
            </div>
            
            {profile?.user_type === 'agent' && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-bright-pink hover:bg-bright-pink/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={filters.position} onValueChange={(value) => setFilters({ ...filters, position: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                <SelectItem value="defender">Defender</SelectItem>
                <SelectItem value="midfielder">Midfielder</SelectItem>
                <SelectItem value="forward">Forward</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sport} onValueChange={(value) => setFilters({ ...filters, sport: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                <SelectItem value="football">Football</SelectItem>
                <SelectItem value="basketball">Basketball</SelectItem>
                <SelectItem value="volleyball">Volleyball</SelectItem>
                <SelectItem value="tennis">Tennis</SelectItem>
                <SelectItem value="rugby">Rugby</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.transferType} onValueChange={(value) => setFilters({ ...filters, transferType: value })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Transfer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="loan">Loan</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setFilters({ position: 'all', sport: 'all', budget: '', transferType: 'all', location: '' })}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Request Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                  <div className="h-16 bg-gray-600 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredRequests.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">No Requests Found</h3>
                <p className="text-gray-400">Try adjusting your search or filter criteria</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="bg-gray-800 border-gray-700 hover:border-bright-pink/50 transition-colors">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">
                        {request.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Badge variant="outline" className="text-xs">
                          {request.position}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {request.sport_type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Expires in</div>
                      <div className="text-white font-medium">
                        {getDaysRemaining(request.expires_at)} days
                      </div>
                    </div>
                  </div>

                  {/* Agent Info */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      {request.agent.full_name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      • {request.agent.country}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {request.description}
                  </p>

                  {/* Budget */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium text-sm">
                      {formatBudget(request.budget_min, request.budget_max, request.currency)}
                    </span>
                    <Badge className={`text-xs ${
                      request.transfer_type === 'permanent' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-orange-500 text-white'
                    }`}>
                      {request.transfer_type.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-bright-pink hover:bg-bright-pink/90 text-white"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Contact
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Request Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create Player Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">Request Title *</label>
              <Input
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                placeholder="e.g., Looking for experienced goalkeeper"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Description *</label>
              <Textarea
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                placeholder="Describe what you're looking for..."
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm mb-2 block">Position *</label>
                <Input
                  value={newRequest.position}
                  onChange={(e) => setNewRequest({ ...newRequest, position: e.target.value })}
                  placeholder="e.g., Goalkeeper, Midfielder"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Sport *</label>
                <Select 
                  value={newRequest.sport_type} 
                  onValueChange={(value: any) => setNewRequest({ ...newRequest, sport_type: value })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="football">Football</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="volleyball">Volleyball</SelectItem>
                    <SelectItem value="tennis">Tennis</SelectItem>
                    <SelectItem value="rugby">Rugby</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm mb-2 block">Transfer Type *</label>
                <Select 
                  value={newRequest.transfer_type} 
                  onValueChange={(value: any) => setNewRequest({ ...newRequest, transfer_type: value })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Currency</label>
                <Select 
                  value={newRequest.currency} 
                  onValueChange={(value) => setNewRequest({ ...newRequest, currency: value })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm mb-2 block">Min Budget</label>
                <Input
                  type="number"
                  value={newRequest.budget_min}
                  onChange={(e) => setNewRequest({ ...newRequest, budget_min: Number(e.target.value) })}
                  placeholder="0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Max Budget</label>
                <Input
                  type="number"
                  value={newRequest.budget_max}
                  onChange={(e) => setNewRequest({ ...newRequest, budget_max: Number(e.target.value) })}
                  placeholder="0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateRequest}
                className="flex-1 bg-bright-pink hover:bg-bright-pink/90 text-white"
                disabled={!newRequest.title || !newRequest.description || !newRequest.position}
              >
                Create Request
              </Button>
              
              <Button
                onClick={() => setIsCreateModalOpen(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedAgentExploreHub;
