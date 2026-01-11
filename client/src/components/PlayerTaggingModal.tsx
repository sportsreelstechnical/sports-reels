import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, MapPin, DollarSign } from 'lucide-react';

interface PitchedPlayer {
    id: string;
    player_id: string;
    player_name: string;
    player_position: string;
    player_citizenship: string;
    asking_price: number;
    currency: string;
    team_name: string;
    team_country: string;
    transfer_type: string;
    expires_at: string;
}

interface PlayerTaggingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTagPlayers: (playerIds: string[]) => void;
    currentlyTagged: string[];
}

export const PlayerTaggingModal: React.FC<PlayerTaggingModalProps> = ({
    isOpen,
    onClose,
    onTagPlayers,
    currentlyTagged
}) => {
    const { toast } = useToast();
    const [pitchedPlayers, setPitchedPlayers] = useState<PitchedPlayer[]>([]);
    const [filteredPlayers, setFilteredPlayers] = useState<PitchedPlayer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>(currentlyTagged);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPitchedPlayers();
            setSelectedPlayers(currentlyTagged);
        }
    }, [isOpen, currentlyTagged]);

    useEffect(() => {
        filterPlayers();
    }, [pitchedPlayers, searchTerm]);

    const fetchPitchedPlayers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transfer_pitches')
                .select(`
          id,
          player_id,
          asking_price,
          currency,
          transfer_type,
          expires_at,
          players!transfer_pitches_player_id_fkey(
            full_name,
            position,
            citizenship
          ),
          teams(
            team_name,
            country
          )
        `)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            const transformedData = (data || []).map((pitch: any) => ({
                id: pitch.id,
                player_id: pitch.player_id,
                player_name: pitch.players?.full_name || '',
                player_position: pitch.players?.position || '',
                player_citizenship: pitch.players?.citizenship || '',
                asking_price: pitch.asking_price || 0,
                currency: pitch.currency || 'USD',
                team_name: pitch.teams?.team_name || '',
                team_country: pitch.teams?.country || '',
                transfer_type: pitch.transfer_type,
                expires_at: pitch.expires_at
            }));

            setPitchedPlayers(transformedData);
        } catch (error) {
            console.error('Error fetching pitched players:', error);
            toast({
                title: "Error",
                description: "Failed to load pitched players",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const filterPlayers = () => {
        let filtered = [...pitchedPlayers];

        if (searchTerm) {
            filtered = filtered.filter(player =>
                player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                player.player_position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                player.team_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredPlayers(filtered);
    };

    const togglePlayerSelection = (playerId: string) => {
        setSelectedPlayers(prev => {
            if (prev.includes(playerId)) {
                return prev.filter(id => id !== playerId);
            } else {
                return [...prev, playerId];
            }
        });
    };

    const handleSave = () => {
        onTagPlayers(selectedPlayers);
        onClose();
    };

    const isPlayerSelected = (playerId: string) => selectedPlayers.includes(playerId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Tag Pitched Players</DialogTitle>
                    <p className="text-sm text-gray-500">
                        Select players from the transfer timeline to tag in your request
                    </p>
                </DialogHeader>

                <div className="flex flex-col h-full space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search players by name, position, or team..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
                        </span>
                        {selectedPlayers.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPlayers([])}
                            >
                                Clear All
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rosegold mx-auto"></div>
                                <p className="text-gray-500 mt-2">Loading players...</p>
                            </div>
                        ) : filteredPlayers.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No pitched players found</p>
                            </div>
                        ) : (
                            filteredPlayers.map((player) => (
                                <Card
                                    key={player.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${isPlayerSelected(player.player_id)
                                        ? 'ring-2 ring-rosegold bg-rosegold/5'
                                        : ''
                                        }`}
                                    onClick={() => togglePlayerSelection(player.player_id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-white">
                                                        {player.player_name}
                                                    </h3>
                                                    {isPlayerSelected(player.player_id) && (
                                                        <Badge variant="default" className="bg-rosegold">
                                                            Selected
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {player.player_position}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {player.player_citizenship}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" />
                                                        {player.asking_price?.toLocaleString()} {player.currency}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {player.team_name}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {player.transfer_type}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="ml-4">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isPlayerSelected(player.player_id)
                                                    ? 'bg-rosegold border-rosegold'
                                                    : 'border-gray-300'
                                                    }`}>
                                                    {isPlayerSelected(player.player_id) && (
                                                        <div className="w-2 h-2 bg-white rounded-sm"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-rosegold hover:bg-rosegold/90"
                        >
                            Tag {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PlayerTaggingModal; 