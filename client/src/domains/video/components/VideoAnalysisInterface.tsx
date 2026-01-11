
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { analyzeVideoWithGemini } from '@/domains/video/services/geminiAnalysisService';
import { r2VideoRetrievalService } from '@/domains/video/services/r2VideoRetrievalService';

interface VideoAnalysisInterfaceProps {
  videoId: string;
  videoTitle: string;
  onRetryAnalysis?: () => void;
}

interface AnalysisData {
  analysis: string;
  analysis_status: string;
  video_type: string;
  analyzed_at?: string;
  model_used: string;
}

// Type guard to check if the data is a valid analysis object
const isValidAnalysisData = (data: any): boolean => {
  return data && typeof data === 'object' && typeof data.analysis === 'string';
};

export const VideoAnalysisInterface: React.FC<VideoAnalysisInterfaceProps> = ({
  videoId,
  videoTitle,
  onRetryAnalysis
}) => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAnalysisData();
  }, [videoId]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from videos table first
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('ai_analysis, ai_analysis_status, title, description, video_url')
        .eq('id', videoId)
        .maybeSingle();

      if (videoError && videoError.code !== 'PGRST116') {
        console.error('Error fetching from videos table:', videoError);
      }

      if (videoData && videoData.ai_analysis && isValidAnalysisData(videoData.ai_analysis)) {
        const analysis = videoData.ai_analysis as any;
        setAnalysisData({
          analysis: analysis.analysis || 'Analysis completed.',
          analysis_status: videoData.ai_analysis_status || 'completed',
          video_type: analysis.video_type || 'video',
          analyzed_at: analysis.analyzed_at,
          model_used: analysis.model_used || 'gemini-2.5-pro'
        });
        return;
      }

      // If not found in videos table, try match_videos table
      const { data: matchVideoData, error: matchVideoError } = await supabase
        .from('match_videos')
        .select('ai_analysis, ai_analysis_status, title, video_url, opposing_team, tagged_players')
        .eq('id', videoId)
        .maybeSingle();

      if (matchVideoError && matchVideoError.code !== 'PGRST116') {
        console.error('Error fetching from match_videos table:', matchVideoError);
      }

      if (matchVideoData && matchVideoData.ai_analysis && isValidAnalysisData(matchVideoData.ai_analysis)) {
        const analysis = matchVideoData.ai_analysis as any;
        setAnalysisData({
          analysis: analysis.analysis || 'Analysis completed.',
          analysis_status: matchVideoData.ai_analysis_status || 'completed',
          video_type: analysis.video_type || 'match',
          analyzed_at: analysis.analyzed_at,
          model_used: analysis.model_used || 'gemini-2.5-pro'
        });
        return;
      }

      // If no analysis exists, trigger analysis
      if (videoData || matchVideoData) {
        await triggerAnalysis(videoData || matchVideoData);
      } else {
        setAnalysisData(null);
      }
    } catch (err: any) {
      console.error('Error fetching analysis data:', err);
      setError(err.message || 'Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async (videoRecord: any) => {
    try {
      setAnalyzing(true);
      setError(null);

      // Determine video type and prepare data
      const isMatchVideo = videoRecord.opposing_team !== undefined;
      const videoType = isMatchVideo ? 'match' : 'video';

      // Retrieve video from R2 (or use existing URL for legacy videos)
      const videoRetrieval = await r2VideoRetrievalService.getVideoForAnalysis(
        videoRecord.video_url,
        { expiresIn: 3600 } // 1 hour for analysis
      );

      if (!videoRetrieval.success || !videoRetrieval.videoUrl) {
        throw new Error(videoRetrieval.error || 'Failed to retrieve video for analysis');
      }

      const analysisData = {
        videoUrl: videoRetrieval.videoUrl,
        videoType: videoType as 'match' | 'interview' | 'training' | 'highlight',
        videoTitle: videoRecord.title || videoTitle,
        videoDescription: videoRecord.description || '',
        opposingTeam: videoRecord.opposing_team || '',
        taggedPlayers: videoRecord.tagged_players || [],
        playerStats: {}
      };

      // Call Gemini analysis service
      const analysis = await analyzeVideoWithGemini(analysisData);

      // Save analysis to appropriate table
      const tableName = isMatchVideo ? 'match_videos' : 'videos';
      const analysisObject = {
        analysis: analysis,
        video_type: videoType,
        analyzed_at: new Date().toISOString(),
        model_used: 'gemini-2.5-pro'
      };

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          ai_analysis: analysisObject,
          ai_analysis_status: 'completed'
        })
        .eq('id', videoId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setAnalysisData({
        analysis: analysis,
        analysis_status: 'completed',
        video_type: videoType,
        analyzed_at: new Date().toISOString(),
        model_used: 'gemini-2.5-pro'
      });

    } catch (err: any) {
      console.error('Error analyzing video:', err);
      setError(err.message || 'Failed to analyze video');

      // Update status to failed in database
      const isMatchVideo = videoRecord.opposing_team !== undefined;
      const tableName = isMatchVideo ? 'match_videos' : 'videos';
      await supabase
        .from(tableName)
        .update({ ai_analysis_status: 'failed' })
        .eq('id', videoId);

    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetry = async () => {
    if (onRetryAnalysis) {
      onRetryAnalysis();
    } else {
      await fetchAnalysisData();
    }
  };

  const formatAnalysisText = (text: string) => {
    // Split by sections and format with proper styling
    const sections = text.split(/\*\*([^*]+)\*\*/g);
    const formattedSections = [];

    for (let i = 0; i < sections.length; i++) {
      if (i % 2 === 1) {
        // This is a header
        formattedSections.push(
          <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-3 border-b border-gray-600 pb-2">
            {sections[i]}
          </h3>
        );
      } else if (sections[i].trim()) {
        // This is content
        const content = sections[i].trim();
        const lines = content.split('\n').filter(line => line.trim());

        formattedSections.push(
          <div key={i} className="space-y-2 mb-4">
            {lines.map((line, lineIndex) => {
              if (line.startsWith('- ')) {
                return (
                  <div key={lineIndex} className="flex items-start gap-2 text-gray-300">
                    <span className="text-bright-pink mt-1 flex-shrink-0">•</span>
                    <span className="flex-1 break-words">{line.substring(2)}</span>
                  </div>
                );
              } else if (line.trim()) {
                return (
                  <p key={lineIndex} className="text-gray-300 leading-relaxed break-words">
                    {line}
                  </p>
                );
              }
              return null;
            })}
          </div>
        );
      }
    }

    return formattedSections;
  };

  return (
    <Card className="bg-gray-800 border-gray-700 text-white w-full max-w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 break-words">
          <FileText className="w-5 h-5 text-bright-pink flex-shrink-0" />
          <span className="break-words min-w-0">AI Analysis: {videoTitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-full overflow-hidden">
        {loading || analyzing ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="mr-2 w-4 h-4 animate-spin" />
            <span>{analyzing ? 'Analyzing video...' : 'Loading analysis...'}</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        ) : analysisData ? (
          <div className="space-y-4 max-w-full">
            {/* Status Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge
                variant="secondary"
                className={`gap-2 ${analysisData.analysis_status === 'completed'
                  ? 'bg-green-600 text-white'
                  : analysisData.analysis_status === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-yellow-600 text-white'
                  }`}
              >
                {analysisData.analysis_status === 'completed' && <CheckCircle className="w-4 h-4" />}
                {analysisData.analysis_status === 'failed' && <XCircle className="w-4 h-4" />}
                {analysisData.analysis_status === 'pending' && <Clock className="w-4 h-4" />}
                {analysisData.analysis_status.toUpperCase()}
              </Badge>

              {analysisData.model_used && (
                <Badge variant="outline" className="text-xs">
                  {analysisData.model_used}
                </Badge>
              )}
            </div>

            {/* Analysis Content */}
            <div className="bg-gray-900/50 rounded-lg p-4 max-w-full overflow-hidden">
              <div className="prose prose-invert max-w-none break-words overflow-wrap-anywhere">
                {formatAnalysisText(analysisData.analysis)}
              </div>
            </div>

            {/* Analysis Metadata */}
            {analysisData.analyzed_at && (
              <div className="text-xs text-gray-400 border-t border-gray-700 pt-3 break-words">
                <span>Analyzed on: {new Date(analysisData.analyzed_at).toLocaleString()}</span>
                {analysisData.video_type && (
                  <span className="ml-4">Type: {analysisData.video_type}</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <Alert variant="default">
            <AlertDescription>
              No AI analysis available for this video yet. Click retry to analyze.
            </AlertDescription>
          </Alert>
        )}

        {(analysisData?.analysis_status === 'failed' || !analysisData) && (
          <Button
            onClick={handleRetry}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full sm:w-auto"
            disabled={analyzing}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {analyzing ? 'Analyzing...' : 'Analyze Video'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
