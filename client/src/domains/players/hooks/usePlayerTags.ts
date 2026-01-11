
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlayerTag {
  id: string;
  label: string;
  color: string;
  description?: string;
  is_system_tag?: boolean;
}

interface PlayerTagAssignment {
  id: string;
  player_id: string;
  tag_id: string;
  assigned_at: string;
  tag: PlayerTag;
}

export const usePlayerTags = () => {
  const [availableTags, setAvailableTags] = useState<PlayerTag[]>([]);
  const [playerTagAssignments, setPlayerTagAssignments] = useState<PlayerTagAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch available tags from database
  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('player_tags')
        .select('*')
        .order('is_system_tag', { ascending: false })
        .order('label');

      if (error) {
        console.error('Error fetching tags:', error);
        toast({
          title: "Error",
          description: "Failed to load player tags",
          variant: "destructive"
        });
        return;
      }

      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Fetch player tag assignments
  const fetchPlayerTagAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('player_tag_assignments')
        .select(`
          *,
          tag:player_tags(*)
        `);

      if (error) {
        console.error('Error fetching player tag assignments:', error);
        return;
      }

      setPlayerTagAssignments(data || []);
    } catch (error) {
      console.error('Error fetching player tag assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchAvailableTags();
    fetchPlayerTagAssignments();
  }, []);

  const createTag = async (tagData: Omit<PlayerTag, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('player_tags')
        .insert({
          label: tagData.label,
          color: tagData.color,
          description: tagData.description,
          is_system_tag: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating tag:', error);
        toast({
          title: "Error",
          description: "Failed to create tag",
          variant: "destructive"
        });
        return null;
      }

      // Refresh available tags
      await fetchAvailableTags();
      
      toast({
        title: "Success",
        description: "Tag created successfully"
      });

      return data;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      // Check if it's a system tag
      const tag = availableTags.find(t => t.id === tagId);
      if (tag?.is_system_tag) {
        toast({
          title: "Error",
          description: "Cannot delete system tags",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('player_tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        console.error('Error deleting tag:', error);
        toast({
          title: "Error",
          description: "Failed to delete tag",
          variant: "destructive"
        });
        return false;
      }

      // Refresh data
      await fetchAvailableTags();
      await fetchPlayerTagAssignments();

      toast({
        title: "Success",
        description: "Tag deleted successfully"
      });

      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  };

  const getPlayerTags = (playerId: string): PlayerTag[] => {
    const assignments = playerTagAssignments.filter(a => a.player_id === playerId);
    return assignments.map(a => a.tag);
  };

  const addTagToPlayer = async (playerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('player_tag_assignments')
        .insert({
          player_id: playerId,
          tag_id: tagId
        });

      if (error) {
        console.error('Error adding tag to player:', error);
        toast({
          title: "Error",
          description: "Failed to add tag to player",
          variant: "destructive"
        });
        return false;
      }

      // Refresh assignments
      await fetchPlayerTagAssignments();

      toast({
        title: "Success",
        description: "Tag added to player"
      });

      return true;
    } catch (error) {
      console.error('Error adding tag to player:', error);
      return false;
    }
  };

  const removeTagFromPlayer = async (playerId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from('player_tag_assignments')
        .delete()
        .eq('player_id', playerId)
        .eq('tag_id', tagId);

      if (error) {
        console.error('Error removing tag from player:', error);
        toast({
          title: "Error",
          description: "Failed to remove tag from player",
          variant: "destructive"
        });
        return false;
      }

      // Refresh assignments
      await fetchPlayerTagAssignments();

      toast({
        title: "Success",
        description: "Tag removed from player"
      });

      return true;
    } catch (error) {
      console.error('Error removing tag from player:', error);
      return false;
    }
  };

  const setPlayerTags = async (playerId: string, tags: PlayerTag[]) => {
    try {
      // First, remove all existing tags for this player
      const { error: deleteError } = await supabase
        .from('player_tag_assignments')
        .delete()
        .eq('player_id', playerId);

      if (deleteError) {
        console.error('Error removing existing tags:', deleteError);
        return false;
      }

      // Then add the new tags
      if (tags.length > 0) {
        const assignments = tags.map(tag => ({
          player_id: playerId,
          tag_id: tag.id
        }));

        const { error: insertError } = await supabase
          .from('player_tag_assignments')
          .insert(assignments);

        if (insertError) {
          console.error('Error adding new tags:', insertError);
          return false;
        }
      }

      // Refresh assignments
      await fetchPlayerTagAssignments();
      return true;
    } catch (error) {
      console.error('Error setting player tags:', error);
      return false;
    }
  };

  return {
    availableTags,
    playerTagAssignments,
    loading,
    createTag,
    deleteTag,
    getPlayerTags,
    setPlayerTags: async (playerId: string, tags: PlayerTag[]) => {
      await setPlayerTags(playerId, tags);
    },
    addTagToPlayer,
    removeTagFromPlayer,
    refreshData: () => {
      fetchAvailableTags();
      fetchPlayerTagAssignments();
    }
  };
};
