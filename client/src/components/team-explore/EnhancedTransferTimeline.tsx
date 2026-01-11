
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Edit, Trash2, Calendar, DollarSign, MapPin, Users, Eye, FileText } from 'lucide-react';
import MessageModal from '../MessageModal';
import { useContractNotifications } from '@/domains/contracts/hooks/useContractNotifications';
import EditPitchModal from './EditPitchModal';

interface TransferPitch {
  id: string;
  transfer_type: string;
  asking_price: number;
  currency: string;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  expires_at: string;
  created_at: string;
  view_count: number;
  message_count: number;
  description?: string;
  players: {
    id: string;
    full_name: string;
    position: string;
    citizenship: string;
    market_value: number;
  };
  teams: {
    id: string;
    team_name: string;
    country: string;
    profile_id: string;
  };
}

interface EnhancedTransferTimelineProps {
  userType: 'team' | 'agent';
}

const EnhancedTransferTimeline: React.FC<EnhancedTransferTimelineProps> = ({ userType }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pitches, setPitches] = useState<TransferPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPitch, setSelectedPitch] = useState<TransferPitch | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [editingPitch, setEditingPitch] = useState<string | null>(null);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPitchForEdit, setSelectedPitchForEdit] = useState<TransferPitch | null>(null);
  const [showTransferred, setShowTransferred] = useState(true);

  // Enable contract notifications
  useContractNotifications();

  const fetchPitches = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('transfer_pitches')
        .select(`
          *,
          players:players!transfer_pitches_player_id_fkey(
            id,
            full_name,
            position,
            citizenship,
            market_value
          ),
          teams:teams(
            id,
            team_name,
            country,
            profile_id
          )
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // For teams, show only their own pitches
      if (userType === 'team' && profile?.user_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('id')
          .eq('profile_id', profile.user_id)
          .single();

        if (teamData) {
          query = query.eq('team_id', teamData.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setPitches(data || []);
    } catch (error) {
      console.error('Error fetching pitches:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer pitches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePitch = async (pitchId: string) => {
    if (!confirm('Are you sure you want to delete this pitch? This action cannot be undone.')) return;

    try {
      // First, check if there are any active contracts or messages for this pitch
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('pitch_id', pitchId)
        .neq('status', 'cancelled');

      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('pitch_id', pitchId);

      if (contracts && contracts.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "This pitch has active contracts and cannot be deleted. Consider marking it as cancelled instead.",
          variant: "destructive"
        });
        return;
      }

      // If there are messages, we'll keep the pitch but mark it as cancelled
      // If no messages, we can safely delete it
      if (messages && messages.length > 0) {
        // Mark as cancelled to preserve message history
        const { error } = await supabase
          .from('transfer_pitches')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', pitchId);

        if (error) throw error;

        setPitches(prev => prev.map(p => 
          p.id === pitchId ? { ...p, status: 'cancelled' } : p
        ));

        toast({
          title: "Success",
          description: "Transfer pitch cancelled successfully (preserved due to message history)",
        });
      } else {
        // Safe to delete completely
        const { error } = await supabase
          .from('transfer_pitches')
          .delete()
          .eq('id', pitchId);

        if (error) throw error;

        setPitches(prev => prev.filter(p => p.id !== pitchId));
        toast({
          title: "Success",
          description: "Transfer pitch deleted successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting pitch:', error);
      toast({
        title: "Error",
        description: "Failed to delete transfer pitch",
        variant: "destructive"
      });
    }
  };

  const handleEditPitch = async (pitchId: string, updates: {
    description?: string;
    asking_price?: number;
    status?: 'active' | 'expired' | 'completed' | 'cancelled';
  }) => {
    try {
      const { error } = await supabase
        .from('transfer_pitches')
        .update(updates)
        .eq('id', pitchId);

      if (error) throw error;

      setPitches(prev => prev.map(p => 
        p.id === pitchId ? { ...p, ...updates } : p
      ));
      
      setEditingPitch(null);
      toast({
        title: "Success",  
        description: "Transfer pitch updated successfully",
      });
    } catch (error) {
      console.error('Error updating pitch:', error);
      toast({
        title: "Error",
        description: "Failed to update transfer pitch",
        variant: "destructive"
      });
    }
  };

  const handleMessageClick = (pitch: TransferPitch) => {
    setSelectedPitch(pitch);
    setShowMessageModal(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'expired': return 'bg-red-600';
      case 'completed': return 'bg-blue-600';
      case 'transferred': return 'bg-red-700'; // Red for transferred players
      default: return 'bg-gray-600';
    }
  };

  useEffect(() => {
    fetchPitches();
  }, [userType, profile]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-gray-700">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-16 bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-polysans font-bold text-white">
            {userType === 'team' ? 'My Transfer Pitches' : 'Available Transfer Pitches'}
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant={showTransferred ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTransferred(!showTransferred)}
              className={`text-xs ${
                showTransferred 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'border-red-500 text-red-400 hover:bg-red-600 hover:text-white'
              }`}
            >
              {showTransferred ? 'Hide' : 'Show'} Transferred
            </Button>
            <Badge variant="outline" className="text-white border-white">
              {pitches.filter(p => showTransferred || p.players.status !== 'transferred').length} 
              {showTransferred ? 'Total' : 'Active'} Pitches
            </Badge>
          </div>
        </div>

        {pitches.length === 0 ? (
          <Card className="border-gray-700">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Transfer Pitches
              </h3>
              <p className="text-gray-400">
                {userType === 'team' 
                  ? "You haven't created any transfer pitches yet."
                  : "No active transfer pitches available at the moment."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pitches
              .filter(pitch => showTransferred || pitch.players.status !== 'transferred')
              .map((pitch) => {
              const daysLeft = getDaysUntilExpiry(pitch.expires_at);
              const isOwner = userType === 'team' && pitch.teams.profile_id === profile?.user_id;
              const isPlayerTransferred = pitch.players.status === 'transferred';
              
              return (
                <Card key={pitch.id} className={`border-gray-700 transition-colors relative ${
                  isPlayerTransferred 
                    ? 'bg-red-900/20 border-red-500/30 opacity-75' 
                    : 'bg-gray-800/50 hover:bg-gray-800/70'
                }`}>
                  {isPlayerTransferred && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                        TRANSFERRED
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-xl text-white font-polysans">
                          {pitch.players.full_name}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {pitch.players.position} • {pitch.players.citizenship}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Market Value: {formatCurrency(pitch.players.market_value, pitch.currency)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isPlayerTransferred ? (
                          <Badge className="bg-red-600 text-white border-red-500">
                            TRANSFERRED
                          </Badge>
                        ) : (
                          <Badge className={`${getStatusColor(pitch.status)} text-white`}>
                            {pitch.status.toUpperCase()}
                          </Badge>
                        )}
                        {daysLeft <= 7 && (
                          <Badge variant="destructive">
                            {daysLeft} days left
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">Transfer Type</div>
                        <div className="text-white font-semibold capitalize">
                          {pitch.transfer_type.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">Asking Price</div>
                        <div className="text-rosegold font-bold text-lg">
                          {formatCurrency(pitch.asking_price, pitch.currency)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">Team</div>
                        <div className="text-white font-semibold">
                          {pitch.teams.team_name} ({pitch.teams.country})
                        </div>
                      </div>
                    </div>

                    {pitch.description && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">Description</div>
                        <div className="text-white text-sm">
                          {editingPitch === pitch.id ? (
                            <div className="space-y-2">
                              <textarea
                                className="w-full p-2 rounded bg-gray-700 text-white"
                                defaultValue={pitch.description}
                                rows={3}
                                onBlur={(e) => {
                                  if (e.target.value !== pitch.description) {
                                    handleEditPitch(pitch.id, { description: e.target.value });
                                  }
                                }}
                              />
                              <Button 
                                size="sm" 
                                onClick={() => setEditingPitch(null)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            pitch.description
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {pitch.view_count} views
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {pitch.message_count} messages
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created {formatDate(pitch.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {userType === 'agent' && !isPlayerTransferred && (
                          <Button
                            onClick={() => handleMessageClick(pitch)}
                            size="sm"
                            className="bg-rosegold hover:bg-rosegold/90"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Express Interest
                          </Button>
                        )}
                        
                        {isPlayerTransferred && (
                          <div className="text-center py-2">
                            <Badge className="bg-red-600 text-white px-3 py-1">
                              Player Already Transferred
                            </Badge>
                          </div>
                        )}
                        
                        {isOwner && (
                          <>
                            <Button
                              onClick={() => handleMessageClick(pitch)}
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Messages
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPitchForEdit(pitch);
                                setShowEditModal(true);
                              }}
                              className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePitch(pitch.id)}
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Modal with Contract Integration */}
      {selectedPitch && (
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedPitch(null);
          }}
          pitchId={selectedPitch.id}
          playerId={selectedPitch.players.id}
          teamId={selectedPitch.teams.id}
          receiverId={selectedPitch.teams.profile_id}
          currentUserId={profile?.user_id || ''}
          playerName={selectedPitch.players.full_name}
          teamName={selectedPitch.teams.team_name}
        />
      )}

      {/* Edit Pitch Modal */}
      {showEditModal && selectedPitchForEdit && (
        <EditPitchModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPitchForEdit(null);
          }}
          pitch={selectedPitchForEdit}
          onPitchUpdated={fetchPitches}
        />
      )}
    </>
  );
};

export default EnhancedTransferTimeline;
