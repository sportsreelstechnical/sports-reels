
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { enhancedContractService } from '@/domains/contracts/services/enhancedContractService';
import {
  CheckCircle,
  Circle,
  Clock,
  FileText,
  Users,
  Eye,
  XCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface ContractStatusTimelineProps {
  contract: any;
  onStageUpdate?: () => void;
}

const ContractStatusTimeline: React.FC<ContractStatusTimelineProps> = ({
  contract,
  onStageUpdate
}) => {
  const { toast } = useToast();

  const stages = [
    {
      id: 'draft',
      title: 'Draft',
      description: 'Contract is being prepared',
      icon: <FileText className="w-4 h-4" />,
      color: 'gray'
    },
    {
      id: 'negotiating',
      title: 'Negotiating',
      description: 'Terms are being discussed',
      icon: <Users className="w-4 h-4" />,
      color: 'blue'
    },
    {
      id: 'under_review',
      title: 'Under Review',
      description: 'Contract is being reviewed',
      icon: <Eye className="w-4 h-4" />,
      color: 'yellow'
    },
    {
      id: 'signed',
      title: 'Signed',
      description: 'Contract has been signed',
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'green'
    },
    {
      id: 'rejected',
      title: 'Rejected',
      description: 'Contract was rejected',
      icon: <XCircle className="w-4 h-4" />,
      color: 'red'
    },
    {
      id: 'expired',
      title: 'Expired',
      description: 'Contract has expired',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'red'
    }
  ];

  const getCurrentStageIndex = () => {
    return stages.findIndex(stage => stage.id === contract.deal_stage);
  };

  const getStageColor = (stage: any, index: number) => {
    const currentIndex = getCurrentStageIndex();
    
    if (stage.id === contract.deal_stage) {
      switch (stage.color) {
        case 'green': return 'bg-green-500 border-green-500 text-white';
        case 'red': return 'bg-red-500 border-red-500 text-white';
        case 'blue': return 'bg-blue-500 border-blue-500 text-white';
        case 'yellow': return 'bg-yellow-500 border-yellow-500 text-white';
        default: return 'bg-gray-500 border-gray-500 text-white';
      }
    } else if (index < currentIndex && contract.deal_stage !== 'rejected' && contract.deal_stage !== 'expired') {
      return 'bg-green-100 border-green-300 text-green-700';
    } else {
      return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  const getNextPossibleStages = () => {
    const currentStage = contract.deal_stage;
    switch (currentStage) {
      case 'draft':
        return ['negotiating', 'rejected'];
      case 'negotiating':
        return ['under_review', 'rejected'];
      case 'under_review':
        return ['signed', 'negotiating', 'rejected'];
      default:
        return [];
    }
  };

  const updateStage = async (newStage: string) => {
    try {
      await enhancedContractService.updateContractStage(contract.id, newStage);
      toast({
        title: "Success",
        description: `Contract stage updated to ${newStage.replace('_', ' ')}`
      });
      onStageUpdate?.();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({
        title: "Error",
        description: "Failed to update contract stage",
        variant: "destructive"
      });
    }
  };

  const nextPossibleStages = getNextPossibleStages();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Contract Progress
          </CardTitle>
          <Badge 
            variant="outline"
            className={`${getStageColor(
              stages.find(s => s.id === contract.deal_stage) || stages[0], 
              getCurrentStageIndex()
            )}`}
          >
            {contract.deal_stage.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Timeline */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div className="space-y-6">
              {stages
                .filter(stage => stage.id !== 'rejected' && stage.id !== 'expired')
                .map((stage, index) => {
                  const isActive = stage.id === contract.deal_stage;
                  const isCompleted = index < getCurrentStageIndex() && 
                    contract.deal_stage !== 'rejected' && 
                    contract.deal_stage !== 'expired';
                  
                  return (
                    <div key={stage.id} className="relative flex items-center">
                      <div className={`
                        relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2
                        ${getStageColor(stage, index)}
                      `}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : stage.icon}
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className={`font-semibold ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                          {stage.title}
                        </h3>
                        <p className="text-sm text-gray-600">{stage.description}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Action Buttons */}
          {nextPossibleStages.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Available Actions:</h4>
              <div className="flex flex-wrap gap-2">
                {nextPossibleStages.map(stage => {
                  const stageInfo = stages.find(s => s.id === stage);
                  if (!stageInfo) return null;

                  return (
                    <Button
                      key={stage}
                      variant="outline"
                      size="sm"
                      onClick={() => updateStage(stage)}
                      className="flex items-center gap-2"
                    >
                      {stageInfo.icon}
                      Move to {stageInfo.title}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contract Details */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Updated:</span>
              <span>{new Date(contract.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Version:</span>
              <span>{contract.version || 1}</span>
            </div>
            {contract.response_deadline && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Response Deadline:</span>
                <span className={
                  new Date(contract.response_deadline) < new Date() 
                    ? 'text-red-600 font-medium' 
                    : 'text-gray-900'
                }>
                  {new Date(contract.response_deadline).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractStatusTimeline;
