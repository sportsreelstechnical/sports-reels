
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ExternalLink, Upload, Youtube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoIntegrationProps {
  onVideoAdded: (videoData: any) => void;
}

const VideoIntegration: React.FC<VideoIntegrationProps> = ({ onVideoAdded }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [hudlData, setHudlData] = useState({ username: '', password: '' });
  const [veoData, setVeoData] = useState({ apiKey: '', clubId: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleYouTubeImport = async () => {
    if (!youtubeUrl) return;
    
    setLoading(true);
    try {
      // Extract video ID from YouTube URL
      const videoId = youtubeUrl.split('v=')[1]?.split('&')[0] || youtubeUrl.split('/').pop();
      
      const videoData = {
        video_url: youtubeUrl,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: `YouTube Video - ${videoId}`,
        video_type: 'youtube',
        source: 'youtube'
      };
      
      onVideoAdded(videoData);
      setYoutubeUrl('');
      
      toast({
        title: "Success",
        description: "YouTube video imported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import YouTube video",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHudlIntegration = async () => {
    setLoading(true);
    try {
      // Mock Hudl integration - in real implementation, this would connect to Hudl API
      toast({
        title: "Hudl Integration",
        description: "Hudl integration requires enterprise partnership. Contact support for setup.",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Hudl",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVeoIntegration = async () => {
    setLoading(true);
    try {
      // Mock VEO integration
      toast({
        title: "VEO Integration",
        description: "VEO integration requires API partnership. Contact support for setup.",
        variant: "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to VEO",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-rosegold/20">
      <CardHeader>
        <CardTitle className="font-polysans text-white">Video Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/10">
            <TabsTrigger value="youtube" className="text-white data-[state=active]:bg-rosegold">
              <Youtube className="w-4 h-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="hudl" className="text-white data-[state=active]:bg-rosegold">
              <ExternalLink className="w-4 h-4 mr-2" />
              Hudl
            </TabsTrigger>
            <TabsTrigger value="veo" className="text-white data-[state=active]:bg-rosegold">
              <ExternalLink className="w-4 h-4 mr-2" />
              VEO
            </TabsTrigger>
            <TabsTrigger value="wyscout" className="text-white data-[state=active]:bg-rosegold">
              <ExternalLink className="w-4 h-4 mr-2" />
              Wyscout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url" className="text-white">YouTube Video URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="bg-white/10 border-rosegold/30 text-white"
              />
            </div>
            <Button 
              onClick={handleYouTubeImport}
              disabled={!youtubeUrl || loading}
              className="bg-rosegold hover:bg-rosegold/90"
            >
              <Youtube className="w-4 h-4 mr-2" />
              Import from YouTube
            </Button>
          </TabsContent>

          <TabsContent value="hudl" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium">Enterprise Integration Required</p>
                  <p>Hudl integration requires a partnership agreement. Contact our support team to set up this integration.</p>
                </div>
              </div>
              <Button 
                onClick={handleHudlIntegration}
                disabled={loading}
                variant="outline"
                className="border-rosegold text-rosegold hover:bg-rosegold hover:text-white"
              >
                Contact Support for Hudl Integration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="veo" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium">VEO Camera Integration</p>
                  <p>Connect your VEO camera system to automatically import match footage and analytics.</p>
                </div>
              </div>
              <Button 
                onClick={handleVeoIntegration}
                disabled={loading}
                variant="outline"
                className="border-rosegold text-rosegold hover:bg-rosegold hover:text-white"
              >
                Setup VEO Integration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wyscout" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-200">
                  <p className="font-medium">Wyscout Data Integration</p>
                  <p>Connect with Wyscout for advanced player analytics and scouting data.</p>
                </div>
              </div>
              <Button 
                disabled={loading}
                variant="outline"
                className="border-rosegold text-rosegold hover:bg-rosegold hover:text-white"
              >
                Setup Wyscout Integration
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VideoIntegration;
