
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Link, Check, X, Globe } from 'lucide-react';

interface FifaPlayer {
  id: string;
  name: string;
  nationality: string;
  position: string;
  club: string;
  age: number;
  marketValue?: number;
}

interface FifaIdIntegrationProps {
  playerId: string;
  currentFifaId?: string;
  playerName: string;
  onFifaIdUpdate: (fifaId: string) => void;
}

const FifaIdIntegration: React.FC<FifaIdIntegrationProps> = ({
  playerId,
  currentFifaId,
  playerName,
  onFifaIdUpdate
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(playerName);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FifaPlayer[]>([]);
  const [manualFifaId, setManualFifaId] = useState(currentFifaId || '');

  // Mock FIFA database search (in real implementation, this would call FIFA's API)
  const searchFifaDatabase = async (query: string): Promise<FifaPlayer[]> => {
    // This is a mock implementation. In a real application, you would:
    // 1. Call FIFA's official API
    // 2. Or use a third-party service that provides FIFA player data
    // 3. Handle authentication and rate limiting
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock results based on search query
        const mockResults: FifaPlayer[] = [
          {
            id: `fifa_${Math.random().toString(36).substr(2, 9)}`,
            name: query,
            nationality: "England",
            position: "Forward",
            club: "Manchester United",
            age: 25,
            marketValue: 50000000
          },
          {
            id: `fifa_${Math.random().toString(36).substr(2, 9)}`,
            name: `${query} Jr.`,
            nationality: "Brazil",
            position: "Midfielder",
            club: "Real Madrid",
            age: 22,
            marketValue: 35000000
          }
        ].filter(player => 
          player.name.toLowerCase().includes(query.toLowerCase())
        );
        
        resolve(mockResults);
      }, 1000);
    });
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a player name to search.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const results = await searchFifaDatabase(searchTerm);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No Results",
          description: "No players found in FIFA database. Try a different search term.",
        });
      }
    } catch (error) {
      console.error('FIFA search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search FIFA database. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkFifaId = async (fifaPlayer: FifaPlayer) => {
    try {
      // In a real implementation, you would:
      // 1. Verify the FIFA ID is valid
      // 2. Update the player record in your database
      // 3. Potentially sync additional data from FIFA
      
      onFifaIdUpdate(fifaPlayer.id);
      
      toast({
        title: "FIFA ID Linked",
        description: `Successfully linked to FIFA player: ${fifaPlayer.name}`,
      });
      
      setSearchResults([]);
    } catch (error) {
      console.error('Error linking FIFA ID:', error);
      toast({
        title: "Link Failed",
        description: "Failed to link FIFA ID. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleManualFifaId = () => {
    if (!manualFifaId.trim()) {
      toast({
        title: "Invalid FIFA ID",
        description: "Please enter a valid FIFA ID.",
        variant: "destructive"
      });
      return;
    }

    onFifaIdUpdate(manualFifaId.trim());
    toast({
      title: "FIFA ID Added",
      description: "FIFA ID has been manually added to player profile.",
    });
  };

  const removeFifaId = () => {
    onFifaIdUpdate('');
    setManualFifaId('');
    toast({
      title: "FIFA ID Removed",
      description: "FIFA ID has been removed from player profile.",
    });
  };

  return (
    <Card className="w-full bg-[#1a1a1a] border-rosegold/20">
      <CardHeader>
        <CardTitle className="text-white font-polysans text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-rosegold" />
          FIFA ID Integration
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Connect player to FIFA database for enhanced profile data
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current FIFA ID Status */}
        {currentFifaId && (
          <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">FIFA ID Connected</p>
                <p className="text-gray-400 text-sm">ID: {currentFifaId}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeFifaId}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        )}

        {/* Search FIFA Database */}
        <div className="space-y-4">
          <h4 className="text-white font-polysans">Search FIFA Database</h4>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="fifa-search" className="sr-only">
                Search FIFA Database
              </Label>
              <Input
                id="fifa-search"
                type="text"
                placeholder="Search for player in FIFA database..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="bg-rosegold hover:bg-rosegold/90 text-black"
            >
              <Search className="w-4 h-4 mr-1" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-white font-medium">Search Results</h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((fifaPlayer) => (
                  <div
                    key={fifaPlayer.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{fifaPlayer.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {fifaPlayer.position}
                        </Badge>
                      </div>
                      <div className="text-gray-400 text-sm">
                        <span>{fifaPlayer.club}</span>
                        <span className="mx-2">•</span>
                        <span>{fifaPlayer.nationality}</span>
                        <span className="mx-2">•</span>
                        <span>Age {fifaPlayer.age}</span>
                      </div>
                      {fifaPlayer.marketValue && (
                        <div className="text-rosegold text-sm font-medium mt-1">
                          Market Value: ${fifaPlayer.marketValue.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleLinkFifaId(fifaPlayer)}
                      className="bg-rosegold hover:bg-rosegold/90 text-black"
                    >
                      <Link className="w-4 h-4 mr-1" />
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual FIFA ID Entry */}
        <div className="space-y-4">
          <h4 className="text-white font-polysans">Manual FIFA ID Entry</h4>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="manual-fifa-id" className="sr-only">
                Manual FIFA ID
              </Label>
              <Input
                id="manual-fifa-id"
                type="text"
                placeholder="Enter FIFA ID manually (e.g., 158023)"
                value={manualFifaId}
                onChange={(e) => setManualFifaId(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <Button
              type="button"
              onClick={handleManualFifaId}
              variant="outline"
            >
              Add FIFA ID
            </Button>
          </div>
          <p className="text-gray-400 text-xs">
            If you know the player's FIFA ID, you can enter it manually here.
          </p>
        </div>

        {/* FIFA Integration Info */}
        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h5 className="text-blue-400 font-medium mb-2">FIFA Integration Benefits</h5>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Official player verification</li>
            <li>• Access to comprehensive player statistics</li>
            <li>• Enhanced transfer pitch credibility</li>
            <li>• Automatic market value updates</li>
            <li>• International recognition</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default FifaIdIntegration;
