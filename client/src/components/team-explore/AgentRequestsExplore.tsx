import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, MessageSquare, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AgentRequest {
  id: string;
  title: string;
  description: string;
  sport_type: string;
  position: string;
  budget_max: number;
  budget_min: number;
  currency: string;
  created_at: string;
  expires_at: string;
  agent_id: string;
  agent_name?: string;
  message_count?: number;
}

interface AgentRequestsExploreProps {
  initialSearch?: string;
}

export const AgentRequestsExplore: React.FC<AgentRequestsExploreProps> = ({ initialSearch = '' }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRequest, setSelectedRequest] = useState<AgentRequest | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [teamSportType, setTeamSportType] = useState<string | null>(null);
  const [teamLoaded, setTeamLoaded] = useState(false);

  useEffect(() => {
    if (!profile?.id) {
      setTeamSportType(null);
      setTeamLoaded(true);
      return;
    }

    setTeamLoaded(false);

    const fetchTeamSportType = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('sport_type')
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching team sport type:', error);
        }

        setTeamSportType(data?.sport_type ?? null);
      } catch (error) {
        console.error('Unexpected error fetching team sport type:', error);
        setTeamSportType(null);
      } finally {
        setTeamLoaded(true);
      }
    };

    fetchTeamSportType();
  }, [profile?.id]);

  useEffect(() => {
    if (!teamLoaded) return;
    fetchRequests();
  }, [teamLoaded, teamSportType, profile?.id]);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  const fetchRequests = async () => {
    if (!profile?.id) return;
    if (!teamLoaded) return;

    try {
      setLoading(true);
      
      if (!teamSportType) {
        setRequests([]);
        return;
      }

      // First get agent requests with explicit column selection (removing status filter)
      const { data: agentRequestsData, error: requestsError } = await supabase
        .from('agent_requests')
        .select('id, title, description, sport_type, position, budget_max, budget_min, currency, created_at, expires_at, agent_id')
        .eq('sport_type', teamSportType)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!agentRequestsData || agentRequestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get unique agent IDs
      const agentIds = [...new Set(agentRequestsData.map(req => req.agent_id))];
      
      // Fetch agent profiles separately
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, profile_id')
        .in('id', agentIds);

      if (agentsError) throw agentsError;

      // Get profile IDs from agents
      const profileIds = agentsData?.map(agent => agent.profile_id) || [];
      
      // Fetch profiles for agent names
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds);

      if (profilesError) throw profilesError;

      // Create a mapping of agent_id to agent_name
      const agentNameMap: Record<string, string> = {};
      agentsData?.forEach(agent => {
        const profile = profilesData?.find(p => p.id === agent.profile_id);
        if (profile) {
          agentNameMap[agent.id] = profile.full_name || 'Unknown Agent';
        }
      });

      const requestsWithAgentName: AgentRequest[] = agentRequestsData.map(request => ({
        id: request.id,
        title: request.title,
        description: request.description,
        sport_type: request.sport_type,
        position: request.position,
        budget_max: request.budget_max || 0,
        budget_min: request.budget_min || 0,
        currency: request.currency || 'USD',
        created_at: request.created_at || new Date().toISOString(),
        expires_at: request.expires_at || new Date().toISOString(),
        agent_id: request.agent_id,
        agent_name: agentNameMap[request.agent_id] || 'Unknown Agent'
      }));

      setRequests(requestsWithAgentName);
    } catch (error) {
      console.error('Error fetching agent requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRequest || !messageContent.trim() || !profile?.id) return;

    try {
      setSendingMessage(true);
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.id,
          receiver_id: selectedRequest.agent_id,
          content: messageContent,
          message_type: 'request_response',
          subject: `Response to: ${selectedRequest.title}`
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message sent successfully",
      });

      setMessageContent('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredRequests = requests.filter(request =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.sport_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (request.agent_name && request.agent_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const noSportConfigured = teamLoaded && !teamSportType;
  const sportLabel = teamSportType || 'Not set';

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agent requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <div className="border border-border bg-muted/30 rounded-md px-3 py-1.5 flex-shrink-0">
          <span className="text-[10px] sm:text-xs uppercase text-muted-foreground block">Sport</span>
          <span className="text-sm font-medium text-foreground">
            {sportLabel}
          </span>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Requests</h3>
            <p className="text-muted-foreground">
              {noSportConfigured
                ? 'Set your team sport in the profile settings to see matching agent requests.'
                : searchQuery
                  ? 'No requests match your search criteria.'
                  : 'There are no active agent requests at the moment.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">{request.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">{request.agent_name}</span>
                      <span className="hidden sm:inline">•</span>
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="text-[10px] sm:text-sm">Expires {format(new Date(request.expires_at), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">{request.sport_type}</Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">{request.position}</Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                  {request.description}
                </p>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-xs sm:text-sm font-medium">
                    Budget: {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: request.currency || 'USD',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(request.budget_min)} - {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: request.currency || 'USD',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(request.budget_max)}
                  </div>
                  
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedRequest(request)}
                    className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <MessageSquare className="h-3 h-3 sm:h-4 sm:w-4" />
                    Respond
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedRequest && (
        <Card className="border-primary">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageSquare className="h-4 h-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Respond to: {selectedRequest.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            <Textarea
              placeholder="Write your response to this agent request..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
              className="text-sm"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendingMessage}
                className="w-full sm:w-auto text-sm"
              >
                {sendingMessage ? 'Sending...' : 'Send Response'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedRequest(null);
                  setMessageContent('');
                }}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
