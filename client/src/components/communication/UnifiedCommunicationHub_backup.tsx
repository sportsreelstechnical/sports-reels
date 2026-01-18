import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MessageCircle, FileText, Send, Clock, User, Video, DollarSign,
  TrendingUp, AlertCircle, CheckCircle, X, Plus, Search, Heart, Eye, Upload
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { contractService, PermanentTransferContract, LoanTransferContract } from '@/domains/contracts/services/contractService';
import { useNavigate } from 'react-router-dom';

interface UnifiedCommunicationHubProps {
  pitchId?: string;
  playerId?: string;
  receiverId?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  pitch_id?: string;
  player_id?: string;
  message_type: string;
  created_at: string;
  read_at?: string;
  sender_profile: {
    full_name: string;
    user_type: string;
  };
  receiver_profile: {
    full_name: string;
    user_type: string;
  };
}

interface Contract {
  id: string;
  status: string;
  deal_stage: string;
  contract_value: number;
  currency: string;
  created_at: string;
  last_activity: string;
}

interface AgentInterest {
  id: string;
  pitch_id: string;
  agent_id: string;
  status: 'interested' | 'requested' | 'negotiating';
  message?: string;
  created_at: string;
  pitch: {
    players: {
      full_name: string;
      position: string;
    };
    teams: {
      team_name: string;
    };
    asking_price: number;
    currency: string;
  };
}

interface ContractWorkflow {
  id: string;
  contractId: string;
  pitchId: string;
  status: 'draft' | 'sent_to_agent' | 'agent_reviewed' | 'team_reviewed' | 'signed' | 'completed';
  currentStep: string;
  created_at: string;
  updated_at: string;
}

const UnifiedCommunicationHub: React.FC<UnifiedCommunicationHubProps> = ({
  pitchId,
  playerId,
  receiverId
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'messages' | 'contracts' | 'interest'>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [agentInterest, setAgentInterest] = useState<AgentInterest[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New state for contract creation and file upload
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractType, setContractType] = useState<'create' | 'upload' | 'template'>('create');
  const [transferType, setTransferType] = useState<'permanent' | 'loan'>('permanent');
  const [contractForm, setContractForm] = useState({
    contractValue: '',
    currency: 'USD',
    terms: '',
    dealStage: 'draft'
  });
  const [selectedInterest, setSelectedInterest] = useState<AgentInterest | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  // NEW: Contract negotiation workflow state
  const [activeContractWorkflow, setActiveContractWorkflow] = useState<ContractWorkflow | null>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [contractDiscussionMessage, setContractDiscussionMessage] = useState('');
  const [contractRevisionRequest, setContractRevisionRequest] = useState('');
  const [selectedContractForAction, setSelectedContractForAction] = useState<Contract | null>(null);
  const [showContractActionsModal, setShowContractActionsModal] = useState(false);
  const [contractActionType, setContractActionType] = useState<'approve' | 'reject' | 'request_changes' | 'finalize' | 'complete'>('approve');

  // Enhanced contract form state for detailed contracts
  const [detailedContractForm, setDetailedContractForm] = useState({
    // Basic Information
    playerName: '',
    playerPosition: '',
    playerNationality: '',
    teamName: '',
    teamCountry: '',
    contractDate: new Date().toISOString().split('T')[0],
    currency: 'USD',
    
    // Transfer Details
    transferFee: 0,
    loanFee: {
      base: 0,
      withOptions: 0,
      withoutOptions: 0,
      withObligations: 0
    },
    contractDuration: '',
    loanDuration: '',
    loanType: 'with-options' as 'with-options' | 'without-options' | 'with-obligations',
    
    // Financial Terms
    playerSalary: {
      annual: 0,
      monthly: 0,
      weekly: 0
    },
    signOnBonus: 0,
    performanceBonus: {
      appearance: 0,
      goal: 0,
      assist: 0,
      cleanSheet: 0,
      teamSuccess: 0
    },
    
    // Support & Benefits
    relocationSupport: {
      housing: 0,
      transportation: 0,
      familySupport: 0,
      languageTraining: 0
    },
    medicalInsurance: true,
    imageRights: {
      percentage: 50,
      terms: 'Standard image rights agreement'
    },
    
    // Additional Terms
    releaseClause: 0,
    sellOnPercentage: 20,
    buybackClause: {
      active: false,
      amount: 0,
      duration: ''
    },
    
    // Loan-specific terms
    salaryCoverage: {
      parentClub: 0,
      loanClub: 0,
      percentage: 100
    },
    appearanceClause: 0,
    goalBonus: 0,
    assistBonus: 0,
    promotionBonus: 0,
    purchaseOption: {
      active: false,
      amount: 0,
      conditions: ['Minimum appearances', 'Performance targets']
    },
    obligationToBuy: {
      active: false,
      amount: 0,
      triggers: ['Promotion achieved', 'Appearance targets met']
    },
    recallClause: {
      active: false,
      conditions: ['Injury crisis', 'Performance issues'],
      noticePeriod: '7 days'
    },
    extensionOption: {
      active: false,
      duration: '1 year',
      conditions: ['Mutual agreement', 'Performance targets met']
    }
  });

  useEffect(() => {
    if (pitchId || playerId) {
      fetchMessages();
      fetchContracts();
      fetchAgentInterest();
    } else {
      // If no specific pitch/player, fetch all communications for the user
      fetchAllCommunications();
    }
  }, [pitchId, playerId]);

  const fetchAllCommunications = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Fetch messages where user is sender or receiver
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(full_name, user_type),
          receiver_profile:profiles!messages_receiver_id_fkey(full_name, user_type)
        `)
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (messageError) throw messageError;

      // Fetch agent interest for teams
      if (profile.user_type === 'team') {
        const { data: interest, error: interestError } = await supabase
          .from('agent_interest')
          .select(`
            *,
            agent:agents!agent_interest_agent_id_fkey(
              profile:profiles!agents_profile_id_fkey(full_name, user_type)
            ),
            pitch:transfer_pitches!agent_interest_pitch_id_fkey(
              players!transfer_pitches_player_id_fkey(full_name, position),
              teams!transfer_pitches_team_id_fkey(team_name),
              asking_price,
              currency
            )
          `)
          .eq('pitch.teams.profile_id', profile.id)
          .order('created_at', { ascending: false });

        if (interestError) throw interestError;
        setAgentInterest(interest || []);
      }

      // Fetch contracts for the user
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .or(`team_id.eq.${profile.id},agent_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (contractError) throw contractError;

      setMessages(messages || []);
      setContracts(contracts || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const query = supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(full_name, user_type),
          receiver_profile:profiles!messages_receiver_id_fkey(full_name, user_type)
        `)
        .or(`pitch_id.eq.${pitchId || 'null'},player_id.eq.${playerId || 'null'}`)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('pitch_id', pitchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchAgentInterest = async () => {
    if (!pitchId) return;

    try {
      const { data, error } = await supabase
        .from('agent_interest')
        .select(`
          *,
          agent:agents!agent_interest_agent_id_fkey(
            profile:profiles!agents_profile_id_fkey(full_name, user_type)
          ),
          pitch:transfer_pitches!agent_interest_pitch_id_fkey(
            players!transfer_pitches_player_id_fkey(full_name, position),
            teams!transfer_pitches_team_id_fkey(team_name),
            asking_price,
            currency
          )
        `)
        .eq('pitch_id', pitchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgentInterest(data || []);
    } catch (error) {
      console.error('Error fetching agent interest:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile?.id) return;

    try {
      const messageData = {
        sender_id: profile.id,
        receiver_id: receiverId || '',
        pitch_id: pitchId || null,
        player_id: playerId || null,
        content: newMessage.trim(),
        message_type: 'general',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      setNewMessage('');
      fetchMessages();
      
      toast({
        title: "Message sent!",
        description: "Your message has been delivered.",
      });
    } catch (error: Error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const updateInterestStatus = async (interestId: string, newStatus: 'interested' | 'requested' | 'negotiating') => {
    try {
      const { error } = await supabase
        .from('agent_interest')
        .update({ status: newStatus })
        .eq('id', interestId);

      if (error) throw error;

      fetchAgentInterest();
      toast({
        title: "Status updated!",
        description: `Interest status changed to ${newStatus}`,
      });
    } catch (error: Error) {
      console.error('Error updating interest status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender_profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.receiver_profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInterest = agentInterest.filter(interest =>
    interest.agent_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interest.pitch.players.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    interest.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Enhanced function to handle contract creation from interest
  const handleCreateContract = async (interest: AgentInterest) => {
    setSelectedInterest(interest);
    setDetailedContractForm(prev => ({
      ...prev,
      playerName: interest.pitch.players.full_name,
      playerPosition: interest.pitch.players.position,
      transferFee: interest.pitch.asking_price,
      currency: interest.pitch.currency
    }));
    setContractType('create');
    setShowContractModal(true);
  };

  // Handle direct message to agent
  const handleSendMessage = async (interest: AgentInterest) => {
    try {
      // Get agent profile ID from agent_id
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('profile_id')
        .eq('id', interest.agent_id)
        .single();

      if (agentError) throw agentError;

      const messageData = {
        sender_id: profile?.id,
        receiver_id: agentData.profile_id,
        pitch_id: interest.pitch_id,
        content: `Regarding your interest in ${interest.pitch.players.full_name}. Let's discuss the details.`,
        message_type: 'negotiation',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: "Your message has been delivered to the agent.",
      });

      fetchMessages();
    } catch (error: Error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Communication Hub
          </CardTitle>
          <p className="text-gray-400">
            {pitchId ? 'Communicate about this specific pitch' : 'Manage all your communications and agent interest'}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'messages' | 'interest' | 'contracts')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 border-0">
              <TabsTrigger
                value="messages"
                className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white"
              >
                <MessageCircle className="w-4 h-4" />
                Messages
              </TabsTrigger>
              <TabsTrigger
                value="interest"
                className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white"
              >
                <Heart className="w-4 h-4" />
                Agent Interest
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white"
              >
                <FileText className="w-4 h-4" />
                Contracts
              </TabsTrigger>
            </TabsList>

            {/* Messages Tab */}
            <TabsContent value="messages" className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-600 bg-gray-800 text-white"
                />
              </div>

              {/* Send Message */}
              {pitchId && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="border-gray-600 bg-gray-800 text-white min-h-[100px]"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-rosegold hover:bg-rosegold/90 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              )}

              {/* Messages List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No messages found</p>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.sender_id === profile?.id
                          ? 'bg-blue-600/20 border border-blue-600/30 ml-8'
                          : 'bg-gray-700/50 border border-gray-600/30 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {message.sender_profile.full_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-200">{message.content}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Agent Interest Tab */}
            <TabsContent value="interest" className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search agent interest..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-600 bg-gray-800 text-white"
                />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredInterest.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No agent interest found</p>
                ) : (
                  filteredInterest.map((interest) => (
                    <Card key={interest.id} className="border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-white">
                              Agent #{interest.agent_id.slice(0, 8)}
                            </h4>
                            <p className="text-sm text-gray-400">
                              Interested in {interest.pitch.players.full_name} ({interest.pitch.players.position})
                            </p>
                            <p className="text-xs text-gray-500">
                              {interest.pitch.teams.team_name} • {interest.pitch.asking_price.toLocaleString()} {interest.pitch.currency}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {interest.status}
                          </Badge>
                        </div>
                        
                        {interest.message && (
                          <p className="text-gray-300 text-sm mb-3">{interest.message}</p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
                          </span>
                          
                          {profile?.user_type === 'team' && (
                            <div className="flex gap-2 flex-wrap">
                              {/* Status-based actions */}
                              {interest.status === 'interested' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateInterestStatus(interest.id, 'negotiating')}
                                    className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                  >
                                    Start Negotiation
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateInterestStatus(interest.id, 'requested')}
                                    className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                                  >
                                    Request More Info
                                  </Button>
                                </>
                              )}
                              
                              {interest.status === 'negotiating' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCreateContract(interest)}
                                    className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                                  >
                                    <FileText className="w-3 h-3 mr-1" />
                                    Create Contract
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendMessage(interest)}
                                    className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                  >
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Send Message
                                  </Button>
                                </>
                              )}
                              
                              {interest.status === 'requested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateInterestStatus(interest.id, 'negotiating')}
                                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                >
                                  Move to Negotiation
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Enhanced Contracts Tab */}
            <TabsContent value="contracts" className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Contract Management</h3>
                {profile?.user_type === 'team' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setContractType('create');
                        setShowContractModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Contract
                    </Button>
                    <Button
                      onClick={() => {
                        setContractType('upload');
                        setShowContractModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Contract
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {contracts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No contracts found</p>
                ) : (
                  contracts.map((contract) => (
                    <Card key={contract.id} className="border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">Contract #{contract.id.slice(0, 8)}</h4>
                          <Badge variant="outline" className="text-xs">
                            {contract.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">
                          Value: {contract.contract_value.toLocaleString()} {contract.currency}
                        </p>
                        <p className="text-sm text-gray-400 mb-2">
                          Stage: {contract.deal_stage}
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          Last activity: {formatDistanceToNow(new Date(contract.last_activity), { addSuffix: true })}
                        </p>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/contract-negotiation/${contract.id}`)}
                            className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Contract
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Contract Creation/Upload Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              {contractType === 'create' ? 'Generate Detailed Contract' : 
               contractType === 'upload' ? 'Upload Contract' : 
               'Contract Templates'}
            </h3>
            
            {/* Contract Type Selector */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={contractType === 'create' ? 'default' : 'outline'}
                onClick={() => setContractType('create')}
                className="flex-1"
              >
                Generate
              </Button>
              <Button
                size="sm"
                variant={contractType === 'upload' ? 'default' : 'outline'}
                onClick={() => setContractType('upload')}
                className="flex-1"
              >
                Upload
              </Button>
              <Button
                size="sm"
                variant={contractType === 'template' ? 'default' : 'outline'}
                onClick={() => setContractType('template')}
                className="flex-1"
              >
                Template
              </Button>
            </div>

            <div className="space-y-4">
              {contractType === 'create' && (
                <>
                  {/* Transfer Type Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Transfer Type
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={transferType === 'permanent' ? 'default' : 'outline'}
                          onClick={() => setTransferType('permanent')}
                          className="flex-1"
                        >
                          Permanent Transfer
                        </Button>
                        <Button
                          size="sm"
                          variant={transferType === 'loan' ? 'default' : 'outline'}
                          onClick={() => setTransferType('loan')}
                          className="flex-1"
                        >
                          Loan Transfer
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Currency
                      </label>
                      <Select value={detailedContractForm.currency} onValueChange={(value) => setDetailedContractForm(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="USD" className="text-white">USD</SelectItem>
                          <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                          <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Player Name
                      </label>
                      <Input
                        placeholder="Enter player name"
                        value={detailedContractForm.playerName}
                        onChange={(e) => setDetailedContractForm(prev => ({ ...prev, playerName: e.target.value }))}
                        className="border-gray-600 bg-gray-800 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block">
                        Position
                      </label>
                      <Input
                        placeholder="e.g., Forward, Midfielder"
                        value={detailedContractForm.playerPosition}
                        onChange={(e) => setDetailedContractForm(prev => ({ ...prev, playerPosition: e.target.value }))}
                        className="border-gray-600 bg-gray-800 text-white"
                      />
                    </div>
                  </div>

                  {/* Financial Terms */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Financial Terms</h4>
                    
                    {transferType === 'permanent' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Transfer Fee
                          </label>
                          <Input
                            type="number"
                            placeholder="Enter transfer fee"
                            value={detailedContractForm.transferFee}
                            onChange={(e) => setDetailedContractForm(prev => ({ ...prev, transferFee: parseFloat(e.target.value) || 0 }))}
                            className="border-gray-600 bg-gray-800 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Contract Duration
                          </label>
                          <Input
                            placeholder="e.g., 3 years"
                            value={detailedContractForm.contractDuration}
                            onChange={(e) => setDetailedContractForm(prev => ({ ...prev, contractDuration: e.target.value }))}
                            className="border-gray-600 bg-gray-800 text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Loan Duration
                          </label>
                          <Input
                            placeholder="e.g., 1 season"
                            value={detailedContractForm.loanDuration}
                            onChange={(e) => setDetailedContractForm(prev => ({ ...prev, loanDuration: e.target.value }))}
                            className="border-gray-600 bg-gray-800 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-white mb-2 block">
                            Loan Type
                          </label>
                          <Select value={detailedContractForm.loanType} onValueChange={(value: any) => setDetailedContractForm(prev => ({ ...prev, loanType: value }))}>
                            <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              <SelectItem value="with-options" className="text-white">With Options</SelectItem>
                              <SelectItem value="without-options" className="text-white">Without Options</SelectItem>
                              <SelectItem value="with-obligations" className="text-white">With Obligations</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white mb-2 block">
                          Annual Salary
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter annual salary"
                          value={detailedContractForm.playerSalary.annual}
                          onChange={(e) => setDetailedContractForm(prev => ({ 
                            ...prev, 
                            playerSalary: { 
                              ...prev.playerSalary, 
                              annual: parseFloat(e.target.value) || 0,
                              monthly: Math.round((parseFloat(e.target.value) || 0) / 12),
                              weekly: Math.round((parseFloat(e.target.value) || 0) / 52)
                            } 
                          }))}
                          className="border-gray-600 bg-gray-800 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-white mb-2 block">
                          Sign-on Bonus
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter sign-on bonus"
                          value={detailedContractForm.signOnBonus}
                          onChange={(e) => setDetailedContractForm(prev => ({ ...prev, signOnBonus: parseFloat(e.target.value) || 0 }))}
                          className="border-gray-600 bg-gray-800 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Performance Bonuses */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Performance Bonuses</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-white mb-2 block">
                          Appearance Bonus
                        </label>
                        <Input
                          type="number"
                          placeholder="Per appearance"
                          value={detailedContractForm.performanceBonus.appearance}
                          onChange={(e) => setDetailedContractForm(prev => ({ 
                            ...prev, 
                            performanceBonus: { ...prev.performanceBonus, appearance: parseFloat(e.target.value) || 0 } 
                          }))}
                          className="border-gray-600 bg-gray-800 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-white mb-2 block">
                          Goal Bonus
                        </label>
                        <Input
                          type="number"
                          placeholder="Per goal"
                          value={detailedContractForm.performanceBonus.goal}
                          onChange={(e) => setDetailedContractForm(prev => ({ 
                            ...prev, 
                            performanceBonus: { ...prev.performanceBonus, goal: parseFloat(e.target.value) || 0 } 
                          }))}
                          className="border-gray-600 bg-gray-800 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {contractType === 'upload' && (
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Upload Contract File
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-300 border border-gray-600 rounded-lg bg-gray-800 p-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX
                  </p>
                </div>
              )}

              {contractType === 'template' && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">Available Templates</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start text-white border-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Standard Transfer Contract
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-white border-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Loan Agreement Template
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-white border-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      Letter of Intent Template
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
                         <div className="flex gap-3 mt-6">
               <Button
                 onClick={async () => {
                   try {
                     if (contractType === 'create') {
                       if (transferType === 'permanent') {
                         const contractData: PermanentTransferContract = {
                           playerName: detailedContractForm.playerName,
                           playerPosition: detailedContractForm.playerPosition,
                           playerNationality: detailedContractForm.playerNationality || 'Not specified',
                           teamName: detailedContractForm.teamName || 'Acquiring Club',
                           teamCountry: detailedContractForm.teamCountry || 'Not specified',
                           contractDate: detailedContractForm.contractDate,
                           transferFee: detailedContractForm.transferFee,
                           currency: detailedContractForm.currency,
                           contractDuration: detailedContractForm.contractDuration,
                           playerSalary: detailedContractForm.playerSalary,
                           signOnBonus: detailedContractForm.signOnBonus,
                           performanceBonus: detailedContractForm.performanceBonus,
                           relocationSupport: detailedContractForm.relocationSupport,
                           medicalInsurance: detailedContractForm.medicalInsurance,
                           imageRights: detailedContractForm.imageRights,
                           releaseClause: detailedContractForm.releaseClause,
                           sellOnPercentage: detailedContractForm.sellOnPercentage,
                           buybackClause: detailedContractForm.buybackClause
                         };
                         
                         const contractHtml = await contractService.generatePermanentTransferContract(contractData);
                         await contractService.downloadContract(contractHtml, `permanent-transfer-${detailedContractForm.playerName}-${Date.now()}.html`);
                         
                         toast({
                           title: "Contract Generated!",
                           description: "Permanent transfer contract has been created and downloaded successfully.",
                         });
                       } else {
                         const contractData: LoanTransferContract = {
                           playerName: detailedContractForm.playerName,
                           playerPosition: detailedContractForm.playerPosition,
                           playerNationality: detailedContractForm.playerNationality || 'Not specified',
                           parentClub: detailedContractForm.teamName || 'Parent Club',
                           loanClub: 'Loan Club',
                           contractDate: detailedContractForm.contractDate,
                           currency: detailedContractForm.currency,
                           loanDuration: detailedContractForm.loanDuration,
                           loanType: detailedContractForm.loanType,
                           loanFee: detailedContractForm.loanFee,
                           salaryCoverage: detailedContractForm.salaryCoverage,
                           appearanceClause: detailedContractForm.appearanceClause,
                           goalBonus: detailedContractForm.goalBonus,
                           assistBonus: detailedContractForm.assistBonus,
                           promotionBonus: detailedContractForm.promotionBonus,
                           purchaseOption: detailedContractForm.purchaseOption,
                           obligationToBuy: detailedContractForm.obligationToBuy,
                           recallClause: detailedContractForm.recallClause,
                           extensionOption: detailedContractForm.extensionOption
                         };
                         
                         const contractHtml = await contractService.generateLoanTransferContract(contractData);
                         await contractService.downloadContract(contractHtml, `loan-transfer-${detailedContractForm.playerName}-${Date.now()}.html`);
                         
                         toast({
                           title: "Contract Generated!",
                           description: "Loan transfer contract has been created and downloaded successfully.",
                         });
                       }
                     } else if (contractType === 'upload' && contractFile) {
                       // Handle file upload logic here
                       toast({
                         title: "Contract Uploaded!",
                         description: "Contract file has been uploaded successfully.",
                       });
                     }
                     
                     setShowContractModal(false);
                   } catch (error: Error) {
                     console.error('Error generating contract:', error);
                     toast({
                       title: "Error",
                       description: error.message || "Failed to generate contract",
                       variant: "destructive"
                     });
                   }
                 }}
                 disabled={contractType === 'upload' ? !contractFile : !detailedContractForm.playerName}
                 className="bg-rosegold hover:bg-rosegold/90 text-white flex-1"
               >
                {contractType === 'upload' ? (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Contract
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Contract
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowContractModal(false);
                  setSelectedInterest(null);
                  setContractFile(null);
                }}
                variant="outline"
                className="border-gray-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedCommunicationHub;
