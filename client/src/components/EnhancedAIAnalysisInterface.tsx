
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, Target, Activity, TrendingUp, Users, Eye,
  Play, Pause, Clock, MapPin, Zap, CheckCircle,
  AlertCircle, BarChart3, Sparkles, Timer
} from 'lucide-react';
import { EnhancedVideoAnalysisService, VideoAnalysisResult } from '@/domains/video/services/enhancedVideoAnalysisService';

interface EnhancedAIAnalysisProps {
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  taggedPlayers: string[];
  metadata: {
    duration: number;
    playerTags: string[];
    matchDetails: any;
  };
  onAnalysisComplete?: (results: VideoAnalysisResult) => void;
}

const EnhancedAIAnalysisInterface: React.FC<EnhancedAIAnalysisProps> = ({
  videoId,
  videoUrl,
  videoTitle,
  taggedPlayers,
  metadata,
  onAnalysisComplete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisResults, setAnalysisResults] = useState<VideoAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const startAnalysis = useCallback(async () => {
    if (!videoRef.current) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStatus('Initializing...');

    try {
      const analysisService = new EnhancedVideoAnalysisService(videoId, taggedPlayers);
      
      analysisService.onProgress((progress, status) => {
        setAnalysisProgress(progress);
        setAnalysisStatus(status);
      });

      const results = await analysisService.analyzeVideo(videoRef.current, metadata);
      
      setAnalysisResults(results);
      onAnalysisComplete?.(results);

      toast({
        title: "Analysis Complete",
        description: `Advanced AI analysis completed with ${results.detectedPlayers.length} players detected`,
      });

    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to complete video analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoId, taggedPlayers, metadata, onAnalysisComplete, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      skill: <Target className="w-4 h-4" />,
      tactical: <Brain className="w-4 h-4" />,
      physical: <Activity className="w-4 h-4" />,
      mental: <Zap className="w-4 h-4" />,
      defensive: <CheckCircle className="w-4 h-4" />,
      offensive: <TrendingUp className="w-4 h-4" />
    };
    return icons[category as keyof typeof icons] || <Activity className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Hidden video element for analysis */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        preload="metadata"
      />

      {/* Header */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-white text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-bright-pink/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-bright-pink" />
                </div>
                Enhanced AI Analysis
              </CardTitle>
              <p className="text-gray-300 text-sm">
                Advanced player tracking and performance analysis with face detection
              </p>
            </div>

            {!isAnalyzing && !analysisResults && (
              <Button
                onClick={startAnalysis}
                className="bg-bright-pink hover:bg-bright-pink/90 text-white px-8 py-3 font-semibold"
                size="lg"
              >
                <Brain className="w-5 h-5 mr-2" />
                Start Enhanced Analysis
              </Button>
            )}
          </div>

          {/* Tagged Players Info */}
          {taggedPlayers.length > 0 && (
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
              <h4 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-bright-pink" />
                Tagged Players
              </h4>
              <div className="flex flex-wrap gap-2">
                {taggedPlayers.map((player, index) => (
                  <Badge key={index} className="bg-bright-pink/20 text-bright-pink border-bright-pink/30">
                    {player}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 bg-bright-pink rounded-full animate-pulse" />
                  Processing Video
                </h3>
                <span className="text-bright-pink font-mono text-sm">
                  {analysisProgress.toFixed(0)}%
                </span>
              </div>

              <Progress 
                value={analysisProgress} 
                className="h-3 bg-gray-700"
              />

              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Timer className="w-4 h-4 text-bright-pink" />
                {analysisStatus}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Face Detection', icon: Eye, progress: Math.min(100, analysisProgress * 1.2) },
                  { label: 'Action Recognition', icon: Activity, progress: Math.max(0, analysisProgress - 20) },
                  { label: 'Performance Metrics', icon: BarChart3, progress: Math.max(0, analysisProgress - 40) },
                  { label: 'Insights Generation', icon: Sparkles, progress: Math.max(0, analysisProgress - 70) }
                ].map((item, index) => (
                  <div key={index} className="text-center space-y-2">
                    <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${
                      item.progress > 0 ? 'bg-bright-pink/20 text-bright-pink' : 'bg-gray-700 text-gray-500'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-bright-pink h-1 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 p-1 rounded-lg">
            <TabsTrigger value="overview" className="font-medium">Overview</TabsTrigger>
            <TabsTrigger value="players" className="font-medium">Players</TabsTrigger>
            <TabsTrigger value="actions" className="font-medium">Actions</TabsTrigger>
            <TabsTrigger value="insights" className="font-medium">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Analysis Summary */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-bright-pink text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {analysisResults.detectedPlayers.length}
                      </div>
                      <div className="text-xs text-gray-400">Players Detected</div>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {analysisResults.playerActions.length}
                      </div>
                      <div className="text-xs text-gray-400">Actions Analyzed</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Tagged Player Present</span>
                      <div className="flex items-center gap-1">
                        {analysisResults.taggedPlayerPresent ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={`text-sm ${
                          analysisResults.taggedPlayerPresent ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {analysisResults.taggedPlayerPresent ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game Context */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-400 text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Game Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Phase</span>
                      <span className="text-white text-sm font-medium">
                        {analysisResults.gameContext.gamePhase}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Intensity</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-bright-pink h-2 rounded-full"
                            style={{ width: `${analysisResults.gameContext.intensity * 100}%` }}
                          />
                        </div>
                        <span className="text-white text-sm">
                          {(analysisResults.gameContext.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Dominance</span>
                      <span className="text-white text-sm font-medium">
                        {analysisResults.gameContext.dominatingTeam}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Events */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-yellow-400 text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Key Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {analysisResults.gameContext.keyEvents.slice(0, 5).map((event, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-bright-pink font-mono text-xs">
                            {formatTime(event.timestamp)}
                          </span>
                          <span className="text-gray-300 flex-1">{event.event}</span>
                          <Badge variant="outline" className="text-xs">
                            {event.impact}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Overall Assessment */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-bright-pink" />
                  Overall Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  {analysisResults.overallAssessment}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analysisResults.performanceMetrics.map((player, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all ${
                    player.isTaggedPlayer 
                      ? 'bg-bright-pink/10 border-bright-pink/30' 
                      : 'bg-gray-800 border-gray-700'
                  } ${selectedPlayer === player.playerId ? 'ring-2 ring-bright-pink' : ''}`}
                  onClick={() => setSelectedPlayer(player.playerId)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className={player.isTaggedPlayer ? 'text-bright-pink' : 'text-white'}>
                        {player.playerName}
                      </span>
                      {player.isTaggedPlayer && (
                        <Badge className="bg-bright-pink text-white">Tagged</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-gray-700 rounded">
                        <div className="text-lg font-bold text-white">
                          {player.metricsData.totalActions}
                        </div>
                        <div className="text-xs text-gray-400">Actions</div>
                      </div>
                      <div className="text-center p-2 bg-gray-700 rounded">
                        <div className="text-lg font-bold text-green-400">
                          {((player.metricsData.successfulActions / player.metricsData.totalActions) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">Success Rate</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { label: 'Technical', value: player.metricsData.technicalScore },
                        { label: 'Tactical', value: player.metricsData.tacticalAwareness },
                        { label: 'Physical', value: player.metricsData.physicalPresence }
                      ].map((metric, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">{metric.label}</span>
                            <span className="text-white">{(metric.value * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-bright-pink h-2 rounded-full transition-all"
                              style={{ width: `${metric.value * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {analysisResults.playerActions.map((action, index) => (
                  <Card 
                    key={index}
                    className={`${
                      analysisResults.performanceMetrics.find(p => p.playerId === action.playerId)?.isTaggedPlayer
                        ? 'bg-bright-pink/5 border-bright-pink/20'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-gray-700 rounded">
                            {getCategoryIcon(action.category)}
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{action.action}</h4>
                            <p className="text-gray-400 text-sm">{action.playerName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-bright-pink font-mono text-sm">
                            {formatTime(action.timestamp)}
                          </span>
                          <div className={`text-sm ${getConfidenceColor(action.confidence)}`}>
                            {(action.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3">{action.description}</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-1 bg-gray-700 rounded">
                          <div className="text-white">{(action.metrics.intensity * 100).toFixed(0)}%</div>
                          <div className="text-gray-400">Intensity</div>
                        </div>
                        <div className="text-center p-1 bg-gray-700 rounded">
                          <div className="text-white">{(action.metrics.accuracy * 100).toFixed(0)}%</div>
                          <div className="text-gray-400">Accuracy</div>
                        </div>
                        <div className="text-center p-1 bg-gray-700 rounded">
                          <div className="text-white">{(action.metrics.effectiveness * 100).toFixed(0)}%</div>
                          <div className="text-gray-400">Effectiveness</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recommendations */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-bright-pink flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResults.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-bright-pink rounded-full mt-2 flex-shrink-0" />
                        <p className="text-gray-300 text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Moments */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-yellow-400 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Key Moments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-3">
                      {analysisResults.performanceMetrics
                        .filter(p => p.isTaggedPlayer)
                        .flatMap(p => p.keyMoments)
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((moment, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <span className="text-bright-pink font-mono text-xs mt-1">
                              {formatTime(moment.timestamp)}
                            </span>
                            <div className="flex-1">
                              <p className="text-gray-300 text-sm">{moment.description}</p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs mt-1 ${
                                  moment.impact === 'high' ? 'border-green-500 text-green-400' :
                                  moment.impact === 'medium' ? 'border-yellow-500 text-yellow-400' :
                                  'border-gray-500 text-gray-400'
                                }`}
                              >
                                {moment.impact} impact
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EnhancedAIAnalysisInterface;
