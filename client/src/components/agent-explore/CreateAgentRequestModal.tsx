import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X } from 'lucide-react';

interface CreateAgentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: () => void;
}

const CreateAgentRequestModal: React.FC<CreateAgentRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestCreated
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    position: '',
    sport_type: 'football',
    transfer_type: 'permanent',
    budget_min: '',
    budget_max: '',
    currency: 'USD'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create requests",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get agent ID first
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (agentError || !agentData) {
        throw new Error('Agent profile not found');
      }

      // Create the request with only the fields that exist in the current schema
      const requestData = {
        title: formData.title,
        description: formData.description,
        position: formData.position || null,
        sport_type: formData.sport_type,
        transfer_type: formData.transfer_type,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        currency: formData.currency
      };

      // Create the request in the database
      console.log('Inserting request data:', {
        ...requestData,
        agent_id: agentData.id,
        is_public: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      const { data: insertedRequest, error: insertError } = await supabase
        .from('agent_requests')
        .insert({
          ...requestData,
          agent_id: agentData.id,
          is_public: true,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log('Request created successfully:', insertedRequest);
      
      toast({
        title: "Request Created",
        description: "Your player request has been posted successfully",
      });
      
      onRequestCreated();
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        position: '',
        sport_type: 'football',
        transfer_type: 'permanent',
        budget_min: '',
        budget_max: '',
        currency: 'USD'
      });
      
    } catch (error) {
      console.error('Error creating request:', error);
      
      let errorMessage = "Failed to create request. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Player Request
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Request Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Looking for Central Midfielder"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (max 550 characters)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="I am looking for [position] for a [league/division/club level] in [country] for a [transfer type] with [passport type]..."
              maxLength={550}
              rows={4}
              required
            />
            <div className="text-xs text-muted-foreground mt-1">
              {formData.description.length}/550 characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="e.g., Central Midfielder"
              />
            </div>

            <div>
              <Label htmlFor="sport_type">Sport Type</Label>
              <Select
                value={formData.sport_type}
                onValueChange={(value) => handleInputChange('sport_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="football">Football</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="baseball">Baseball</SelectItem>
                  <SelectItem value="rugby">Rugby</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transfer_type">Transfer Type</Label>
              <Select
                value={formData.transfer_type}
                onValueChange={(value) => handleInputChange('transfer_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="budget_min">Min Budget</Label>
              <Input
                id="budget_min"
                type="number"
                value={formData.budget_min}
                onChange={(e) => handleInputChange('budget_min', e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="budget_max">Max Budget</Label>
              <Input
                id="budget_max"
                type="number"
                value={formData.budget_max}
                onChange={(e) => handleInputChange('budget_max', e.target.value)}
                placeholder="1000000"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>



          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentRequestModal;
