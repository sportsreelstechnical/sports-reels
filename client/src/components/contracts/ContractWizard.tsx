
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { enhancedContractService, ContractTemplate } from '@/domains/contracts/services/enhancedContractService';
import { ChevronLeft, ChevronRight, FileText, Users, DollarSign, Calendar, CheckCircle } from 'lucide-react';

interface ContractWizardProps {
  pitchId?: string;
  onComplete?: (contractId: string) => void;
  onCancel?: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const ContractWizard: React.FC<ContractWizardProps> = ({ pitchId, onComplete, onCancel }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [formData, setFormData] = useState({
    // Template Selection
    template_id: '',
    template_type: 'permanent',
    language_code: 'en',
    
    // Contract Details
    contract_type: 'transfer',
    priority_level: 'medium',
    duration: '',
    effective_date: '',
    response_deadline: '',
    
    // Financial Terms
    transfer_fee: '',
    annual_salary: '',
    sign_on_bonus: '',
    performance_bonus: '',
    relocation_support: '',
    currency: 'USD',
    
    // Parties Information
    team_name: '',
    team_address: '',
    team_representative: '',
    player_name: '',
    player_dob: '',
    player_nationality: '',
    player_passport: '',
    
    // Legal Terms
    governing_law: 'International Football Law',
    dispute_resolution: 'FIFA DRC',
    image_rights: '',
    
    // Additional Terms
    medical_requirements: '',
    disciplinary_clauses: '',
    termination_conditions: '',
    special_clauses: ''
  });

  useEffect(() => {
    loadTemplates();
    if (pitchId) {
      loadPitchData();
    }
  }, [pitchId]);

  const loadTemplates = async () => {
    try {
      const data = await enhancedContractService.getContractTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load contract templates",
        variant: "destructive"
      });
    }
  };

  const loadPitchData = async () => {
    // Load pitch data to pre-populate form
    // This would fetch from the transfer_pitches table
    console.log('Loading pitch data for:', pitchId);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Template Selection
        return formData.template_id !== '';
      case 1: // Contract Details
        return formData.duration !== '' && formData.effective_date !== '';
      case 2: // Financial Terms
        return formData.currency !== '';
      case 3: // Parties Information
        return formData.team_name !== '' && formData.player_name !== '';
      case 4: // Legal Terms
        return formData.governing_law !== '';
      case 5: // Review & Create
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before continuing",
        variant: "destructive"
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const createContract = async () => {
    setLoading(true);
    try {
      let contractId: string;
      
      if (pitchId) {
        contractId = await enhancedContractService.createContractFromPitch(pitchId, formData);
      } else {
        // Create standalone contract
        const contractHTML = await enhancedContractService.generateContractFromTemplate(
          formData.template_id,
          formData
        );
        
        // Save contract (implement this method)
        const contractData = {
          ...formData,
          terms: formData,
          contract_html: contractHTML,
          status: 'draft',
          deal_stage: 'draft'
        };
        
        // This would need to be implemented in the service
        contractId = 'new-contract-id'; // Placeholder
      }

      toast({
        title: "Success",
        description: "Contract created successfully!"
      });

      onComplete?.(contractId);
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Step Components
  const TemplateSelectionStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="template_type">Contract Type</Label>
        <Select value={formData.template_type} onValueChange={(value) => updateFormData('template_type', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select contract type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="permanent">Permanent Transfer</SelectItem>
            <SelectItem value="loan">Loan Agreement</SelectItem>
            <SelectItem value="renewal">Contract Renewal</SelectItem>
            <SelectItem value="pre_contract">Pre-Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="template_id">Choose Template</Label>
        <div className="grid gap-3 mt-2">
          {templates
            .filter(t => t.template_type === formData.template_type)
            .map(template => (
            <Card 
              key={template.id} 
              className={`cursor-pointer transition-colors ${
                formData.template_id === template.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => updateFormData('template_id', template.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{template.template_type} • {template.language_code.toUpperCase()}</p>
                  </div>
                  {formData.template_id === template.id && <CheckCircle className="w-5 h-5 text-blue-500" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="language_code">Language</Label>
        <Select value={formData.language_code} onValueChange={(value) => updateFormData('language_code', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const ContractDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Contract Duration *</Label>
          <Input
            id="duration"
            placeholder="e.g., 2 years, 18 months"
            value={formData.duration}
            onChange={(e) => updateFormData('duration', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="priority_level">Priority Level</Label>
          <Select value={formData.priority_level} onValueChange={(value) => updateFormData('priority_level', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="effective_date">Effective Date *</Label>
          <Input
            id="effective_date"
            type="date"
            value={formData.effective_date}
            onChange={(e) => updateFormData('effective_date', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="response_deadline">Response Deadline</Label>
          <Input
            id="response_deadline"
            type="date"
            value={formData.response_deadline}
            onChange={(e) => updateFormData('response_deadline', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const FinancialTermsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">Currency *</Label>
          <Select value={formData.currency} onValueChange={(value) => updateFormData('currency', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="transfer_fee">Transfer Fee</Label>
          <Input
            id="transfer_fee"
            type="number"
            placeholder="0"
            value={formData.transfer_fee}
            onChange={(e) => updateFormData('transfer_fee', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="annual_salary">Annual Salary</Label>
          <Input
            id="annual_salary"
            type="number"
            placeholder="0"
            value={formData.annual_salary}
            onChange={(e) => updateFormData('annual_salary', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sign_on_bonus">Sign-on Bonus</Label>
          <Input
            id="sign_on_bonus"
            type="number"
            placeholder="0"
            value={formData.sign_on_bonus}
            onChange={(e) => updateFormData('sign_on_bonus', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="performance_bonus">Performance Bonus</Label>
          <Input
            id="performance_bonus"
            type="number"
            placeholder="0"
            value={formData.performance_bonus}
            onChange={(e) => updateFormData('performance_bonus', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="relocation_support">Relocation Support</Label>
          <Input
            id="relocation_support"
            type="number"
            placeholder="0"
            value={formData.relocation_support}
            onChange={(e) => updateFormData('relocation_support', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const PartiesInformationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Team Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="team_name">Team Name *</Label>
            <Input
              id="team_name"
              value={formData.team_name}
              onChange={(e) => updateFormData('team_name', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="team_representative">Team Representative</Label>
            <Input
              id="team_representative"
              value={formData.team_representative}
              onChange={(e) => updateFormData('team_representative', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <Label htmlFor="team_address">Team Address</Label>
          <Textarea
            id="team_address"
            value={formData.team_address}
            onChange={(e) => updateFormData('team_address', e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-3">Player Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="player_name">Player Name *</Label>
            <Input
              id="player_name"
              value={formData.player_name}
              onChange={(e) => updateFormData('player_name', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="player_dob">Date of Birth</Label>
            <Input
              id="player_dob"
              type="date"
              value={formData.player_dob}
              onChange={(e) => updateFormData('player_dob', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label htmlFor="player_nationality">Nationality</Label>
            <Input
              id="player_nationality"
              value={formData.player_nationality}
              onChange={(e) => updateFormData('player_nationality', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="player_passport">Passport/ID Number</Label>
            <Input
              id="player_passport"
              value={formData.player_passport}
              onChange={(e) => updateFormData('player_passport', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const LegalTermsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="governing_law">Governing Law *</Label>
          <Input
            id="governing_law"
            value={formData.governing_law}
            onChange={(e) => updateFormData('governing_law', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dispute_resolution">Dispute Resolution</Label>
          <Input
            id="dispute_resolution"
            value={formData.dispute_resolution}
            onChange={(e) => updateFormData('dispute_resolution', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image_rights">Image Rights Clause</Label>
        <Textarea
          id="image_rights"
          placeholder="Specify image rights arrangements..."
          value={formData.image_rights}
          onChange={(e) => updateFormData('image_rights', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="medical_requirements">Medical Requirements</Label>
        <Textarea
          id="medical_requirements"
          placeholder="Medical examination and fitness requirements..."
          value={formData.medical_requirements}
          onChange={(e) => updateFormData('medical_requirements', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="special_clauses">Special Clauses</Label>
        <Textarea
          id="special_clauses"
          placeholder="Any special conditions or clauses..."
          value={formData.special_clauses}
          onChange={(e) => updateFormData('special_clauses', e.target.value)}
        />
      </div>
    </div>
  );

  const ReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold">Review Contract Details</h3>
        <p className="text-gray-600">Please review all information before creating the contract</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contract Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Type:</span>
              <span className="text-sm capitalize">{formData.template_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Duration:</span>
              <span className="text-sm">{formData.duration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Priority:</span>
              <Badge variant="outline" className="text-xs">{formData.priority_level}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Transfer Fee:</span>
              <span className="text-sm">{formData.transfer_fee || '0'} {formData.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Annual Salary:</span>
              <span className="text-sm">{formData.annual_salary || '0'} {formData.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sign-on Bonus:</span>
              <span className="text-sm">{formData.sign_on_bonus || '0'} {formData.currency}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Contract will be created in draft status</li>
          <li>• You can make further edits before sending</li>
          <li>• All parties will be notified when contract is sent</li>
          <li>• Digital signatures can be collected through the platform</li>
        </ul>
      </div>
    </div>
  );

  const steps: WizardStep[] = [
    {
      id: 'template',
      title: 'Template Selection',
      icon: <FileText className="w-5 h-5" />,
      component: <TemplateSelectionStep />
    },
    {
      id: 'details',
      title: 'Contract Details',
      icon: <Calendar className="w-5 h-5" />,
      component: <ContractDetailsStep />
    },
    {
      id: 'financial',
      title: 'Financial Terms',
      icon: <DollarSign className="w-5 h-5" />,
      component: <FinancialTermsStep />
    },
    {
      id: 'parties',
      title: 'Parties Information',
      icon: <Users className="w-5 h-5" />,
      component: <PartiesInformationStep />
    },
    {
      id: 'legal',
      title: 'Legal Terms',
      icon: <FileText className="w-5 h-5" />,
      component: <LegalTermsStep />
    },
    {
      id: 'review',
      title: 'Review & Create',
      icon: <CheckCircle className="w-5 h-5" />,
      component: <ReviewStep />
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Contract</CardTitle>
          <div className="mt-4">
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
            <div className="flex justify-between mt-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-20">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              {steps[currentStep].icon}
              {steps[currentStep].title}
            </h2>
            {steps[currentStep].component}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? onCancel : prevStep}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Button>

            <Button
              onClick={currentStep === steps.length - 1 ? createContract : nextStep}
              disabled={loading || !validateStep(currentStep)}
            >
              {currentStep === steps.length - 1 ? (
                loading ? 'Creating...' : 'Create Contract'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractWizard;
