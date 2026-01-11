import { supabase } from '@/integrations/supabase/client';
import { contractService, PermanentTransferContract, LoanTransferContract } from './contractService';

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export interface CreateContractData {
  pitchId: string;
  agentId: string;
  teamId: string;
  transferType: 'permanent' | 'loan';
  contractValue: number;
  currency: string;
  contractDetails?: {
    duration?: string;
    salary?: number;
    signOnBonus?: number;
    performanceBonus?: number;
    relocationSupport?: number;
  };
  playerId?: string; // Added for permanent transfer
}

// Legacy contract action interface
export interface ContractAction {
  contractId: string;
  action: 'approve' | 'reject' | 'request-changes' | 'finalize' | 'complete';
  details?: string;
  userId: string;
}

// New role-specific contract action interface
export interface RoleSpecificContractAction {
  contractId: string;
  action: 'accept-offer' | 'negotiate-terms' | 'reject-offer' | 'submit-counter-proposal' | 'counter-offer' | 'accept-agent-terms' | 'withdraw-offer' | 'finalize-deal' | 'complete-transfer';
  details?: string;
  userId: string;
  customTerms?: any;
}

export interface ContractActionResult {
  success: boolean;
  newStatus: 'draft' | 'sent' | 'under_review' | 'negotiating' | 'finalized' | 'completed' | 'rejected' | 'withdrawn';
  newStep: 'draft' | 'sent' | 'review' | 'negotiation' | 'finalization' | 'completion' | 'rejected' | 'withdrawn';
  message: string;
}

export const contractManagementService = {
  // Create a new contract
  async createContract(data: CreateContractData) {
    try {
      // If playerId is not provided, try to get it from the pitch
      let playerId = data.playerId;
      if (!playerId && data.pitchId) {
        const { data: pitchData } = await supabase
          .from('transfer_pitches')
          .select('player_id')
          .eq('id', data.pitchId)
          .single();
        playerId = pitchData?.player_id;
      }

      if (!playerId) {
        throw new Error('Player ID is required to create a contract');
      }

      // Use the provided agent and team IDs directly
      // The UnifiedCommunicationHub already resolves these from the database
      const agentId = data.agentId;
      const teamId = data.teamId;

      console.log('🔍 CREATE CONTRACT DEBUG:', {
        inputAgentId: data.agentId,
        inputTeamId: data.teamId,
        resolvedAgentId: agentId,
        resolvedTeamId: teamId,
        pitchId: data.pitchId
      });

      if (!agentId || !teamId) {
        throw new Error('Missing team or agent information');
      }

      // Map transfer type to contract type
      const contractType = data.transferType === 'permanent' ? 'transfer' : 'loan';

      // Create terms object from contract details
      const terms = {
        transferFee: data.contractValue,
        currency: data.currency,
        duration: data.contractDetails?.duration,
        salary: data.contractDetails?.salary,
        signOnBonus: data.contractDetails?.signOnBonus,
        performanceBonus: data.contractDetails?.performanceBonus,
        relocationSupport: data.contractDetails?.relocationSupport
      };

      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          pitch_id: data.pitchId,
          player_id: playerId,
          agent_id: agentId,
          team_id: teamId,
          contract_type: contractType,
          status: 'sent',
          deal_stage: 'under_review',
          contract_value: data.contractValue,
          currency: data.currency,
          terms: terms,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Skip contract message creation for now to avoid foreign key issues
      // TODO: Re-enable once database schema is properly fixed
      console.log('Contract created successfully. Message creation temporarily disabled.');

      return contract;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  },

  // Get contract with all related data
  async getContract(contractId: string) {
    try {
      // Validate UUID format before querying
      if (!isValidUUID(contractId)) {
        throw new Error(`Invalid contract ID format: ${contractId}`);
      }

      // First get the contract data
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) {
        // Handle specific error cases
        if (contractError.code === 'PGRST116') {
          throw new Error('Contract not found or you do not have permission to view it');
        } else if (contractError.code === 'PGRST301') {
          throw new Error('Not authorized to access this contract');
        } else if (contractError.message?.includes('406')) {
          throw new Error('Access denied. Please check your permissions.');
        }
        throw contractError;
      }

      // Get related data separately to avoid foreign key relationship issues
      const [pitchData, agentData, teamData] = await Promise.all([
        // Get pitch data with error handling for RLS issues
        contract.pitch_id ? supabase
          .from('transfer_pitches')
          .select(`
            id,
            transfer_type,
            asking_price,
            currency,
            status,
            player_id
          `)
          .eq('id', contract.pitch_id)
          .maybeSingle()
          .then(result => {
            // Handle errors with detailed logging
            if (result.error) {
              console.error('❌ Transfer pitches query error:', {
                error: result.error,
                errorCode: result.error.code,
                errorMessage: result.error.message,
                contractPitchId: contract.pitch_id,
                queryType: 'getContract'
              });
              
              // Handle PGRST116 (no rows found) or 406 errors
              if (result.error.code === 'PGRST116' || result.error.message?.includes('406') || result.error.code === '406') {
                console.warn('🔄 Transfer pitch not found or access denied, using fallback data');
                return { 
                  data: {
                    id: contract.pitch_id,
                    transfer_type: 'permanent',
                    asking_price: 0,
                    currency: 'USD',
                    status: 'active',
                    player_id: null
                  }, 
                  error: null 
                };
              }
            }
            
            // Handle case where no data is returned (null result)
            if (!result.data) {
              console.warn('🔄 No transfer pitch data found, using fallback');
              return { 
                data: {
                  id: contract.pitch_id,
                  transfer_type: 'permanent',
                  asking_price: 0,
                  currency: 'USD',
                  status: 'active',
                  player_id: null
                }, 
                error: null 
              };
            }
            return result;
          }) : Promise.resolve({ data: null, error: null }),
        
        // Get agent data with error handling
        contract.agent_id ? supabase
          .from('agents')
          .select(`
            id,
            profile_id,
            agency_name
          `)
          .eq('id', contract.agent_id)
          .maybeSingle()
          .then(result => {
            if (result.error && result.error.code === 'PGRST116') {
              console.warn('🔄 Agent not found, using fallback data');
              return { 
                data: {
                  id: contract.agent_id,
                  profile_id: null,
                  agency_name: 'Unknown Agency'
                }, 
                error: null 
              };
            }
            return result;
          }) : Promise.resolve({ data: null, error: null }),
        
        // Get team data
        contract.team_id ? supabase
          .from('teams')
          .select(`
            id,
            team_name,
            country,
            logo_url
          `)
          .eq('id', contract.team_id)
          .single() : Promise.resolve({ data: null, error: null })
      ]);

      // Get player data if pitch has a player
      let playerData = null;
      if (pitchData.data?.player_id) {
        const { data: player } = await supabase
          .from('players')
          .select(`
            id,
            full_name,
            position,
            citizenship
          `)
          .eq('id', pitchData.data.player_id)
          .single();
        playerData = player;
      }

      // Get agent profile data if agent exists
      let agentProfileData = null;
      if (agentData.data?.profile_id) {
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            user_type
          `)
          .eq('id', agentData.data.profile_id)
          .single();
        agentProfileData = agentProfile;
      }

      // Combine all data
      const result = {
        ...contract,
        pitch: pitchData.data ? {
          ...pitchData.data,
          player: playerData
        } : null,
        agent: agentData.data ? {
          ...agentData.data,
          profile: agentProfileData
        } : null,
        team: teamData.data
      };

      return result;
    } catch (error) {
      console.error('Error fetching contract:', error);
      throw error;
    }
  },

  // Get all contracts for a user (agent or team)
  async getUserContracts(userId: string, userType: 'agent' | 'team') {
    try {
      // First get the user's agent or team ID
      let userEntityId = null;
      
      if (userType === 'agent') {
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', userId)
          .single();
        userEntityId = agent?.id;
      } else {
        const { data: team } = await supabase
          .from('teams')
          .select('id')
          .eq('profile_id', userId)
          .single();
        userEntityId = team?.id;
      }

      if (!userEntityId) {
        return [];
      }

      // Get contracts for the user
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .or(userType === 'agent' ? `agent_id.eq.${userEntityId}` : `team_id.eq.${userEntityId}`)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Get related data for each contract
      const contractsWithData = await Promise.all(
        (contracts || []).map(async (contract) => {
          const [pitchData, agentData, teamData] = await Promise.all([
            // Get pitch data with error handling for RLS issues
            contract.pitch_id ? supabase
              .from('transfer_pitches')
              .select(`
                id,
                transfer_type,
                asking_price,
                currency,
                player_id
              `)
              .eq('id', contract.pitch_id)
              .maybeSingle()
              .then(result => {
                // Handle errors with detailed logging
                if (result.error) {
                  console.error('❌ Transfer pitches query error in getUserContracts:', {
                    error: result.error,
                    errorCode: result.error.code,
                    errorMessage: result.error.message,
                    contractPitchId: contract.pitch_id,
                    queryType: 'getUserContracts'
                  });
                  
                  // Handle PGRST116 (no rows found) or 406 errors
                  if (result.error.code === 'PGRST116' || result.error.message?.includes('406') || result.error.code === '406') {
                    console.warn('🔄 Transfer pitch not found in getUserContracts, using fallback data');
                    return { 
                      data: {
                        id: contract.pitch_id,
                        transfer_type: 'permanent',
                        asking_price: 0,
                        currency: 'USD',
                        player_id: null
                      }, 
                      error: null 
                    };
                  }
                }
                
                // Handle case where no data is returned
                if (!result.data) {
                  console.warn('🔄 No transfer pitch data found in getUserContracts, using fallback');
                  return { 
                    data: {
                      id: contract.pitch_id,
                      transfer_type: 'permanent',
                      asking_price: 0,
                      currency: 'USD',
                      player_id: null
                    }, 
                    error: null 
                  };
                }
                return result;
              }) : Promise.resolve({ data: null, error: null }),
            
            // Get agent data with error handling
            contract.agent_id ? supabase
              .from('agents')
              .select(`
                id,
                profile_id
              `)
              .eq('id', contract.agent_id)
              .maybeSingle()
              .then(result => {
                if (result.error && result.error.code === 'PGRST116') {
                  console.warn('🔄 Agent not found in getUserContracts, using fallback data');
                  return { 
                    data: {
                      id: contract.agent_id,
                      profile_id: null
                    }, 
                    error: null 
                  };
                }
                return result;
              }) : Promise.resolve({ data: null, error: null }),
            
            // Get team data
            contract.team_id ? supabase
              .from('teams')
              .select(`
                id,
                team_name,
                country
              `)
              .eq('id', contract.team_id)
              .single() : Promise.resolve({ data: null, error: null })
          ]);

          // Get player data if pitch has a player
          let playerData = null;
          if (pitchData.data?.player_id) {
            const { data: player } = await supabase
              .from('players')
              .select(`
                id,
                full_name,
                position
              `)
              .eq('id', pitchData.data.player_id)
              .single();
            playerData = player;
          }

          // Get agent profile data if agent exists
          let agentProfileData = null;
          if (agentData.data?.profile_id) {
            const { data: agentProfile } = await supabase
              .from('profiles')
              .select(`
                id,
                full_name,
                email
              `)
              .eq('id', agentData.data.profile_id)
              .single();
            agentProfileData = agentProfile;
          }

          // Combine all data
          return {
            ...contract,
            pitch: pitchData.data ? {
              ...pitchData.data,
              player: playerData
            } : null,
            agent: agentData.data ? {
              ...agentData.data,
              profile: agentProfileData
            } : null,
            team: teamData.data
          };
        })
      );

      return contractsWithData;
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      return [];
    }
  },

  // Update contract status and step
  async updateContractStatus(contractId: string, status: string, step: string) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status,
          current_step: step,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating contract status:', error);
      throw error;
    }
  },

  // Add message to contract discussion
  async addContractMessage(contractId: string, senderId: string, content: string, messageType: string = 'discussion', relatedField?: string) {
    try {
      // Validate inputs
      if (!contractId || !content) {
        throw new Error('Contract ID and content are required');
      }

      // If senderId is invalid, use null for system messages
      let validSenderId = senderId;
      if (senderId && !isValidUUID(senderId)) {
        console.warn('Invalid sender ID provided, using null for system message');
        validSenderId = null;
      }

      const { data, error } = await supabase
        .from('contract_messages')
        .insert({
          contract_id: contractId,
          sender_id: validSenderId,
          content,
          message_type: messageType,
          related_field: relatedField,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting contract message:', error);
        // Return a fallback message object
        return {
          id: `temp-${Date.now()}`,
          contract_id: contractId,
          sender_id: senderId,
          content,
          message_type: messageType,
          related_field: relatedField,
          created_at: new Date().toISOString(),
          sender_profile: {
            full_name: 'Unknown User',
            user_type: 'unknown'
          }
        };
      }

      // Get sender profile data separately (only if senderId is valid)
      let profileData = null;
      if (validSenderId) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, user_type')
          .eq('id', validSenderId)
          .single();
        profileData = data;
      }

      return {
        ...data,
        sender_profile: profileData || { full_name: 'System', user_type: 'system' }
      };
    } catch (error) {
      console.error('Error adding contract message:', error);
      // Return a fallback message object
      return {
        id: `temp-${Date.now()}`,
        contract_id: contractId,
        sender_id: senderId,
        content,
        message_type: messageType,
        related_field: relatedField,
        created_at: new Date().toISOString(),
        sender_profile: {
          full_name: 'Unknown User',
          user_type: 'unknown'
        }
      };
    }
  },

  // Get contract messages
  async getContractMessages(contractId: string) {
    try {
      const { data, error } = await supabase
        .from('contract_messages')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching contract messages:', error);
        return []; // Return empty array if table doesn't exist
      }

      // Get sender profiles for all messages
      const messagesWithProfiles = await Promise.all(
        data.map(async (message) => {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, user_type')
              .eq('id', message.sender_id)
              .single();

            return {
              ...message,
              sender_profile: profileData || { full_name: 'Unknown User', user_type: 'unknown' }
            };
          } catch (profileError) {
            console.error('Error fetching profile for message:', profileError);
            return {
              ...message,
              sender_profile: { full_name: 'Unknown User', user_type: 'unknown' }
            };
          }
        })
      );

      return messagesWithProfiles;
    } catch (error) {
      console.error('Error fetching contract messages:', error);
      return []; // Return empty array on error
    }
  },

  // Handle contract action (approve, reject, etc.)
  async handleContractAction(actionData: ContractAction): Promise<ContractActionResult> {
    try {
      let newStatus: 'draft' | 'sent' | 'under_review' | 'negotiating' | 'finalized' | 'completed' | 'rejected' | 'withdrawn' = 'draft';
      let newStep: 'draft' | 'sent' | 'review' | 'negotiation' | 'finalization' | 'completion' | 'rejected' | 'withdrawn' = 'draft';

      // Convert legacy actions to new status
      const legacyActionMap: Record<string, { 
        status: 'draft' | 'sent' | 'under_review' | 'negotiating' | 'finalized' | 'completed' | 'rejected' | 'withdrawn', 
        step: 'draft' | 'sent' | 'review' | 'negotiation' | 'finalization' | 'completion' | 'rejected' | 'withdrawn' 
      }> = {
        'approve': { status: 'finalized', step: 'finalization' },
        'reject': { status: 'rejected', step: 'rejected' },
        'request-changes': { status: 'negotiating', step: 'negotiation' },
        'finalize': { status: 'completed', step: 'completion' },
        'complete': { status: 'completed', step: 'completion' }
      };

      if (legacyActionMap[actionData.action]) {
        newStatus = legacyActionMap[actionData.action].status;
        newStep = legacyActionMap[actionData.action].step;
      } else {
        // This is redundant with the mapping above, remove duplicate logic
      }

      // Update contract status
      await this.updateContractStatus(actionData.contractId, newStatus, newStep);

      // Add action message
      await this.addContractMessage(
        actionData.contractId,
        actionData.userId,
        `Contract ${actionData.action.replace('-', ' ')}${actionData.details ? `: ${actionData.details}` : ''}`,
        'action',
        actionData.action
      );

      return { success: true, newStatus, newStep, message: `Contract ${actionData.action.replace('-', ' ')}` };
    } catch (error) {
      console.error('Error handling contract action:', error);
      throw error;
    }
  },

  // Handle role-specific contract actions
  async handleRoleSpecificAction(action: RoleSpecificContractAction): Promise<ContractActionResult> {
    try {
      let newStatus: ContractActionResult['newStatus'] = 'draft';
      let newStep: ContractActionResult['newStep'] = 'draft';
      let actionMessage = '';

      // Determine new status based on action
      switch (action.action) {
        case 'accept-offer':
          newStatus = 'finalized';
          newStep = 'finalization';
          actionMessage = 'Agent accepted the contract offer';
          break;
        case 'negotiate-terms':
          newStatus = 'negotiating';
          newStep = 'negotiation';
          actionMessage = 'Agent requested term negotiations';
          break;
        case 'reject-offer':
          newStatus = 'rejected';
          newStep = 'rejected';
          actionMessage = 'Agent rejected the contract offer';
          break;
        case 'submit-counter-proposal':
          newStatus = 'negotiating';
          newStep = 'negotiation';
          actionMessage = 'Agent submitted a counter-proposal';
          break;
        case 'counter-offer':
          newStatus = 'negotiating';
          newStep = 'negotiation';
          actionMessage = 'Team sent a counter-offer';
          break;
        case 'accept-agent-terms':
          newStatus = 'finalized';
          newStep = 'finalization';
          actionMessage = 'Team accepted agent terms';
          break;
        case 'withdraw-offer':
          newStatus = 'withdrawn';
          newStep = 'withdrawn';
          actionMessage = 'Team withdrew the contract offer';
          break;
        case 'finalize-deal':
          newStatus = 'finalized';
          newStep = 'finalization';
          actionMessage = 'Deal finalized - ready for completion';
          break;
        case 'complete-transfer':
          newStatus = 'completed';
          newStep = 'completion';
          actionMessage = 'Transfer completed successfully';
          break;
        default:
          throw new Error(`Unknown action: ${action.action}`);
      }

      // Update contract in database
      const updateData: any = {
        status: newStatus,
        deal_stage: (['contract_signing', 'payment_pending', 'completed'].includes(newStep)) ? 'signed' : newStep,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add custom terms if provided
      if (action.customTerms) {
        updateData.terms = action.customTerms;
        updateData.contract_value = action.customTerms.contractValue || updateData.contract_value;
      }

      const { error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', action.contractId);

      if (error) throw error;

      // Add action message
      await this.addContractMessage(
        action.contractId,
        action.userId,
        actionMessage + (action.details ? ` - ${action.details}` : ''),
        'action'
      );

      return {
        success: true,
        newStatus,
        newStep,
        message: actionMessage
      };
    } catch (error) {
      console.error('Error handling role-specific contract action:', error);
      throw error;
    }
  },

  // Complete player transfer
  async completeTransfer(contractId: string, pitchId: string) {
    try {
      // Update player status to transferred
      const { error: playerError } = await supabase
        .from('players')
        .update({ status: 'transferred' })
        .eq('id', pitchId);

      if (playerError) throw playerError;

      // Update pitch status to completed
      const { error: pitchError } = await supabase
        .from('transfer_pitches')
        .update({ status: 'completed' })
        .eq('id', pitchId);

      if (pitchError) throw pitchError;

      // Update contract status
      await this.updateContractStatus(contractId, 'completed', 'completed');

      return { success: true };
    } catch (error) {
      console.error('Error completing transfer:', error);
      throw error;
    }
  },

  // Upload contract document
  async uploadContractDocument(contractId: string, file: File) {
    try {
      const fileName = `contract-${contractId}-${Date.now()}.pdf`;
      
      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Update contract with document URL
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          document_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (updateError) throw updateError;

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading contract document:', error);
      throw error;
    }
  },

  // Generate contract preview
  async generateContractPreview(contractData: any) {
    try {
      // Ensure we have valid contract values
      const contractValue = contractData.contract_value || 0;
      const currency = contractData.currency || 'USD';

      if (contractData.transfer_type === 'permanent') {
        const contractDataForPreview: PermanentTransferContract = {
          playerName: contractData.pitch?.player?.full_name || 'Player Name',
          playerPosition: contractData.pitch?.player?.position || 'Position',
          playerNationality: contractData.pitch?.player?.citizenship || 'Nationality',
          teamName: contractData.team?.team_name || 'Acquiring Club',
          teamCountry: contractData.team?.country || 'Country',
          contractDate: new Date().toISOString().split('T')[0],
          transferFee: contractValue,
          currency: currency,
          contractDuration: '3 years',
          playerSalary: {
            annual: contractValue * 0.1,
            monthly: (contractValue * 0.1) / 12,
            weekly: (contractValue * 0.1) / 52
          },
          signOnBonus: contractValue * 0.05,
          performanceBonus: {
            appearance: 10000,
            goal: 5000,
            assist: 3000,
            cleanSheet: 2000,
            teamSuccess: 50000
          },
          relocationSupport: {
            housing: 50000,
            transportation: 20000,
            familySupport: 30000,
            languageTraining: 10000
          },
          medicalInsurance: true,
          imageRights: {
            percentage: 50,
            terms: 'Standard image rights agreement'
          },
          releaseClause: contractValue * 1.5,
          sellOnPercentage: 20,
          buybackClause: {
            active: false,
            amount: 0,
            duration: ''
          }
        };

        return await contractService.generatePermanentTransferContract(contractDataForPreview);
      } else {
        // Loan transfer contract
        const contractDataForPreview: LoanTransferContract = {
          playerName: contractData.pitch?.player?.full_name || 'Player Name',
          playerPosition: contractData.pitch?.player?.position || 'Position',
          playerNationality: contractData.pitch?.player?.citizenship || 'Nationality',
          parentClub: contractData.team?.team_name || 'Parent Club',
          loanClub: contractData.team?.team_name || 'Loan Club',
          contractDate: new Date().toISOString().split('T')[0],
          currency: currency,
          loanDuration: '1 year',
          loanType: 'with-options',
          loanFee: {
            base: contractValue,
            withOptions: contractValue * 1.2,
            withoutOptions: contractValue * 0.8,
            withObligations: contractValue * 1.5
          },
          salaryCoverage: {
            parentClub: 50,
            loanClub: 50,
            percentage: 100
          },
          appearanceClause: 20,
          goalBonus: 5000,
          assistBonus: 3000,
          promotionBonus: 25000,
          purchaseOption: {
            active: true,
            amount: contractValue * 1.2,
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
        };

        return await contractService.generateLoanTransferContract(contractDataForPreview);
      }
    } catch (error) {
      console.error('Error generating contract preview:', error);
      // Return a simple fallback HTML instead of throwing
      return `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2>Contract Preview</h2>
          <p>Contract preview could not be generated due to missing data.</p>
          <p>Please ensure all contract details are properly filled.</p>
        </div>
      `;
    }
  }
};
