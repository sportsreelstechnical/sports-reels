
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FilterConfig {
  position?: string;
  transferType?: string;
  budgetRange?: [number, number];
  region?: string;
  sortBy: string; // Made required to match FilterState
}

interface CustomFilterView {
  id: string;
  view_name: string;
  filter_config: FilterConfig;
  created_at: string;
}

export const useCustomFilterViews = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [views, setViews] = useState<CustomFilterView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchCustomViews();
    }
  }, [profile]);

  const fetchCustomViews = async () => {
    if (!profile?.id) return;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) return;

      const { data, error } = await supabase
        .from('custom_filter_views')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the filter_config from Json to FilterConfig with proper validation
      const typedViews = (data || []).map(view => {
        let filterConfig: FilterConfig;
        
        try {
          const config = typeof view.filter_config === 'string' 
            ? JSON.parse(view.filter_config) 
            : view.filter_config;
          
          filterConfig = {
            position: config?.position,
            transferType: config?.transferType,
            budgetRange: config?.budgetRange,
            region: config?.region,
            sortBy: config?.sortBy || 'newest'
          };
        } catch (e) {
          // Fallback to default config if parsing fails
          filterConfig = {
            sortBy: 'newest'
          };
        }
        
        return {
          ...view,
          filter_config: filterConfig
        };
      });
      
      setViews(typedViews);
    } catch (error) {
      console.error('Error fetching custom views:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveView = async (viewName: string, filterConfig: FilterConfig) => {
    if (!profile?.id) return false;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) throw new Error('Team not found');

      const { error } = await supabase
        .from('custom_filter_views')
        .insert({
          team_id: teamData.id,
          view_name: viewName,
          filter_config: JSON.stringify(filterConfig)
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Filter view "${viewName}" saved successfully`
      });

      await fetchCustomViews();
      return true;
    } catch (error) {
      console.error('Error saving view:', error);
      toast({
        title: "Error",
        description: "Failed to save filter view",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteView = async (viewId: string) => {
    try {
      const { error } = await supabase
        .from('custom_filter_views')
        .delete()
        .eq('id', viewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Filter view deleted successfully"
      });

      await fetchCustomViews();
      return true;
    } catch (error) {
      console.error('Error deleting view:', error);
      toast({
        title: "Error",
        description: "Failed to delete filter view",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    views,
    loading,
    saveView,
    deleteView,
    refreshViews: fetchCustomViews
  };
};
