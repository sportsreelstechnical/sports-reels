
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ContractWorkflowService } from '@/domains/contracts/services/contractWorkflowService';
import { ContractGenerationModal } from '@/components/ContractGenerationModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Send, 
  Eye, 
  Heart,
  MessageCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { TransferPitch } from '@/types/tranfer';

interface TransferTimelineActionsProps {
  pitch: TransferPitch;
  onAction?: (action: string) => void;
}

const TransferTimelineActions: React.FC<TransferTimelineActionsProps> = ({
  pitch,
  onAction
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showContractModal, setShowContractModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContractGeneration = async (contractHtml: string) => {
    try {
      setLoading(true);
      
      // Initialize contract from pitch with all required parameters
      const contractId = await ContractWorkflowService.initializeContractFromPitch(
        pitch.id, 
        'transfer',
        { template_content: contractHtml }
      );

      if (contractId) {
        toast({
          title: "Success",
          description: "Contract has been generated and is ready to send to agent"
        });

        setShowContractModal(false);
        onAction?.('contract_created');
      } else {
        throw new Error('Failed to create contract');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "Error",
        description: "Failed to generate contract",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShortlist = async () => {
    if (!profile?.id || profile.user_type !== 'agent') return;

    try {
      setLoading(true);
      // Add to agent shortlist logic would go here
      toast({
        title: "Success",
        description: `${pitch.players.full_name} added to your shortlist`
      });
      onAction?.('shortlisted');
    } catch (error) {
      console.error('Error shortlisting:', error);
      toast({
        title: "Error",
        description: "Failed to add to shortlist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const status = pitch.status;
    const dealStage = pitch.deal_stage || 'active';

    let color = 'bg-gray-500';
    let text = status;

    switch (status) {
      case 'active':
        color = 'bg-green-500';
        text = 'Active';
        break;
      case 'expired':
        color = 'bg-red-500';
        text = 'Expired';
        break;
      case 'completed':
        color = 'bg-blue-500';
        text = 'Completed';
        break;
    }

    if (dealStage === 'contract_negotiation') {
      color = 'bg-orange-500';
      text = 'In Contract';
    } else if (dealStage === 'completed') {
      color = 'bg-emerald-500';
      text = 'Finalized';
    }

    return <Badge className={`${color} text-white`}>{text}</Badge>;
  };

  const showTeamActions = profile?.user_type === 'team' && pitch.status === 'active';
  const showAgentActions = profile?.user_type === 'agent' && pitch.status === 'active';
  const isContractPhase = pitch.deal_stage === 'contract_negotiation';

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        {getStatusBadge()}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isContractPhase && (
            <>
              <FileText className="w-4 h-4" />
              <span>Contract Phase</span>
            </>
          )}
        </div>
      </div>

      {/* Team Actions */}
      {showTeamActions && !isContractPhase && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowContractModal(true)}
            className="bg-rosegold hover:bg-rosegold/90"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Contract
          </Button>
        </div>
      )}

      {/* Agent Actions */}
      {showAgentActions && (
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleShortlist}
            disabled={loading}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Heart className="w-4 h-4 mr-2" />
            Shortlist
          </Button>
          
          <Button variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Message Team
          </Button>
          
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Analyze Player
          </Button>
        </div>
      )}

      {/* Contract Phase Indicator */}
      {isContractPhase && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium text-orange-900">Contract in Progress</h4>
          </div>
          <p className="text-orange-700 text-sm">
            A contract has been generated for this player. Check your messages for contract details.
          </p>
          {pitch.contract_finalized && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-700 text-sm font-medium">Contract Finalized</span>
            </div>
          )}
        </div>
      )}

      {/* Contract Generation Modal */}
      <ContractGenerationModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        pitchId={pitch.id}
        playerName={pitch.players.full_name}
        teamName={pitch.teams.team_name}
        onContractGenerated={handleContractGeneration}
      />
    </div>
  );
};

export default TransferTimelineActions;
