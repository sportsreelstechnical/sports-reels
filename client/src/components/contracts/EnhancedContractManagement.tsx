
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { enhancedContractService, EnhancedContract } from '@/domains/contracts/services/enhancedContractService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import ContractWizard from './ContractWizard';
import ContractAnalyticsDashboard from './ContractAnalyticsDashboard';
import ContractCollaboration from './ContractCollaboration';
import ContractStatusTimeline from './ContractStatusTimeline';

import {
  Plus,
  Search,
  Filter,
  FileText,
  BarChart3,
  Users,
  Clock,
  DollarSign,
  Eye,
  Edit,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const EnhancedContractManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<EnhancedContract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<EnhancedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState<EnhancedContract | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'analytics'>('list');
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      loadTeamId();
    }
  }, [profile]);

  useEffect(() => {
    if (teamId) {
      loadContracts();
    }
  }, [teamId]);

  useEffect(() => {
    filterContracts();
  }, [contracts, searchTerm, statusFilter, priorityFilter]);

  const loadTeamId = async () => {
    try {
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (team) {
        setTeamId(team.id);
      }
    } catch (error) {
      console.error('Error loading team ID:', error);
    }
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await enhancedContractService.getEnhancedContracts(teamId || undefined);
      setContracts(data);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContracts = () => {
    let filtered = contracts;

    if (searchTerm) {
      filtered = filtered.filter(contract =>
        contract.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contract_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.deal_stage.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(contract => contract.deal_stage === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(contract => contract.priority_level === priorityFilter);
    }

    setFilteredContracts(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'negotiating': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'signed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const ContractCard: React.FC<{ contract: EnhancedContract }> = ({ contract }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Contract #{contract.id.slice(-6)}</h3>
              <p className="text-sm text-gray-600 capitalize">{contract.contract_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(contract.priority_level)}>
              {contract.priority_level}
            </Badge>
            <Badge className={getStatusColor(contract.deal_stage)}>
              {contract.deal_stage.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Contract Value</p>
            <p className="font-semibold">
              {formatCurrency(contract.contract_value, contract.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Version</p>
            <p className="font-semibold">v{contract.version}</p>
          </div>
        </div>

        {contract.response_deadline && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Response due: {new Date(contract.response_deadline).toLocaleDateString()}
              </span>
              {new Date(contract.response_deadline) < new Date() && (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            {new Date(contract.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedContract(contract)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Handle edit */}}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ContractDetailModal = () => {
    if (!selectedContract) return null;

    return (
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contract #{selectedContract.id.slice(-6)}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contract Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{selectedContract.contract_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(selectedContract.deal_stage)}>
                        {selectedContract.deal_stage.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority:</span>
                      <Badge className={getPriorityColor(selectedContract.priority_level)}>
                        {selectedContract.priority_level}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version:</span>
                      <span className="font-medium">v{selectedContract.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Language:</span>
                      <span className="font-medium">{selectedContract.language_code.toUpperCase()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contract Value:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedContract.contract_value, selectedContract.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span className="font-medium">{selectedContract.currency}</span>
                    </div>
                    {selectedContract.financial_summary && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transfer Fee:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              selectedContract.financial_summary.transfer_fee, 
                              selectedContract.currency
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Annual Salary:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              selectedContract.financial_summary.annual_salary, 
                              selectedContract.currency
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Contract Terms */}
              {selectedContract.terms && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contract Terms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedContract.terms).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">
                            {key.replace('_', ' ')}:
                          </span>
                          <span className="font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline">
              <ContractStatusTimeline 
                contract={selectedContract}
                onStageUpdate={loadContracts}
              />
            </TabsContent>

            <TabsContent value="collaboration">
              <ContractCollaboration
                contractId={selectedContract.id}
                onContractUpdate={loadContracts}
              />
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Contract PDF
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Contract
                    </Button>
                    <Button className="w-full" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      View All Versions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
          <p className="text-gray-600">Manage all your contracts and agreements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveView('analytics')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
          <Button
            variant={activeView === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveView('list')}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Contracts
          </Button>
          <Button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </Button>
        </div>
      </div>

      {activeView === 'analytics' ? (
        <ContractAnalyticsDashboard />
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search contracts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contracts Grid */}
          {filteredContracts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredContracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {contracts.length === 0 ? 'No Contracts Yet' : 'No Matching Contracts'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {contracts.length === 0 
                    ? 'Create your first contract to get started'
                    : 'Try adjusting your search or filters'
                  }
                </p>
                {contracts.length === 0 && (
                  <Button onClick={() => setShowWizard(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Contract
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Contract Wizard Modal */}
      {showWizard && (
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
            <ContractWizard
              onComplete={(contractId) => {
                setShowWizard(false);
                loadContracts();
                toast({
                  title: "Success",
                  description: "Contract created successfully!"
                });
              }}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Contract Detail Modal */}
      <ContractDetailModal />
    </div>
  );
};

export default EnhancedContractManagement;
