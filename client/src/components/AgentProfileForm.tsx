
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Building2, Calendar, Globe, Award, FileImage } from 'lucide-react';
import { useSportData } from '@/hooks/useSportData';
import { AssociationSelect } from '@/components/ui/AssociationSelect';

interface AgentProfileFormProps {
  onProfileComplete?: () => void;
}

export const AgentProfileForm: React.FC<AgentProfileFormProps> = ({ onProfileComplete }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agentData, setAgentData] = useState({
    agency_name: '',
    bio: '',
    fifa_id: '',
    license_number: '',
    website: '',
    logo_url: '',
    year_founded: '',
    member_association: '',
    specialization: [] as string[]
  });

  const sportTypes = ['football', 'basketball', 'volleyball', 'tennis', 'rugby'];

  // Get sport-specific data for associations (use first specialization or default to football)
  const primarySport = agentData.specialization.length > 0 ? agentData.specialization[0] : 'football';
  const sportData = useSportData(primarySport, 'male');

  useEffect(() => {
    if (profile?.user_type === 'agent') {
      fetchAgentData();
    }
  }, [profile]);

  const fetchAgentData = async () => {
    if (!profile) return;

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
        setAgentData({
          agency_name: data.agency_name || '',
          bio: data.bio || '',
          fifa_id: data.fifa_id || '',
          license_number: data.license_number || '',
          website: data.website || '',
          logo_url: (data as any).logo_url || '',
          year_founded: (data as any).year_founded?.toString() || '',
          member_association: (data as any).member_association || '',
          specialization: data.specialization || []
        });
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
      toast({
        title: "Error",
        description: "Failed to load agent profile",
        variant: "destructive"
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('player-photos')
        .upload(`agent-logos/${fileName}`, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('player-photos')
        .getPublicUrl(`agent-logos/${fileName}`);

      setAgentData(prev => ({ ...prev, logo_url: urlData.publicUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validation for football agents
    if (agentData.specialization.includes('football') && !agentData.fifa_id) {
      toast({
        title: "FIFA ID Required",
        description: "FIFA ID is required for football agents",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const dataToSave: any = {
        profile_id: profile.id,
        agency_name: agentData.agency_name,
        bio: agentData.bio,
        fifa_id: agentData.fifa_id || null,
        license_number: agentData.license_number || null,
        website: agentData.website || null,
        specialization: agentData.specialization as any
      };

      // Add the new fields as raw data since they're not in the TypeScript types yet
      if (agentData.logo_url) dataToSave.logo_url = agentData.logo_url;
      if (agentData.year_founded) dataToSave.year_founded = parseInt(agentData.year_founded);
      if (agentData.member_association) dataToSave.member_association = agentData.member_association;

      const { error } = await supabase
        .from('agents')
        .upsert(dataToSave, { onConflict: 'profile_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent profile updated successfully",
      });

      if (onProfileComplete) {
        onProfileComplete();
      }
    } catch (error) {
      console.error('Error saving agent profile:', error);
      toast({
        title: "Error",
        description: "Failed to save agent profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.user_type !== 'agent') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">This form is only available for agent accounts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto border border-gray-800 bg-[#0f0f0f] rounded-2xl shadow-lg">
      <CardHeader className="p-4 sm:p-6 border-b border-gray-800">
        <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
          <Building2 className="w-5 h-5 text-rosegold" />
          Agent Profile Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Agency Logo */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-white text-sm sm:text-base">
              <FileImage className="w-4 h-4 text-rosegold" />
              Agency Logo
            </Label>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0">
                {agentData.logo_url ? (
                  <img
                    src={agentData.logo_url}
                    alt="Agency Logo"
                    className="w-24 h-24 rounded-xl border border-gray-700 object-cover shadow-inner"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl border border-dashed border-gray-700 flex items-center justify-center text-gray-500">
                    <FileImage className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="bg-[#111111] border border-gray-700 text-white file:bg-rosegold file:text-white file:border-0 file:px-3 file:py-2 file:rounded-md"
                />
                <p className="text-xs sm:text-sm text-gray-400">
                  Upload a square logo (recommended). Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="agency_name" className="text-sm text-gray-300">Agency Name *</Label>
              <Input
                id="agency_name"
                value={agentData.agency_name}
                onChange={(e) => setAgentData(prev => ({ ...prev, agency_name: e.target.value }))}
                placeholder="Enter your agency name"
                required
                className="bg-[#111111] border border-gray-700 text-white h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-300">Sport Specialization *</Label>
              <Select
                value={agentData.specialization[0] || ''}
                onValueChange={(value) => setAgentData(prev => ({ ...prev, specialization: [value] }))}
              >
                <SelectTrigger className="bg-[#111111] border border-gray-700 text-white h-10">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border border-gray-700 text-white">
                  {sportTypes.map(sport => (
                    <SelectItem key={sport} value={sport} className="capitalize">
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_number" className="text-sm text-gray-300">License Number</Label>
              <Input
                id="license_number"
                value={agentData.license_number}
                onChange={(e) => setAgentData(prev => ({ ...prev, license_number: e.target.value }))}
                placeholder="Enter your license number"
                className="bg-[#111111] border border-gray-700 text-white h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year_founded" className="flex items-center gap-2 text-sm text-gray-300">
                <Calendar className="w-4 h-4 text-rosegold" />
                Year Founded
              </Label>
              <Input
                id="year_founded"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={agentData.year_founded}
                onChange={(e) => setAgentData(prev => ({ ...prev, year_founded: e.target.value }))}
                placeholder="e.g. 2015"
                className="bg-[#111111] border border-gray-700 text-white h-10"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="member_association" className="text-sm text-gray-300">Member Association</Label>
              <AssociationSelect
                value={agentData.member_association}
                onValueChange={(value) => setAgentData(prev => ({ ...prev, member_association: value }))}
                associations={sportData.associations}
                placeholder="Select association"
                triggerClassName="bg-[#111111] border border-gray-700 text-white h-10"
                contentClassName="bg-[#111111] border border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Conditional FIFA ID */}
          {agentData.specialization.includes('football') && (
            <div className="space-y-2">
              <Label htmlFor="fifa_id" className="flex items-center gap-2 text-sm text-gray-300">
                <Award className="w-4 h-4 text-rosegold" />
                FIFA Licensed ID *
              </Label>
              <Input
                id="fifa_id"
                value={agentData.fifa_id}
                onChange={(e) => setAgentData(prev => ({ ...prev, fifa_id: e.target.value }))}
                placeholder="Enter your FIFA ID"
                required
                className="bg-[#111111] border border-gray-700 text-white h-10"
              />
              <p className="text-xs text-red-400">
                FIFA ID is required for football agents to message players and offer contracts.
              </p>
            </div>
          )}

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2 text-sm text-gray-300">
              <Globe className="w-4 h-4 text-rosegold" />
              Website
            </Label>
            <Input
              id="website"
              type="url"
              value={agentData.website}
              onChange={(e) => setAgentData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://youragency.com"
              className="bg-[#111111] border border-gray-700 text-white h-10"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm text-gray-300">Bio</Label>
            <Textarea
              id="bio"
              value={agentData.bio}
              onChange={(e) => setAgentData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about your agency and experience..."
              rows={4}
              className="bg-[#111111] border border-gray-700 text-white resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !agentData.agency_name}
            className="w-full bg-rosegold text-white hover:bg-rosegold/90 h-11 text-sm sm:text-base"
          >
            {loading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Agent Profile'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AgentProfileForm;
