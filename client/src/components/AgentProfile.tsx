import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { User, Shield, AlertTriangle, CheckCircle, Mail, Globe, FileText } from 'lucide-react';
import { useSports } from '@/hooks/useSports';

interface AgentData {
  id: string;
  agency_name: string;
  fifa_id?: string;
  license_number?: string;
  specialization: string[];
  bio?: string;
  website?: string;
  verified: boolean;
}

const AgentProfile = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { sports, loading: sportsLoading } = useSports();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    agency_name: '',
    fifa_id: '',
    license_number: '',
    bio: '',
    website: ''
  });

  useEffect(() => {
    fetchAgentData();
  }, [profile]);

  const fetchAgentData = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAgentData(data);
        setFormData({
          agency_name: data.agency_name || '',
          fifa_id: data.fifa_id || '',
          license_number: data.license_number || '',
          bio: data.bio || '',
          website: data.website || ''
        });
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    // Validate football specialization requires FIFA ID
    if (agentData?.specialization.includes('football') && !formData.fifa_id) {
      toast({
        title: "Validation Error",
        description: "As a football agent, you must provide a FIFA ID to transfer players or offer contracts",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        agency_name: formData.agency_name,
        fifa_id: formData.fifa_id || null,
        license_number: formData.license_number || null,
        bio: formData.bio || null,
        website: formData.website || null
      };

      if (agentData) {
        const { error } = await supabase
          .from('agents')
          .update(updateData)
          .eq('profile_id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agents')
          .insert({
            profile_id: profile.id,
            ...updateData,
            specialization: [] // Will be set during onboarding
          });

        if (error) throw error;
      }

      await fetchAgentData();
      setEditing(false);

      toast({
        title: "Success",
        description: "Agent profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating agent profile:', error);
      toast({
        title: "Error",
        description: "Failed to update agent profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canMessagePlayers = () => {
    const isFootballAgent = agentData?.specialization?.includes('football');
    if (isFootballAgent) {
      return agentData?.fifa_id && agentData?.license_number;
    }
    return agentData?.license_number; // For non-football agents, only license is required
  };

  const getSportLabel = (sportValue: string) => {
    const sport = sports.find(s => s.value === sportValue);
    return sport?.label || sportValue;
  };

  if (loading || sportsLoading) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white font-polysans">
          <User className="w-5 h-5" />
          Agent Profile
          {agentData?.verified && (
            <Badge className="bg-green-600 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent Status */}
        <div className="p-4 rounded-lg  border-0 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium text-white">Agent Status</span>
          </div>
          {canMessagePlayers() ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                {agentData?.specialization?.includes('football')
                  ? 'FIFA Licensed - Can message players and offer contracts'
                  : 'Licensed - Can message players'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                {agentData?.specialization?.includes('football')
                  ? 'Unlicensed - FIFA ID required for football agents'
                  : 'Unlicensed - Can only view and shortlist players'}
              </span>
            </div>
          )}
        </div>

        {/* Specialization Display */}
        {agentData?.specialization && agentData.specialization.length > 0 && (
          <div className="p-4 rounded-lg border-0 bg-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              <span className="font-medium text-white">Sports Specialization</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {agentData.specialization.map(sport => (
                <Badge key={sport} className="bg-gray-700 text-white">
                  {getSportLabel(sport)}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Specializations can only be set during initial onboarding. Contact support to modify.
            </p>
          </div>
        )}

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Agency Name *</Label>
              <Input
                value={formData.agency_name}
                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter agency name"
              />
            </div>

            {agentData?.specialization?.includes('football') && (
              <div className="space-y-2">
                <Label className="text-gray-300">FIFA ID *</Label>
                <Input
                  value={formData.fifa_id}
                  onChange={(e) => setFormData({ ...formData, fifa_id: e.target.value })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter FIFA ID"
                />
                <p className="text-sm text-red-500">
                  As a registered football agent, you must have a licensed FIFA ID to transfer players or offer contracts
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">License Number</Label>
              <Input
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter license number"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Professional Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Describe your professional experience..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="https://your-website.com"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={loading || !formData.agency_name}

              >
                Save Changes
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    agency_name: agentData?.agency_name || '',
                    fifa_id: agentData?.fifa_id || '',
                    license_number: agentData?.license_number || '',
                    bio: agentData?.bio || '',
                    website: agentData?.website || ''
                  });
                }}
                variant="outline"

              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {agentData ? (
              <>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-sm">Agency Name</Label>
                  <p className="text-white font-medium">{agentData.agency_name}</p>
                </div>

                {agentData.fifa_id && (
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">FIFA ID</Label>
                    <p className="text-white font-medium">{agentData.fifa_id}</p>
                  </div>
                )}

                {agentData.license_number && (
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">License Number</Label>
                    <p className="text-white font-medium">{agentData.license_number}</p>
                  </div>
                )}

                {agentData.bio && (
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">Bio</Label>
                    <p className="text-white">{agentData.bio}</p>
                  </div>
                )}

                {agentData.website && (
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">Website</Label>
                    <a
                      href={agentData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rosegold hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      {agentData.website}
                    </a>
                  </div>
                )}

                <Button
                  onClick={() => setEditing(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Edit Profile
                </Button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Complete your agent profile to access all features</p>
                <Button
                  onClick={() => setEditing(true)}
                  className="bg-rosegold hover:bg-rosegold/90 text-white"
                >
                  Set Up Profile
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentProfile;