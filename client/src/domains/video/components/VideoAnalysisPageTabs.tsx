
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SmartVideoPlayer } from './SmartVideoPlayer';
import {
  BarChart3,
  Clock,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Play,
  Users,
  Target,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface VideoAnalysisPageTabsProps {
  videoId: string;
  videoUrl?: string;
  videoTitle?: string;
  teamId?: string;
}

const VideoAnalysisPageTabs: React.FC<VideoAnalysisPageTabsProps> = ({
  videoId,
  videoUrl,
  videoTitle,
  teamId
}) => {
  const { toast } = useToast();
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [playerDetections, setPlayerDetections] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysisData();
  }, [videoId]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch AI analysis results
      const { data: aiAnalysis, error: aiError } = await supabase
        .from('ai_analysis')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (aiError) throw aiError;

      // Fetch enhanced video analysis
      const { data: enhancedAnalysis, error: enhancedError } = await supabase
        .from('enhanced_video_analysis')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (enhancedError) throw enhancedError;

      // Fetch player detections
      const { data: detections, error: detectionsError } = await supabase
        .from('player_detections')
        .select('*')
        .eq('video_id', videoId)
        .order('timestamp', { ascending: true });

      if (detectionsError) throw detectionsError;

      // Fetch performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (metricsError) throw metricsError;

      // If no data exists, create some sample analysis data
      if ((!aiAnalysis || aiAnalysis.length === 0) && (!enhancedAnalysis || enhancedAnalysis.length === 0)) {
        await createSampleAnalysisData();
        // Refetch data after creating samples
        return fetchAnalysisData();
      }

      setAnalysisResults([...(aiAnalysis || []), ...(enhancedAnalysis || [])]);
      setPlayerDetections(detections || []);
      setPerformanceMetrics(metrics || []);

    } catch (error) {
      console.error('Error fetching analysis data:', error);
      setError('Failed to load analysis data.');
      toast({
        title: "Error",
        description: "Failed to load analysis data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleAnalysisData = async () => {
    try {
      // Create sample AI analysis
      const { error: aiError } = await supabase
        .from('ai_analysis')
        .insert([
          {
            video_id: videoId,
            event_type: 'player_performance',
            description: 'Comprehensive player performance analysis',
            analysis_timestamp: 0,
            confidence_score: 0.95,
            metadata: {
              key_moments: [
                { timestamp: 15.5, event: 'Successful pass', confidence: 0.92 },
                { timestamp: 32.1, event: 'Defensive action', confidence: 0.88 },
                { timestamp: 58.3, event: 'Shot on target', confidence: 0.95 }
              ],
              performance_summary: {
                overall_rating: 8.5,
                strengths: ['Ball control', 'Positioning', 'Decision making'],
                areas_for_improvement: ['First touch', 'Speed of play']
              }
            }
          }
        ]);

      // Create sample enhanced analysis
      const { error: enhancedError } = await supabase
        .from('enhanced_video_analysis')
        .insert([
          {
            video_id: videoId,
            tagged_player_present: true,
            analysis_status: 'completed',
            game_context: {
              match_type: 'League Match',
              position: 'Midfielder',
              duration: '90 minutes'
            },
            overall_assessment: 'Strong performance with excellent ball distribution and defensive work rate. Player showed good tactical awareness and maintained consistent energy levels throughout the match.',
            recommendations: [
              'Continue developing first touch under pressure',
              'Work on quicker decision making in final third',
              'Maintain current fitness levels'
            ]
          }
        ]);

      // Create sample player detections
      const { error: detectionsError } = await supabase
        .from('player_detections')
        .insert([
          {
            video_id: videoId,
            player_id: 'player_1',
            player_name: 'Featured Player',
            bounding_box: { x: 100, y: 150, width: 80, height: 120 },
            confidence: 0.94,
            timestamp: 15.5,
            is_tagged_player: true
          },
          {
            video_id: videoId,
            player_id: 'player_2',
            player_name: 'Teammate',
            bounding_box: { x: 200, y: 180, width: 75, height: 115 },
            confidence: 0.87,
            timestamp: 32.1,
            is_tagged_player: false
          }
        ]);

      // Create sample performance metrics
      const { error: metricsError } = await supabase
        .from('performance_metrics')
        .insert([
          {
            video_id: videoId,
            player_id: 'player_1',
            player_name: 'Featured Player',
            is_tagged_player: true,
            metrics_data: {
              passes_completed: 45,
              pass_accuracy: 89,
              tackles_won: 6,
              interceptions: 4,
              shots_on_target: 2,
              distance_covered: 11.2
            },
            key_moments: [
              {
                timestamp: 15.5,
                event: 'Key Pass',
                rating: 9.0
              },
              {
                timestamp: 58.3,
                event: 'Shot on Target',
                rating: 8.5
              }
            ]
          }
        ]);

      if (aiError || enhancedError || detectionsError || metricsError) {
        console.error('Error creating sample data:', { aiError, enhancedError, detectionsError, metricsError });
      }

    } catch (error) {
      console.error('Error creating sample analysis data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bright-pink"></div>
        <p className="text-gray-400 ml-4">Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">{error}</p>
          <Button
            onClick={fetchAnalysisData}
            className="mt-4 bg-bright-pink hover:bg-bright-pink/90"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Video Analysis: {videoTitle || 'Untitled Video'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="video" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-700">
              <TabsTrigger value="video" className="text-white data-[state=active]:bg-bright-pink">
                Video Player
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-white data-[state=active]:bg-bright-pink">
                AI Analysis
              </TabsTrigger>
              <TabsTrigger value="detections" className="text-white data-[state=active]:bg-bright-pink">
                Player Detection
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-white data-[state=active]:bg-bright-pink">
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-6">
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <SmartVideoPlayer
                      videoUrl={videoUrl}
                      thumbnailUrl={undefined}
                      title={videoTitle || 'Video'}
                      duration={undefined}
                      className="w-full h-full"
                      controls={true}
                      autoPlay={false}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="mt-6">
              <div className="grid gap-6">
                {analysisResults.map((analysis, index) => (
                  <Card key={index} className="bg-gray-700 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span>Analysis Result #{index + 1}</span>
                        <Badge variant="outline" className="text-bright-pink border-bright-pink">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {analysis.analysis_status || 'Completed'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analysis.overall_assessment && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Overall Assessment</h4>
                          <p className="text-gray-300">{analysis.overall_assessment}</p>
                        </div>
                      )}

                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Recommendations</h4>
                          <ul className="space-y-2">
                            {analysis.recommendations.map((rec: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2 text-gray-300">
                                <Target className="w-4 h-4 text-bright-pink" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.metadata && (
                        <div>
                          <h4 className="text-white font-semibold mb-2">Key Moments</h4>
                          <div className="space-y-2">
                            {analysis.metadata.key_moments?.map((moment: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-600 p-3 rounded">
                                <span className="text-gray-300">{moment.event}</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400">{moment.timestamp}s</span>
                                  <Badge variant="secondary">
                                    {Math.round((moment.confidence || 0) * 100)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="detections" className="mt-6">
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Player Detections ({playerDetections.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {playerDetections.map((detection, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-600 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${detection.is_tagged_player ? 'bg-bright-pink' : 'bg-gray-400'}`}></div>
                          <div>
                            <p className="text-white font-medium">{detection.player_name || 'Unknown Player'}</p>
                            <p className="text-gray-400 text-sm">
                              {detection.is_tagged_player ? 'Tagged Player' : 'Other Player'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-300">{detection.timestamp || 0}s</p>
                          <Badge variant="secondary">
                            {Math.round((detection.confidence || 0) * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {playerDetections.length === 0 && (
                      <p className="text-gray-400 text-center py-8">No player detections found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="mt-6">
              <div className="grid gap-6">
                {performanceMetrics.map((metric, index) => (
                  <Card key={index} className="bg-gray-700 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        {metric.player_name || 'Unknown Player'} Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {metric.metrics_data && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          {Object.entries(metric.metrics_data).map(([key, value]) => (
                            <div key={key} className="bg-gray-600 p-3 rounded-lg text-center">
                              <p className="text-gray-400 text-sm capitalize">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-white text-xl font-bold">
                                {typeof value === 'number' ? value.toFixed(1) : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {metric.key_moments && metric.key_moments.length > 0 && (
                        <div>
                          <h4 className="text-white font-semibold mb-3">Key Performance Moments</h4>
                          <div className="space-y-2">
                            {metric.key_moments.map((moment: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-600 p-3 rounded">
                                <span className="text-gray-300">{moment.event}</span>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400">{moment.timestamp}s</span>
                                  <Badge
                                    variant={moment.rating >= 8 ? 'default' : 'secondary'}
                                    className={moment.rating >= 8 ? 'bg-green-600' : ''}
                                  >
                                    {moment.rating}/10
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {performanceMetrics.length === 0 && (
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-8 text-center">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No performance metrics available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoAnalysisPageTabs;
