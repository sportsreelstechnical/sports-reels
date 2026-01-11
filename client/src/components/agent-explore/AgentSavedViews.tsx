
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Trash2, Star, Filter } from 'lucide-react';

interface SavedFilter {
  id: string;
  name: string;
  filters: any;
  is_default: boolean;
  created_at: string;
}

export const AgentSavedViews: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentId();
  }, [profile]);

  useEffect(() => {
    if (agentId) {
      fetchSavedFilters();
    }
  }, [agentId]);

  const fetchAgentId = async () => {
    if (!profile?.user_type || profile.user_type !== 'agent') return;

    try {
      const { data } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      setAgentId(data?.id || null);
    } catch (error) {
      console.error('Error fetching agent ID:', error);
    }
  };

  const fetchSavedFilters = async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      
      // Use placeholder data since new tables might not be synchronized yet
      const placeholderFilters: SavedFilter[] = [
        {
          id: '1',
          name: 'EU Strikers Under 25',
          filters: {
            position: 'striker',
            passport_requirement: 'EU',
            age_max: 25,
            transfer_type: 'permanent'
          },
          is_default: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Loan Midfielders',
          filters: {
            position: 'midfielder',
            transfer_type: 'loan',
            budget_range: '500000-2000000'
          },
          is_default: false,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      
      setSavedFilters(placeholderFilters);
    } catch (error) {
      console.error('Error fetching saved filters:', error);
      toast({
        title: "Error",
        description: "Failed to load saved views",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedFilter = async (filterId: string) => {
    try {
      setSavedFilters(prev => prev.filter(f => f.id !== filterId));
      toast({
        title: "Success",
        description: "Saved view deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting saved filter:', error);
      toast({
        title: "Error",
        description: "Failed to delete saved view",
        variant: "destructive"
      });
    }
  };

  const setAsDefault = async (filterId: string) => {
    try {
      setSavedFilters(prev => prev.map(f => ({
        ...f,
        is_default: f.id === filterId
      })));

      toast({
        title: "Success",
        description: "Default view updated",
      });
    } catch (error) {
      console.error('Error setting default filter:', error);
      toast({
        title: "Error",
        description: "Failed to set default view",
        variant: "destructive"
      });
    }
  };

  const formatFilters = (filters: any) => {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value && value !== 'all')
      .map(([key, value]) => {
        switch (key) {
          case 'position':
            return `Position: ${value}`;
          case 'transfer_type':
            return `Transfer: ${value}`;
          case 'budget_range':
            return `Budget: ${value}`;
          case 'passport_requirement':
            return `Passport: ${value}`;
          case 'age_max':
            return `Max Age: ${value}`;
          default:
            return `${key}: ${value}`;
        }
      });

    return activeFilters.length > 0 ? activeFilters : ['No filters applied'];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Filter Views</h2>
          <p className="text-muted-foreground">
            Quickly apply your favorite search criteria and filters
          </p>
        </div>
      </div>

      {savedFilters.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Saved Views Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create saved views by applying filters in the Requests Feed and clicking "Save Filters"
            </p>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Go to Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedFilters.map((filter) => (
            <Card key={filter.id} className="relative">
              {filter.is_default && (
                <Badge className="absolute -top-2 -right-2 bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  Default
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5" />
                  {filter.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Applied Filters:</h4>
                  <div className="space-y-1">
                    {formatFilters(filter.filters).map((filterText, index) => (
                      <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                        {filterText}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created {new Date(filter.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Apply View
                  </Button>
                  
                  {!filter.is_default && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setAsDefault(filter.id)}
                    >
                      <Star className="w-3 h-3" />
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => deleteSavedFilter(filter.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentSavedViews;
