
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSquadAvailability } from '@/hooks/useSquadAvailability';
import { Users, Edit, Save, X, DollarSign } from 'lucide-react';

const SquadAvailabilityManager = () => {
  const { toast } = useToast();
  const { availability, loading, updatePlayerAvailability } = useSquadAvailability();
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const handleEditPlayer = (playerAvailability: any) => {
    setEditingPlayer(playerAvailability.id);
    setEditData({
      available_for_transfer: playerAvailability.available_for_transfer,
      transfer_type: playerAvailability.transfer_type || [],
      asking_price: playerAvailability.asking_price || '',
      currency: playerAvailability.currency || 'USD',
      notes: playerAvailability.notes || ''
    });
  };

  const handleSaveChanges = async () => {
    if (!editingPlayer) return;

    const success = await updatePlayerAvailability(editingPlayer, {
      available_for_transfer: editData.available_for_transfer,
      transfer_type: editData.transfer_type,
      asking_price: editData.asking_price ? Number(editData.asking_price) : null,
      currency: editData.currency,
      notes: editData.notes
    });

    if (success) {
      setEditingPlayer(null);
      setEditData({});
    }
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditData({});
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAvailabilityBadgeColor = (available: boolean) => {
    return available ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
  };

  if (loading) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-black rounded w-1/3"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-black rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          Squad Availability Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availability.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Players Available
            </h3>
            <p className="text-black">
              Add players to your squad to manage their transfer availability.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {availability.map((playerAvailability) => (
              <Card key={playerAvailability.id} className="border-gray-600">
                <CardContent className="p-4">
                  {editingPlayer === playerAvailability.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">
                          {playerAvailability.player.full_name}
                        </h3>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700">
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="border-gray-600">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editData.available_for_transfer}
                            onCheckedChange={(checked) => setEditData(prev => ({ ...prev, available_for_transfer: checked }))}
                          />
                          <span className="text-sm text-white">Available for Transfer</span>
                        </div>
                        
                        <div>
                          <label className="text-sm text-white block mb-1">Transfer Type</label>
                          <Select 
                            value={editData.transfer_type.join(',')} 
                            onValueChange={(value) => setEditData(prev => ({ ...prev, transfer_type: value.split(',').filter(Boolean) }))}
                          >
                            <SelectTrigger className="bg-black border-gray-600 text-white">
                              <SelectValue placeholder="Select transfer type" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-gray-600">
                              <SelectItem value="permanent" className="text-white hover:bg-gray-700">Permanent</SelectItem>
                              <SelectItem value="loan" className="text-white hover:bg-gray-700">Loan</SelectItem>
                              <SelectItem value="permanent,loan" className="text-white hover:bg-gray-700">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-sm text-white block mb-1">Asking Price</label>
                          <Input
                            type="number"
                            value={editData.asking_price}
                            onChange={(e) => setEditData(prev => ({ ...prev, asking_price: e.target.value }))}
                            placeholder="Enter asking price"
                            className="bg-black border-gray-600 text-white"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm text-white block mb-1">Currency</label>
                          <Select 
                            value={editData.currency} 
                            onValueChange={(value) => setEditData(prev => ({ ...prev, currency: value }))}
                          >
                            <SelectTrigger className="bg-black border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-gray-600">
                              <SelectItem value="USD" className="text-white hover:bg-gray-700">USD</SelectItem>
                              <SelectItem value="GBP" className="text-white hover:bg-gray-700">GBP</SelectItem>
                              <SelectItem value="EUR" className="text-white hover:bg-gray-700">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-white block mb-1">Notes</label>
                        <Input
                          value={editData.notes}
                          onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add any notes about availability"
                          className="bg-black border-gray-600 text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">
                            {playerAvailability.player.full_name}
                          </h3>
                          <p className="text-sm text-black">
                            {playerAvailability.player.position} • Market Value: {formatCurrency(playerAvailability.player.market_value, 'USD')}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEditPlayer(playerAvailability)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getAvailabilityBadgeColor(playerAvailability.available_for_transfer)}>
                          {playerAvailability.available_for_transfer ? 'Available' : 'Not Available'}
                        </Badge>
                        {playerAvailability.transfer_type.length > 0 && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {playerAvailability.transfer_type.join(', ')}
                          </Badge>
                        )}
                        {playerAvailability.asking_price && (
                          <Badge variant="outline" className="text-rosegold border-rosegold">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {formatCurrency(playerAvailability.asking_price, playerAvailability.currency)}
                          </Badge>
                        )}
                      </div>
                      
                      {playerAvailability.notes && (
                        <p className="text-sm text-black italic">
                          "{playerAvailability.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SquadAvailabilityManager;
