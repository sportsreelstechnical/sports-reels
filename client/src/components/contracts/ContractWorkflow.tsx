
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ContractWorkflowService, ContractWorkflowStep } from '@/domains/contracts/services/contractWorkflowService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Send, 
  Download, 
  Upload, 
  Check, 
  X, 
  Edit,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ContractWorkflowProps {
  contractId: string;
  pitchId?: string;
  onWorkflowUpdate?: () => void;
}

const ContractWorkflow: React.FC<ContractWorkflowProps> = ({
  contractId,
  pitchId,
  onWorkflowUpdate
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [workflowSteps, setWorkflowSteps] = useState<ContractWorkflowStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (contractId) {
      loadWorkflowSteps();
    }
  }, [contractId]);

  const loadWorkflowSteps = async () => {
    try {
      const steps = await ContractWorkflowService.getWorkflowSteps(contractId);
      setWorkflowSteps(steps);
    } catch (error) {
      console.error('Error loading workflow steps:', error);
    }
  };

  const handleAgentReview = async (action: 'accept' | 'modify' | 'reject') => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const approved = action === 'accept';
      await ContractWorkflowService.agentReviewContract(
        contractId, 
        profile.id, 
        approved,
        reviewNotes || undefined
      );
      
      setReviewNotes('');
      await loadWorkflowSteps();
      onWorkflowUpdate?.();
      
      toast({
        title: "Success",
        description: `Contract ${action}ed successfully`
      });
    } catch (error) {
      console.error('Error in agent review:', error);
      toast({
        title: "Error",
        description: "Failed to process contract review",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const signatureType = profile.user_type === 'team' ? 'team' : 'agent';
      await ContractWorkflowService.signContract(contractId, profile.id, signatureType);
      
      await loadWorkflowSteps();
      onWorkflowUpdate?.();
      
      toast({
        title: "Success",
        description: "Contract signed successfully"
      });
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: "Failed to sign contract",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepType: ContractWorkflowStep['step_type']) => {
    switch (stepType) {
      case 'draft_created': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'sent_to_agent': return <Send className="w-4 h-4 text-orange-600" />;
      case 'agent_reviewed': return <Check className="w-4 h-4 text-green-600" />;
      case 'agent_modified': return <Edit className="w-4 h-4 text-yellow-600" />;
      case 'signed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'finalized': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStepTitle = (stepType: ContractWorkflowStep['step_type']) => {
    switch (stepType) {
      case 'draft_created': return 'Contract Draft Created';
      case 'sent_to_agent': return 'Sent to Agent';
      case 'agent_reviewed': return 'Agent Reviewed';
      case 'agent_modified': return 'Agent Requested Modifications';
      case 'signed': return 'Contract Signed';
      case 'finalized': return 'Contract Finalized';
      default: return 'Unknown Step';
    }
  };

  const currentStep = workflowSteps[workflowSteps.length - 1];
  const canAgentReview = profile?.user_type === 'agent' && currentStep?.step_type === 'sent_to_agent';
  const canSign = currentStep?.step_type === 'agent_reviewed' || currentStep?.step_type === 'agent_modified';

  return (
    <div className="space-y-4">
      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Contract Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowSteps.length > 0 ? (
              workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step.step_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{getStepTitle(step.step_type)}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(step.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {step.notes && (
                      <p className="text-sm text-gray-600 mt-1">{step.notes}</p>
                    )}
                    {index < workflowSteps.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-200 ml-2 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-6">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No workflow steps yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Review Actions */}
      {canAgentReview && (
        <Card>
          <CardHeader>
            <CardTitle>Review Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Add your review notes (optional)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAgentReview('accept')}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button
                  onClick={() => handleAgentReview('modify')}
                  disabled={loading}
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  onClick={() => handleAgentReview('reject')}
                  disabled={loading}
                  variant="destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Actions */}
      {canSign && (
        <Card>
          <CardHeader>
            <CardTitle>Sign Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Ready to Sign</h4>
                </div>
                <p className="text-blue-700 text-sm">
                  By signing this contract, you agree to all terms and conditions. 
                  This action cannot be undone.
                </p>
              </div>
              <Button
                onClick={handleSignContract}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? 'Signing...' : 'Sign Contract'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractWorkflow;
