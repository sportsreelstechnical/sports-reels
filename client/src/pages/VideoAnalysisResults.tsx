import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Play,
  Download,
  Share,
  BarChart3,
  Clock,
  Users,
  Target,
  TrendingUp,
  Activity,
  Eye,
  Star,
  AlertCircle,
  Zap,
  Award,
  MapPin,
  Filter,
  Search,
  MoreVertical,
  Calendar,
  Timer,
  Maximize2,
  Volume2,
  Settings,
  ChevronRight,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Pause,
  SkipForward,
  SkipBack,
  ArrowLeft,
  Quote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SmartVideoPlayer, SmartVideoPlayerRef } from '@/domains/video/components/SmartVideoPlayer';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ComprehensiveAIAnalysisService } from '@/domains/video/services/comprehensiveAIAnalysisService';
import { EnhancedVideoAnalysisService } from '@/domains/video/services/enhancedVideoAnalysisService';
import { VideoFrameExtractor } from '@/utils/videoFrameExtractor';
import { r2VideoRetrievalService } from '@/domains/video/services/r2VideoRetrievalService';
import { usePlayersData } from '@/domains/players/hooks/usePlayersData';
import PlayerTagDisplay from '@/components/PlayerTagDisplay';
import PlayerTrackingVisualization from '@/components/PlayerTrackingVisualization';
import FormationVisualizer from '@/components/FormationVisualizer';
import HeatMapVisualization from '@/components/HeatMapVisualization';
import EnhancedFormationVisualizer from '@/components/EnhancedFormationVisualizer';
import EnhancedHeatMapVisualizer from '@/components/EnhancedHeatMapVisualizer';
import PlayerPerformanceAnalysis from '@/components/PlayerPerformanceAnalysis';

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

interface AnalysisData {
  playerActions: any[];
  keyMoments: any[];
  summary: string;
  insights: string[];
  performanceRating: number;
  heatmapData?: any[];
  playerStats?: any[];
  timeline?: any[];
  playerTracking?: any[];
  tacticalAnalysis?: any;
  matchStatistics?: any;
  sportSpecificInsights?: any;
  recommendations?: string[];
  confidence?: number;
  processingTime?: number;
}

const VideoAnalysisResults = () => {
  const { videoTitle } = useParams<{ videoTitle: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [detectedSport, setDetectedSport] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef<SmartVideoPlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [momentFilter, setMomentFilter] = useState('all');
  const [momentSearchTerm, setMomentSearchTerm] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [videoCount, setVideoCount] = useState<number>(0);

  // Extract player IDs from video tags for fetching player data
  const playerIds = video?.tags || [];
  const { players: taggedPlayers, loading: playersLoading } = usePlayersData(playerIds);

  // AI analysis data - starts empty, populated only by AI analysis
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    playerActions: [],
    keyMoments: [],
    summary: "",
    insights: [],
    performanceRating: 0,
    playerStats: [],
    timeline: [],
    playerTracking: [],
    tacticalAnalysis: {
      formationChanges: [],
      pressingMoments: [],
      buildUpPlay: [],
      defensiveActions: [],
      attackingPatterns: []
    },
    matchStatistics: {
      possession: { home: 50, away: 50 },
      shots: { home: 0, away: 0 },
      passes: { home: 0, away: 0, accuracy: { home: 0, away: 0 } },
      goals: [],
      cards: [],
      substitutions: []
    },
    sportSpecificInsights: {
      formation: 'Unknown',
      tacticalStyle: 'Unknown',
      keyStrengths: [],
      areasForImprovement: [],
      criticalMoments: [],
      performanceMetrics: {
        overallTeamRating: 0,
        individualRatings: [],
        tacticalEffectiveness: 0,
        physicalPerformance: 0,
        technicalExecution: 0
      }
    },
    recommendations: [],
    confidence: 0,
    processingTime: 0
  });

  useEffect(() => {
    fetchCurrentTeam();
  }, []);

  useEffect(() => {
    if (videoTitle) {
      fetchVideoData();
    }
  }, [videoTitle]);

  // Detect sport when video data is loaded
  useEffect(() => {
    if (video) {
      detectVideoSport();
    }
  }, [video]);

  const fetchCurrentTeam = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (teamData) {
        setCurrentTeamId(teamData.id);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const detectVideoSport = async () => {
    if (!video) return;

    try {
      const sport = await determineSportFromVideo(video);
      setDetectedSport(sport);
      console.log('Sport detected on load:', sport);
    } catch (error) {
      console.error('Error detecting sport on load:', error);
    }
  };

  // Function to handle duplicate videos
  const handleDuplicateVideos = async (title: string) => {
    try {
      console.log('Attempting to resolve duplicate videos for title:', title);

      // Build query - for agents, don't filter by team_id
      let duplicateQuery = supabase
        .from('videos')
        .select('id, created_at, video_url, thumbnail_url')
        .eq('title', title);

      // Only filter by team_id if user is a team (not an agent)
      if (profile?.user_type === 'team' && currentTeamId) {
        duplicateQuery = duplicateQuery.eq('team_id', currentTeamId);
      }

      const { data: duplicateVideos, error } = await duplicateQuery
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (duplicateVideos && duplicateVideos.length > 1) {
        console.log(`Found ${duplicateVideos.length} duplicate videos:`, duplicateVideos);

        // Keep the most recent one, delete the older ones
        const videosToDelete = duplicateVideos.slice(1);
        const deleteIds = videosToDelete.map(v => v.id);

        console.log('Deleting duplicate videos with IDs:', deleteIds);

        const { error: deleteError } = await supabase
          .from('videos')
          .delete()
          .in('id', deleteIds);

        if (deleteError) {
          console.error('Error deleting duplicate videos:', deleteError);
        } else {
          console.log('Successfully deleted duplicate videos');
          // Refresh the page to load the remaining video
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error handling duplicate videos:', error);
    }
  };

  const fetchVideoData = async () => {
    if (!videoTitle) return;

    try {
      setIsLoading(true);
      const decodedTitle = decodeURIComponent(videoTitle);

      console.log('Fetching video data:', { videoTitle, decodedTitle, currentTeamId, isAgent: profile?.user_type === 'agent' });

      // Build query - for agents, don't filter by team_id
      let query = supabase
        .from('videos')
        .select('*')
        .eq('title', decodedTitle);

      // Only filter by team_id if user is a team (not an agent)
      if (profile?.user_type === 'team' && currentTeamId) {
        query = query.eq('team_id', currentTeamId);
      }

      // First, let's check how many videos exist with this title
      const countQuery = profile?.user_type === 'team' && currentTeamId
        ? supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('title', decodedTitle)
          .eq('team_id', currentTeamId)
        : supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('title', decodedTitle);

      const { count: countResult } = await countQuery;
      const count = countResult || 0;
      setVideoCount(count);
      console.log(`Found ${count} videos with title: "${decodedTitle}"`);

      // Fetch the video
      const { data, error } = await query
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
          tags: Array.isArray(data.tagged_players)
            ? data.tagged_players.map((tag: any) => String(tag))
            : [],
          ai_analysis_status: (data.ai_analysis_status === 'pending' ||
            data.ai_analysis_status === 'analyzing' ||
            data.ai_analysis_status === 'completed' ||
            data.ai_analysis_status === 'failed')
            ? data.ai_analysis_status
            : 'pending',
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

      let errorMessage = "Failed to load video data";

      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'PGRST116') {
          errorMessage = "Multiple videos found with the same title. This can happen when the same video is uploaded multiple times.";
          setDuplicateCount(videoCount || 0);
          setShowDuplicateWarning(true);
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!video) return;

    try {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisStatus('Initializing enhanced AI analysis...');

      // Initialize enhanced video analysis service
      const enhancedAiService = new EnhancedVideoAnalysisService({
        genAI: null, // Will be initialized internally
        API_KEY: import.meta.env.VITE_GEMINI_API_KEY
      });

      // Retrieve video URL for analysis
      setAnalysisProgress(10);
      setAnalysisStatus('Retrieving video for analysis...');
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

      setAnalysisProgress(20);
      setAnalysisStatus('Preparing enhanced analysis...');

      // Prepare enhanced analysis request
      const detectedSport = await determineSportFromVideo(video);
      setDetectedSport(detectedSport);

      // Use actual player data with names and jersey numbers
      const playerTagsWithData = taggedPlayers.map(player => ({
        playerId: player.id,
        playerName: player.full_name || 'Unknown Player',
        jerseyNumber: parseInt(player.jersey_number) || null,
        position: player.position || 'Unknown'
      }));

      console.log('Enhanced Video Analysis Debug Info:', {
        videoTitle: video.title,
        videoType: video.video_type,
        detectedSport: detectedSport,
        playerTags: playerTagsWithData,
        taggedPlayers: taggedPlayers,
        description: video.description,
        duration: video.duration,
        teamId: currentTeamId
      });

      const analysisRequest = {
        videoUrl: videoRetrieval.videoUrl,
        videoType: video.video_type,
        sport: detectedSport,
        metadata: {
          playerTags: playerTagsWithData,
          teamInfo: {
            homeTeam: video.opposing_team ? 'Your Team' : 'Home Team',
            awayTeam: video.opposing_team || 'Away Team',
            competition: video.league_competition || 'Unknown Competition',
            date: video.created_at
          },
          context: video.description || '',
          duration: video.duration
        }
      };

      // Perform enhanced AI analysis
      setAnalysisProgress(40);
      setAnalysisStatus('Running enhanced AI analysis with player tracking...');

      // Create a progress updater that simulates more granular progress
      let progressInterval: NodeJS.Timeout;
      const statusMessages = [
        'Analyzing player movements and positions...',
        'Detecting key actions and moments...',
        'Processing tactical analysis...',
        'Generating comprehensive insights...',
        'Finalizing analysis results...'
      ];
      let messageIndex = 0;

      const startProgress = () => {
        progressInterval = setInterval(() => {
          setAnalysisProgress(prev => {
            if (prev >= 75) return prev; // Don't go above 75% until analysis is done
            const newProgress = Math.min(prev + Math.random() * 3, 75);

            // Update status message every few progress updates
            if (Math.random() < 0.3 && messageIndex < statusMessages.length - 1) {
              messageIndex++;
              setAnalysisStatus(statusMessages[messageIndex]);
            }

            return newProgress;
          });
        }, 1500);
      };

      startProgress();

      const result = await enhancedAiService.analyzeVideo(analysisRequest);

      // Clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      if (result.success) {
        setAnalysisProgress(80);
        setAnalysisStatus('Processing enhanced analysis results...');

        // Update analysis data with enhanced results
        setAnalysisData({
          ...analysisData,
          ...result.analysis
        });
        setHasAnalysis(true);

        setAnalysisProgress(100);
        setAnalysisStatus('Enhanced analysis completed successfully!');

        toast({
          title: "Enhanced Analysis Complete",
          description: `AI analysis completed with player tracking, tactical analysis, and match statistics! Processing time: ${Math.round(result.analysis.processingTime / 1000)}s`,
        });
      } else {
        throw new Error(result.error || 'Enhanced analysis failed');
      }
    } catch (error) {
      console.error('Enhanced AI analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to complete enhanced AI analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisStatus('');
    }
  };

  const determineSportFromVideo = async (video: Video): Promise<'football' | 'basketball' | 'volleyball' | 'tennis' | 'rugby' | 'baseball' | 'soccer' | 'cricket' | 'hockey' | 'golf' | 'swimming' | 'athletics'> => {
    try {
      // First, try to get sport from team's sport_type
      if (currentTeamId) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('sport_type')
          .eq('id', currentTeamId)
          .single();

        if (teamData?.sport_type) {
          console.log('Sport detected from team:', teamData.sport_type);
          // Normalize sport type names
          const sportType = teamData.sport_type.toLowerCase();
          if (sportType === 'soccer') return 'football';
          if (sportType === 'football' || sportType === 'soccer') return 'football';
          return teamData.sport_type as any;
        }
      }

      // Fallback: Determine sport based on video content, tags, or description
      const videoContent = `${video.title} ${video.description || ''} ${video.tags.join(' ')}`.toLowerCase();

      // More comprehensive sport detection with better keyword matching

      // Football/Soccer
      if (videoContent.includes('football') || videoContent.includes('soccer') || videoContent.includes('futbol') ||
        videoContent.includes('goal') || videoContent.includes('penalty') || videoContent.includes('corner') ||
        videoContent.includes('stadium') || videoContent.includes('pitch') || videoContent.includes('referee')) {
        return 'football';
      }

      // Basketball
      if (videoContent.includes('basketball') || videoContent.includes('basket ball') || videoContent.includes('hoops') ||
        videoContent.includes('basket') || videoContent.includes('dunk') || videoContent.includes('three pointer') ||
        videoContent.includes('court') || videoContent.includes('backboard') || videoContent.includes('free throw')) {
        return 'basketball';
      }

      // Rugby
      if (videoContent.includes('rugby') || videoContent.includes('rugby union') || videoContent.includes('rugby league') ||
        videoContent.includes('try') || videoContent.includes('scrum') || videoContent.includes('lineout') ||
        videoContent.includes('tackle') || videoContent.includes('conversion') || videoContent.includes('maul')) {
        return 'rugby';
      }

      // Tennis
      if (videoContent.includes('tennis') || videoContent.includes('tennis court') || videoContent.includes('racket') ||
        videoContent.includes('ace') || videoContent.includes('serve') || videoContent.includes('match point') ||
        videoContent.includes('net') || videoContent.includes('forehand') || videoContent.includes('backhand')) {
        return 'tennis';
      }

      // Volleyball
      if (videoContent.includes('volleyball') || videoContent.includes('volley ball') || videoContent.includes('spike') ||
        videoContent.includes('block') || videoContent.includes('serve') || videoContent.includes('dig') ||
        videoContent.includes('setter') || videoContent.includes('attack') || videoContent.includes('reception')) {
        return 'volleyball';
      }

      // Baseball
      if (videoContent.includes('baseball') || videoContent.includes('base ball') || videoContent.includes('diamond') ||
        videoContent.includes('pitch') || videoContent.includes('bat') || videoContent.includes('home run') ||
        videoContent.includes('inning') || videoContent.includes('strike') || videoContent.includes('ball')) {
        return 'baseball';
      }

      // Cricket
      if (videoContent.includes('cricket') || videoContent.includes('wicket') || videoContent.includes('batting') ||
        videoContent.includes('bowling') || videoContent.includes('over') || videoContent.includes('run') ||
        videoContent.includes('six') || videoContent.includes('four') || videoContent.includes('stump')) {
        return 'cricket';
      }

      // Hockey
      if (videoContent.includes('hockey') || videoContent.includes('ice hockey') || videoContent.includes('field hockey') ||
        videoContent.includes('stick') || videoContent.includes('puck') || videoContent.includes('rink') ||
        videoContent.includes('check') || videoContent.includes('slapshot') || videoContent.includes('faceoff')) {
        return 'hockey';
      }

      // Golf
      if (videoContent.includes('golf') || videoContent.includes('putt') || videoContent.includes('tee') ||
        videoContent.includes('green') || videoContent.includes('fairway') || videoContent.includes('driver') ||
        videoContent.includes('iron') || videoContent.includes('wedge') || videoContent.includes('par')) {
        return 'golf';
      }

      // Swimming
      if (videoContent.includes('swimming') || videoContent.includes('pool') || videoContent.includes('stroke') ||
        videoContent.includes('freestyle') || videoContent.includes('backstroke') || videoContent.includes('breaststroke') ||
        videoContent.includes('butterfly') || videoContent.includes('medley') || videoContent.includes('lane')) {
        return 'swimming';
      }

      // Athletics/Track and Field
      if (videoContent.includes('athletics') || videoContent.includes('track') || videoContent.includes('sprint') ||
        videoContent.includes('marathon') || videoContent.includes('jump') || videoContent.includes('throw') ||
        videoContent.includes('relay') || videoContent.includes('hurdle') || videoContent.includes('pole vault')) {
        return 'athletics';
      }

      console.log('Sport detection - Video content:', videoContent);
      console.log('Defaulting to football for unknown sport');
      return 'football'; // Default to football
    } catch (error) {
      console.error('Error determining sport from team:', error);
      // Fallback to content-based detection
      const videoContent = `${video.title} ${video.description || ''} ${video.tags.join(' ')}`.toLowerCase();
      if (videoContent.includes('basketball') || videoContent.includes('basket') || videoContent.includes('hoops')) return 'basketball';
      if (videoContent.includes('tennis') || videoContent.includes('racket')) return 'tennis';
      if (videoContent.includes('volleyball') || videoContent.includes('spike')) return 'volleyball';
      return 'football'; // Default to football
    }
  };

  const mapAIResultsToAnalysisData = (aiResults: any): AnalysisData => {
    // Map comprehensive AI analysis results to the expected AnalysisData format
    const videoType = video?.video_type;

    switch (videoType) {
      case 'match':
        return {
          playerActions: aiResults.matchAnalysis?.playerActions?.map((action: any) => ({
            timestamp: action.timestamp || 0,
            action: action.action || 'Unknown',
            description: action.description || '',
            confidence: action.confidence || aiResults.confidence || 0.8,
            players: action.players || ['Unknown Player'],
            zone: action.zone || 'Unknown Zone'
          })) || [],
          keyMoments: aiResults.matchAnalysis?.keyMoments?.map((moment: any) => ({
            timestamp: moment.timestamp || 0,
            type: moment.type || 'Unknown',
            description: moment.description || '',
            importance: moment.importance || 'medium'
          })) || [],
          summary: aiResults.summary || 'AI analysis completed successfully.',
          insights: aiResults.recommendations || ['Analysis insights will appear here.'],
          performanceRating: aiResults.matchAnalysis?.performanceMetrics?.overallRating || 7.5,
          playerStats: aiResults.matchAnalysis?.playerStats?.map((player: any) => ({
            name: player.name || 'Unknown Player',
            position: player.position || 'Unknown',
            rating: player.rating || 7.0,
            actions: player.actions || 0,
            keyPasses: player.keyPasses || 0,
            goals: player.goals || 0
          })) || [],
          timeline: aiResults.matchAnalysis?.timeline?.map((item: any) => ({
            minute: item.minute || 0,
            events: item.events || ['Event']
          })) || []
        };

      case 'training':
        return {
          playerActions: aiResults.trainingAnalysis?.skillAssessment?.map((player: any) => ({
            timestamp: 0,
            action: 'Training Assessment',
            description: `${player.playerName} - Technical: ${player.technicalRating}/10, Physical: ${player.physicalRating}/10, Tactical: ${player.tacticalRating}/10`,
            confidence: aiResults.confidence || 0.8,
            players: [player.playerName],
            zone: 'Training Ground'
          })) || [],
          keyMoments: aiResults.trainingAnalysis?.coachingInsights?.keyLearnings?.map((learning: any, index: number) => ({
            timestamp: index * 60,
            type: 'Key Learning',
            description: learning,
            importance: 'high'
          })) || [],
          summary: aiResults.summary || 'Training session analysis completed.',
          insights: aiResults.recommendations || ['Training insights will appear here.'],
          performanceRating: aiResults.trainingAnalysis?.coachingInsights?.sessionEffectiveness || 7.5,
          playerStats: aiResults.trainingAnalysis?.skillAssessment?.map((player: any) => ({
            name: player.playerName || 'Unknown Player',
            position: player.position || 'Unknown',
            rating: (player.technicalRating + player.physicalRating + player.tacticalRating) / 3,
            actions: 0,
            keyPasses: 0,
            goals: 0
          })) || [],
          timeline: aiResults.trainingAnalysis?.sessionStructure?.mainDrills?.map((drill: any, index: number) => ({
            minute: index * 15,
            events: [drill]
          })) || []
        };

      case 'highlight':
        return {
          playerActions: aiResults.highlightAnalysis?.keyMoments?.map((moment: any) => ({
            timestamp: moment.timestamp || 0,
            action: moment.type || 'Highlight',
            description: moment.description || '',
            confidence: moment.skillLevel / 10 || aiResults.confidence || 0.8,
            players: [moment.playerInvolved || 'Unknown Player'],
            zone: 'Highlight Zone'
          })) || [],
          keyMoments: aiResults.highlightAnalysis?.keyMoments?.map((moment: any) => ({
            timestamp: moment.timestamp || 0,
            type: moment.type || 'Highlight',
            description: moment.description || '',
            importance: moment.skillLevel >= 8 ? 'high' : 'medium'
          })) || [],
          summary: aiResults.summary || 'Highlight analysis completed.',
          insights: aiResults.recommendations || ['Highlight insights will appear here.'],
          performanceRating: aiResults.highlightAnalysis?.performanceInsights?.overallQuality || 7.5,
          playerStats: aiResults.highlightAnalysis?.playerHighlights?.map((player: any) => ({
            name: player.playerName || 'Unknown Player',
            position: player.position || 'Unknown',
            rating: player.skillRating || 7.0,
            actions: player.highlightMoments?.length || 0,
            keyPasses: 0,
            goals: 0
          })) || [],
          timeline: aiResults.highlightAnalysis?.keyMoments?.map((moment: any, index: number) => ({
            minute: Math.floor((moment.timestamp || 0) / 60),
            events: [moment.type || 'Highlight', moment.description || '']
          })) || []
        };

      case 'interview':
        return {
          playerActions: aiResults.interviewAnalysis?.keyQuotes?.map((quote: any) => ({
            timestamp: quote.timestamp || 0,
            action: 'Quote',
            description: quote.quote || '',
            confidence: quote.importance === 'high' ? 0.9 : quote.importance === 'medium' ? 0.7 : 0.5,
            players: [quote.speaker || 'Unknown Speaker'],
            zone: 'Interview'
          })) || [],
          keyMoments: aiResults.interviewAnalysis?.keyQuotes?.map((quote: any) => ({
            timestamp: quote.timestamp || 0,
            type: 'Key Quote',
            description: quote.quote || '',
            importance: quote.importance || 'medium'
          })) || [],
          summary: aiResults.summary || 'Interview analysis completed.',
          insights: aiResults.recommendations || ['Interview insights will appear here.'],
          performanceRating: aiResults.interviewAnalysis?.communicationAnalysis?.overallEffectiveness || 7.5,
          playerStats: [{
            name: 'Interview Performance',
            position: 'Communication',
            rating: aiResults.interviewAnalysis?.communicationAnalysis?.overallEffectiveness || 7.0,
            actions: aiResults.interviewAnalysis?.keyQuotes?.length || 0,
            keyPasses: 0,
            goals: 0
          }],
          timeline: aiResults.interviewAnalysis?.keyQuotes?.map((quote: any, index: number) => ({
            minute: Math.floor((quote.timestamp || 0) / 60),
            events: [quote.speaker || 'Speaker', quote.quote?.substring(0, 50) + '...' || '']
          })) || []
        };

      default:
        return {
          playerActions: [],
          keyMoments: [],
          summary: aiResults.summary || 'Analysis completed.',
          insights: aiResults.recommendations || ['Analysis insights will appear here.'],
          performanceRating: 7.5,
          playerStats: [],
          timeline: []
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const jumpToTimestamp = (timestamp: number) => {
    console.log('Jumping to timestamp:', timestamp);
    console.log('Video duration:', video?.duration);
    console.log('Current time before jump:', currentTime);

    // Ensure timestamp is within video duration
    const safeTimestamp = Math.min(Math.max(0, timestamp), video?.duration || 0);
    console.log('Safe timestamp:', safeTimestamp);

    setCurrentTime(safeTimestamp);
    // Actually seek the video to the timestamp
    if (videoRef.current) {
      videoRef.current.seekTo(safeTimestamp);
    }
  };

  const getActionColor = (action: string) => {
    const colors = {
      'Goal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
      'Save': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'Tackle': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      'Pass': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'Shot': 'bg-red-500/20 text-red-400 border-red-500/50'
    };
    return colors[action] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  // Generate sample data for testing
  const generateSampleData = () => {
    if (!taggedPlayers.length) return null;

    const sampleActions = [
      {
        timestamp: 45.2,
        action: 'shot',
        description: 'Made 3-pointer from top of key',
        players: [taggedPlayers[0].full_name],
        confidence: 0.95,
        outcome: 'successful',
        zone: 'Top of Key'
      },
      {
        timestamp: 67.8,
        action: 'pass',
        description: 'Assist to teammate for layup',
        players: [taggedPlayers[0].full_name],
        confidence: 0.88,
        outcome: 'successful',
        zone: 'Left Wing'
      },
      {
        timestamp: 89.1,
        action: 'tackle',
        description: 'Steal and fast break',
        players: [taggedPlayers[0].full_name],
        confidence: 0.92,
        outcome: 'successful',
        zone: 'Center Court'
      }
    ];

    const samplePlayerTracking = taggedPlayers.map((player, index) => ({
      playerId: player.id,
      playerName: player.full_name,
      jerseyNumber: parseInt(player.jersey_number) || 30,
      position: player.position,
      positions: [
        { x: 50, y: 85, timestamp: 0, confidence: 0.95 },
        { x: 45, y: 80, timestamp: 30, confidence: 0.90 },
        { x: 55, y: 75, timestamp: 60, confidence: 0.88 }
      ],
      totalDistance: 2500,
      averageSpeed: 5.2,
      maxSpeed: 8.1,
      heatMapData: [
        { x: 50, y: 85, intensity: 0.8, timestamp: 0 },
        { x: 45, y: 80, intensity: 0.6, timestamp: 30 },
        { x: 55, y: 75, intensity: 0.9, timestamp: 60 }
      ],
      keyMoments: sampleActions.filter((_, i) => i === index)
    }));

    return {
      playerActions: sampleActions,
      playerTracking: samplePlayerTracking,
      tacticalAnalysis: {
        formationChanges: [
          { timestamp: 120.5, formation: "1-2-2", description: "Defensive formation" }
        ],
        pressingMoments: [
          { timestamp: 67.3, intensity: "high", description: "Full court press" }
        ],
        buildUpPlay: [
          { timestamp: 89.1, type: "fast_break", description: "Quick transition" }
        ]
      },
      matchStatistics: {
        possession: { home: 55, away: 45 },
        shots: { home: 25, away: 18 },
        passes: { home: 320, away: 280, accuracy: { home: 85, away: 78 } },
        goals: sampleActions.filter(a => a.action === 'shot'),
        cards: [],
        substitutions: []
      },
      // Add missing properties
      keyMoments: sampleActions,
      summary: "Steph Curry dominated this game with exceptional shooting and court vision. His 3-point shooting was particularly effective, and he showed great leadership in directing the team's offense.",
      insights: [
        "Exceptional 3-point shooting accuracy from beyond the arc",
        "Strong court vision and passing ability",
        "Effective leadership and team coordination",
        "Consistent performance throughout the game",
        "Quick decision making in fast break situations",
        "Excellent defensive awareness and positioning"
      ],
      performanceRating: 8.5,
      recommendations: [
        "Continue working on 3-point shooting consistency",
        "Focus on defensive positioning and awareness",
        "Develop more mid-range shooting options"
      ],
      confidence: 0.92,
      processingTime: 45000,
      sportSpecificInsights: {
        basketball: {
          shooting: "High accuracy from 3-point range",
          passing: "Excellent court vision and assist rate",
          defense: "Strong perimeter defense"
        }
      },
      // Add more missing properties
      timeline: sampleActions.map(action => ({
        timestamp: action.timestamp,
        type: action.action,
        description: action.description
      })),
      playerStats: taggedPlayers.map((player, index) => ({
        name: player.full_name,
        rating: 8.5 - (index * 0.2),
        actions: Math.floor(Math.random() * 20) + 10,
        keyPasses: Math.floor(Math.random() * 10) + 5,
        goals: Math.floor(Math.random() * 5)
      }))
    };
  };

  // Extract key moments from player tracking if not available in main analysis
  const extractKeyMomentsFromPlayerTracking = (data: any) => {
    if (!data?.playerTracking) return [];

    const allKeyMoments: any[] = [];
    data.playerTracking.forEach((player: any) => {
      if (player.keyMoments && Array.isArray(player.keyMoments)) {
        player.keyMoments.forEach((moment: any) => {
          allKeyMoments.push({
            timestamp: moment.timestamp || 0,
            type: moment.type || 'action',
            description: moment.description || `${player.playerName} - ${moment.type || 'action'}`,
            confidence: moment.confidence || 0.8,
            players: [player.playerName],
            outcome: moment.outcome || 'unknown',
            zone: moment.fieldPosition || 'Unknown zone',
            importance: moment.importance || 'high'
          });
        });
      }
    });

    // Sort by timestamp and remove duplicates
    return allKeyMoments
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((moment, index, arr) =>
        index === 0 || moment.timestamp !== arr[index - 1].timestamp
      );
  };

  // Use sample data if no real analysis data
  const effectiveAnalysisData = analysisData || (hasAnalysis ? generateSampleData() : null);

  // Extract key moments from player tracking if needed
  if (effectiveAnalysisData && (!effectiveAnalysisData.keyMoments || effectiveAnalysisData.keyMoments.length === 0)) {
    const extractedKeyMoments = extractKeyMomentsFromPlayerTracking(effectiveAnalysisData);
    if (extractedKeyMoments.length > 0) {
      effectiveAnalysisData.keyMoments = extractedKeyMoments;
    }
  }

  // Extract player actions from key moments if player actions are empty
  if (effectiveAnalysisData && (!effectiveAnalysisData.playerActions || effectiveAnalysisData.playerActions.length === 0)) {
    const extractedActions = extractKeyMomentsFromPlayerTracking(effectiveAnalysisData).map(moment => ({
      timestamp: moment.timestamp,
      action: moment.type,
      description: moment.description,
      players: moment.players,
      confidence: moment.confidence,
      outcome: moment.outcome,
      zone: moment.zone
    }));
    if (extractedActions.length > 0) {
      effectiveAnalysisData.playerActions = extractedActions;
    }
  }

  const filteredActions = effectiveAnalysisData?.playerActions.filter(action => {
    const matchesFilter = selectedFilter === 'all' || action.action.toLowerCase() === selectedFilter;
    const matchesSearch = searchTerm === '' ||
      action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const filteredKeyMoments = effectiveAnalysisData?.keyMoments.filter(moment => {
    const matchesFilter = momentFilter === 'all' || (moment as any).type?.toLowerCase() === momentFilter;
    const matchesSearch = momentSearchTerm === '' ||
      moment.description?.toLowerCase().includes(momentSearchTerm.toLowerCase()) ||
      (moment as any).context?.toLowerCase().includes(momentSearchTerm.toLowerCase()) ||
      (moment as any).participants?.some((participant: string) => participant.toLowerCase().includes(momentSearchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  }) || [];

  // Debug: Log analysis data
  useEffect(() => {
    if (hasAnalysis && effectiveAnalysisData) {
      console.log('Analysis Data Debug:', {
        playerActions: effectiveAnalysisData.playerActions?.length || 0,
        playerTracking: effectiveAnalysisData.playerTracking?.length || 0,
        tacticalAnalysis: effectiveAnalysisData.tacticalAnalysis,
        matchStatistics: effectiveAnalysisData.matchStatistics,
        keyMoments: effectiveAnalysisData.keyMoments?.length || 0
      });

      // Log sample player actions
      if (effectiveAnalysisData.playerActions?.length > 0) {
        console.log('Sample Player Actions:', effectiveAnalysisData.playerActions.slice(0, 3));
      }

      // Log sample player tracking
      if (effectiveAnalysisData.playerTracking?.length > 0) {
        console.log('Sample Player Tracking:', effectiveAnalysisData.playerTracking[0]);

        // Log sample timestamps to verify conversion
        const samplePositions = effectiveAnalysisData.playerTracking[0].positions || [];
        if (samplePositions.length > 0) {
          console.log('Sample Position Timestamps:', samplePositions.map(p => ({ timestamp: p.timestamp, x: p.x, y: p.y })));
        }
      }
    }
  }, [hasAnalysis, effectiveAnalysisData]);

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
            <p className="text-gray-400 mb-6">The video you're looking for doesn't exist or has been removed.</p>
            <Button
              onClick={() => navigate('/videos')}
              className="bg-bright-pink hover:bg-bright-pink/90"
            >
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
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/videos')}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Videos
              </Button>
              <div>
                <h1 className="text-3xl font-polysans text-white">
                  {video.title}
                </h1>

              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30 capitalize">
                {video.video_type}
              </Badge>
              <Button
                variant="outline"
                className="border-bright-pink/30 text-bright-pink hover:bg-bright-pink/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Video Player Section */}
          <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                  <SmartVideoPlayer
                    ref={videoRef}
                    videoUrl={video.compressed_url || video.video_url}
                    thumbnailUrl={video.thumbnail_url}
                    title={video.title}
                    duration={video.duration}
                    onTimeUpdate={(time) => setCurrentTime(time)}
                    className="w-full h-full"
                    controls={true}
                    autoPlay={false}
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-xl mb-1">{video.title}</h3>
                      <div className="flex items-center gap-4 text-gray-400 text-sm">
                        <span className="flex items-center gap-1">
                          <Timer className="w-4 h-4" />
                          {formatDuration(video.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(video.created_at)}
                        </span>
                        {video.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(video.file_size)}</span>
                          </>
                        )}
                      </div>

                      {/* Tagged Players Button */}
                      {playerIds.length > 0 && (
                        <div className="mt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="border-bright-pink/30 text-bright-pink hover:bg-bright-pink/10"
                              >
                                <Users className="w-4 h-4 mr-2" />
                                View Tagged Players ({playerIds.length})
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-white flex items-center gap-2">
                                  <Users className="w-5 h-5 text-bright-pink" />
                                  Tagged Players ({playerIds.length})
                                </DialogTitle>
                              </DialogHeader>
                              <div className="mt-4">
                                <PlayerTagDisplay
                                  players={taggedPlayers}
                                  loading={playersLoading}
                                  size="md"
                                  showJerseyNumber={true}
                                  showTeamInfo={true}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="border-bright-pink/30 text-bright-pink hover:bg-bright-pink/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Enhanced AI Analysis Button */}
                  <Button
                    onClick={handleAnalyzeVideo}
                    disabled={isAnalyzing}
                    className="w-full bg-bright-pink hover:bg-bright-pink/90 text-white disabled:opacity-50"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {analysisStatus}
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Run Enhanced AI Analysis
                      </>
                    )}
                  </Button>

                  {/* Analysis Progress Bar */}
                  {isAnalyzing && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Analysis Progress</span>
                        <span className="text-bright-pink font-semibold">{Math.round(analysisProgress)}%</span>
                      </div>
                      <Progress value={analysisProgress} className="h-3 bg-gray-700/50" />
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-2 h-2 bg-bright-pink rounded-full animate-pulse"></div>
                        <span>{analysisStatus || 'Processing...'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm font-medium">Total Events</p>
                    <p className="text-white text-3xl font-bold mt-1">
                      {effectiveAnalysisData?.playerActions.length || 0}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-blue-300">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      {hasAnalysis ? 'Events detected' : 'No data yet'}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Activity className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border-emerald-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-200 text-sm font-medium">Key Moments</p>
                    <p className="text-white text-3xl font-bold mt-1">
                      {effectiveAnalysisData?.keyMoments.length || 0}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-emerald-300">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      {hasAnalysis ? 'Key moments found' : 'No moments yet'}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Target className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm font-medium">Performance</p>
                    <div className="flex items-center mt-1">
                      <p className="text-white text-3xl font-bold">
                        {effectiveAnalysisData?.performanceRating || 0}
                      </p>
                      <span className="text-gray-400 text-lg ml-1">/10</span>
                    </div>
                    <div className="flex items-center mt-2 text-xs text-purple-300">
                      <Star className="w-3 h-3 mr-1" />
                      {hasAnalysis ? 'Performance analyzed' : 'No rating yet'}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Award className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 border-orange-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-200 text-sm font-medium">AI Confidence</p>
                    <p className="text-white text-3xl font-bold mt-1">
                      {hasAnalysis ? 'High' : 'N/A'}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-orange-300">
                      <Zap className="w-3 h-3 mr-1" />
                      {hasAnalysis ? 'Analysis completed' : 'Run analysis first'}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-500/20 rounded-xl">
                    <Eye className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sport Type Display */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm font-medium">Sport Type</p>
                    <p className="text-white text-3xl font-bold mt-1">
                      {detectedSport ? detectedSport.charAt(0).toUpperCase() + detectedSport.slice(1) : 'Detecting...'}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-blue-300">
                      <Target className="w-3 h-3 mr-1" />
                      {detectedSport ? 'Sport identified' : 'Analyzing video content'}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Target className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Analysis Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className={`grid w-full ${video?.video_type === 'interview' ? 'grid-cols-5' : 'grid-cols-6'} bg-gray-800/50 backdrop-blur-sm border-0 p-1`}>
              <TabsTrigger value="overview" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              {video?.video_type === 'interview' ? (
                <TabsTrigger value="quotes" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
                  Key Quotes
                </TabsTrigger>
              ) : (
                <TabsTrigger value="player-analysis" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
                  Player Analysis
                </TabsTrigger>
              )}
              <TabsTrigger value="moments" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
                {video?.video_type === 'interview' ? 'Communication' : 'Key Moments'}
              </TabsTrigger>
              {video?.video_type !== 'interview' && (
                <>
                  <TabsTrigger value="tactics" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
                    Tactics
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="insights" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Performance Timeline */}
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-bright-pink" />
                    {video?.video_type === 'interview' ? 'Interview Timeline' : 'Match Timeline'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-2">No analysis data available</p>
                      <p className="text-gray-500 text-sm">Click "Analyze Video with AI" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(effectiveAnalysisData as any)?.timeline?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer hover:border-bright-pink/30 border border-transparent"
                          onClick={() => jumpToTimestamp(item.timestamp || (item.minute * 60))}
                        >
                          <div className="w-12 h-12 bg-bright-pink/20 rounded-full flex items-center justify-center text-bright-pink font-semibold">
                            {item.minute}'
                          </div>
                          <div className="flex-1">
                            <div className="flex gap-2 mb-1">
                              {item.events.map((event, eventIndex) => (
                                <Badge key={eventIndex} variant="outline" className="text-xs border-gray-600 text-gray-300">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Analysis Summary */}
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-bright-pink" />
                    Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-2">No analysis summary available</p>
                      <p className="text-gray-500 text-sm">Run AI analysis to get detailed insights</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-300 leading-relaxed text-lg mb-6">
                        {effectiveAnalysisData?.summary || 'Analysis summary will appear here after AI processing.'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <ArrowUp className="w-4 h-4 text-green-400" />
                            Key Insights
                          </h4>
                          <div className="space-y-2">
                            {effectiveAnalysisData?.insights?.slice(0, 3).map((insight, index) => (
                              <div key={index} className="flex items-center gap-2 text-green-400 text-sm">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                {insight}
                              </div>
                            )) || (
                                <p className="text-gray-500 text-sm">No insights available yet</p>
                              )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-white font-semibold flex items-center gap-2">
                            <ArrowDown className="w-4 h-4 text-orange-400" />
                            Recommendations
                          </h4>
                          <div className="space-y-2">
                            {effectiveAnalysisData?.insights?.slice(3, 6).map((insight, index) => (
                              <div key={index} className="flex items-center gap-2 text-orange-400 text-sm">
                                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                {insight}
                              </div>
                            )) || (
                                <p className="text-gray-500 text-sm">No recommendations available yet</p>
                              )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="player-analysis" className="space-y-6">
              {/* Enhanced Player Analysis */}
              {!hasAnalysis ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 mb-2">No player analysis data available</p>
                  <p className="text-gray-500 text-sm">Run AI analysis to see player actions, tracking, and performance insights</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Action Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {effectiveAnalysisData?.playerActions?.length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Total Actions</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {effectiveAnalysisData?.playerActions?.filter((a: any) => a.action === 'goal').length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Goals</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {effectiveAnalysisData?.playerActions?.filter((a: any) => a.action === 'assist').length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Assists</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {effectiveAnalysisData?.playerActions?.filter((a: any) => a.action === 'tackle').length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Tackles</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {effectiveAnalysisData?.playerActions?.filter((a: any) => a.action === 'shot').length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Shots</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">
                          {effectiveAnalysisData?.playerActions?.filter((a: any) => a.action === 'save' || a.action === 'brilliant_save').length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Saves</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Filters */}
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300 text-sm">Filter:</span>
                        </div>
                        <div className="flex gap-2">
                          {[
                            'all', 'goal', 'assist', 'tackle', 'pass', 'shot', 'save', 'interception', 'foul', 'substitution',
                            'dribble', 'cross', 'corner', 'free_kick', 'throw_in', 'penalty', 'offside', 'yellow_card', 'red_card',
                            'block', 'clearance', 'header', 'volley', 'through_ball', 'long_ball', 'short_pass', 'key_pass',
                            'big_chance', 'missed_shot', 'shot_on_target', 'shot_off_target', 'saves', 'clean_sheet',
                            'goal_conceded', 'own_goal', 'handball', 'dive', 'time_wasting', 'celebration', 'injury', 'recovery',
                            'sprint', 'jog', 'walk', 'position_change', 'formation_change', 'tactical_foul', 'professional_foul',
                            'last_man_tackle', 'sliding_tackle', 'standing_tackle', 'aerial_duel', 'ground_duel', 'ball_recovery',
                            'turnover', 'mistake', 'error', 'brilliant_save', 'catches', 'punches', 'distribution', 'communication',
                            'leadership', 'motivation'
                          ].slice(0, 12).map((filter) => (
                            <Button
                              key={filter}
                              variant={selectedFilter === filter ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedFilter(filter)}
                              className={selectedFilter === filter ? "bg-bright-pink hover:bg-bright-pink/80" : "border-gray-600 text-gray-300"}
                            >
                              {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </Button>
                          ))}
                        </div>
                        <div className="flex-1 max-w-xs relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search actions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 border-0 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-bright-pink focus:border-transparent"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Player Overview Section */}
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-bright-pink" />
                        Tagged Players ({taggedPlayers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {taggedPlayers.map((player, index) => (
                          <div key={player.id} className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                              {player.photo_url ? (
                                <img
                                  src={player.photo_url}
                                  alt={player.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (nextElement) {
                                      nextElement.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div className="w-full h-full bg-gradient-to-br from-bright-pink/20 to-blue-500/20 flex items-center justify-center text-white font-bold text-lg" style={{ display: player.photo_url ? 'none' : 'flex' }}>
                                {player.full_name.split(' ').map(n => n[0]).join('')}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold truncate">{player.full_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Badge variant="outline" className="text-xs border-bright-pink/50 text-bright-pink">
                                  #{player.jersey_number}
                                </Badge>
                                <span>{player.position}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 truncate">{player.bio}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions List */}
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-bright-pink" />
                        Player Actions & Timeline ({filteredActions.length})
                      </CardTitle>
                      <p className="text-gray-400 text-sm">Click on any action to jump to that moment in the video</p>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {filteredActions.map((action, index) => (
                            <div
                              key={index}
                              className="group p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-all duration-200 border border-transparent hover:border-bright-pink/30"
                              onClick={() => jumpToTimestamp(action.timestamp)}
                            >
                              <div className="flex items-start gap-4">
                                {/* Player Avatar */}
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex-shrink-0">
                                  {(() => {
                                    const player = taggedPlayers.find(p => action.players?.includes(p.full_name));
                                    if (player?.photo_url) {
                                      return (
                                        <img
                                          src={player.photo_url}
                                          alt={player.full_name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (nextElement) {
                                              nextElement.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div className="w-full h-full bg-gradient-to-br from-bright-pink/20 to-blue-500/20 flex items-center justify-center text-white font-bold text-sm">
                                    {(() => {
                                      const player = taggedPlayers.find(p => action.players?.includes(p.full_name));
                                      return player?.full_name.split(' ').map(n => n[0]).join('') || '?';
                                    })()}
                                  </div>
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Badge className={getActionColor(action.action)}>
                                      {action.action}
                                    </Badge>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTime(action.timestamp)}
                                    </span>
                                    {action.zone && (
                                      <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {action.zone}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-white text-sm mb-2">{action.description}</p>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-400">
                                        {(() => {
                                          const player = taggedPlayers.find(p => action.players?.includes(p.full_name));
                                          if (player) {
                                            return `${player.full_name} (#${player.jersey_number})`;
                                          }
                                          return action.players?.join(', ') || 'Unknown Player';
                                        })()}
                                      </span>
                                    </div>
                                    {action.outcome && (
                                      <Badge variant="outline" className={
                                        action.outcome === 'successful'
                                          ? 'border-green-500/50 text-green-400'
                                          : action.outcome === 'failed'
                                            ? 'border-red-500/50 text-red-400'
                                            : 'border-gray-500/50 text-gray-400'
                                      }>
                                        {action.outcome}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right space-y-1">
                                  <p className="text-xs text-gray-400">Confidence</p>
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={action.confidence * 100}
                                      className="w-16 h-2"
                                    />
                                    <span className="text-white font-semibold text-sm">
                                      {Math.round(action.confidence * 100)}%
                                    </span>
                                  </div>
                                </div>

                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-bright-pink transition-colors" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Key Quotes Tab for Interviews */}
            <TabsContent value="quotes" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Quote className="w-5 h-5 text-bright-pink" />
                    Key Quotes Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Quote className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-2">No quotes available</p>
                      <p className="text-gray-500 text-sm">Run AI analysis to extract key quotes from the interview</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {effectiveAnalysisData?.playerActions?.map((quote, index) => (
                          <div
                            key={index}
                            className="group p-6 bg-gradient-to-r from-gray-700/30 to-gray-700/10 rounded-xl hover:from-bright-pink/10 hover:to-bright-pink/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-bright-pink/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 bg-bright-pink/20 rounded-full flex items-center justify-center">
                                    <span className="text-bright-pink font-semibold text-sm">
                                      {Math.floor(quote.timestamp / 60)}'
                                    </span>
                                  </div>
                                  <Badge className="bg-bright-pink text-white px-3 py-1">
                                    Quote
                                  </Badge>
                                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                                    {quote.players?.[0] || 'Speaker'}
                                  </Badge>
                                </div>
                                <blockquote className="text-white text-lg font-medium mb-3 italic">
                                  "{quote.description}"
                                </blockquote>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatTime(quote.timestamp)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {Math.round(quote.confidence * 100)}% confidence
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Player Tracking Visualization */}
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-bright-pink" />
                    Player Tracking & Movement Analysis
                  </CardTitle>
                  <p className="text-gray-400 text-sm">Real-time player positions and movement patterns throughout the video</p>
                </CardHeader>
                <CardContent>
                  <PlayerTrackingVisualization
                    playerTracking={effectiveAnalysisData?.playerTracking || []}
                    tacticalAnalysis={effectiveAnalysisData?.tacticalAnalysis || {
                      formationChanges: [],
                      pressingMoments: [],
                      buildUpPlay: [],
                      defensiveActions: [],
                      attackingPatterns: []
                    }}
                    matchStatistics={effectiveAnalysisData?.matchStatistics || {
                      possession: { home: 50, away: 50 },
                      shots: { home: 0, away: 0 },
                      passes: { home: 0, away: 0, accuracy: { home: 0, away: 0 } },
                      goals: [],
                      cards: [],
                      substitutions: []
                    }}
                    onTimestampClick={jumpToTimestamp}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="moments" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    {video?.video_type === 'interview' ? (
                      <>
                        <Users className="w-5 h-5 text-bright-pink" />
                        Communication Analysis
                      </>
                    ) : (
                      <>
                        <Star className="w-5 h-5 text-bright-pink" />
                        Key Moments & Special Events
                      </>
                    )}
                  </CardTitle>
                  <p className="text-gray-400 text-sm">
                    {video?.video_type === 'interview'
                      ? 'Important communication moments and key quotes'
                      : 'Referee decisions, commentary, substitutions, celebrations, and game-changing moments'
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        {video?.video_type === 'interview' ? (
                          <Users className="w-8 h-8 text-gray-400" />
                        ) : (
                          <Target className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-400 mb-2">No analysis data available</p>
                      <p className="text-gray-500 text-sm">Run AI analysis to get detailed insights</p>
                    </div>
                  ) : video?.video_type === 'interview' ? (
                    <div className="space-y-6">
                      {/* Communication Analysis for Interviews */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-white font-semibold mb-3">Communication Effectiveness</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-300 text-sm">Clarity</span>
                              <span className="text-white font-semibold">
                                {(effectiveAnalysisData as any)?.playerStats?.[0]?.rating || 0}/10
                              </span>
                            </div>
                            <Progress value={((effectiveAnalysisData as any)?.playerStats?.[0]?.rating || 0) * 10} className="h-2" />
                            <div className="flex justify-between">
                              <span className="text-gray-300 text-sm">Confidence</span>
                              <span className="text-white font-semibold">
                                {effectiveAnalysisData?.performanceRating || 0}/10
                              </span>
                            </div>
                            <Progress value={(effectiveAnalysisData?.performanceRating || 0) * 10} className="h-2" />
                            <div className="flex justify-between">
                              <span className="text-gray-300 text-sm">Engagement</span>
                              <span className="text-white font-semibold">
                                {Math.max(0, (effectiveAnalysisData?.performanceRating || 0) - 1)}/10
                              </span>
                            </div>
                            <Progress value={Math.max(0, (effectiveAnalysisData?.performanceRating || 0) - 1) * 10} className="h-2" />
                          </div>
                        </div>
                        <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <h4 className="text-white font-semibold mb-3">Key Communication Insights</h4>
                          <div className="space-y-2 text-sm">
                            {effectiveAnalysisData?.insights?.slice(0, 3).map((insight, index) => (
                              <div key={index} className="flex items-center gap-2 text-green-400">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                {insight}
                              </div>
                            )) || (
                                <p className="text-gray-500 text-sm">No insights available yet</p>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Key Moments Filters */}
                      <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">Filter by Type:</span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {['all', 'referee_decision', 'commentary', 'substitution', 'celebration', 'controversy', 'tactical_change', 'VAR_review', 'penalty_awarded', 'goal_celebration', 'save_of_match', 'turning_point', 'momentum_shift'].map((filter) => (
                                  <Button
                                    key={filter}
                                    variant={momentFilter === filter ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setMomentFilter(filter)}
                                    className={momentFilter === filter ? "bg-bright-pink hover:bg-bright-pink/80" : "border-gray-600 text-gray-300"}
                                  >
                                    {filter.replace(/_/g, ' ').charAt(0).toUpperCase() + filter.replace(/_/g, ' ').slice(1)}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">Search:</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Search moments, context, or participants..."
                                value={momentSearchTerm}
                                onChange={(e) => setMomentSearchTerm(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-bright-pink"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-sm">
                                Showing {filteredKeyMoments.length} of {effectiveAnalysisData?.keyMoments?.length || 0} moments
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setMomentFilter('all')}
                                  className="border-gray-600 text-gray-300"
                                >
                                  Clear Filters
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Key Moments List */}
                      {filteredKeyMoments.map((moment, index) => (
                        <div
                          key={index}
                          className="group p-6 bg-gradient-to-r from-gray-700/30 to-gray-700/10 rounded-xl hover:from-bright-pink/10 hover:to-bright-pink/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-bright-pink/30"
                          onClick={() => jumpToTimestamp(moment.timestamp)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-bright-pink/20 rounded-full flex items-center justify-center">
                                  <span className="text-bright-pink font-semibold text-sm">
                                    {Math.floor(moment.timestamp / 60)}'
                                  </span>
                                </div>
                                <Badge className="bg-bright-pink text-white px-3 py-1">
                                  {moment.type?.replace(/_/g, ' ').toUpperCase() || 'KEY MOMENT'}
                                </Badge>
                                <Badge variant="outline" className={
                                  moment.importance === 'critical' || moment.importance === 'high'
                                    ? 'border-red-500/50 text-red-400'
                                    : moment.importance === 'medium'
                                      ? 'border-yellow-500/50 text-yellow-400'
                                      : 'border-blue-500/50 text-blue-400'
                                }>
                                  {(moment.importance || 'MEDIUM').toUpperCase()} IMPACT
                                </Badge>
                                {moment.source && (
                                  <Badge variant="outline" className="border-gray-500/50 text-gray-400">
                                    {moment.source?.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-white text-lg font-medium mb-2">{moment.description}</p>
                              {moment.context && (
                                <p className="text-gray-300 text-sm mb-2 italic">
                                  "{moment.context}"
                                </p>
                              )}
                              {moment.participants && moment.participants.length > 0 && (
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400 text-sm">
                                    {moment.participants.join(', ')}
                                  </span>
                                </div>
                              )}
                              <p className="text-gray-400 text-sm">
                                Click to jump to {formatTime(moment.timestamp)} in the video
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-bright-pink transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="players" className="space-y-6">
              {!hasAnalysis ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 mb-2">No player data available</p>
                  <p className="text-gray-500 text-sm">Run AI analysis to see individual player statistics</p>
                </div>
              ) : (
                <PlayerPerformanceAnalysis
                  playerTracking={effectiveAnalysisData?.playerTracking || []}
                  matchStatistics={effectiveAnalysisData?.matchStatistics || {
                    possession: { home: 50, away: 50 },
                    shots: { home: 0, away: 0 },
                    passes: { home: 0, away: 0, accuracy: { home: 0, away: 0 } },
                    goals: [],
                    cards: [],
                    substitutions: []
                  }}
                  onTimestampClick={jumpToTimestamp}
                />
              )}
            </TabsContent>


            {/* Enhanced Tactical Analysis Tab */}
            <TabsContent value="tactics" className="space-y-6">
              {!hasAnalysis ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 mb-2">No tactical analysis data available</p>
                  <p className="text-gray-500 text-sm">Run enhanced AI analysis to see formation changes, tactical patterns, and strategic insights</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Enhanced Formation Visualizer with Real-time Movement */}
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-bright-pink" />
                        Real-time Formation Analysis
                      </CardTitle>
                      <p className="text-gray-400 text-sm">
                        Live formation tracking synchronized with video playback - shows full team formations, not just tagged players
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EnhancedFormationVisualizer
                        playerTracking={effectiveAnalysisData?.playerTracking || []}
                        tacticalAnalysis={effectiveAnalysisData?.tacticalAnalysis || {}}
                        currentTime={currentTime}
                        videoRef={videoRef}
                        onTimestampChange={jumpToTimestamp}
                        taggedPlayers={taggedPlayers}
                        detectedSport={detectedSport}
                      />
                    </CardContent>
                  </Card>

                  {/* Enhanced Heat Map with Comprehensive Data */}
                  <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-bright-pink" />
                        Comprehensive Heat Map Analysis
                      </CardTitle>
                      <p className="text-gray-400 text-sm">
                        Multi-timestamp heat maps showing player movement patterns, activity zones, and intensity throughout the entire video
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EnhancedHeatMapVisualizer
                        playerTracking={effectiveAnalysisData?.playerTracking || []}
                        currentTime={currentTime}
                        onTimestampClick={jumpToTimestamp}
                        videoRef={videoRef}
                      />
                    </CardContent>
                  </Card>

                  {/* Tactical Insights */}
                  {effectiveAnalysisData?.sportSpecificInsights && (
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Target className="w-5 h-5 text-bright-pink" />
                          Tactical Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-white font-semibold mb-2">Formation</h4>
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                {analysisData.sportSpecificInsights.formation}
                              </Badge>
                            </div>
                            <div>
                              <h4 className="text-white font-semibold mb-2">Tactical Style</h4>
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                                {analysisData.sportSpecificInsights.tacticalStyle}
                              </Badge>
                            </div>
                            <div>
                              <h4 className="text-white font-semibold mb-2">Key Strengths</h4>
                              <div className="space-y-1">
                                {analysisData.sportSpecificInsights.keyStrengths.map((strength, index) => (
                                  <div key={index} className="flex items-center gap-2 text-green-400 text-sm">
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    {strength}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-white font-semibold mb-2">Areas for Improvement</h4>
                              <div className="space-y-1">
                                {analysisData.sportSpecificInsights.areasForImprovement.map((improvement, index) => (
                                  <div key={index} className="flex items-center gap-2 text-orange-400 text-sm">
                                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                    {improvement}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-white font-semibold mb-2">Performance Metrics</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Team Rating</span>
                                  <span className="text-white">{analysisData.sportSpecificInsights.performanceMetrics.overallTeamRating}/10</span>
                                </div>
                                <Progress value={analysisData.sportSpecificInsights.performanceMetrics.overallTeamRating * 10} className="h-2" />
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Tactical Effectiveness</span>
                                  <span className="text-white">{analysisData.sportSpecificInsights.performanceMetrics.tacticalEffectiveness}/10</span>
                                </div>
                                <Progress value={analysisData.sportSpecificInsights.performanceMetrics.tacticalEffectiveness * 10} className="h-2" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {/* Enhanced AI Insights */}
              <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-bright-pink" />
                    AI-Generated Insights & Analysis
                  </CardTitle>
                  <p className="text-gray-400 text-sm">
                    Comprehensive AI analysis providing deep insights into player performance, tactical patterns, and strategic recommendations
                  </p>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-2">No insights available</p>
                      <p className="text-gray-500 text-sm">Run enhanced AI analysis to get detailed insights and strategic recommendations</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Key Insights Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Array.isArray(effectiveAnalysisData?.insights) && effectiveAnalysisData.insights.map((insight, index) => (
                          <div key={index} className="p-6 bg-gradient-to-br from-gray-700/30 to-gray-700/10 rounded-lg border border-gray-600/30 hover:border-bright-pink/30 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-bright-pink/20 to-bright-pink/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <Zap className="w-5 h-5 text-bright-pink" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30 text-xs">
                                    Insight #{index + 1}
                                  </Badge>
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                </div>
                                <p className="text-white font-medium mb-2">Strategic Analysis</p>
                                <p className="text-gray-300 text-sm leading-relaxed">{insight}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary Insights */}
                      {effectiveAnalysisData?.summary && (
                        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <Quote className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="text-blue-400 font-semibold mb-2">AI Analysis Summary</h4>
                              <p className="text-gray-300 leading-relaxed">{effectiveAnalysisData.summary}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sport-Specific Insights */}
                      {effectiveAnalysisData?.sportSpecificInsights && (
                        <div className="p-6 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-lg border border-green-500/30">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <Target className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <h4 className="text-green-400 font-semibold mb-3">Sport-Specific Analysis</h4>
                              <div className="space-y-2">
                                {Array.isArray(effectiveAnalysisData.sportSpecificInsights) ? (
                                  effectiveAnalysisData.sportSpecificInsights.map((insight: string, index: number) => (
                                    <div key={index} className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                      <p className="text-gray-300 text-sm">{insight}</p>
                                    </div>
                                  ))
                                ) : typeof effectiveAnalysisData.sportSpecificInsights === 'object' ? (
                                  Object.entries(effectiveAnalysisData.sportSpecificInsights).map(([key, value], index) => (
                                    <div key={index} className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                      <div>
                                        <p className="text-gray-300 text-sm">
                                          <span className="text-green-400 font-medium">{key}:</span> {String(value)}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-gray-300 text-sm">{String(effectiveAnalysisData.sportSpecificInsights)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced AI Recommendations */}
              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-bright-pink" />
                    AI Recommendations & Strategic Insights
                  </CardTitle>
                  <p className="text-gray-400 text-sm">
                    Actionable recommendations based on AI analysis to improve performance and strategic approach
                  </p>
                </CardHeader>
                <CardContent>
                  {!hasAnalysis ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-400 mb-2">No recommendations available</p>
                      <p className="text-gray-500 text-sm">Run enhanced AI analysis to get personalized strategic recommendations</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Enhanced Recommendations */}
                      {effectiveAnalysisData?.recommendations && Array.isArray(analysisData.recommendations) && analysisData.recommendations.length > 0 ? (
                        analysisData.recommendations.map((recommendation, index) => (
                          <div key={index} className="p-5 bg-gray-700/30 rounded-lg border-l-4 border-bright-pink hover:bg-gray-700/40 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-bright-pink to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Zap className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-bright-pink font-semibold">Strategic Recommendation #{index + 1}</h4>
                                  <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30 text-xs">
                                    Priority {index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low'}
                                  </Badge>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">{recommendation}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        // Fallback to basic insights with enhanced styling
                        Array.isArray(effectiveAnalysisData?.insights) && effectiveAnalysisData.insights.slice(0, 3).map((insight, index) => (
                          <div key={index} className="p-5 bg-gray-700/30 rounded-lg border-l-4 border-bright-pink hover:bg-gray-700/40 transition-all duration-300">
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-bright-pink to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <Zap className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-bright-pink font-semibold">AI Insight #{index + 1}</h4>
                                  <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30 text-xs">
                                    Analysis
                                  </Badge>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">{insight}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Additional Strategic Insights */}
                      {effectiveAnalysisData?.playerActions && Array.isArray(effectiveAnalysisData.playerActions) && effectiveAnalysisData.playerActions.length > 0 && (
                        <div className="p-5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30 mt-6">
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <TrendingUp className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="text-purple-400 font-semibold mb-2">Performance Analysis Summary</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-xl font-bold text-white">
                                    {effectiveAnalysisData.playerActions.filter((a: any) => a.action === 'goal').length}
                                  </div>
                                  <div className="text-xs text-gray-400">Goals</div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold text-white">
                                    {effectiveAnalysisData.playerActions.filter((a: any) => a.action === 'assist').length}
                                  </div>
                                  <div className="text-xs text-gray-400">Assists</div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold text-white">
                                    {effectiveAnalysisData.playerActions.filter((a: any) => a.action === 'tackle').length}
                                  </div>
                                  <div className="text-xs text-gray-400">Tackles</div>
                                </div>
                                <div>
                                  <div className="text-xl font-bold text-white">
                                    {effectiveAnalysisData.playerActions.filter((a: any) => a.action === 'pass').length}
                                  </div>
                                  <div className="text-xs text-gray-400">Passes</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Analysis Information */}
              {hasAnalysis && (
                <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-bright-pink" />
                      Analysis Overview & Statistics
                    </CardTitle>
                    <p className="text-gray-400 text-sm">
                      Comprehensive analysis metrics and processing information
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg border border-blue-500/30">
                        <div className="text-2xl font-bold text-blue-400">
                          {Math.round((effectiveAnalysisData?.confidence || analysisData.confidence || 0.95) * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">Analysis Confidence</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg border border-green-500/30">
                        <div className="text-2xl font-bold text-green-400">
                          {Math.round((effectiveAnalysisData?.processingTime || analysisData.processingTime || 0) / 1000)}s
                        </div>
                        <div className="text-xs text-gray-400">Processing Time</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg border border-purple-500/30">
                        <div className="text-2xl font-bold text-purple-400">
                          {effectiveAnalysisData?.playerTracking?.length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Players Tracked</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-lg border border-orange-500/30">
                        <div className="text-2xl font-bold text-orange-400">
                          {effectiveAnalysisData?.playerActions?.length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Actions Analyzed</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg border border-red-500/30">
                        <div className="text-2xl font-bold text-red-400">
                          {effectiveAnalysisData?.keyMoments?.length || 0}
                        </div>
                        <div className="text-xs text-gray-400">Key Moments</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-lg border border-teal-500/30">
                        <div className="text-2xl font-bold text-teal-400">
                          {detectedSport?.toUpperCase() || 'UNKNOWN'}
                        </div>
                        <div className="text-xs text-gray-400">Sport Detected</div>
                      </div>
                    </div>

                    {/* Analysis Quality Indicators */}
                    <div className="mt-6 p-4 bg-gray-700/20 rounded-lg">
                      <h4 className="text-white font-semibold mb-3">Analysis Quality Indicators</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 text-sm">Real-time Formation Tracking</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 text-sm">Multi-timestamp Heat Maps</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 text-sm">Comprehensive Action Analysis</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 text-sm">Sport-Specific Insights</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 text-sm">AI-Generated Recommendations</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-gray-300 text-sm">Enhanced Player Tracking</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Enhanced Action Bar */}
          <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {hasAnalysis ? (
                    <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30">
                      Enhanced Analysis Complete
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Analysis Pending
                    </Badge>
                  )}
                  <span className="text-gray-400 text-sm">
                    {hasAnalysis ? (
                      <>
                        Generated on {new Date().toLocaleDateString()} •
                        Processing time: {effectiveAnalysisData?.processingTime ? Math.round(analysisData.processingTime / 1000) : 0} seconds •
                        Confidence: {effectiveAnalysisData?.confidence ? Math.round(analysisData.confidence * 100) : 0}%
                      </>
                    ) : (
                      'Run enhanced AI analysis to get comprehensive insights'
                    )}
                  </span>
                </div>
                <div className="flex gap-3">
                  {hasAnalysis && (
                    <>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        className="bg-bright-pink hover:bg-bright-pink/80 text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Enhanced Report
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Video Warning */}
          {showDuplicateWarning && (
            <Card className="bg-yellow-900/20 border-yellow-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-yellow-400 font-semibold text-lg mb-2">
                      Duplicate Videos Detected
                    </h3>
                    <p className="text-yellow-300 mb-4">
                      We found {duplicateCount} videos with the same title "{videoTitle}".
                      This usually happens when the same video is uploaded multiple times.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDuplicateVideos(videoTitle || '')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Clean Up Duplicates
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowDuplicateWarning(false)}
                        className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VideoAnalysisResults;