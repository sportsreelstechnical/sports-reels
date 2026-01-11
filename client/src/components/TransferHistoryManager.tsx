import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft, Plus, Save, Trash2, DollarSign, Calendar } from 'lucide-react';

interface TransferHistory {
  id?: string;
  player_id: string;
  from_club?: string;
  to_club?: string;
  transfer_date: string;
  transfer_value?: number;
  transfer_type: string;
  currency: string;
  notes?: string;
}

interface TransferHistoryManagerProps {
  playerId: string;
  playerName: string;
}

export const TransferHistoryManager: React.FC<TransferHistoryManagerProps> = ({
  playerId,
  playerName
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [newTransfer, setNewTransfer] = useState<TransferHistory>({
    player_id: playerId,
    from_club: '',
    to_club: '',
    transfer_date: '',
    transfer_value: undefined,
    transfer_type: 'permanent',
    currency: 'USD',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTransferHistory();
  }, [playerId]);

  const fetchTransferHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('player_transfer_history')
        .select('*')
        .eq('player_id', playerId)
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      setTransferHistory(data || []);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransfer = async () => {
    if (!newTransfer.transfer_date || !newTransfer.transfer_type) {
      toast({
        title: "Validation Error",
        description: "Transfer date and type are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('player_transfer_history')
        .insert({
          player_id: newTransfer.player_id,
          from_club: newTransfer.from_club || null,
          to_club: newTransfer.to_club || null,
          transfer_date: newTransfer.transfer_date,
          transfer_value: newTransfer.transfer_value || null,
          transfer_type: newTransfer.transfer_type,
          currency: newTransfer.currency,
          notes: newTransfer.notes || null
        })
        .select()
        .single();

      if (error) throw error;

      setTransferHistory(prev => [data, ...prev]);
      setNewTransfer({
        player_id: playerId,
        from_club: '',
        to_club: '',
        transfer_date: '',
        transfer_value: undefined,
        transfer_type: 'permanent',
        currency: 'USD',
        notes: ''
      });

      toast({
        title: "Success",
        description: "Transfer record added successfully"
      });
    } catch (error) {
      console.error('Error adding transfer record:', error);
      toast({
        title: "Error",
        description: "Failed to add transfer record",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransfer = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('player_transfer_history')
        .delete()
        .eq('id', transferId);

      if (error) throw error;

      setTransferHistory(prev => prev.filter(transfer => transfer.id !== transferId));
      toast({
        title: "Success",
        description: "Transfer record deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting transfer record:', error);
      toast({
        title: "Error",
        description: "Failed to delete transfer record",
        variant: "destructive"
      });
    }
  };

  const getTransferTypeColor = (type: string) => {
    switch (type) {
      case 'permanent':
        return 'bg-green-100 text-green-800';
      case 'loan':
        return 'bg-blue-100 text-blue-800';
      case 'free':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Transfer Record */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Transfer Record for {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_club" className="text-white">From Club</Label>
              <Input
                id="from_club"
                value={newTransfer.from_club}
                onChange={(e) => setNewTransfer(prev => ({ ...prev, from_club: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                placeholder="Previous club name"
              />
            </div>
            <div>
              <Label htmlFor="to_club" className="text-white">To Club</Label>
              <Input
                id="to_club"
                value={newTransfer.to_club}
                onChange={(e) => setNewTransfer(prev => ({ ...prev, to_club: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                placeholder="New club name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="transfer_date" className="text-white">Transfer Date *</Label>
              <Input
                id="transfer_date"
                type="date"
                value={newTransfer.transfer_date}
                onChange={(e) => setNewTransfer(prev => ({ ...prev, transfer_date: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="transfer_type" className="text-white">Transfer Type *</Label>
              <Select
                value={newTransfer.transfer_type}
                onValueChange={(value) => setNewTransfer(prev => ({ ...prev, transfer_type: value }))}
              >
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="free">Free Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency" className="text-white">Currency</Label>
              <Select
                value={newTransfer.currency}
                onValueChange={(value) => setNewTransfer(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="transfer_value" className="text-white">Transfer Value</Label>
            <Input
              id="transfer_value"
              type="number"
              value={newTransfer.transfer_value || ''}
              onChange={(e) => setNewTransfer(prev => ({ ...prev, transfer_value: parseFloat(e.target.value) || undefined }))}
              className="bg-gray-700 text-white border-gray-600"
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-white">Notes</Label>
            <Textarea
              id="notes"
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-gray-700 text-white border-gray-600"
              rows={3}
              placeholder="Additional notes about the transfer..."
            />
          </div>

          <Button
            onClick={handleAddTransfer}
            disabled={saving}
            className="bg-rosegold hover:bg-rosegold/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Adding...' : 'Add Transfer Record'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Transfer History */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transferHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No transfer history recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {transferHistory.map((transfer) => (
                <div key={transfer.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-white">
                          {transfer.from_club && (
                            <>
                              <span className="font-medium">{transfer.from_club}</span>
                              <ArrowRightLeft className="w-4 h-4 text-rosegold" />
                            </>
                          )}
                          <span className="font-medium">{transfer.to_club || 'New Club'}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTransferTypeColor(transfer.transfer_type)}`}>
                          {transfer.transfer_type.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(transfer.transfer_date).toLocaleDateString()}
                        </div>
                        {transfer.transfer_value && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(transfer.transfer_value, transfer.currency)}
                          </div>
                        )}
                      </div>
                      
                      {transfer.notes && (
                        <p className="text-gray-400 text-sm mt-2">{transfer.notes}</p>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleDeleteTransfer(transfer.id!)}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white ml-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
