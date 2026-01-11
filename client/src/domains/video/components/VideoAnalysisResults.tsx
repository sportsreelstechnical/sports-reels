import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  SkipBack
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SmartVideoPlayer } from './SmartVideoPlayer';

interface VideoAnalysisResultsProps {
  videoId: string;
  videoType: 'match' | 'training' | 'highlight' | 'interview';
  teamId: string;
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
}

const VideoAnalysisResults: React.FC<VideoAnalysisResultsProps> = ({
  videoId,
  videoType,
  teamId
}) => {

  const [videoData, setVideoData] = useState<any>({
    title: "Loading...",
    duration: "0:00",
    upload_date: "",
    video_url: null
  });

  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    playerActions: [
      { timestamp: 120, action: "Goal", description: "Header goal from corner kick", confidence: 0.95, players: ["Player #9"], zone: "Penalty Box" },
      { timestamp: 350, action: "Tackle", description: "Successful defensive tackle", confidence: 0.88, players: ["Player #4"], zone: "Midfield" },
      { timestamp: 780, action: "Pass", description: "Long through ball assist", confidence: 0.92, players: ["Player #10"], zone: "Attacking Third" },
      { timestamp: 1250, action: "Save", description: "Goalkeeper diving save", confidence: 0.97, players: ["Player #1"], zone: "Goal Area" },
      { timestamp: 1680, action: "Shot", description: "Shot on target from outside box", confidence: 0.85, players: ["Player #7"], zone: "Edge of Box" }
    ],
    keyMoments: [
      { timestamp: 120, type: "Goal", description: "Opening goal changes momentum", importance: 'high' },
      { timestamp: 1250, type: "Save", description: "Crucial save maintains lead", importance: 'high' },
      { timestamp: 1680, type: "Near Miss", description: "Close attempt could have equalized", importance: 'medium' }
    ],
    summary: "Comprehensive match analysis reveals strong defensive performance with 89% pass accuracy. Team maintained possession for 62% of the match with notable attacking phases in the final third.",
    insights: [
      "Defensive line coordination improved by 23% compared to previous matches",
      "Midfield pressing intensity peaked during 30-45 minute period",
      "Set piece conversion rate: 2/5 (40% success)",
      "Player #10 covered 11.2km with highest sprint count (42 bursts)"
    ],
    performanceRating: 8.5,
    playerStats: [
      { name: "Player #9", position: "Forward", rating: 9.2, actions: 15, keyPasses: 3, goals: 1 },
      { name: "Player #10", position: "Midfielder", rating: 8.8, actions: 23, keyPasses: 7, goals: 0 },
      { name: "Player #4", position: "Defender", rating: 8.5, actions: 19, keyPasses: 2, goals: 0 },
      { name: "Player #1", position: "Goalkeeper", rating: 9.0, actions: 8, keyPasses: 12, goals: 0 }
    ],
    timeline: [
      { minute: 0, events: ["Kickoff", "Formation: 4-3-3"] },
      { minute: 2, events: ["Early pressure", "3 shots in 2 minutes"] },
      { minute: 12, events: ["Corner kick", "Goal scored"] },
      { minute: 20, events: ["Tactical adjustment", "Formation shift"] },
      { minute: 35, events: ["Yellow card", "Defensive intensity"] }
    ]
  });

  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch video data from database
  useEffect(() => {
    const fetchVideoData = async () => {
      if (!videoId) {
        return;
      }

      try {
        setLoading(true);
        // Try to find the video by ID
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .single();

        if (error) {
          console.error('Error fetching video:', error);
          return;
        }

        if (data) {
          const mappedData = {
            title: data.title || 'Untitled Video',
            duration: data.duration ? formatDuration(data.duration) : '0:00',
            upload_date: data.created_at ? new Date(data.created_at).toLocaleDateString() : '',
            video_url: data.video_url || null,
            description: data.description || '',
            video_type: data.video_type || 'highlight'
          };

          setVideoData(mappedData);
        } else {
          setVideoData({
            title: "Video Not Found",
            duration: "0:00",
            upload_date: "",
            video_url: null,
            description: "The requested video could not be found in the database",
            video_type: "unknown"
          });
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
        setVideoData({
          title: "Error Loading Video",
          duration: "0:00",
          upload_date: "",
          video_url: null,
          description: "Failed to load video data",
          video_type: "unknown"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const jumpToTimestamp = (timestamp: number) => {
    setCurrentTime(timestamp);
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

  const filteredActions = analysisData?.playerActions.filter(action => {
    const matchesFilter = selectedFilter === 'all' || action.action.toLowerCase() === selectedFilter;
    const matchesSearch = searchTerm === '' ||
      action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-bright-pink mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Video Analysis Results
            </h1>
            <p className="text-gray-400 mt-1">AI-powered sports analysis and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30">
              {videoType.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Video Player Section */}
        <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <div className="aspect-video rounded-t-lg overflow-hidden">
                <SmartVideoPlayer
                  videoUrl={videoData?.video_url}
                  thumbnailUrl={videoData?.thumbnail_url}
                  title={videoData?.title || 'Video'}
                  duration={videoData?.duration}
                  className="w-full h-full"
                  controls={true}
                  autoPlay={false}
                />

                {/* Video Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Button size="sm" className="bg-bright-pink/20 hover:bg-bright-pink/30 border-bright-pink/50">
                        <SkipBack className="w-4 h-4" />
                      </Button>
                      <Button size="sm" className="bg-bright-pink hover:bg-bright-pink/80">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" className="bg-bright-pink/20 hover:bg-bright-pink/30 border-bright-pink/50">
                        <SkipForward className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 mx-4">
                        <Progress value={33} className="h-1 bg-gray-700" />
                      </div>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-xl mb-1">
                      {videoData?.title}
                    </h3>
                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {videoData?.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {videoData?.upload_date}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        HD Quality
                      </Badge>
                    </div>
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
                    {analysisData?.playerActions.length || 0}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-blue-300">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    +12% vs last match
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
                    {analysisData?.keyMoments.length || 0}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-emerald-300">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    High impact events
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
                      {analysisData?.performanceRating || 0}
                    </p>
                    <span className="text-gray-400 text-lg ml-1">/10</span>
                  </div>
                  <div className="flex items-center mt-2 text-xs text-purple-300">
                    <Star className="w-3 h-3 mr-1" />
                    Excellent rating
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
                  <p className="text-white text-3xl font-bold mt-1">92%</p>
                  <div className="flex items-center mt-2 text-xs text-orange-300">
                    <Zap className="w-3 h-3 mr-1" />
                    High accuracy
                  </div>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Eye className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analysis Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 backdrop-blur-sm  border-0 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
              Actions
            </TabsTrigger>
            <TabsTrigger value="moments" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
              Key Moments
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-bright-pink data-[state=active]:text-white">
              Players
            </TabsTrigger>
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
                  Match Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisData?.timeline?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                      <div className="w-12 h-12 bg-bright-pink/20 rounded-full flex items-center justify-center text-bright-pink font-semibold">
                        {item.minute}'
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-2 mb-1">
                          {item.events.map((event, eventIndex) => (
                            <Badge key={eventIndex} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Summary */}
            <Card className="border-0 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-bright-pink" />
                  Analysis Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {analysisData?.summary}
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <ArrowUp className="w-4 h-4 text-green-400" />
                      Strengths
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        High defensive coordination (89%)
                      </div>
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Effective possession retention (62%)
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <ArrowDown className="w-4 h-4 text-orange-400" />
                      Areas for Improvement
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-orange-400 text-sm">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        Set piece conversion (40%)
                      </div>
                      <div className="flex items-center gap-2 text-orange-400 text-sm">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        Final third creativity
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            {/* Filters */}
            <Card className="border-0 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">Filter:</span>
                  </div>
                  <div className="flex gap-2">
                    {['all', 'goal', 'save', 'tackle', 'pass', 'shot'].map((filter) => (
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
                      className="w-full pl-10 pr-4 py-2 border-0 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-bright-pink focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions List */}
            <Card className="border-0">
              <CardHeader>
                <CardTitle className="text-white">Player Actions ({filteredActions.length})</CardTitle>
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
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={getActionColor(action.action)}>
                                {action.action}
                              </Badge>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(action.timestamp)}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {action.zone}
                              </span>
                            </div>
                            <p className="text-white text-sm mb-2">{action.description}</p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Users className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                  {action.players?.join(', ')}
                                </span>
                              </div>
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
          </TabsContent>

          <TabsContent value="moments" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-bright-pink" />
                  Key Moments Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisData?.keyMoments.map((moment, index) => (
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
                              {moment.type}
                            </Badge>
                            <Badge variant="outline" className={
                              moment.importance === 'high'
                                ? 'border-red-500/50 text-red-400'
                                : 'border-yellow-500/50 text-yellow-400'
                            }>
                              {moment.importance.toUpperCase()} IMPACT
                            </Badge>
                          </div>
                          <p className="text-white text-lg font-medium mb-2">{moment.description}</p>
                          <p className="text-gray-400 text-sm">
                            Click to jump to {formatTime(moment.timestamp)} in the video
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-bright-pink transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysisData?.playerStats?.map((player, index) => (
                <Card key={index} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{player.name}</h3>
                        <p className="text-gray-400 text-sm">{player.position}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-bright-pink">{player.rating}</div>
                        <div className="text-xs text-gray-400">Rating</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-xl font-semibold text-white">{player.actions}</div>
                        <div className="text-xs text-gray-400">Actions</div>
                      </div>
                      <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-xl font-semibold text-white">{player.keyPasses}</div>
                        <div className="text-xs text-gray-400">Key Passes</div>
                      </div>
                      <div className="text-center p-3 bg-gray-700/30 rounded-lg">
                        <div className="text-xl font-semibold text-white">{player.goals}</div>
                        <div className="text-xs text-gray-400">Goals</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Performance</span>
                        <span className="text-white">{player.rating}/10</span>
                      </div>
                      <Progress value={player.rating * 10} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* AI Insights */}
            <Card className="border-0 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-bright-pink" />
                  AI-Generated Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysisData?.insights.map((insight, index) => (
                    <div key={index} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-bright-pink/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-bright-pink" />
                        </div>
                        <div>
                          <p className="text-white font-medium mb-1">Insight #{index + 1}</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{insight}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-bright-pink" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-lg border border-green-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-green-400 font-semibold">Attacking</h4>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Shots on Target</span>
                        <span className="text-white font-semibold">67%</span>
                      </div>
                      <Progress value={67} className="h-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Passing Accuracy</span>
                        <span className="text-white font-semibold">89%</span>
                      </div>
                      <Progress value={89} className="h-2" />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-lg border border-blue-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-blue-400 font-semibold">Defensive</h4>
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Tackles Won</span>
                        <span className="text-white font-semibold">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Interceptions</span>
                        <span className="text-white font-semibold">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-lg border border-purple-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-purple-400 font-semibold">Physical</h4>
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Distance Covered</span>
                        <span className="text-white font-semibold">11.2km</span>
                      </div>
                      <Progress value={85} className="h-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">Sprint Count</span>
                        <span className="text-white font-semibold">42</span>
                      </div>
                      <Progress value={70} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-bright-pink" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-700/30 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <ArrowUp className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h4 className="text-green-400 font-semibold mb-1">Tactical Strength</h4>
                        <p className="text-gray-300 text-sm">
                          Continue utilizing high defensive line coordination. The 89% success rate indicates strong team chemistry in defensive transitions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-700/30 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h4 className="text-orange-400 font-semibold mb-1">Area for Improvement</h4>
                        <p className="text-gray-300 text-sm">
                          Focus on set piece delivery and positioning. Current 40% conversion rate suggests need for specialized training in dead ball situations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-700/30 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h4 className="text-blue-400 font-semibold mb-1">Player Development</h4>
                        <p className="text-gray-300 text-sm">
                          Player #10's midfield coverage (11.2km) is exceptional. Consider building more plays through central areas to maximize this asset.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Bar */}
        <Card className="border-0 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-bright-pink/20 text-bright-pink border-bright-pink/30">
                  Analysis Complete
                </Badge>
                <span className="text-gray-400 text-sm">
                  Generated on {new Date().toLocaleDateString()} • Processing time: 2.3 seconds
                </span>
              </div>
              <div className="flex gap-3">
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
                  Export Full Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Button */}
        <div className="flex justify-center mt-8">
          <Button
            className="bg-bright-pink hover:bg-bright-pink/90 text-white h-14 text-lg font-medium px-8"
            size="lg"
            disabled
          >
            <Zap className="w-5 h-5 mr-3" />
            Analyze Video with AI
          </Button>
        </div>
      </div>
    </div >
  );
};

export default VideoAnalysisResults; 