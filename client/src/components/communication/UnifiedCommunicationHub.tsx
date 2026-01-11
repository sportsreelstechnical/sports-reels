import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  MessageCircle,
  Clock,
  User,
  Video,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  Plus,
  Search,
  Heart,
  Eye,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { contractService, PermanentTransferContract, LoanTransferContract } from '@/domains/contracts/services/contractService';
import { contractManagementService } from '@/domains/contracts/services/contractManagementService';
import { useNavigate } from 'react-router-dom';
import { EnhancedNotificationService } from '@/domains/notifications/services/enhancedNotificationService';
import { useAgentInterestRealtime } from '@/hooks/useAgentInterestRealtime';
import { BeepingBorder } from '@/components/ui/BeepingBorder';
import { useAutoMarkNotificationsRead } from '@/hooks/useAutoMarkNotificationsRead';
import { usePlayerStatusRealtime } from '@/domains/players/hooks/usePlayerStatusRealtime';

interface UnifiedCommunicationHubProps {
  pitchId?: string;
  playerId?: string;
  receiverId?: string;
}


interface Contract {
  id: string;
  pitch_id: string;
  agent_id: string;
  team_id: string;
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
  status: 'interested' | 'requested' | 'negotiating' | 'withdrawn' | 'rejected';
  message?: string;
  created_at: string;
  updated_at?: string;
  status_message?: string; // For displaying withdrawal/rejection messages
  agent: {
    profile: {
      full_name: string;
      user_type: string;
    };
  };
  pitch: {
    players: {
      full_name: string;
      position: string;
      citizenship?: string;
    };
    teams: {
      team_name: string;
      country?: string;
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
  const [activeTab, setActiveTab] = useState<'interest' | 'contracts'>('interest');
  const [contracts, setContracts] = useState<Contract[]>([]);
  
  // Debug wrapper for setContracts to track when contracts are set/cleared
  const setContractsWithDebug = (contracts: Contract[] | ((prev: Contract[]) => Contract[])) => {
    if (typeof contracts === 'function') {
      setContracts(prev => {
        const newContracts = contracts(prev);
        console.log('🔍 CONTRACTS STATE UPDATE (function):', {
          previousCount: prev.length,
          newCount: newContracts.length,
          stackTrace: new Error().stack?.split('\n').slice(1, 4)
        });
        return newContracts;
      });
    } else {
      console.log('🔍 CONTRACTS STATE UPDATE (direct):', {
        newCount: contracts.length,
        contracts: contracts.map(c => ({ id: c.id, pitch_id: c.pitch_id, agent_id: c.agent_id })),
        stackTrace: new Error().stack?.split('\n').slice(1, 4)
      });
      setContracts(contracts);
    }
  };
  const [agentInterest, setAgentInterest] = useState<AgentInterest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newInterests, setNewInterests] = useState<Set<string>>(new Set()); // Track new interests for beeping borders
  
  // Real-time agent interest management
  const { interests: realtimeInterests, updateInterestStatus: updateRealtimeStatus, cancelInterest } = useAgentInterestRealtime(pitchId);
  
  // Real-time player status management
  const { updatePlayerStatus } = usePlayerStatusRealtime();
  
  // Auto-mark ALL notifications as read when viewing this tab
  useAutoMarkNotificationsRead(activeTab === 'interest');

  // Mark interests as viewed when communication tab is active
  useEffect(() => {
    if (activeTab === 'interest') {
      console.log('👁️ Communication tab viewed - removing beeping borders and marking notifications as read');
      
      // Remove all beeping borders after 2 seconds of viewing
      setTimeout(() => {
        setNewInterests(new Set());
        console.log('🔴 Removed all beeping borders');
      }, 2000);
    }
  }, [activeTab]);

  // Listen for immediate interest updates and mark as new for beeping borders
  useEffect(() => {
    if (!profile?.user_id) return;

    console.log('🎯 Setting up communication hub event listeners');

    // Listen for new agent interests
    const handleNewInterest = (event: CustomEvent) => {
      const { pitchId, playerName, teamProfileId, agentName } = event.detail;
      
      console.log('⚡ COMM HUB: New interest event received');
      
      // If this is for the current user's pitch, mark it as new
      if ((profile.user_type === 'team' && teamProfileId === profile.id) || profile.user_type === 'agent') {
        console.log('✅ COMM HUB: Marking interest as new for beeping border');
        
        // Mark this pitch as having new interest
        setNewInterests(prev => new Set([...prev, pitchId]));
        
        // Auto-remove new status after 15 seconds
        setTimeout(() => {
          setNewInterests(prev => {
            const newSet = new Set(prev);
            newSet.delete(pitchId);
            return newSet;
          });
        }, 15000);

        // Refresh agent interest data
        setTimeout(() => fetchAgentInterest(), 1000);
      }
    };

    // Listen for cancelled interests
    const handleCancelledInterest = (event: CustomEvent) => {
      console.log('⚡ COMM HUB: Interest cancelled event received');
      
      // Refresh agent interest data
      setTimeout(() => fetchAgentInterest(), 1000);
    };

    const handleContractCreated = (event: CustomEvent) => {
      console.log('⚡ COMM HUB: Contract created event received - auto-refreshing');
      // Force refresh of both contracts and interests
      handleRefresh();
    };

    window.addEventListener('agentInterestExpressed', handleNewInterest as EventListener);
    window.addEventListener('agentInterestCancelled', handleCancelledInterest as EventListener);
    window.addEventListener('contractCreated', handleContractCreated as EventListener);

    return () => {
      console.log('🧹 COMM HUB: Cleaning up event listeners');
      window.removeEventListener('agentInterestExpressed', handleNewInterest as EventListener);
      window.removeEventListener('agentInterestCancelled', handleCancelledInterest as EventListener);
      window.removeEventListener('contractCreated', handleContractCreated as EventListener);
    };
  }, [profile?.user_id, profile?.user_type, profile?.id]);

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
    console.log('🔄 INITIALIZING COMMUNICATION HUB:', { pitchId, playerId, userType: profile?.user_type });
    
    if (pitchId || playerId) {
      console.log('🔄 Specific pitch/player mode - fetching targeted data');
      fetchContracts();
      fetchAgentInterest();
    } else {
      console.log('🔄 General communication mode - fetching all data');
      // Always fetch contracts using our reliable fetchContracts function
      fetchContracts();
      // Delay fetchAllCommunications to prevent race condition
      setTimeout(() => {
        console.log('🔄 Delayed fetchAllCommunications to prevent race condition');
        fetchAllCommunications();
      }, 2000);
    }
  }, [pitchId, playerId, profile?.user_type, profile?.id]);

  const fetchAllCommunications = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch agent interest based on user type
      if (profile.user_type === 'team') {
        // For teams: show interest in their pitches
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (teamData) {
          const { data: teamPitches } = await supabase
            .from('transfer_pitches')
            .select('id')
            .eq('team_id', teamData.id);

          if (teamPitches && teamPitches.length > 0) {
            const pitchIds = teamPitches.map(p => p.id);

            const { data: interest, error: interestError } = await supabase
              .from('agent_interest')
              .select('*')
              .in('pitch_id', pitchIds)
              .order('created_at', { ascending: false });

            if (interestError) throw interestError;

            const interestWithDetails = await Promise.all(
              (interest || []).map(async (item) => {
                const { data: agentData } = await supabase
                  .from('agents')
                  .select('profile_id')
                  .eq('id', item.agent_id)
                  .single();

                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name, user_type')
                  .eq('id', agentData?.profile_id)
                  .single();

                const { data: pitchData } = await supabase
                  .from('transfer_pitches')
                  .select(`
                    players!transfer_pitches_player_id_fkey(full_name, position, citizenship),
                    teams(team_name, country),
                    asking_price,
                    currency
                  `)
                  .eq('id', item.pitch_id)
                  .single();

                return {
                  ...item,
                  agent: { profile: profileData || { full_name: 'Unknown', user_type: 'unknown' } },
                  pitch: pitchData || {
                    players: { full_name: 'Unknown', position: 'Unknown', citizenship: '' },
                    teams: { team_name: 'Unknown', country: '' },
                    asking_price: 0,
                    currency: 'USD'
                  }
                };
              })
            );

            setAgentInterest(interestWithDetails || []);
          } else {
            setAgentInterest([]);
          }
        }
      } else if (profile.user_type === 'agent') {
        // For agents: show their own interest submissions
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (agentData) {
          const { data: interest, error: interestError } = await supabase
            .from('agent_interest')
            .select('*')
            .eq('agent_id', agentData.id)
            .order('created_at', { ascending: false });

          if (interestError) throw interestError;

          const interestWithDetails = await Promise.all(
            (interest || []).map(async (item) => {
              // Get pitch details
              const { data: pitchData } = await supabase
                .from('transfer_pitches')
                .select(`
                  players!transfer_pitches_player_id_fkey(full_name, position, citizenship),
                  teams(team_name, country),
                  asking_price,
                  currency
                `)
                .eq('id', item.pitch_id)
                .single();

              return {
                ...item,
                agent: { profile: { full_name: profile.full_name || 'You', user_type: 'agent' } },
                pitch: pitchData || {
                  players: { full_name: 'Unknown', position: 'Unknown', citizenship: '' },
                  teams: { team_name: 'Unknown', country: '' },
                  asking_price: 0,
                  currency: 'USD'
                }
              };
            })
          );

          setAgentInterest(interestWithDetails || []);
        }
      }

      // Fetch contracts for the user (fixed to use proper IDs)
      console.log('🔍 FETCH ALL COMMUNICATIONS - Getting contracts for user type:', profile.user_type);
      
      if (profile.user_type === 'agent') {
        // For agents: get agent_id first, then query contracts
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        
        if (agentData) {
          console.log('🔍 FETCH ALL COMMUNICATIONS - Using agent_id:', agentData.id);
          const { data: contracts, error: contractError } = await supabase
            .from('contracts')
            .select('*')
            .eq('agent_id', agentData.id)
            .order('created_at', { ascending: false });

          if (contractError) throw contractError;
          console.log('🔍 FETCH ALL COMMUNICATIONS - Agent contracts found:', contracts?.length || 0);
          setContractsWithDebug(contracts || []);
        } else {
          console.log('🔍 FETCH ALL COMMUNICATIONS - No agent record found, clearing contracts');
          setContractsWithDebug([]);
        }
      } else if (profile.user_type === 'team') {
        // For teams: get team_id first, then query contracts  
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        
        if (teamData) {
          console.log('🔍 FETCH ALL COMMUNICATIONS - Using team_id:', teamData.id);
          const { data: contracts, error: contractError } = await supabase
            .from('contracts')
            .select('*')
            .eq('team_id', teamData.id)
            .order('created_at', { ascending: false });

          if (contractError) throw contractError;
          console.log('🔍 FETCH ALL COMMUNICATIONS - Team contracts found:', contracts?.length || 0);
          setContractsWithDebug(contracts || []);
        } else {
          console.log('🔍 FETCH ALL COMMUNICATIONS - No team record found, clearing contracts');
          setContractsWithDebug([]);
        }
      }

    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchContracts = async () => {
    try {
      if (pitchId) {
        // If pitchId is provided, fetch contracts for that specific pitch
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('pitch_id', pitchId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('🔍 CONTRACTS DEBUG (direct query):', data);
        setContractsWithDebug(data || []);
      } else {
        // If no pitchId, fetch contracts for the current user
        if (profile?.id && profile?.user_type) {
          try {
            // Try direct query first for better reliability
            let contractQuery = supabase.from('contracts').select('*');
            
            if (profile.user_type === 'agent') {
              // Get agent_id from profile
              const { data: agentData, error: agentError } = await supabase
                .from('agents')
                .select('id')
                .eq('profile_id', profile.id)
                .single();
              
              console.log('🔍 AGENT LOOKUP DEBUG:', {
                profileId: profile.id,
                agentData: agentData,
                agentError: agentError
              });
              
              if (agentData) {
                console.log('🔍 Using agent_id for contract query:', agentData.id);
                contractQuery = contractQuery.eq('agent_id', agentData.id);
              } else {
                console.error('❌ No agent found for profile_id:', profile.id);
                console.error('❌ Agent error:', agentError);
              }
            } else if (profile.user_type === 'team') {
              // Get team_id from profile
              const { data: teamData } = await supabase
                .from('teams')
                .select('id')
                .eq('profile_id', profile.id)
                .single();
              
              if (teamData) {
                contractQuery = contractQuery.eq('team_id', teamData.id);
              }
            }
            
            const { data: directContracts, error: directError } = await contractQuery
              .order('created_at', { ascending: false });
            
            console.log('🔍 CONTRACT QUERY DEBUG:', {
              queryType: profile.user_type,
              profileId: profile.id,
              directContracts: directContracts,
              directError: directError,
              queryExecuted: contractQuery
            });
            
            if (directError) {
              console.error('❌ Direct contract query error:', directError);
              throw directError;
            }
            
            console.log('🔍 CONTRACTS DEBUG (direct query):', directContracts);
            console.log('🔍 CONTRACTS DEBUG - First contract structure:', directContracts?.[0]);
            
            // If no contracts found, try multiple fallback strategies
            if (!directContracts || directContracts.length === 0) {
              console.log('🔍 No contracts found with primary query, trying fallback strategies');
              
              // Test 1: Try searching by profile_id as agent_id
              const { data: fallbackContracts1, error: fallbackError1 } = await supabase
                .from('contracts')
                .select('*')
                .eq('agent_id', profile.id) // Use profile_id as agent_id
                .order('created_at', { ascending: false });
              
              console.log('🔍 FALLBACK TEST 1 (profile_id as agent_id):', {
                data: fallbackContracts1,
                error: fallbackError1
              });
              
              // Test 2: Try searching for ANY contracts (no filters)
              const { data: allContracts, error: allContractsError } = await supabase
                .from('contracts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
              
              console.log('🔍 FALLBACK TEST 2 (all contracts):', {
                totalCount: allContracts?.length || 0,
                data: allContracts,
                error: allContractsError
              });
              
              // Test 3: Try searching for the specific contract we know was created
              const { data: specificContract, error: specificError } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', '28c28d8f-507a-486a-aa84-547decaed61f');
              
              console.log('🔍 FALLBACK TEST 3 (specific contract):', {
                data: specificContract,
                error: specificError
              });
              
              // Use the best result we found
              if (fallbackContracts1 && fallbackContracts1.length > 0) {
                console.log('✅ Using fallback contracts (profile_id match)');
                setContractsWithDebug(fallbackContracts1);
              } else if (specificContract && specificContract.length > 0) {
                console.log('✅ Using specific contract');
                setContractsWithDebug(specificContract);
              } else {
                console.log('❌ No contracts found with any method');
                setContractsWithDebug([]);
              }
            } else {
              setContractsWithDebug(directContracts || []);
            }
            
          } catch (error) {
            console.error('Direct contract query failed, falling back to service:', error);
            
            // Fallback to service method
            const userContracts = await contractManagementService.getUserContracts(
              profile.id,
              profile.user_type as 'agent' | 'team'
            );
            console.log('🔍 CONTRACTS DEBUG (fallback getUserContracts):', userContracts);
            setContractsWithDebug(userContracts || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  // Function to clean up invalid agent interest records
  const cleanupInvalidAgentInterest = async () => {
    try {
      // First, get all agent interest records
      const { data: allAgentInterest, error: fetchError } = await supabase
        .from('agent_interest')
        .select('id, agent_id');

      if (fetchError) {
        console.error('Error fetching agent interest records:', fetchError);
        return;
      }

      if (!allAgentInterest || allAgentInterest.length === 0) {
        toast({
          title: "No Records Found",
          description: "No agent interest records to clean up.",
        });
        return;
      }

      // Get all valid agent IDs (not profile IDs!)
      const { data: validAgents, error: agentError } = await supabase
        .from('agents')
        .select('id');

      if (agentError) {
        console.error('Error fetching valid agents:', agentError);
        return;
      }

      const validAgentIds = new Set(validAgents?.map(a => a.id) || []);

      // Find invalid records - agent_id should reference agents table
      const invalidRecords = allAgentInterest.filter(record =>
        !validAgentIds.has(record.agent_id)
      );

      if (invalidRecords.length === 0) {
        toast({
          title: "No Invalid Records",
          description: "All agent interest records are valid.",
        });
        return;
      }

      console.log(`Found ${invalidRecords.length} invalid agent interest records to clean up`);

      // Delete invalid records
      const { error: deleteError } = await supabase
        .from('agent_interest')
        .delete()
        .in('id', invalidRecords.map(r => r.id));

      if (deleteError) {
        console.error('Error deleting invalid records:', deleteError);
        toast({
          title: "Error",
          description: "Failed to delete invalid records.",
          variant: "destructive"
        });
      } else {
        console.log(`Successfully cleaned up ${invalidRecords.length} invalid records`);
        toast({
          title: "Database Cleanup",
          description: `Cleaned up ${invalidRecords.length} invalid agent interest records.`,
        });

        // Refresh the data
        fetchAgentInterest();
        fetchAllCommunications();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Error",
        description: "An error occurred during cleanup.",
        variant: "destructive"
      });
    }
  };

  // Comprehensive refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered');
      
      // Refresh both interest and contracts data
      await Promise.all([
        fetchAgentInterest(),
        fetchContracts()
      ]);
      
      toast({
        title: "Refreshed!",
        description: "Communication data has been updated.",
        duration: 2000,
      });
      
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast({
        title: "Refresh Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAgentInterest = async () => {
    if (!pitchId) return;

    try {
      const { data, error } = await supabase
        .from('agent_interest')
        .select('*, status_message, status_changed_at, status_changed_by')
        .eq('pitch_id', pitchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const interestWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          // Get agent profile
          const { data: agentData } = await supabase
            .from('agents')
            .select('profile_id')
            .eq('id', item.agent_id)
            .single();

          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, user_type')
            .eq('id', agentData?.profile_id)
            .single();

          // Get pitch details with all required fields
          const { data: pitchData } = await supabase
            .from('transfer_pitches')
            .select(`
              id,
              transfer_type,
              asking_price,
              currency,
              player_id,
              team_id,
              players!transfer_pitches_player_id_fkey(full_name, position, citizenship),
              teams!transfer_pitches_team_id_fkey(team_name, country)
            `)
            .eq('id', item.pitch_id)
            .single();

          return {
            ...item,
            agent: { profile: profileData || { full_name: 'Unknown', user_type: 'unknown' } },
            pitch: pitchData || { players: { full_name: 'Unknown', position: 'Unknown' }, teams: { team_name: 'Unknown' }, asking_price: 0, currency: 'USD' }
          };
        })
      );

      setAgentInterest(interestWithDetails || []);
    } catch (error) {
      console.error('Error fetching agent interest:', error);
    }
  };


  const updateInterestStatus = async (interestId: string, newStatus: 'interested' | 'requested' | 'negotiating') => {
    try {
      if (newStatus === 'negotiating') {
        console.log('🚀 Processing Start Negotiation for interest:', interestId);
        
        // Find the interest in our current agentInterest state to avoid additional queries
        const interestData = agentInterest.find(interest => interest.id === interestId);
        
        if (!interestData) {
          console.error('❌ Interest not found in current state');
          throw new Error('Interest not found');
        }

        console.log('🔍 Using interest data from state:', interestData);

        // Extract data from the existing interest object
        const playerData = interestData.pitch?.players;
        const teamData = interestData.pitch?.teams;

        // Direct approach - update status (database trigger will handle notification)
        const { error: updateError } = await supabase
            .from('agent_interest')
          .update({ 
            status: 'negotiating',
            updated_at: new Date().toISOString()
          })
          .eq('id', interestId);

        if (updateError) throw updateError;

        // Update player status immediately
        updatePlayerStatus(pitchId || '', '', 'negotiating');

        // Trigger agent update
        window.dispatchEvent(new CustomEvent('workflowUpdate', {
          detail: {
            type: 'team_started_negotiation',
            teamName: teamData?.team_name || 'Unknown',
            playerName: playerData?.full_name || 'Unknown'
          }
        }));

        toast({
          title: "Success!",
          description: "Negotiations started! Agent has been notified.",
          duration: 4000,
        });

        console.log('🔄 Refreshing communication tab after successful negotiation start');
        
        // Immediate refresh with visual feedback
        setLoading(true);
        await Promise.all([
          fetchAgentInterest(),
          fetchContracts()
        ]);
        setLoading(false);
        
        // Force re-render of the component
        setTimeout(() => {
          fetchAgentInterest();
        }, 500);
      } else {
        // Handle other status updates normally
        const success = await updateRealtimeStatus(interestId, newStatus);
        if (!success) {
          toast({
            title: "Error",
            description: "Failed to update status",
            variant: "destructive"
          });
          return;
        }

        const actionMessages = {
          interested: "Interest acknowledged",
          requested: "More information requested from agent"
        };

        toast({
          title: "Success!",
          description: actionMessages[newStatus] || "Status updated",
          duration: 4000,
        });

        // Immediate refresh of communication tab data
        console.log('🔄 Refreshing communication tab after status update');
        fetchAgentInterest();
      }

    } catch (error: any) {
      console.error('Error updating interest status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const withdrawInterest = async (interestId: string) => {
    try {
      const { error } = await supabase
        .from('agent_interest')
        .delete()
        .eq('id', interestId);

      if (error) throw error;

      // Refresh the data
      fetchAgentInterest();
      toast({
        title: "Interest withdrawn",
        description: "Your interest has been withdrawn successfully",
      });
    } catch (error: any) {
      console.error('Error withdrawing interest:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw interest",
        variant: "destructive"
      });
    }
  };

  const rejectInterest = async (interestId: string) => {
    try {
      // Get interest details for notification with explicit foreign keys
      const { data: interestData } = await supabase
        .from('agent_interest')
        .select(`
          *,
          agent:agents(profile_id),
          pitch:transfer_pitches(
            players!transfer_pitches_player_id_fkey(full_name),
            teams!transfer_pitches_team_id_fkey(team_name, profile_id)
          )
        `)
        .eq('id', interestId)
        .single();

      // Extract data properly (arrays from foreign key relationships)
      const playerData = Array.isArray(interestData.pitch?.players) ? interestData.pitch.players[0] : interestData.pitch?.players;
      const teamData = Array.isArray(interestData.pitch?.teams) ? interestData.pitch.teams[0] : interestData.pitch?.teams;

      // Update status to 'rejected' with message - this keeps the record for display
      const { error } = await supabase
        .rpc('update_agent_interest_status', {
          interest_id: interestId,
          new_status: 'rejected',
          status_msg: `Team ${profile?.full_name || teamData?.team_name || 'Unknown'} has rejected this interest in ${playerData?.full_name || 'this player'} on ${new Date().toLocaleString()}`
        });

      if (error) throw error;

      console.log('✅ Agent interest status updated to rejected - database trigger will handle agent notification');

      // Immediate refresh of communication tab data
      console.log('🔄 Refreshing communication tab after interest rejection');
      fetchAgentInterest();
      
      toast({
        title: "Interest Rejected",
        description: "Interest has been rejected and agent has been notified",
      });
    } catch (error: any) {
      console.error('Error rejecting interest:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject interest",
        variant: "destructive"
      });
    }
  };


  const filteredInterest = agentInterest.filter(interest => {
    const hasValidAgent = interest.agent?.profile?.full_name;
    const matchesSearch = (interest.agent?.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (interest.pitch?.players?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      interest.status.toLowerCase().includes(searchTerm.toLowerCase());

    return hasValidAgent && matchesSearch;
  });

  // Enhanced function to handle contract creation from interest
  const handleCreateContract = async (interest: AgentInterest) => {
    setSelectedInterest(interest);

    // Auto-populate contract form with comprehensive pitch data
    setDetailedContractForm(prev => ({
      ...prev,
      // Basic Information
      playerName: interest.pitch.players.full_name,
      playerPosition: interest.pitch.players.position,
      playerNationality: interest.pitch.players.citizenship || '',
      teamName: interest.pitch.teams.team_name,
      teamCountry: interest.pitch.teams.country || '',
      contractDate: new Date().toISOString().split('T')[0],
      currency: interest.pitch.currency,

      // Transfer Details
      transferFee: interest.pitch.asking_price,
      loanFee: {
        base: interest.pitch.asking_price * 0.1, // 10% of asking price as default loan fee
        withOptions: interest.pitch.asking_price * 0.12,
        withoutOptions: interest.pitch.asking_price * 0.08,
        withObligations: interest.pitch.asking_price * 0.15
      },

      // Contract Terms
      contractDuration: '3 years',
      loanDuration: '1 year',
      loanType: 'with-options' as 'with-options' | 'without-options' | 'with-obligations',

      // Player Salary (estimate based on transfer fee)
      playerSalary: {
        annual: interest.pitch.asking_price * 0.15, // 15% of transfer fee as annual salary
        weekly: (interest.pitch.asking_price * 0.15) / 52,
        monthly: (interest.pitch.asking_price * 0.15) / 12
      },

      // Bonuses
      signOnBonus: interest.pitch.asking_price * 0.05, // 5% of transfer fee
      performanceBonus: {
        appearance: interest.pitch.asking_price * 0.01,
        goal: interest.pitch.asking_price * 0.02,
        assist: interest.pitch.asking_price * 0.015,
        cleanSheet: interest.pitch.asking_price * 0.01,
        teamSuccess: interest.pitch.asking_price * 0.025
      },

      // Relocation Support
      relocationSupport: {
        housing: interest.pitch.asking_price * 0.02,
        transportation: interest.pitch.asking_price * 0.01,
        familySupport: interest.pitch.asking_price * 0.015,
        languageTraining: interest.pitch.asking_price * 0.005
      },

      // Release Clause
      releaseClause: interest.pitch.asking_price * 1.5, // 150% of transfer fee

      // Buyback Clause (for permanent transfers)
      buybackClause: {
        active: true,
        amount: interest.pitch.asking_price * 1.2, // 120% of transfer fee
        duration: '2 years'
      },

      // Image Rights
      imageRights: {
        terms: 'Standard commercial rights',
        percentage: 50
      },

      // Loan-specific terms
      salaryCoverage: {
        parentClub: interest.pitch.asking_price * 0.1,
        loanClub: interest.pitch.asking_price * 0.05,
        percentage: 100
      },
      appearanceClause: interest.pitch.asking_price * 0.01,
      goalBonus: interest.pitch.asking_price * 0.02,
      assistBonus: interest.pitch.asking_price * 0.015,
      promotionBonus: interest.pitch.asking_price * 0.025,
      purchaseOption: {
        active: true,
        amount: interest.pitch.asking_price * 1.1,
        conditions: ['Minimum appearances', 'Performance targets']
      },
      obligationToBuy: {
        active: false,
        amount: interest.pitch.asking_price * 1.2,
        triggers: ['Promotion achieved', 'Appearance targets met']
      },
      recallClause: {
        active: true,
        conditions: ['Injury crisis', 'Performance issues'],
        noticePeriod: '7 days'
      },
      extensionOption: {
        active: true,
        duration: '1 year',
        conditions: ['Mutual agreement', 'Performance targets met']
      }
    }));

    setContractType('create');
    setShowContractModal(true);
  };

  // Handle contract creation completion
  const handleContractCreated = async (interest: AgentInterest) => {
    try {
      // Get agent's profile_id first, then user_id
      const { data: agentData } = await supabase
        .from('agents')
        .select('profile_id')
        .eq('id', interest.agent_id)
        .single();

      if (!agentData?.profile_id) {
        console.error('❌ Agent profile_id not found for agent_id:', interest.agent_id);
        return;
      }

      // Get agent's user_id for notification
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', agentData.profile_id)
        .single();

      if (agentProfile?.user_id) {
        console.log('📬 Creating contract notification for agent:', agentProfile.user_id);
        
        // Send notification to agent about contract creation
        const contractNotification = await EnhancedNotificationService.createNotification({
          user_id: agentProfile.user_id,
          title: "📄 Contract Created!",
          message: `Team ${interest.pitch.teams.team_name} has created a contract for ${interest.pitch.players.full_name}. You can now enter the negotiation room.`,
          type: "contract_update",
          action_url: `/agent-explore?tab=communication`,
          action_text: "Enter Negotiation Room",
          metadata: {
            interest_id: interest.id,
            pitch_id: interest.pitch_id,
            player_name: interest.pitch.players.full_name,
            team_name: interest.pitch.teams.team_name,
            action: 'contract_created'
          }
        });

        console.log('✅ Contract notification created successfully:', contractNotification.id);

        // Update player status to contracted
        updatePlayerStatus(interest.pitch_id, '', 'contracted');

        // Trigger custom events for immediate UI updates
        window.dispatchEvent(new CustomEvent('workflowUpdate', {
          detail: {
            type: 'contract_created',
            playerName: interest.pitch.players.full_name,
            teamName: interest.pitch.teams.team_name,
            agentId: interest.agent_id,
            pitchId: interest.pitch_id
          }
        }));

        // Specific event for agent UI updates
        window.dispatchEvent(new CustomEvent('contractCreated', {
          detail: {
            agentId: interest.agent_id,
            pitchId: interest.pitch_id,
            playerName: interest.pitch.players.full_name,
            teamName: interest.pitch.teams.team_name
          }
        }));

        toast({
          title: "Contract Created!",
          description: `Contract created successfully. Agent ${interest.agent?.profile?.full_name} has been notified.`,
          duration: 5000,
        });

        // Auto-refresh after contract creation
        console.log('🔄 Auto-refreshing after contract creation');
        await handleRefresh();
        setShowContractModal(false);
      }
    } catch (error) {
      console.error('Error notifying about contract creation:', error);
      toast({
        title: "Contract Created",
        description: "Contract created successfully, but failed to send notification.",
        variant: "destructive"
      });
    }
  };

  // Handle navigation to contract negotiation room
  const handleSendMessage = async (interest: AgentInterest) => {
    try {
      console.log('🔍 ENTER NEGOTIATION: Looking for existing contract');
      
      // Find the contract for this interest from our loaded contracts
      const matchingContract = contracts.find(contract => 
        contract.pitch_id === interest.pitch_id && 
        contract.agent_id === interest.agent_id
      );

      if (matchingContract) {
        console.log('✅ ENTER NEGOTIATION: Found contract, navigating to:', matchingContract.id);
        // Navigate to existing contract negotiation
        navigate(`/contract-negotiation/${matchingContract.id}`);
        
        toast({
          title: "Entering Negotiation Room",
          description: "Redirecting to contract negotiation...",
          duration: 2000,
        });
        return;
      }

      // If no contract found in state, try a direct query as fallback
      console.log('🔍 ENTER NEGOTIATION: No contract in state, trying direct query');
      
      const { data: existingContract, error: contractError } = await supabase
        .from('contracts')
        .select('id')
        .eq('pitch_id', interest.pitch_id)
        .eq('agent_id', interest.agent_id)
        .maybeSingle();

      if (contractError) {
        console.error('❌ Error querying for contract:', contractError);
        throw new Error('Unable to access contract. Please try refreshing the page.');
      }

      if (existingContract) {
        console.log('✅ ENTER NEGOTIATION: Found contract via direct query, navigating to:', existingContract.id);
        navigate(`/contract-negotiation/${existingContract.id}`);
        
        toast({
          title: "Entering Negotiation Room",
          description: "Redirecting to contract negotiation...",
          duration: 2000,
        });
        return;
      }

      // If still no contract found, this is an error state
      console.error('❌ ENTER NEGOTIATION: No contract found for this interest');
      toast({
        title: "No Contract Found",
        description: "Please ask the team to create a contract first.",
        variant: "destructive"
      });

    } catch (error: any) {
      console.error('Error entering negotiation room:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to enter negotiation room",
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
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'interest' | 'contracts')} className="w-full">
            <TabsList className="grid w-full grid-cols-1 border-0">
              <TabsTrigger
                value="interest"
                className="flex items-center gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white"
              >
                <Heart className="w-4 h-4" />
                Agent Interest
              </TabsTrigger>

            </TabsList>


            {/* Agent Interest Tab */}
            <TabsContent value="interest" className="mt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={profile?.user_type === 'agent' ? "Search your interests..." : "Search agent interest..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-600 bg-gray-800 text-white flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white shrink-0"
                  title="Refresh communication data"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {refreshing && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mr-2" />
                  <span className="text-blue-400">Refreshing communication data...</span>
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredInterest.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-2">
                      {profile?.user_type === 'agent'
                        ? "No active interest submissions found"
                        : "No agent interest found"
                      }
                    </p>
                    {profile?.user_type === 'agent' && (
                      <p className="text-sm text-gray-500">
                        Express interest in transfer pitches to see them here. Cancelled interests are removed from this list.
                      </p>
                    )}
                    {profile?.user_type === 'team' && (
                      <p className="text-sm text-gray-500">
                        Agents who express interest will appear here. Cancelled interests are automatically removed.
                      </p>
                    )}
                  </div>
                ) : (
                  (realtimeInterests.length > 0 ? realtimeInterests : filteredInterest).map((interest) => (
                    <BeepingBorder key={interest.id} isActive={newInterests.has(interest.pitch_id)} className="mb-4">
                      <Card className="border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {profile?.user_type === 'agent' ? (
                              // Agent view - show their interest in other teams' pitches
                              <>
                                <h4 className="font-semibold text-white">
                                  Your Interest in {interest.pitch?.players?.full_name || 'Unknown Player'}
                                </h4>
                                <p className="text-sm text-gray-400">
                                  {interest.pitch?.players?.position || 'Unknown Position'} • {interest.pitch?.teams?.team_name || 'Unknown Team'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {interest.pitch?.teams?.country || 'Unknown Country'} • {interest.pitch?.asking_price?.toLocaleString() || '0'} {interest.pitch?.currency || 'USD'}
                                </p>
                              </>
                            ) : (
                              // Team view - show agents interested in their pitches
                              <>
                                <h4 className="font-semibold text-white">
                                  {interest.agent?.profile?.full_name || `Agent #${interest.agent_id.slice(0, 8)}`}
                                </h4>
                                <p className="text-sm text-gray-400">
                                  Interested in {interest.pitch?.players?.full_name || 'Unknown Player'} ({interest.pitch?.players?.position || 'Unknown Position'})
                                </p>
                                <p className="text-xs text-gray-500">
                                  {interest.pitch?.teams?.team_name || 'Unknown Team'} • {interest.pitch?.asking_price?.toLocaleString() || '0'} {interest.pitch?.currency || 'USD'}
                                </p>
                              </>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              interest.status === 'interested' ? 'border-blue-500 text-blue-400' :
                              interest.status === 'negotiating' ? 'border-yellow-500 text-yellow-400' :
                              interest.status === 'requested' ? 'border-orange-500 text-orange-400' :
                              interest.status === 'withdrawn' ? 'border-orange-600 text-orange-500' :
                              interest.status === 'rejected' ? 'border-red-600 text-red-500' :
                              'border-gray-500 text-gray-400'
                            }`}
                          >
                            {interest.status === 'withdrawn' ? 'Withdrawn' :
                             interest.status === 'rejected' ? 'Rejected' :
                             interest.status}
                          </Badge>
                        </div>

                        {interest.message && (
                          <p className="text-gray-300 text-sm mb-3">{interest.message}</p>
                        )}

                        {/* Show status message for withdrawn/rejected interests */}
                        {(interest.status === 'withdrawn' || interest.status === 'rejected') && interest.status_message && (
                          <div className={`p-3 rounded-lg mb-3 ${
                            interest.status === 'withdrawn' 
                              ? 'bg-orange-500/10 border border-orange-500/20' 
                              : 'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <p className={`text-sm font-medium ${
                              interest.status === 'withdrawn' ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              {interest.status === 'withdrawn' ? '🚫 Interest Withdrawn' : '❌ Interest Rejected'}
                            </p>
                            <p className="text-gray-300 text-sm mt-1">
                              {interest.status_message}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
                          </span>

                          {profile?.user_type === 'team' ? (
                            // Team actions (only show for active interests)
                            <div className="flex gap-2 flex-wrap">
                              {interest.status === 'interested' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      console.log('🚀 Start Negotiation clicked for interest:', interest.id);
                                      try {
                                        await updateInterestStatus(interest.id, 'negotiating');
                                      } catch (error) {
                                        console.error('❌ Error starting negotiation:', error);
                                      }
                                    }}
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
                              
                              {interest.status === 'interested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectInterest(interest.id)}
                                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Reject Interest
                                </Button>
                              )}

                              {interest.status === 'negotiating' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      handleCreateContract(interest);
                                      // Contract will only be created when user submits the form
                                    }}
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
                                    Enter Negotiation Room
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

                              {/* Show message for withdrawn/rejected interests */}
                              {(interest.status === 'withdrawn' || interest.status === 'rejected') && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  interest.status === 'withdrawn' ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {interest.status === 'withdrawn' ? 'No actions available - withdrawn' : 'No actions available - rejected'}
                                </span>
                              )}
                            </div>
                          ) : (
                            // Agent actions
                            <div className="flex gap-2 flex-wrap">
                              {interest.status === 'interested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendMessage(interest)}
                                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                >
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  Follow Up
                                </Button>
                              )}

                              {interest.status === 'negotiating' && (
                                <>
                                  {/* Proper workflow: Show Enter Negotiation Room ONLY if contract exists for THIS specific interest */}
                                  {(() => {
                                    const matchingContract = contracts.find(contract => 
                                      contract.pitch_id === interest.pitch_id && 
                                      contract.agent_id === interest.agent_id
                                    );
                                    
                                    console.log('🔍 WORKFLOW DEBUG:', {
                                      interestId: interest.id,
                                      interestStatus: interest.status,
                                      interestPitchId: interest.pitch_id,
                                      interestAgentId: interest.agent_id,
                                      totalContracts: contracts.length,
                                      contractsForThisPitch: contracts.filter(c => c.pitch_id === interest.pitch_id),
                                      matchingContract: matchingContract ? {
                                        id: matchingContract.id,
                                        pitch_id: matchingContract.pitch_id,
                                        agent_id: matchingContract.agent_id,
                                        status: matchingContract.status
                                      } : null,
                                      hasMatchingContract: !!matchingContract,
                                      shouldShowEnterButton: !!matchingContract,
                                      workflowState: matchingContract ? 'CONTRACT_EXISTS' : 'WAITING_FOR_CONTRACT'
                                    });
                                    
                                    return !!matchingContract;
                                  })() ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendMessage(interest)}
                                      className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                                  >
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                      Enter Negotiation Room
                                  </Button>
                                  ) : (
                                    <div className="text-sm text-yellow-400 flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Waiting for contract from team...
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => withdrawInterest(interest.id)}
                                    className="border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Withdraw Interest
                                  </Button>
                                </>
                              )}

                              {interest.status === 'requested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendMessage(interest)}
                                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                >
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  Provide Info
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    </BeepingBorder>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Enhanced Contracts Tab */}
            <TabsContent value="contracts" className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {profile?.user_type === 'agent' ? 'Your Contracts' : 'Contract Management'}
                </h3>
                {profile?.user_type === 'team' ? (
                  <div className="flex gap-2">
                    <Button
                      disabled={loading}
                      onClick={() => {
                        setContractType('create');
                        setShowContractModal(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Generate Contract
                        </>
                      )}
                    </Button>
                    <Button
                      disabled={loading}
                      onClick={() => {
                        setContractType('upload');
                        setShowContractModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Contract
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      disabled={loading}
                      onClick={() => {
                        setContractType('upload');
                        setShowContractModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Contract
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {contracts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-2">
                      {profile?.user_type === 'agent'
                        ? "No contracts found"
                        : "No contracts found"
                      }
                    </p>
                    {profile?.user_type === 'agent' && (
                      <p className="text-sm text-gray-500">
                        Contracts you're involved in will appear here
                      </p>
                    )}
                  </div>
                ) : (
                  contracts.map((contract) => (
                    <Card key={contract.id} className="border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">
                            {profile?.user_type === 'agent'
                              ? `Contract #${contract.id.slice(0, 8)}`
                              : `Contract #${contract.id.slice(0, 8)}`
                            }
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${contract.status === 'draft' ? 'border-gray-500 text-gray-400' :
                              contract.status === 'under_review' ? 'border-yellow-500 text-yellow-400' :
                                contract.status === 'negotiating' ? 'border-blue-500 text-blue-400' :
                                  contract.status === 'signed' ? 'border-green-500 text-green-400' :
                                    contract.status === 'completed' ? 'border-green-600 text-green-500' :
                                      'border-gray-500 text-gray-400'
                              }`}
                          >
                            {contract.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          <p className="text-sm text-gray-400">
                            <span className="font-medium">Value:</span> {contract.contract_value?.toLocaleString() || '0'} {contract.currency || 'USD'}
                          </p>
                          <p className="text-sm text-gray-400">
                            <span className="font-medium">Stage:</span> {contract.deal_stage || 'Unknown'}
                          </p>
                          {profile?.user_type === 'agent' && (
                            <p className="text-sm text-gray-400">
                              <span className="font-medium">Role:</span> Agent
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mb-3">
                          Last activity: {formatDistanceToNow(new Date(contract.last_activity || contract.created_at), { addSuffix: true })}
                        </p>

                        <div className="flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/contract-negotiation/${contract.id}`)}
                              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View Contract
                            </Button>
                            {profile?.user_type === 'agent' && contract.status === 'under_review' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/contract-negotiation/${contract.id}`)}
                                className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Review
                              </Button>
                            )}
                          </div>

                          {profile?.user_type === 'agent' && (
                            <div className="text-xs text-gray-500">
                              {contract.status === 'draft' && 'Awaiting team review'}
                              {contract.status === 'under_review' && 'Your review needed'}
                              {contract.status === 'negotiating' && 'In negotiation'}
                              {contract.status === 'signed' && 'Contract signed'}
                              {contract.status === 'completed' && 'Contract completed'}
                            </div>
                          )}
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
                disabled={loading || (contractType === 'upload' ? !contractFile : !detailedContractForm.playerName)}
                onClick={async () => {
                  try {
                    setLoading(true);
                    if (contractType === 'create') {
                      // Get team and agent IDs
                      let teamId = '';
                      let agentId = '';

                      if (profile?.user_type === 'team') {
                        // First, verify the profile exists
                        const { data: profileData, error: profileError } = await supabase
                          .from('profiles')
                          .select('id')
                          .eq('id', profile.id)
                          .maybeSingle();

                        if (profileError) {
                          console.error('Error fetching profile data:', profileError);
                          throw new Error(`Profile not found: ${profileError.message}`);
                        }

                        if (!profileData) {
                          throw new Error(`Profile with ID ${profile.id} does not exist in profiles table`);
                        }

                        const { data: teamData, error: teamError } = await supabase
                          .from('teams')
                          .select('id')
                          .eq('profile_id', profile.id)
                          .maybeSingle(); // Use maybeSingle instead of single

                        if (teamError) {
                          console.error('Error fetching team data:', teamError);
                          throw new Error(`Team not found: ${teamError.message}`);
                        }

                        // If no team record exists, create one
                        if (!teamData) {
                          console.log('No team record found, creating one...');
                          const { data: newTeamData, error: createError } = await supabase
                            .from('teams')
                            .insert({
                              profile_id: profile.id,
                              team_name: 'Team', // Default name
                              country: 'Unknown',
                              sport_type: 'football'
                            })
                            .select('id')
                            .single();

                          if (createError) {
                            console.error('Error creating team record:', createError);
                            throw new Error(`Failed to create team record: ${createError.message}`);
                          }

                          teamId = newTeamData?.id || '';
                        } else {
                          teamId = teamData.id;
                        }

                        if (!teamId) {
                          throw new Error('Team record not found in teams table');
                        }
                      }

                      if (selectedInterest) {
                        console.log('Selected interest agent_id:', selectedInterest.agent_id);

                        // Get the agent data and verify it exists
                        const { data: agentData, error: agentError } = await supabase
                          .from('agents')
                          .select('id, profile_id')
                          .eq('id', selectedInterest.agent_id)
                          .maybeSingle();

                        if (agentError) {
                          console.error('Error fetching agent data:', agentError);
                          throw new Error(`Agent not found: ${agentError.message}`);
                        }

                        if (!agentData) {
                          console.error('Agent not found for agent_id:', selectedInterest.agent_id);
                          throw new Error('Agent not found');
                        }

                        // Get the profile data separately
                        const { data: profileData, error: profileError } = await supabase
                          .from('profiles')
                          .select('id, full_name, user_type')
                          .eq('id', agentData.profile_id)
                          .single();

                        if (profileError) {
                          console.error('Error fetching profile data:', profileError);
                          throw new Error(`Profile not found: ${profileError.message}`);
                        }

                        console.log('🔍 CONTRACT DEBUG - Agent found:', agentData);
                        console.log('🔍 CONTRACT DEBUG - Profile found:', profileData);
                        console.log('🔍 CONTRACT DEBUG - Selected interest agent_id:', selectedInterest.agent_id);
                        console.log('🔍 CONTRACT DEBUG - About to use agentId:', agentData.id);

                        // Now we have the agent data, continue with contract creation
                        agentId = agentData.id;
                      }

                      if (!teamId || !agentId) {
                        throw new Error(`Missing team or agent information. Team ID: ${teamId}, Agent ID: ${agentId}. Please ensure both team and agent profiles are properly set up.`);
                      }

                      // Get player_id from the transfer_pitches table
                      let playerId = null;
                      if (selectedInterest?.pitch_id) {
                        const { data: pitchData, error: pitchError } = await supabase
                          .from('transfer_pitches')
                          .select('player_id')
                          .eq('id', selectedInterest.pitch_id)
                          .single();
                        
                        if (pitchError) {
                          console.error('❌ Error fetching player_id from pitch:', pitchError);
                        } else {
                          playerId = pitchData?.player_id;
                          console.log('🔍 Retrieved player_id from pitch:', playerId);
                        }
                      }

                      if (!playerId) {
                        throw new Error('Player ID is required to create a contract');
                      }

                      // Create contract in database
                      const contractData = {
                        pitchId: selectedInterest?.pitch_id || pitchId || '',
                        playerId: playerId, // ✅ Added missing player_id
                        agentId: agentId,
                        teamId: teamId,
                        transferType: transferType as 'permanent' | 'loan',
                        contractValue: detailedContractForm.transferFee,
                        currency: detailedContractForm.currency,
                        contractDetails: {
                          duration: detailedContractForm.contractDuration,
                          salary: detailedContractForm.playerSalary.annual,
                          signOnBonus: detailedContractForm.signOnBonus,
                          performanceBonus: detailedContractForm.performanceBonus.appearance,
                          relocationSupport: detailedContractForm.relocationSupport.housing
                        }
                      };

                      console.log('🔍 CONTRACT DEBUG - Contract data being created:', contractData);

                      const contract = await contractManagementService.createContract(contractData);
                      
                      console.log('🔍 CONTRACT DEBUG - Contract created with ID:', contract);

                      // Update agent interest status to reflect contract creation
                      if (selectedInterest) {
                        await supabase
                          .from('agent_interest')
                          .update({
                            status: 'negotiating',
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', selectedInterest.id);
                      }

                      toast({
                        title: "Contract Created!",
                        description: "Contract has been created and is ready for negotiation.",
                      });

                      setShowContractModal(false);

                      // Navigate to contract negotiation page
                      navigate(`/contract-negotiation/${contract.id}`);

                    } else if (contractType === 'upload' && contractFile) {
                      // Handle file upload logic here
                      toast({
                        title: "Contract Uploaded!",
                        description: "Contract file has been uploaded successfully.",
                      });
                    }
                  } catch (error: any) {
                    console.error('Error creating contract:', error);
                    toast({
                      title: "Error",
                      description: error.message || "Failed to create contract",
                      variant: "destructive"
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-rosegold hover:bg-rosegold/90 text-white flex-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {contractType === 'upload' ? 'Uploading...' : 'Generating...'}
                  </>
                ) : contractType === 'upload' ? (
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
