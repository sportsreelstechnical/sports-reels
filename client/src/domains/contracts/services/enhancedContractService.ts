import { supabase } from '@/integrations/supabase/client';
import { contractService, ContractData } from './contractService';

export interface EnhancedContract {
  id: string;
  team_id: string;
  agent_id?: string;
  player_id?: string;
  pitch_id?: string;
  contract_type: string;
  status: string;
  deal_stage: string;
  terms: any;
  version: number;
  response_deadline?: string;
  auto_expire_date?: string;
  financial_summary: any;
  compliance_status: any;
  digital_signature_status: any;
  language_code: string;
  priority_level: string;
  contract_value?: number;
  currency: string;
  negotiation_rounds: number;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  template_type: string;
  language_code: string;
  template_content: string;
  is_active: boolean;
  variables: Record<string, string>;
}

export interface ContractComment {
  id: string;
  contract_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
  user?: {
    full_name: string;
  };
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  content: string;
  changes_summary?: string;
  created_by: string;
  created_at: string;
  user?: {
    full_name: string;
  };
}

export interface ContractReminder {
  id: string;
  contract_id: string;
  reminder_type: string;
  reminder_date: string;
  is_sent: boolean;
}

export interface ContractAnalytics {
  total_contracts: number;
  contracts_by_stage: Record<string, number>;
  average_negotiation_time: number;
  success_rate: number;
  total_contract_value: number;
  contracts_by_priority: Record<string, number>;
  recent_activity: any[];
}

export const enhancedContractService = {
  // Template Management
  async getContractTemplates(): Promise<ContractTemplate[]> {
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(template => ({
      id: template.id,
      name: template.name,
      template_type: template.template_type,
      language_code: template.language_code,
      template_content: template.template_content || template.content,
      is_active: template.is_active,
      variables: typeof template.variables === 'string' ? JSON.parse(template.variables) : (template.variables || {})
    }));
  },

  async createContractTemplate(template: Omit<ContractTemplate, 'id' | 'is_active'>): Promise<string> {
    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        name: template.name,
        template_type: template.template_type,
        language_code: template.language_code,
        template_content: template.template_content,
        content: template.template_content, // Ensure both fields are populated
        variables: template.variables,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  },

  // Enhanced Contract Management
  async getEnhancedContracts(teamId?: string): Promise<EnhancedContract[]> {
    let query = supabase
      .from('contracts')
      .select(`
        *,
        teams(team_name),
        players(full_name, position)
      `)
      .order('last_activity', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createContractFromPitch(pitchId: string, additionalData: any): Promise<string> {
    // Get pitch data
    const { data: pitch, error: pitchError } = await supabase
      .from('transfer_pitches')
      .select(`
        *,
        teams(*),
        players!transfer_pitches_player_id_fkey(*)
      `)
      .eq('id', pitchId)
      .single();

    if (pitchError) throw pitchError;

    // Create contract with pitch data
    const contractData = {
      team_id: pitch.team_id,
      player_id: pitch.player_id,
      pitch_id: pitchId,
      contract_type: pitch.transfer_type,
      status: 'draft',
      deal_stage: 'draft',
      terms: {
        transfer_fee: pitch.asking_price,
        salary: pitch.player_salary,
        sign_on_bonus: pitch.sign_on_bonus,
        performance_bonus: pitch.performance_bonus,
        currency: pitch.currency,
        duration: additionalData.duration || '2 years',
        ...additionalData
      },
      financial_summary: {
        total_value: pitch.asking_price + (pitch.player_salary || 0),
        transfer_fee: pitch.asking_price,
        annual_salary: pitch.player_salary,
        currency: pitch.currency
      },
      contract_value: pitch.asking_price,
      currency: pitch.currency,
      language_code: additionalData.language_code || 'en',
      priority_level: additionalData.priority_level || 'medium'
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert(contractData)
      .select()
      .single();

    if (error) throw error;

    // Update pitch to link to contract
    await supabase
      .from('transfer_pitches')
      .update({ deal_stage: 'contract_negotiation' })
      .eq('id', pitchId);

    return data.id;
  },

  async updateContractStage(contractId: string, newStage: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('contracts')
      .update({
        deal_stage: newStage,
        last_activity: new Date().toISOString(),
        ...(newStage === 'signed' && { status: 'signed' }),
        ...(newStage === 'rejected' && { status: 'rejected' })
      })
      .eq('id', contractId);

    if (error) throw error;

    // Add comment if notes provided
    if (notes) {
      await this.addContractComment(contractId, notes, false);
    }
  },

  // Comments Management
  async getContractComments(contractId: string): Promise<ContractComment[]> {
    const { data, error } = await supabase
      .from('contract_comments')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Get user profiles separately to avoid relation issues
    const userIds = [...new Set((data || []).map(comment => comment.user_id).filter(Boolean))];
    let profiles: any[] = [];
    
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profiles = profileData || [];
    }

    return (data || []).map(comment => {
      const userProfile = profiles.find(p => p.id === comment.user_id);
      return {
        id: comment.id,
        contract_id: comment.contract_id || '',
        user_id: comment.user_id || '',
        comment: comment.comment,
        is_internal: comment.is_internal || false,
        created_at: comment.created_at || '',
        user: userProfile ? { full_name: userProfile.full_name || 'Unknown User' } : undefined
      };
    });
  },

  async addContractComment(contractId: string, comment: string, isInternal: boolean = false): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('contract_comments')
      .insert({
        contract_id: contractId,
        user_id: user.user?.id,
        comment,
        is_internal: isInternal
      });

    if (error) throw error;
  },

  // Version Management
  async getContractVersions(contractId: string): Promise<ContractVersion[]> {
    const { data, error } = await supabase
      .from('contract_versions')
      .select('*')
      .eq('contract_id', contractId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    
    // Get user profiles separately to avoid relation issues
    const userIds = [...new Set((data || []).map(version => version.created_by).filter(Boolean))];
    let profiles: any[] = [];
    
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profiles = profileData || [];
    }

    return (data || []).map(version => {
      const userProfile = profiles.find(p => p.id === version.created_by);
      return {
        id: version.id,
        contract_id: version.contract_id || '',
        version_number: version.version_number,
        content: version.content,
        changes_summary: version.changes_summary || undefined,
        created_by: version.created_by || '',
        created_at: version.created_at || '',
        user: userProfile ? { full_name: userProfile.full_name || 'Unknown User' } : undefined
      };
    });
  },

  // Reminders Management
  async createContractReminder(contractId: string, reminderType: string, reminderDate: string): Promise<void> {
    const { error } = await supabase
      .from('contract_reminders')
      .insert({
        contract_id: contractId,
        reminder_type: reminderType,
        reminder_date: reminderDate
      });

    if (error) throw error;
  },

  async getContractReminders(contractId: string): Promise<ContractReminder[]> {
    const { data, error } = await supabase
      .from('contract_reminders')
      .select('*')
      .eq('contract_id', contractId)
      .eq('is_sent', false)
      .order('reminder_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Analytics
  async getContractAnalytics(teamId?: string): Promise<ContractAnalytics> {
    let baseQuery = supabase.from('contracts').select('*');
    
    if (teamId) {
      baseQuery = baseQuery.eq('team_id', teamId);
    }

    const { data: contracts, error } = await baseQuery;
    if (error) throw error;

    const contractsArray = contracts || [];

    // Calculate analytics
    const total_contracts = contractsArray.length;
    
    const contracts_by_stage = contractsArray.reduce((acc, contract) => {
      acc[contract.deal_stage] = (acc[contract.deal_stage] || 0) + 1;
      return acc;
    }, {});

    const contracts_by_priority = contractsArray.reduce((acc, contract) => {
      acc[contract.priority_level] = (acc[contract.priority_level] || 0) + 1;
      return acc;
    }, {});

    const signedContracts = contractsArray.filter(c => c.deal_stage === 'signed');
    const success_rate = total_contracts > 0 ? (signedContracts.length / total_contracts) * 100 : 0;

    const total_contract_value = contractsArray.reduce((sum, contract) => {
      return sum + (contract.contract_value || 0);
    }, 0);

    // Calculate average negotiation time (mock for now)
    const average_negotiation_time = 7; // days

    const recent_activity = contractsArray
      .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
      .slice(0, 5)
      .map(contract => ({
        id: contract.id,
        action: `Contract ${contract.deal_stage}`,
        date: contract.last_activity,
        contract_type: contract.contract_type
      }));

    return {
      total_contracts,
      contracts_by_stage,
      contracts_by_priority,
      success_rate,
      total_contract_value,
      average_negotiation_time,
      recent_activity
    };
  },

  // Generate contract from template
  async generateContractFromTemplate(
    templateId: string, 
    contractData: any, 
    pitchData?: any
  ): Promise<string> {
    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Replace template placeholders with actual data
    let contractHTML = template.content;
    
    const replacements = {
      teamName: contractData.team_name || pitchData?.teams?.team_name || 'Team Name',
      playerName: contractData.player_name || pitchData?.players?.full_name || 'Player Name',
      transferType: contractData.transfer_type || pitchData?.transfer_type || 'Permanent',
      transferFee: contractData.transfer_fee || pitchData?.asking_price || '0',
      currency: contractData.currency || pitchData?.currency || 'USD',
      annualSalary: contractData.annual_salary || pitchData?.player_salary || '0',
      signOnBonus: contractData.sign_on_bonus || pitchData?.sign_on_bonus || '0',
      performanceBonus: contractData.performance_bonus || pitchData?.performance_bonus || '0',
      contractDuration: contractData.duration || '2 years',
      signatureDate: new Date().toLocaleDateString(),
      playerDob: contractData.player_dob || 'TBD',
      playerNationality: contractData.player_nationality || 'TBD',
      teamAddress: contractData.team_address || 'TBD',
      governingLaw: contractData.governing_law || 'International Football Law',
      clubRepresentative: contractData.club_representative || 'Club Representative',
      witnessName: contractData.witness_name || 'Witness',
      // ... more replacements as needed
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      contractHTML = contractHTML.replace(regex, String(value));
    });

    return contractHTML;
  },

  // Compliance checking
  async checkContractCompliance(contractId: string): Promise<any> {
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) throw error;

    const compliance = {
      fifa_regulations: true, // Mock compliance check
      league_rules: true,
      salary_cap: true,
      transfer_window: true,
      documentation: contract.terms ? true : false,
      score: 85 // Overall compliance score
    };

    // Update compliance status
    await supabase
      .from('contracts')
      .update({ compliance_status: compliance })
      .eq('id', contractId);

    return compliance;
  },

  // Bulk operations
  async bulkUpdateContracts(contractIds: string[], updates: any): Promise<void> {
    const { error } = await supabase
      .from('contracts')
      .update(updates)
      .in('id', contractIds);

    if (error) throw error;
  },

  // Search and filter
  async searchContracts(filters: any): Promise<EnhancedContract[]> {
    let query = supabase.from('contracts').select('*');

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.deal_stage) {
      query = query.eq('deal_stage', filters.deal_stage);
    }
    
    if (filters.priority_level) {
      query = query.eq('priority_level', filters.priority_level);
    }
    
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    const { data, error } = await query.order('last_activity', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
