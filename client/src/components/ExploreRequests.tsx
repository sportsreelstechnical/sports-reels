
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Send, Globe, Calendar, User, Plus } from 'lucide-react';
import PlayerProfileWrapper from './PlayerProfileWrapper';
import { usePlayerProfile } from '@/domains/players/hooks/usePlayerProfile';

interface AgentRequest {
  id: string;
  title: string;
  description: string;
  position?: string;
  sport_type: string;
  transfer_type: string;
  budget_min?: number;
  budget_max?: number;
  currency: string;
  expires_at: string;
  created_at: string;
  is_public: boolean;
  agents: {
    agency_name: string;
  };
}

const transferTypes = [
  { value: 'permanent', label: 'Permanent Transfer' },
  { value: 'loan', label: 'Loan' },
  { value: 'free', label: 'Free Transfer' }
];

const positions = [
  'Goalkeeper', 'Centre-Back', 'Left-Back', 'Right-Back', 'Defensive Midfielder',
  'Central Midfielder', 'Attacking Midfielder', 'Left Winger', 'Right Winger',
  'Centre-Forward', 'Striker'
];

const ExploreRequests = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    position: '',
    sport_type: 'football',
    transfer_type: 'permanent',
    budget_min: '',
    budget_max: '',
    currency: 'USD'
  });

  const {
    selectedPlayerId,
    selectedPlayerName,
    isModalOpen: isPlayerModalOpen,
    openPlayerProfile,
    closePlayerProfile
  } = usePlayerProfile();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_requests')
        .select(`
          *,
          agents!inner(
            agency_name
          )
        `)
        .eq('is_public', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch explore requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!profile?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post requests",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in title and description",
        variant: "destructive"
      });
      return;
    }

    if (formData.description.length > 550) {
      toast({
        title: "Description Too Long",
        description: "Description must be 550 characters or less",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      // Get agent ID - if agent doesn't exist, create one
      const { data: initialAgentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

       
      let agentData = initialAgentData;

      if (agentError && agentError.code !== 'PGRST116') {
        throw agentError;
      }

      // If no agent profile exists, create one
      if (!agentData) {
        const { data: newAgent, error: createError } = await supabase
          .from('agents')
          .insert({
            profile_id: profile.id,
            agency_name: profile.full_name || 'Agent',
            contact_email: profile.email || '',
            specialization: ['football'],
            verification_status: 'pending'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        agentData = newAgent;
      }

      // Create the request
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // Expire in 30 days

      const { error: insertError } = await supabase
        .from('agent_requests')
        .insert({
          agent_id: agentData.id,
          title: formData.title,
          description: formData.description,
          position: formData.position || null,
          sport_type: formData.sport_type as any,
          transfer_type: formData.transfer_type as any,
          budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
          budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
          currency: formData.currency,
          is_public: true,
          expires_at: expiryDate.toISOString()
        });

      if (insertError) throw insertError;

      // Reset form
      setFormData({
        title: '',
        description: '',
        position: '',
        sport_type: 'football',
        transfer_type: 'permanent',
        budget_min: '',
        budget_max: '',
        currency: 'USD'
      });
      setShowCreateForm(false);

      toast({
        title: "Success",
        description: "Request posted successfully",
      });

      fetchRequests();
    } catch (error) {
      console.error('Error posting request:', error);
      toast({
        title: "Error",
        description: "Failed to post request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  const handlePlayerTagClick = async (playerName: string) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name')
        .ilike('full_name', `%${playerName.trim()}%`)
        .limit(1);

      if (error) {
        console.error('Error finding player:', error);
        return;
      }

      if (data && data.length > 0) {
        openPlayerProfile(data[0].id, data[0].full_name);
      } else {
        console.log('Player not found:', playerName);
      }
    } catch (error) {
      console.error('Error in handlePlayerTagClick:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Request Section - Always show for agents */}
      {profile?.user_type === 'agent' && (
        <Card className="border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white font-polysans">
              <Plus className="w-5 h-5" />
              Post a Player Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showCreateForm ? (
              <div className="text-center py-6">
                <p className="text-gray-400 mb-4">
                  Let teams know what type of player you're looking for
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-rosegold hover:bg-rosegold/90 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Create Request
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-medium">Request Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="e.g., Looking for Central Midfielder"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">Position</label>
                    <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {positions.map((position) => (
                          <SelectItem key={position} value={position} className="text-white hover:bg-gray-700">
                            {position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">Transfer Type</label>
                    <Select value={formData.transfer_type} onValueChange={(value) => setFormData({ ...formData, transfer_type: value })}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {transferTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-700">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">Min Budget</label>
                    <input
                      type="number"
                      value={formData.budget_min}
                      onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">Max Budget</label>
                    <input
                      type="number"
                      value={formData.budget_max}
                      onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">Currency</label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="USD" className="text-white hover:bg-gray-700">USD</SelectItem>
                        <SelectItem value="EUR" className="text-white hover:bg-gray-700">EUR</SelectItem>
                        <SelectItem value="GBP" className="text-white hover:bg-gray-700">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-medium">Description * (max 550 characters)</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white resize-none"
                    placeholder="I am looking for a central midfielder for a Premier League club in England for a permanent transfer with EU passport..."
                    rows={4}
                    maxLength={550}
                    required
                  />
                  <p className="text-xs text-gray-400 text-right">{formData.description.length}/550</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={submitting || !formData.title || !formData.description}
                    className="bg-rosegold hover:bg-rosegold/90 text-white"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post Request
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requests Feed */}
      <Card className="border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-polysans">
            <Globe className="w-5 h-5" />
            Explore Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-polysans font-semibold text-white mb-2">
                No Active Requests
              </h3>
              <p className="text-gray-400 font-poppins">
                {profile?.user_type === 'agent'
                  ? "Be the first to post a player request and let teams know what you're looking for."
                  : "No agent requests are currently available."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="border-gray-600 hover:border-rosegold/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-polysans font-bold text-white mb-1">
                            {request.title}
                          </h3>
                          <p className="text-gray-300 text-sm mb-2 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            by {request.agents.agency_name}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatTimeAgo(request.created_at)}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {request.position && (
                          <Badge variant="outline" className="text-rosegold border-rosegold">
                            {request.position}
                          </Badge>
                        )}
                        <Badge variant={request.transfer_type === 'permanent' ? 'default' : 'secondary'}>
                          {request.transfer_type.toUpperCase()}
                        </Badge>
                        {request.budget_min && request.budget_max && (
                          <Badge variant="outline" className="text-bright-pink border-bright-pink">
                            {formatCurrency(request.budget_min, request.currency)} - {formatCurrency(request.budget_max, request.currency)}
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm leading-relaxed">
                        {request.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Profile Modal */}
      <PlayerProfileWrapper
        isOpen={isPlayerModalOpen}
        onClose={closePlayerProfile}
        playerId={selectedPlayerId || ''}
        playerName={selectedPlayerName || ''}
      />
    </div>
  );
};

export default ExploreRequests;
