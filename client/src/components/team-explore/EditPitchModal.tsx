import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Video, DollarSign, Edit, Save, X, AlertCircle, 
  Calendar, MapPin, Building2, Target, FileText 
} from 'lucide-react';

interface EditPitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitch: any;
  onPitchUpdated: () => void;
}

interface EditPitchData {
  asking_price: number;
  currency: string;
  transfer_type: string;
  description: string;
  expires_at: string;
  sign_on_bonus?: number;
  performance_bonus?: number;
  player_salary?: number;
  relocation_support?: number;
  loan_fee?: number;
  loan_with_option: boolean;
  loan_with_obligation: boolean;
}

const EditPitchModal: React.FC<EditPitchModalProps> = ({
  isOpen,
  onClose,
  pitch,
  onPitchUpdated
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const [editData, setEditData] = useState<EditPitchData>({
    asking_price: 0,
    currency: 'USD',
    transfer_type: 'permanent',
    description: '',
    expires_at: '',
    sign_on_bonus: 0,
    performance_bonus: 0,
    player_salary: 0,
    relocation_support: 0,
    loan_fee: 0,
    loan_with_option: false,
    loan_with_obligation: false
  });

  // Load pitch data when modal opens
  useEffect(() => {
    if (pitch && isOpen) {
      setEditData({
        asking_price: pitch.asking_price || 0,
        currency: pitch.currency || 'USD',
        transfer_type: pitch.transfer_type || 'permanent',
        description: pitch.description || '',
        expires_at: pitch.expires_at ? new Date(pitch.expires_at).toISOString().split('T')[0] : '',
        sign_on_bonus: pitch.sign_on_bonus || 0,
        performance_bonus: pitch.performance_bonus || 0,
        player_salary: pitch.player_salary || 0,
        relocation_support: pitch.relocation_support || 0,
        loan_fee: pitch.loan_fee || 0,
        loan_with_option: pitch.loan_with_option || false,
        loan_with_obligation: pitch.loan_with_obligation || false
      });
      setErrors({});
    }
  }, [pitch, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!editData.asking_price || editData.asking_price <= 0) {
      newErrors.asking_price = 'Asking price must be greater than 0';
    }

    if (!editData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (editData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    if (!editData.expires_at) {
      newErrors.expires_at = 'Expiration date is required';
    }

    if (editData.expires_at && new Date(editData.expires_at) <= new Date()) {
      newErrors.expires_at = 'Expiration date must be in the future';
    }

    // Loan-specific validation
    if (editData.transfer_type === 'loan') {
      if (!editData.loan_fee || editData.loan_fee <= 0) {
        newErrors.loan_fee = 'Loan fee must be greater than 0 for loan transfers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transfer_pitches')
        .update({
          asking_price: editData.asking_price,
          currency: editData.currency,
          transfer_type: editData.transfer_type,
          description: editData.description,
          expires_at: editData.expires_at,
          sign_on_bonus: editData.sign_on_bonus,
          performance_bonus: editData.performance_bonus,
          player_salary: editData.player_salary,
          relocation_support: editData.relocation_support,
          loan_fee: editData.loan_fee,
          loan_with_option: editData.loan_with_option,
          loan_with_obligation: editData.loan_with_obligation,
          updated_at: new Date().toISOString()
        })
        .eq('id', pitch.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transfer pitch updated successfully",
      });

      onPitchUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating pitch:', error);
      toast({
        title: "Error",
        description: "Failed to update transfer pitch",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pitch) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Edit className="w-5 h-5 text-rosegold" />
              Edit Transfer Pitch
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Pitch Summary */}
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-4">
              {pitch.players?.photo_url ? (
                <img
                  src={pitch.players.photo_url}
                  alt={pitch.players.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {pitch.players?.full_name}
                </h3>
                <p className="text-gray-400">
                  {pitch.players?.position} • {pitch.players?.citizenship}
                </p>
                <p className="text-sm text-gray-500">
                  {pitch.teams?.team_name} • {pitch.teams?.country}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Asking Price</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={editData.asking_price}
                    onChange={(e) => handleInputChange('asking_price', parseFloat(e.target.value) || 0)}
                    className={`bg-gray-800 border-gray-600 text-white ${errors.asking_price ? 'border-red-500' : ''}`}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                  <Select
                    value={editData.currency}
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger className="w-24 bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.asking_price && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.asking_price}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Transfer Type</label>
                <Select
                  value={editData.transfer_type}
                  onValueChange={(value) => handleInputChange('transfer_type', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Expiration Date</label>
                <Input
                  type="date"
                  value={editData.expires_at}
                  onChange={(e) => handleInputChange('expires_at', e.target.value)}
                  className={`bg-gray-800 border-gray-600 text-white ${errors.expires_at ? 'border-red-500' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.expires_at && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.expires_at}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`bg-gray-800 border-gray-600 text-white resize-none ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Describe the transfer opportunity, requirements, and any special conditions..."
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{editData.description.length}/1000 characters</span>
                  {errors.description && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.description}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Terms */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rosegold" />
                Additional Terms
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Sign-on Bonus</label>
                  <Input
                    type="number"
                    value={editData.sign_on_bonus}
                    onChange={(e) => handleInputChange('sign_on_bonus', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Performance Bonus</label>
                  <Input
                    type="number"
                    value={editData.performance_bonus}
                    onChange={(e) => handleInputChange('performance_bonus', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Player Salary</label>
                  <Input
                    type="number"
                    value={editData.player_salary}
                    onChange={(e) => handleInputChange('player_salary', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Relocation Support</label>
                  <Input
                    type="number"
                    value={editData.relocation_support}
                    onChange={(e) => handleInputChange('relocation_support', parseFloat(e.target.value) || 0)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>

                {editData.transfer_type === 'loan' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Loan Fee</label>
                    <Input
                      type="number"
                      value={editData.loan_fee}
                      onChange={(e) => handleInputChange('loan_fee', parseFloat(e.target.value) || 0)}
                      className={`bg-gray-800 border-gray-600 text-white ${errors.loan_fee ? 'border-red-500' : ''}`}
                      placeholder="0"
                      min="0"
                      step="1000"
                    />
                    {errors.loan_fee && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.loan_fee}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {editData.transfer_type === 'loan' && (
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="loan_with_option"
                      checked={editData.loan_with_option}
                      onChange={(e) => handleInputChange('loan_with_option', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-rosegold focus:ring-rosegold"
                    />
                    <label htmlFor="loan_with_option" className="text-sm text-gray-300">
                      Loan with Option to Buy
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="loan_with_obligation"
                      checked={editData.loan_with_obligation}
                      onChange={(e) => handleInputChange('loan_with_obligation', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-rosegold focus:ring-rosegold"
                    />
                    <label htmlFor="loan_with_obligation" className="text-sm text-gray-300">
                      Loan with Obligation to Buy
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={loading}
                className="bg-rosegold hover:bg-rosegold/90 text-white px-8"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Pitch
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPitchModal;
