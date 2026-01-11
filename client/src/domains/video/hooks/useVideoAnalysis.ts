
import { useState, useCallback, useRef } from 'react';
import { GeminiVideoAnalysisService, GeminiAnalysisRequest, GeminiAnalysisResponse } from '@/domains/video/services/geminiVideoAnalysisService';
import { VideoFrameExtractor, VideoFrame } from '@/utils/videoFrameExtractor';
import { GEMINI_CONFIG, validateGeminiConfig } from '@/config/gemini';
import { supabase } from '@/integrations/supabase/client';

export interface VideoAnalysisState {
  isAnalyzing: boolean;
  progress: number;
  status: string;
  currentStep: string;
  error: string | null;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  format: string;
}

export interface PlayerTag {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  position: string;
}

export interface TeamInfo {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string;
}

export interface AnalysisResult {
  playerAnalysis: any[];
  tacticalInsights: any;
  skillAssessment: any;
  matchEvents: any[];
  recommendations: string[];
  confidence: number;
}

export const useVideoAnalysis = () => {
  const [analysisState, setAnalysisState] = useState<VideoAnalysisState>({
    isAnalyzing: false,
    progress: 0,
    status: 'Ready to analyze',
    currentStep: '',
    error: null
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<VideoFrame[]>([]);

  const geminiServiceRef = useRef<GeminiVideoAnalysisService | null>(null);
  const frameExtractorRef = useRef<VideoFrameExtractor | null>(null);

  // Initialize Gemini service
  const initializeGeminiService = useCallback(() => {
    try {
      validateGeminiConfig();
      geminiServiceRef.current = new GeminiVideoAnalysisService({
        apiKey: GEMINI_CONFIG.API_KEY,
        model: "gemini-2.5-pro" // Use literal type instead of variable
      });
      return true;
    } catch (error) {
      setAnalysisState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize Gemini service'
      }));
      return false;
    }
  }, []);

  // Handle video file upload
  const handleVideoUpload = useCallback(async (file: File) => {
    try {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);

      // Extract video metadata
      const metadata = await extractVideoMetadata(file);
      setVideoMetadata(metadata);

      // Reset previous analysis
      setAnalysisResult(null);
      setExtractedFrames([]);
      setAnalysisState(prev => ({
        ...prev,
        error: null,
        status: 'Video uploaded successfully'
      }));

      return { success: true, metadata };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process video';
      setAnalysisState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Extract video metadata
  const extractVideoMetadata = useCallback(async (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fileSize: file.size,
          format: file.type
        });
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Extract video frames
  const extractFrames = useCallback(async (
    options: {
      frameRate?: number;
      maxFrames?: number;
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ) => {
    if (!videoUrl) {
      throw new Error('No video available for frame extraction');
    }

    try {
      setAnalysisState(prev => ({
        ...prev,
        currentStep: 'Extracting video frames...',
        progress: 10
      }));

      const extractor = new VideoFrameExtractor();
      frameExtractorRef.current = extractor;

      const frames = await extractor.extractFrames(videoUrl, {
        frameRate: options.frameRate || GEMINI_CONFIG.VIDEO_ANALYSIS.FRAME_RATE,
        maxFrames: options.maxFrames || GEMINI_CONFIG.VIDEO_ANALYSIS.MAX_FRAMES,
        quality: options.quality || GEMINI_CONFIG.VIDEO_ANALYSIS.QUALITY,
        maxWidth: options.maxWidth || GEMINI_CONFIG.VIDEO_ANALYSIS.MAX_WIDTH,
        maxHeight: options.maxHeight || GEMINI_CONFIG.VIDEO_ANALYSIS.MAX_HEIGHT
      });

      setExtractedFrames(frames);
      setAnalysisState(prev => ({
        ...prev,
        progress: 30,
        currentStep: `Extracted ${frames.length} frames successfully`
      }));

      return frames;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Frame extraction failed';
      setAnalysisState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [videoUrl]);

  // Perform AI analysis
  const performAnalysis = useCallback(async (
    videoType: 'match' | 'interview' | 'training' | 'highlight',
    sport: string,
    playerTags: PlayerTag[] = [],
    teamInfo?: TeamInfo,
    context?: string
  ) => {
    if (!geminiServiceRef.current) {
      if (!initializeGeminiService()) {
        return { success: false, error: 'Gemini service not initialized' };
      }
    }

    if (!extractedFrames.length) {
      return { success: false, error: 'No frames extracted. Please extract frames first.' };
    }

    try {
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: true,
        progress: 50,
        currentStep: 'Sending to Gemini AI for analysis...',
        error: null
      }));

      const analysisRequest: GeminiAnalysisRequest = {
        videoUrl,
        videoType,
        sport: sport as any,
        metadata: {
          playerTags: playerTags.length > 0 ? playerTags : undefined,
          teamInfo: teamInfo?.homeTeam ? teamInfo : undefined,
          context: context || undefined
        },
        frames: extractedFrames
      };

      const result = await geminiServiceRef.current!.analyzeVideo(analysisRequest);

      if (result.success) {
        setAnalysisState(prev => ({
          ...prev,
          progress: 90,
          currentStep: 'Processing results...'
        }));

        setAnalysisResult(result.analysis);

        // Save to enhanced_video_analysis table instead
        await saveAnalysisToDatabase(result.analysis, {
          videoUrl,
          videoType,
          sport,
          playerTags,
          teamInfo,
          context
        });

        setAnalysisState(prev => ({
          ...prev,
          progress: 100,
          currentStep: 'Analysis completed successfully!',
          isAnalyzing: false,
          status: 'Analysis completed'
        }));

        return { success: true, result: result.analysis };
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage,
        progress: 0
      }));
      return { success: false, error: errorMessage };
    }
  }, [videoUrl, extractedFrames, initializeGeminiService]);

  // Save analysis to database using enhanced_video_analysis table
  const saveAnalysisToDatabase = useCallback(async (
    analysis: AnalysisResult,
    metadata: {
      videoUrl: string;
      videoType: string;
      sport: string;
      playerTags: PlayerTag[];
      teamInfo?: TeamInfo;
      context?: string;
    }
  ) => {
    try {
      // First, find the video by URL to get the video_id
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('id')
        .eq('video_url', metadata.videoUrl)
        .single();

      if (videoError || !videoData) {
        console.error('Video not found for analysis save:', videoError);
        return;
      }

      // Cast to proper JSON type for Supabase
      const analysisMetadata = {
        sport: metadata.sport,
        video_type: metadata.videoType,
        player_tags: metadata.playerTags || [],
        team_info: metadata.teamInfo || {},
        context: metadata.context || '',
        confidence: analysis.confidence || 0,
        frame_count: extractedFrames.length
      } as any;

      const { error } = await supabase
        .from('enhanced_video_analysis')
        .insert({
          video_id: videoData.id,
          analysis_status: 'completed',
          overall_assessment: `AI analysis completed for ${metadata.videoType} video`,
          recommendations: (analysis.recommendations || []) as any,
          analysis_metadata: analysisMetadata,
          tagged_player_analysis: (analysis.playerAnalysis || {}) as any,
          key_events: (analysis.matchEvents || []) as any,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving enhanced analysis:', error);
      }
    } catch (error) {
      console.error('Failed to save enhanced analysis:', error);
    }
  }, [extractedFrames.length]);

  // Reset analysis
  const resetAnalysis = useCallback(() => {
    setAnalysisState({
      isAnalyzing: false,
      progress: 0,
      status: 'Ready to analyze',
      currentStep: '',
      error: null
    });
    setAnalysisResult(null);
    setExtractedFrames([]);
  }, []);

  // Cleanup resources
  const cleanup = useCallback(() => {
    if (frameExtractorRef.current) {
      frameExtractorRef.current.destroy();
      frameExtractorRef.current = null;
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
  }, [videoUrl]);

  // Get analysis history from enhanced_video_analysis table
  const getAnalysisHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_video_analysis')
        .select(`
          *,
          videos (
            title,
            video_type,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch analysis history:', error);
      return [];
    }
  }, []);

  return {
    // State
    analysisState,
    videoFile,
    videoUrl,
    videoMetadata,
    analysisResult,
    extractedFrames,

    // Actions
    handleVideoUpload,
    extractFrames,
    performAnalysis,
    resetAnalysis,
    cleanup,
    getAnalysisHistory,

    // Utilities
    isReady: !!geminiServiceRef.current && !!videoUrl,
    canAnalyze: !!extractedFrames.length && !analysisState.isAnalyzing
  };
};
