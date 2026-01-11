
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { contractService } from '@/domains/contracts/services/contractService';
import { FileText, Download, Send } from 'lucide-react';

interface ContractGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchId?: string;
  playerName: string;
  teamName: string;
  onContractGenerated?: (contractHtml: string, contractUrl?: string) => void;
}

export const ContractGenerationModal: React.FC<ContractGenerationModalProps> = ({
  isOpen,
  onClose,
  pitchId,
  playerName,
  teamName,
  onContractGenerated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contractData, setContractData] = useState({
    transferType: 'permanent' as 'permanent' | 'loan',
    duration: '2 years',
    salary: 0,
    signOnBonus: 0,
    performanceBonus: 0,
    relocationSupport: 0,
    askingPrice: 0,
    loanFee: 0,
    currency: 'USD',
    additionalTerms: ''
  });
  const [generatedContract, setGeneratedContract] = useState<string | null>(null);
  const [contractStep, setContractStep] = useState<'form' | 'preview'>('form');

  const handleInputChange = (field: string, value: any) => {
    setContractData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateContract = async () => {
    if (!pitchId) {
      toast({
        title: "Error",
        description: "Pitch information is required to generate contract",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const contractHtml = await contractService.generateContract({
        pitchId,
        playerName,
        teamName,
        transferType: contractData.transferType,
        askingPrice: contractData.transferType === 'permanent' ? contractData.askingPrice : undefined,
        loanFee: contractData.transferType === 'loan' ? contractData.loanFee : undefined,
        currency: contractData.currency,
        contractDetails: {
          duration: contractData.duration,
          salary: contractData.salary,
          signOnBonus: contractData.signOnBonus,
          performanceBonus: contractData.performanceBonus,
          relocationSupport: contractData.relocationSupport
        }
      });

      setGeneratedContract(contractHtml);
      setContractStep('preview');

      toast({
        title: "Contract Generated",
        description: "Contract has been generated successfully. Please review before sending.",
      });
    } catch (error) {
      console.error('Contract generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate contract. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadContract = async () => {
    if (!generatedContract) return;

    try {
      const fileName = `${playerName}_${teamName}_Contract_${new Date().toISOString().split('T')[0]}.html`;
      await contractService.downloadContract(generatedContract, fileName);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download contract",
        variant: "destructive"
      });
    }
  };

  const previewContract = async () => {
    if (!generatedContract) return;

    try {
      await contractService.previewContract(generatedContract);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Failed",
        description: "Failed to open contract preview",
        variant: "destructive"
      });
    }
  };

  const sendContract = async () => {
    if (!generatedContract || !onContractGenerated) return;

    try {
      await onContractGenerated(generatedContract);
      onClose();
      setContractStep('form');
      setGeneratedContract(null);
    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send contract",
        variant: "destructive"
      });
    }
  };

  const goBackToForm = () => {
    setContractStep('form');
    setGeneratedContract(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rosegold" />
            Generate Contract - {playerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {contractStep === 'form' ? (
            <>
              {/* Transfer Type */}
              <div className="space-y-2">
                <Label>Transfer Type</Label>
                <Select
                  value={contractData.transferType}
                  onValueChange={(value) => handleInputChange('transferType', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="permanent">Permanent Transfer</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Financial Terms */}
                {contractData.transferType === 'permanent' ? (
                  <div className="space-y-2">
                    <Label>Transfer Fee</Label>
                    <Input
                      type="number"
                      value={contractData.askingPrice}
                      onChange={(e) => handleInputChange('askingPrice', parseFloat(e.target.value) || 0)}
                      className="bg-gray-800 border-gray-600"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Loan Fee</Label>
                    <Input
                      type="number"
                      value={contractData.loanFee}
                      onChange={(e) => handleInputChange('loanFee', parseFloat(e.target.value) || 0)}
                      className="bg-gray-800 border-gray-600"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={contractData.currency}
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contract Duration</Label>
                  <Input
                    value={contractData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="bg-gray-800 border-gray-600"
                    placeholder="e.g., 2 years"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly Salary</Label>
                  <Input
                    type="number"
                    value={contractData.salary}
                    onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sign-on Bonus</Label>
                  <Input
                    type="number"
                    value={contractData.signOnBonus}
                    onChange={(e) => handleInputChange('signOnBonus', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Performance Bonus</Label>
                  <Input
                    type="number"
                    value={contractData.performanceBonus}
                    onChange={(e) => handleInputChange('performanceBonus', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
              </div>

              {/* Additional Terms */}
              <div className="space-y-2">
                <Label>Additional Terms</Label>
                <Textarea
                  value={contractData.additionalTerms}
                  onChange={(e) => handleInputChange('additionalTerms', e.target.value)}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Any additional contract terms or conditions..."
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <Button
                  onClick={generateContract}
                  disabled={loading}
                  className="flex-1 bg-rosegold hover:bg-rosegold/90"
                >
                  {loading ? 'Generating...' : 'Generate Contract'}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Preview Step */}
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-rosegold" />
                <h3 className="text-xl font-polysans font-semibold text-white mb-2">
                  Contract Generated Successfully!
                </h3>
                <p className="text-gray-400 font-poppins mb-6">
                  Please review your contract before sending it to the recipient.
                </p>

                <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Contract Summary</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <p><strong>Player:</strong> {playerName}</p>
                      <p><strong>Team:</strong> {teamName}</p>
                      <p><strong>Type:</strong> {contractData.transferType === 'permanent' ? 'Permanent Transfer' : 'Loan'}</p>
                      <p><strong>Duration:</strong> {contractData.duration}</p>
                      <p><strong>Salary:</strong> {contractData.currency} {contractData.salary.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-700">
                  <Button
                    onClick={goBackToForm}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Back to Edit
                  </Button>

                  <Button
                    onClick={previewContract}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                  >
                    Preview Contract
                  </Button>

                  <Button
                    onClick={downloadContract}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>

                  <Button
                    onClick={sendContract}
                    className="bg-rosegold hover:bg-rosegold/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Contract
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
