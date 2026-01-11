import { supabase } from '@/integrations/supabase/client';
import { EnhancedNotificationService } from './enhancedNotificationService';

export class SmoothWorkflowService {
  // Handle agent expressing interest with all notifications
  static async handleAgentExpressInterest(data: {
    pitchId: string;
    agentId: string;
    teamProfileId: string;
    playerName: string;
    teamName: string;
    agentName: string;
    message?: string;
    interestType: 'interested' | 'requested';
  }) {
    try {
      console.log('🎯 Handling agent express interest workflow');

      // 1. Create agent interest record
      const { error: interestError } = await supabase
        .from('agent_interest')
        .insert({
          pitch_id: data.pitchId,
          agent_id: data.agentId,
          status: data.interestType,
          message: data.message,
          created_at: new Date().toISOString()
        });

      if (interestError) throw interestError;

      // 2. Get team's user_id for notification
      if (!data.teamProfileId) {
        console.error('❌ No team profile ID provided');
        throw new Error('Team profile ID is required');
      }

      const { data: teamProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', data.teamProfileId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching team profile:', profileError);
        throw profileError;
      }

      if (teamProfile?.user_id) {
        // 3. Create notification for team
        await EnhancedNotificationService.createNotification({
          user_id: teamProfile.user_id,
          title: "🎯 New Agent Interest",
          message: `Agent ${data.agentName} has expressed interest in ${data.playerName}`,
          type: "agent_interest",
          action_url: `/team-explore?tab=communication`,
          action_text: "View Communication",
          metadata: {
            pitch_id: data.pitchId,
            player_name: data.playerName,
            team_name: data.teamName,
            agent_name: data.agentName,
            action: 'expressed_interest'
          }
        });

        console.log('✅ Team notification created for agent interest');
      }

      // 4. Trigger immediate UI updates
      window.dispatchEvent(new CustomEvent('workflowUpdate', {
        detail: {
          type: 'agent_interest_expressed',
          pitchId: data.pitchId,
          teamProfileId: data.teamProfileId,
          playerName: data.playerName,
          agentName: data.agentName
        }
      }));

      return { success: true };
    } catch (error) {
      console.error('❌ Error in agent express interest workflow:', error);
      return { success: false, error };
    }
  }

  // Handle agent cancelling interest
  static async handleAgentCancelInterest(data: {
    interestId: string;
    pitchId: string;
    teamProfileId: string;
    playerName: string;
    agentName: string;
  }) {
    try {
      console.log('🗑️ Handling agent cancel interest workflow');

      // 1. Delete interest record
      const { error } = await supabase
        .from('agent_interest')
        .delete()
        .eq('id', data.interestId);

      if (error) throw error;

      // 2. Get team's user_id for notification
      if (!data.teamProfileId) {
        console.error('❌ No team profile ID provided for cancellation');
        throw new Error('Team profile ID is required');
      }

      const { data: teamProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', data.teamProfileId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching team profile for cancellation:', profileError);
        throw profileError;
      }

      if (teamProfile?.user_id) {
        // 3. Create notification for team
        await EnhancedNotificationService.createNotification({
          user_id: teamProfile.user_id,
          title: "🚫 Interest Cancelled",
          message: `Agent ${data.agentName} has cancelled their interest in ${data.playerName}`,
          type: "agent_interest",
          action_url: `/team-explore?tab=communication`,
          action_text: "View Communication",
          metadata: {
            pitch_id: data.pitchId,
            player_name: data.playerName,
            agent_name: data.agentName,
            action: 'cancelled_interest'
          }
        });

        console.log('✅ Team notification created for cancelled interest');
      }

      // 4. Trigger immediate UI updates
      window.dispatchEvent(new CustomEvent('workflowUpdate', {
        detail: {
          type: 'agent_interest_cancelled',
          pitchId: data.pitchId,
          agentName: data.agentName
        }
      }));

      return { success: true };
    } catch (error) {
      console.error('❌ Error in agent cancel interest workflow:', error);
      return { success: false, error };
    }
  }

  // Handle team starting negotiation
  static async handleTeamStartNegotiation(data: {
    interestId: string;
    agentProfileId: string;
    playerName: string;
    teamName: string;
  }) {
    try {
      console.log('🚀 Handling team start negotiation workflow');

      // 1. Update interest status
      const { error } = await supabase
        .from('agent_interest')
        .update({ 
          status: 'negotiating',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.interestId);

      if (error) throw error;

      // 2. Get agent's user_id for notification
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', data.agentProfileId)
        .single();

      if (agentProfile?.user_id) {
        // 3. Create notification for agent
        await EnhancedNotificationService.createNotification({
          user_id: agentProfile.user_id,
          title: "🚀 Negotiation Started!",
          message: `Team ${data.teamName} is ready to start negotiations for ${data.playerName}`,
          type: "agent_interest",
          action_url: `/agent-explore?tab=communication`,
          action_text: "View Communication",
          metadata: {
            interest_id: data.interestId,
            player_name: data.playerName,
            team_name: data.teamName,
            action: 'negotiation_started'
          }
        });

        console.log('✅ Agent notification created for negotiation start');
      }

      // 4. Trigger immediate UI updates
      window.dispatchEvent(new CustomEvent('workflowUpdate', {
        detail: {
          type: 'team_started_negotiation',
          interestId: data.interestId,
          teamName: data.teamName
        }
      }));

      return { success: true };
    } catch (error) {
      console.error('❌ Error in team start negotiation workflow:', error);
      return { success: false, error };
    }
  }

  // Handle contract creation
  static async handleContractCreation(data: {
    interestId: string;
    agentProfileId: string;
    playerName: string;
    teamName: string;
    contractData: any;
  }) {
    try {
      console.log('📄 Handling contract creation workflow');

      // 1. Create contract (simplified for demo)
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          pitch_id: data.contractData.pitch_id,
          agent_id: data.contractData.agent_id,
          team_id: data.contractData.team_id,
          status: 'draft',
          deal_stage: 'negotiating',
          contract_value: data.contractData.contract_value,
          currency: data.contractData.currency,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // 2. Get agent's user_id for notification
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', data.agentProfileId)
        .single();

      if (agentProfile?.user_id) {
        // 3. Create notification for agent
        await EnhancedNotificationService.createNotification({
          user_id: agentProfile.user_id,
          title: "📄 Contract Created!",
          message: `Team ${data.teamName} has created a contract for ${data.playerName}. You can now enter the negotiation room.`,
          type: "contract_update",
          action_url: `/agent-explore?tab=communication`,
          action_text: "Enter Negotiation Room",
          metadata: {
            contract_id: contract.id,
            player_name: data.playerName,
            team_name: data.teamName,
            action: 'contract_created'
          }
        });

        console.log('✅ Agent notification created for contract creation');
      }

      // 4. Trigger immediate UI updates
      window.dispatchEvent(new CustomEvent('workflowUpdate', {
        detail: {
          type: 'contract_created',
          contractId: contract.id,
          playerName: data.playerName,
          teamName: data.teamName
        }
      }));

      return { success: true, contract };
    } catch (error) {
      console.error('❌ Error in contract creation workflow:', error);
      return { success: false, error };
    }
  }
}
