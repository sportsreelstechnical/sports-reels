
import { supabase } from '@/integrations/supabase/client';

export interface ContractWorkflowStep {
  id: string;
  contract_id: string;
  step_type: string;
  completed_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface WorkflowContext {
  contractId: string;
  teamId: string;
  agentId: string;
  playerId: string;
  currentUserId: string;
}

export class ContractWorkflowService {
  static async initializeWorkflow(context: WorkflowContext): Promise<boolean> {
    try {
      // Update contract status instead of creating workflow steps
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'draft',
          deal_stage: 'negotiation',
          last_activity: new Date().toISOString()
        })
        .eq('id', context.contractId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to initialize workflow:', error);
      return false;
    }
  }

  static async initializeContractFromPitch(
    pitchId: string,
    contractType: string,
    terms: any
  ): Promise<string | null> {
    try {
      // Get pitch details
      const { data: pitch, error: pitchError } = await supabase
        .from('transfer_pitches')
        .select(`
          *,
          teams (id, profile_id),
          players (id)
        `)
        .eq('id', pitchId)
        .single();

      if (pitchError || !pitch) {
        console.error('Pitch not found:', pitchError);
        return null;
      }

      // Create contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          pitch_id: pitchId,
          team_id: pitch.team_id,
          player_id: pitch.player_id,
          contract_type: contractType,
          terms,
          status: 'draft',
          deal_stage: 'draft',
          created_by: pitch.teams?.profile_id,
          contract_value: pitch.asking_price || null,
          currency: pitch.currency || 'USD'
        })
        .select('id')
        .single();

      if (contractError || !contract) {
        console.error('Failed to create contract:', contractError);
        return null;
      }

      return contract.id;
    } catch (error) {
      console.error('Failed to create contract from pitch:', error);
      return null;
    }
  }

  static async advanceWorkflow(
    contractId: string,
    stepType: string,
    userId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      // Update contract status based on step type
      let newStatus = 'draft';
      let newDealStage = 'negotiation';

      switch (stepType) {
        case 'initial_review':
          newStatus = 'under_review';
          newDealStage = 'review';
          break;
        case 'negotiations':
          newStatus = 'negotiating';
          newDealStage = 'negotiation';
          break;
        case 'final_review':
          newStatus = 'pending_signatures';
          newDealStage = 'finalizing';
          break;
        case 'signatures':
          newStatus = 'signed';
          newDealStage = 'completed';
          break;
        case 'completion':
          newStatus = 'completed';
          newDealStage = 'completed';
          break;
      }

      // Get current contract to increment negotiation rounds
      const { data: currentContract, error: fetchError } = await supabase
        .from('contracts')
        .select('negotiation_rounds')
        .eq('id', contractId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('contracts')
        .update({
          status: newStatus,
          deal_stage: newDealStage,
          last_activity: new Date().toISOString(),
          negotiation_rounds: (currentContract?.negotiation_rounds || 0) + 1
        })
        .eq('id', contractId);

      if (error) throw error;

      // Create a comment to track the workflow step
      await supabase
        .from('contract_comments')
        .insert({
          contract_id: contractId,
          user_id: userId,
          comment: `Workflow step completed: ${stepType}${notes ? ` - ${notes}` : ''}`,
          is_internal: true
        });

      return true;
    } catch (error) {
      console.error('Failed to advance workflow:', error);
      return false;
    }
  }

  static async agentReviewContract(
    contractId: string,
    agentId: string,
    approved: boolean,
    notes?: string
  ): Promise<boolean> {
    try {
      const status = approved ? 'agent_approved' : 'agent_rejected';
      
      const { error } = await supabase
        .from('contracts')
        .update({
          status,
          last_activity: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;

      // Add comment
      await supabase
        .from('contract_comments')
        .insert({
          contract_id: contractId,
          user_id: agentId,
          comment: `Agent ${approved ? 'approved' : 'rejected'} contract${notes ? ` - ${notes}` : ''}`,
          is_internal: true
        });

      return true;
    } catch (error) {
      console.error('Failed to update agent review:', error);
      return false;
    }
  }

  static async signContract(
    contractId: string,
    userId: string,
    signatureType: 'player' | 'team' | 'agent'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'signed',
          deal_stage: 'completed',
          last_activity: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) throw error;

      // Add signature comment
      await supabase
        .from('contract_comments')
        .insert({
          contract_id: contractId,
          user_id: userId,
          comment: `Contract signed by ${signatureType}`,
          is_internal: true
        });

      return true;
    } catch (error) {
      console.error('Failed to sign contract:', error);
      return false;
    }
  }

  static async getWorkflowSteps(contractId: string): Promise<ContractWorkflowStep[]> {
    try {
      const { data: comments, error } = await supabase
        .from('contract_comments')
        .select('*')
        .eq('contract_id', contractId)
        .eq('is_internal', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Convert comments to workflow steps format
      return (comments || []).map(comment => ({
        id: comment.id,
        contract_id: comment.contract_id,
        step_type: comment.comment.includes('approved') ? 'agent_reviewed' : 
                  comment.comment.includes('signed') ? 'signed' : 'step_completed',
        completed_by: comment.user_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        notes: comment.comment
      }));
    } catch (error) {
      console.error('Failed to get workflow steps:', error);
      return [];
    }
  }

  static async getWorkflowStatus(contractId: string): Promise<any> {
    try {
      const { data: contract, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_comments (
            id,
            comment,
            created_at,
            user_id,
            is_internal
          )
        `)
        .eq('id', contractId)
        .single();

      if (error) throw error;

      // Filter internal comments that represent workflow steps
      const workflowSteps = contract?.contract_comments?.filter(
        (comment: any) => comment.is_internal && comment.comment.includes('Workflow step completed')
      ) || [];

      return {
        contract,
        workflowSteps,
        currentStep: contract?.deal_stage || 'draft',
        progress: this.calculateProgress(contract?.status || 'draft')
      };
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return null;
    }
  }

  static calculateProgress(status: string): number {
    const progressMap: { [key: string]: number } = {
      'draft': 10,
      'under_review': 25,
      'negotiating': 50,
      'pending_signatures': 75,
      'signed': 90,
      'completed': 100
    };
    return progressMap[status] || 0;
  }

  static async updateContractTerms(
    contractId: string,
    terms: any,
    userId: string
  ): Promise<boolean> {
    try {
      // Get current contract to increment version
      const { data: currentContract, error: fetchError } = await supabase
        .from('contracts')
        .select('version')
        .eq('id', contractId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('contracts')
        .update({
          terms,
          last_activity: new Date().toISOString(),
          version: (currentContract?.version || 1) + 1
        })
        .eq('id', contractId);

      if (error) throw error;

      // Log the update
      await supabase
        .from('contract_comments')
        .insert({
          contract_id: contractId,
          user_id: userId,
          comment: 'Contract terms updated',
          is_internal: true
        });

      return true;
    } catch (error) {
      console.error('Failed to update contract terms:', error);
      return false;
    }
  }

  static async getActiveContracts(userId: string): Promise<any[]> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return [];

      // Get contracts where user is either team owner or agent
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          teams (
            team_name,
            profile_id
          ),
          agents (
            agency_name,
            profile_id
          ),
          players (
            full_name,
            position
          )
        `)
        .or(`teams.profile_id.eq.${profile.id},agents.profile_id.eq.${profile.id}`)
        .in('status', ['draft', 'under_review', 'negotiating', 'pending_signatures'])
        .order('last_activity', { ascending: false });

      if (error) throw error;
      return contracts || [];
    } catch (error) {
      console.error('Failed to get active contracts:', error);
      return [];
    }
  }

  static async createContractFromPitch(
    pitchId: string,
    contractType: string,
    terms: any
  ): Promise<string | null> {
    return this.initializeContractFromPitch(pitchId, contractType, terms);
  }
}

export default ContractWorkflowService;
