import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play, Download, Share, BarChart3, Clock, Users, Target, TrendingUp,
  Activity, Eye, Star, AlertCircle, Zap, Award, MapPin, Filter, Search,
  MoreVertical, Calendar, Timer, Maximize2, Volume2, Settings, ChevronRight,
  TrendingDown, ArrowUp, ArrowDown, Pause, SkipForward, SkipBack, ArrowLeft,
  Quote, Brain, Shield, Heart, Lightbulb, AlertTriangle, Trophy, Flame,
  Wind, Gauge, FileText, Video, Mic, Camera, PieChart, LineChart, BarChart2,
  Crosshair, Navigation, Compass, Map, Layers, Grid, Layout as LayoutIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ComprehensiveAIAnalysisService } from '@/domains/video/services/comprehensiveAIAnalysisService';
import { VideoFrameExtractor } from '@/utils/videoFrameExtractor';
import { r2VideoRetrievalService } from '@/domains/video/services/r2VideoRetrievalService';

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  video_type: 'match' | 'training' | 'interview' | 'highlight';
  description?: string;
  tags: string[];
  ai_analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  opposing_team?: string;
  match_date?: string;
  score?: string;
  league_competition?: string;
  file_size?: number;
  compressed_url?: string;
}

const VideoAnalysisResults = () => {
  const { videoTitle } = useParams<{ videoTitle: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [detectedSport, setDetectedSport] = useState<string>('');
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [enhancedAnalysisData, setEnhancedAnalysisData] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');

  const { profile } = useAuth();

  useEffect(() => {
    fetchCurrentTeam();
  }, [profile?.id]);

  useEffect(() => {
    if (videoTitle && currentTeamId) {
      fetchVideoData();
    }
  }, [videoTitle, currentTeamId]);

  const fetchCurrentTeam = async () => {
    try {
      if (!profile?.id) return;

      const { data: teamData } = await supabase
        .from('teams')
        .select('id, sport_type')
        .eq('profile_id', profile.id)
        .single();

      if (teamData) {
        setCurrentTeamId(teamData.id);
        if (teamData.sport_type) {
          setDetectedSport(teamData.sport_type);
        }
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchVideoData = async () => {
    if (!videoTitle || !currentTeamId) return;

    try {
      setIsLoading(true);
      const decodedTitle = decodeURIComponent(videoTitle);

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('title', decodedTitle)
        .eq('team_id', currentTeamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        const mappedVideo: Video = {
          id: data.id,
          title: data.title,
          video_url: data.video_url,
          thumbnail_url: data.thumbnail_url,
          duration: data.duration,
          video_type: data.video_type as 'match' | 'training' | 'interview' | 'highlight',
          description: data.description,
          tags: Array.isArray(data.tagged_players) ? data.tagged_players.map((tag: any) => String(tag)) : [],
          ai_analysis_status: data.ai_analysis_status || 'pending',
          created_at: data.created_at,
          opposing_team: data.opposing_team,
          match_date: data.match_date,
          score: data.score_display || undefined,
          league_competition: data.league || undefined,
          file_size: data.file_size,
          compressed_url: data.compressed_url
        };
        setVideo(mappedVideo);
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      toast({
        title: "Error",
        description: "Failed to load video data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancedAnalyzeVideo = async () => {
    if (!video) return;

    try {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisStatus('🚀 Initializing advanced AI analysis engine...');

      // Initialize enhanced AI analysis service
      const aiService = new ComprehensiveAIAnalysisService();

      // Retrieve video URL for analysis
      setAnalysisProgress(10);
      setAnalysisStatus('🔗 Retrieving video for analysis...');
      const videoRetrieval = await r2VideoRetrievalService.getVideoForAnalysis(video.video_url, {
        expiresIn: 3600 // 1 hour for analysis
      });

      if (!videoRetrieval.success || !videoRetrieval.videoUrl) {
        // Check if it's a localhost URL issue
        if (videoRetrieval.error?.includes('localhost') || videoRetrieval.error?.includes('development')) {
          toast({
            title: "Video Not Available",
            description: "This video was uploaded during development and is no longer accessible. Please re-upload the video to perform AI analysis.",
            variant: "destructive"
          });
        }
        throw new Error(videoRetrieval.error || 'Failed to retrieve video for analysis');
      }

      // Extract video frames with optimization
      setAnalysisProgress(15);
      setAnalysisStatus('📸 Extracting high-quality video frames...');
      const frameExtractor = new VideoFrameExtractor();

      const frames = await frameExtractor.extractFrames(videoRetrieval.videoUrl, {
        frameRate: 1,
        maxFrames: 60, // More frames for better analysis
        quality: 0.9,
        maxWidth: 1280,
        maxHeight: 720
      });

      setAnalysisProgress(25);
      setAnalysisStatus(`✅ ${frames.length} frames extracted, preparing deep analysis...`);

      // Prepare enhanced analysis request
      const analysisRequest = {
        videoUrl: video.video_url,
        videoType: video.video_type,
        sport: detectedSport || 'football',
        metadata: {
          playerTags: video.tags.map((tag, index) => ({
            playerId: `player_${index}`,
            playerName: tag,
            jerseyNumber: index + 1,
            position: 'Analysis pending'
          })),
          teamInfo: {
            homeTeam: video.opposing_team ? 'Your Team' : 'Home Team',
            awayTeam: video.opposing_team || 'Away Team',
            competition: video.league_competition || 'Competition',
            date: video.created_at
          },
          context: video.description || '',
          duration: video.duration
        },
        frames: frames
      };

      // Perform enhanced AI analysis with multiple passes
      setAnalysisProgress(40);
      setAnalysisStatus('🧠 AI performing comprehensive multi-layer analysis...');

      const result = await aiService.analyzeVideo(analysisRequest);

      if (result.success) {
        setAnalysisProgress(75);
        setAnalysisStatus('📊 Processing advanced metrics and insights...');

        // Store enhanced analysis data
        setEnhancedAnalysisData(result.analysis);
        setHasAnalysis(true);

        setAnalysisProgress(90);
        setAnalysisStatus('🎯 Generating critical recommendations...');

        // Simulate final processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        setAnalysisProgress(100);
        setAnalysisStatus('✨ Analysis completed successfully!');

        toast({
          title: "🎉 Advanced Analysis Complete",
          description: "Comprehensive AI analysis with critical insights ready!",
        });
      } else {
        throw new Error(result.analysis.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Enhanced AI analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to complete advanced analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        setAnalysisProgress(0);
        setAnalysisStatus('');
      }, 2000);
    }
  };

  // Dynamic tab configuration based on video type
  const getTabsForVideoType = () => {
    const commonTabs = ['overview', 'insights'];

    switch (video?.video_type) {
      case 'match':
        return ['overview', 'tactical', 'players', 'momentum', 'weaknesses', 'insights'];
      case 'training':
        return ['overview', 'skills', 'drills', 'fatigue', 'development', 'insights'];
      case 'highlight':
        return ['overview', 'showcase', 'marketing', 'branding', 'viral', 'insights'];
      case 'interview':
        return ['overview', 'quotes', 'psychology', 'language', 'media', 'insights'];
      default:
        return commonTabs;
    }
  };

  const getTabLabel = (tab: string) => {
    const labels: { [key: string]: string } = {
      overview: 'Overview',
      tactical: 'Tactical Analysis',
      players: 'Player Metrics',
      momentum: 'Momentum',
      weaknesses: 'Critical Weaknesses',
      skills: 'Skill Matrix',
      drills: 'Drill Analysis',
      fatigue: 'Fatigue Monitor',
      development: 'Development',
      showcase: 'Skill Showcase',
      marketing: 'Marketing Intel',
      branding: 'Player Brand',
      viral: 'Viral Potential',
      quotes: 'Key Quotes',
      psychology: 'Psychology',
      language: 'Language Analysis',
      media: 'Media Training',
      insights: 'AI Insights'
    };
    return labels[tab] || tab;
  };

  const getTabIcon = (tab: string) => {
    const icons: { [key: string]: any } = {
      overview: LayoutIcon,
      tactical: Compass,
      players: Users,
      momentum: TrendingUp,
      weaknesses: AlertTriangle,
      skills: Target,
      drills: Grid,
      fatigue: Heart,
      development: Trophy,
      showcase: Star,
      marketing: PieChart,
      branding: Award,
      viral: Flame,
      quotes: Quote,
      psychology: Brain,
      language: Mic,
      media: Camera,
      insights: Lightbulb
    };
    const Icon = icons[tab] || BarChart3;
    return <Icon className="w-4 h-4" />;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render tactical intelligence for match videos
  const renderTacticalIntelligence = () => {
    if (!enhancedAnalysisData?.tacticalIntelligence) {
      return <EmptyState icon={Compass} message="No tactical data available" />;
    }

    const tactical = enhancedAnalysisData.tacticalIntelligence;

    return (
      <div className="space-y-6">
        {/* Formation and Shape */}
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-bright-pink" />
              Formation & Defensive Shape
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-semibold mb-3">Current Formation</h4>
                <div className="text-4xl font-bold text-bright-pink mb-2">{tactical.formation}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pressing Intensity</span>
                    <span className="text-white">{tactical.pressingIntensity}/10</span>
                  </div>
                  <Progress value={tactical.pressingIntensity * 10} className="h-2" />
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3">Defensive Shape</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Compactness</span>
                    <span className="text-white">{tactical.defensiveShape?.compactness}/10</span>
                  </div>
                  <Progress value={(tactical.defensiveShape?.compactness || 0) * 10} className="h-2" />
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">Vulnerabilities:</p>
                    {tactical.defensiveShape?.vulnerabilities?.map((v: string, i: number) => (
                      <Badge key={i} variant="outline" className="mr-2 mb-1 border-red-500/50 text-red-400">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attacking Patterns */}
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">Attacking Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tactical.attackingPatterns?.map((pattern: any, index: number) => (
                <div key={index} className="p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-semibold">{pattern.pattern}</h4>
                    <Badge className="bg-bright-pink/20 text-bright-pink">
                      {pattern.successRate}% success
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Frequency:</span>
                      <span className="text-white ml-2">{pattern.frequency}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Key Players:</span>
                      <span className="text-white ml-2">{pattern.keyPlayers?.join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render advanced player metrics
  const renderAdvancedPlayerMetrics = () => {
    if (!enhancedAnalysisData?.advancedPlayerMetrics) {
      return <EmptyState icon={Users} message="No player metrics available" />;
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enhancedAnalysisData.advancedPlayerMetrics.map((player: any, index: number) => (
          <Card key={index} className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">{player.name}</CardTitle>
                  <p className="text-gray-400 text-sm">{player.position}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-bright-pink">{player.overallRating}</div>
                  <div className="text-xs text-gray-400">Overall Rating</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Passing Stats */}
                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-bright-pink" />
                    Passing
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.passing?.accuracy}%</div>
                      <div className="text-xs text-gray-400">Accuracy</div>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.passing?.keyPasses}</div>
                      <div className="text-xs text-gray-400">Key Passes</div>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.passing?.progressivePasses}</div>
                      <div className="text-xs text-gray-400">Progressive</div>
                    </div>
                  </div>
                </div>

                {/* Defensive Stats */}
                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Defensive
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.defensive?.tackles}</div>
                      <div className="text-xs text-gray-400">Tackles</div>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.defensive?.interceptions}</div>
                      <div className="text-xs text-gray-400">Interceptions</div>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.defensive?.aerialDuelsWon}</div>
                      <div className="text-xs text-gray-400">Aerials Won</div>
                    </div>
                  </div>
                </div>

                {/* Expected Metrics */}
                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-green-400" />
                    Expected Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.expectedMetrics?.xG?.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">xG</div>
                    </div>
                    <div className="bg-gray-700/30 p-2 rounded">
                      <div className="text-white font-semibold">{player.expectedMetrics?.xA?.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">xA</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render critical weaknesses
  const renderCriticalWeaknesses = () => {
    if (!enhancedAnalysisData?.criticalWeaknesses) {
      return <EmptyState icon={AlertTriangle} message="No weaknesses identified" />;
    }

    return (
      <div className="space-y-4">
        {enhancedAnalysisData.criticalWeaknesses.map((weakness: any, index: number) => (
          <Alert key={index} className={`
            ${weakness.severity === 'high' ? 'border-red-500 bg-red-500/10' :
              weakness.severity === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                'border-blue-500 bg-blue-500/10'}
          `}>
            <AlertTriangle className="h-4 w-4" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-white">{weakness.area}</h4>
                <Badge variant="outline" className={`
                  ${weakness.severity === 'high' ? 'border-red-500 text-red-400' :
                    weakness.severity === 'medium' ? 'border-yellow-500 text-yellow-400' :
                      'border-blue-500 text-blue-400'}
                `}>
                  {weakness.severity.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <AlertDescription className="text-gray-300">
                {weakness.description}
              </AlertDescription>
              {weakness.examples && weakness.examples.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-400 mb-1">Examples:</p>
                  <ul className="list-disc list-inside text-sm text-gray-400">
                    {weakness.examples.map((example: string, i: number) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
              {weakness.recommendations && weakness.recommendations.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-green-400 mb-1">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-green-300">
                    {weakness.recommendations.map((rec: string, i: number) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Alert>
        ))}
      </div>
    );
  };

  // Empty state component
  const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-400 mb-2">{message}</p>
      <p className="text-gray-500 text-sm">Run AI analysis to generate insights</p>
    </div>
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bright-pink mx-auto mb-4"></div>
            <p className="text-gray-400">Loading video analysis...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Video Not Found</h2>
            <p className="text-gray-400 mb-6">The video you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/videos')} className="bg-bright-pink hover:bg-bright-pink/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Videos
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/videos')} variant="outline" className="border-gray-600 text-gray-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">{video.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className="bg-bright-pink/20 text-bright-pink capitalize">
                    {video.video_type}
                  </Badge>
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                    {detectedSport || 'Sport'}
                  </Badge>
                  <span className="text-gray-400 text-sm">
                    {formatDuration(video.duration)} • {formatDate(video.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Player */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-t-lg">
                <video
                  src={video.compressed_url || video.video_url}
                  poster={video.thumbnail_url}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-6">
                <Button
                  onClick={handleEnhancedAnalyzeVideo}
                  disabled={isAnalyzing}
                  className="w-full bg-bright-pink hover:bg-bright-pink/90 text-white h-12"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {analysisStatus}
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Perform Advanced AI Analysis
                    </>
                  )}
                </Button>

                {isAnalyzing && (
                  <div className="mt-4 space-y-2">
                    <Progress value={analysisProgress} className="h-3" />
                    <p className="text-center text-sm text-gray-400">{analysisProgress}% Complete</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Analysis Tabs */}
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
            <TabsList className="grid w-full bg-gray-800/50 p-1" style={{
              gridTemplateColumns: `repeat(${getTabsForVideoType().length}, minmax(0, 1fr))`
            }}>
              {getTabsForVideoType().map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-bright-pink data-[state=active]:text-white flex items-center gap-1"
                >
                  {getTabIcon(tab)}
                  <span className="hidden sm:inline">{getTabLabel(tab)}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Match-specific tabs */}
            {video.video_type === 'match' && (
              <>
                <TabsContent value="tactical">
                  {renderTacticalIntelligence()}
                </TabsContent>
                <TabsContent value="players">
                  {renderAdvancedPlayerMetrics()}
                </TabsContent>
                <TabsContent value="weaknesses">
                  {renderCriticalWeaknesses()}
                </TabsContent>
              </>
            )}

            {/* Common tabs */}
            <TabsContent value="insights">
              <Card className="bg-gray-800/50 border-gray-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-bright-pink" />
                    Critical AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <EmptyState icon={Lightbulb} message="No insights available yet" />
                  ) : (
                    <div className="space-y-4">
                      {enhancedAnalysisData?.insights?.map((insight: string, index: number) => (
                        <div key={index} className="p-4 bg-gradient-to-r from-bright-pink/10 to-purple-500/10 rounded-lg border border-bright-pink/30">
                          <p className="text-white">{insight}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default VideoAnalysisResults;