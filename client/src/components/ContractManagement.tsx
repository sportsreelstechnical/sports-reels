
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Download, Upload, Send, Eye, Plus, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Contract {
  id: string;
  player_id: string;
  agent_id?: string;
  team_id?: string;
  contract_type: string;
  status: string;
  terms: any;
  template_url?: string;
  signed_contract_url?: string;
  created_at: string;
  updated_at: string;
  players?: {
    full_name: string;
    position: string;
    photo_url?: string;
  };
  agents?: {
    agency_name: string;
  };
  teams?: {
    team_name: string;
    logo_url?: string;
  };
}

const ContractManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [contractType, setContractType] = useState('');
  const [contractTerms, setContractTerms] = useState({
    transfer_fee: '',
    sign_on_bonus: '',
    player_salary: '',
    contract_duration: '',
    performance_bonus: '',
    relocation_support: ''
  });
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    fetchContracts();
    if (profile?.user_type === 'team') {
      fetchTeamPlayers();
    }
  }, [profile]);

  const fetchContracts = async () => {
    if (!profile?.id) return;

    try {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          players(full_name, position, photo_url),
          agents(agency_name),
          teams(team_name, logo_url)
        `);

      if (profile.user_type === 'team') {
        // Get team ID first
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (teamData) {
          query = query.eq('team_id', teamData.id);
        }
      } else if (profile.user_type === 'agent') {
        // Get agent ID first
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', profile.id)
          .single();

        if (agentData) {
          query = query.eq('agent_id', agentData.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async () => {
    if (!profile?.id) return;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (teamData) {
        const { data: playersData, error } = await supabase
          .from('players')
          .select('id, full_name, position, photo_url')
          .eq('team_id', teamData.id);

        if (error) throw error;
        setPlayers(playersData || []);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleCreateContract = async () => {
    if (!profile?.id || !selectedPlayerId || !contractType) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      let teamId = null;
      let agentId = null;

      if (profile.user_type === 'team') {
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        teamId = teamData?.id;
      } else if (profile.user_type === 'agent') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        agentId = agentData?.id;
      }

      const { error } = await supabase
        .from('contracts')
        .insert({
          player_id: selectedPlayerId,
          team_id: teamId,
          agent_id: agentId,
          contract_type: contractType,
          status: 'draft',
          terms: contractTerms
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contract created successfully",
      });

      setShowCreateModal(false);
      setSelectedPlayerId('');
      setContractType('');
      setContractTerms({
        transfer_fee: '',
        sign_on_bonus: '',
        player_salary: '',
        contract_duration: '',
        performance_bonus: '',
        relocation_support: ''
      });
      fetchContracts();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (contractId: string, file: File, type: 'template' | 'signed') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contractId}-${type}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Update contract with file URL
      const updateField = type === 'template' ? 'template_url' : 'signed_contract_url';
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ [updateField]: urlData.publicUrl })
        .eq('id', contractId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `${type === 'template' ? 'Template' : 'Signed contract'} uploaded successfully`,
      });

      fetchContracts();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  const updateContractStatus = async (contractId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status })
        .eq('id', contractId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Contract status updated to ${status}`,
      });

      fetchContracts();
    } catch (error) {
      console.error('Error updating contract:', error);
      toast({
        title: "Error",
        description: "Failed to update contract status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'signed': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white font-polysans">Contract Management</h2>
          <p className="text-gray-400 font-poppins">Manage player contracts and agreements</p>
        </div>

        {profile?.user_type === 'team' && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-rosegold hover:bg-rosegold/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Contract</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Select Player *</Label>
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose player" />
                      </SelectTrigger>
                      <SelectContent>
                        {players.map(player => (
                          <SelectItem key={player.id} value={player.id}>
                            <div className="flex items-center gap-2">
                              <span>{player.full_name}</span>
                              {player.jersey_number && (
                                <Badge className="bg-bright-pink text-white text-xs px-1.5 py-0.5 font-bold">
                                  #{player.jersey_number}
                                </Badge>
                              )}
                              <span className="text-gray-400">- {player.position}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Contract Type *</Label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">Permanent Transfer</SelectItem>
                        <SelectItem value="loan">Loan Transfer</SelectItem>
                        <SelectItem value="pre_contract">Pre-Contract</SelectItem>
                        <SelectItem value="renewal">Contract Renewal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transfer Fee</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={contractTerms.transfer_fee}
                      onChange={(e) => setContractTerms({ ...contractTerms, transfer_fee: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Sign-on Bonus</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={contractTerms.sign_on_bonus}
                      onChange={(e) => setContractTerms({ ...contractTerms, sign_on_bonus: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Player Salary (Monthly)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={contractTerms.player_salary}
                      onChange={(e) => setContractTerms({ ...contractTerms, player_salary: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Contract Duration (Years)</Label>
                    <Input
                      type="number"
                      placeholder="Enter years"
                      value={contractTerms.contract_duration}
                      onChange={(e) => setContractTerms({ ...contractTerms, contract_duration: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateContract} className="w-full">
                  Create Contract
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-2">No Contracts Yet</h3>
            <p className="text-gray-400 mb-6">
              {profile?.user_type === 'team'
                ? 'Create your first contract to manage player agreements'
                : 'Contracts you receive will appear here'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {contracts.map((contract) => (
            <Card key={contract.id} className="border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {contract.players?.photo_url && (
                      <img
                        src={contract.players.photo_url}
                        alt={contract.players.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <CardTitle className="text-white">
                        {contract.players?.full_name}
                      </CardTitle>
                      <p className="text-gray-400 text-sm">
                        {contract.players?.position} • {contract.contract_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(contract.status)}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      {new Date(contract.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Contract Terms */}
                  {contract.terms && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg">
                      {contract.terms.transfer_fee && (
                        <div>
                          <p className="text-xs text-gray-400">Transfer Fee</p>
                          <p className="text-white font-semibold">${contract.terms.transfer_fee}</p>
                        </div>
                      )}
                      {contract.terms.player_salary && (
                        <div>
                          <p className="text-xs text-gray-400">Monthly Salary</p>
                          <p className="text-white font-semibold">${contract.terms.player_salary}</p>
                        </div>
                      )}
                      {contract.terms.contract_duration && (
                        <div>
                          <p className="text-xs text-gray-400">Duration</p>
                          <p className="text-white font-semibold">{contract.terms.contract_duration} years</p>
                        </div>
                      )}
                      {contract.terms.sign_on_bonus && (
                        <div>
                          <p className="text-xs text-gray-400">Sign-on Bonus</p>
                          <p className="text-white font-semibold">${contract.terms.sign_on_bonus}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contract Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {contract.template_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contract.template_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-1" />
                          View Template
                        </a>
                      </Button>
                    )}

                    {contract.signed_contract_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={contract.signed_contract_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-1" />
                          Download Signed
                        </a>
                      </Button>
                    )}

                    {/* File Upload for contracts */}
                    {contract.status === 'draft' && (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          style={{ display: 'none' }}
                          id={`template-${contract.id}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(contract.id, file, 'template');
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`template-${contract.id}`)?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload Template
                        </Button>
                      </div>
                    )}

                    {contract.status === 'sent' && (
                      <>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          style={{ display: 'none' }}
                          id={`signed-${contract.id}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(contract.id, file, 'signed');
                              updateContractStatus(contract.id, 'signed');
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`signed-${contract.id}`)?.click()}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload Signed
                        </Button>
                      </>
                    )}

                    {/* Status Update Buttons */}
                    {contract.status === 'draft' && contract.template_url && (
                      <Button
                        size="sm"
                        onClick={() => updateContractStatus(contract.id, 'sent')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send Contract
                      </Button>
                    )}
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

export default ContractManagement;
