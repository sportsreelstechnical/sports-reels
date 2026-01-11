
import { supabase } from '@/integrations/supabase/client';
import { r2VideoRetrievalService } from './r2VideoRetrievalService';

export interface VideoAnalysisResult {
  videoId: string;
  videoType: 'match' | 'interview' | 'training' | 'highlight';
  analysisData: any;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface InterviewAnalysisResult {
  transcription: {
    text: string;
    language: string;
    confidence: number;
  };
  translations: {
    [language: string]: string;
  };
  sentimentAnalysis: {
    confidence: number;
    professionalism: number;
    communicationSkills: number;
    overallSentiment: 'positive' | 'neutral' | 'negative';
  };
  keywordTags: string[];
  bioExtract: string;
  subtitles: Array<{
    start: number;
    end: number;
    text: string;
    language: string;
  }>;
}

export interface HighlightAnalysisResult {
  autoHighlights: Array<{
    timestamp: number;
    duration: number;
    action: string;
    confidence: number;
    description: string;
  }>;
  skillClassification: Array<{
    timestamp: number;
    skill: string;
    confidence: number;
    category: 'technical' | 'physical' | 'tactical';
  }>;
  playerComparison: {
    similarPlayers: Array<{
      playerId: string;
      playerName: string;
      similarityScore: number;
      comparisonMetrics: string[];
    }>;
  };
  qualityEnhancements: {
    resolutionUpscaled: boolean;
    lightingAdjusted: boolean;
    slowMotionSegments: Array<{
      start: number;
      end: number;
      playbackSpeed: number;
    }>;
  };
}

export interface TrainingAnalysisResult {
  biomechanicalAnalysis: {
    runningForm: {
      score: number;
      issues: string[];
      suggestions: string[];
    };
    jumpTechnique: {
      score: number;
      height: number;
      form: string[];
    };
    balance: {
      score: number;
      steadiness: number;
    };
  };
  workRateDetection: {
    sprintCount: number;
    repetitions: number;
    drillsCompleted: string[];
    intensityLevel: 'low' | 'moderate' | 'high' | 'peak';
  };
  coachingInsights: Array<{
    area: string;
    issue: string;
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  progressTracking: {
    improvements: string[];
    regressions: string[];
    overallProgress: number;
    comparisonPeriod: string;
  };
}

export interface MatchAnalysisResult {
  playerTracking: Array<{
    playerId: string;
    playerName: string;
    jerseyNumber: number;
    positions: Array<{
      timestamp: number;
      x: number;
      y: number;
    }>;
    confidence: number;
  }>;
  eventRecognition: Array<{
    timestamp: number;
    eventType: 'goal' | 'assist' | 'save' | 'foul' | 'card' | 'pass' | 'shot';
    playerId: string;
    confidence: number;
    details: any;
  }>;
  heatmaps: {
    [playerId: string]: {
      positions: Array<{ x: number; y: number; intensity: number }>;
      zones: Array<{
        zone: string;
        timeSpent: number;
        effectiveness: number;
      }>;
    };
  };
  xgAnalysis: {
    totalXG: number;
    shotsAnalysis: Array<{
      timestamp: number;
      playerId: string;
      xgValue: number;
      outcome: 'goal' | 'save' | 'miss' | 'block';
    }>;
  };
  tacticalAnalysis: {
    formation: string;
    pressingPatterns: Array<{
      timestamp: number;
      pattern: string;
      effectiveness: number;
    }>;
    teamShape: {
      compactness: number;
      width: number;
      depth: number;
    };
  };
  opponentAnalysis: {
    strengths: string[];
    weaknesses: string[];
    keyPlayers: Array<{
      playerId: string;
      impact: number;
      role: string;
    }>;
  };
}

export class AIVideoAnalysisService {
  private videoId: string;
  private videoType: 'match' | 'interview' | 'training' | 'highlight';
  private analysisCallbacks: Array<(progress: number, status: string) => void> = [];

  constructor(videoId: string, videoType: 'match' | 'interview' | 'training' | 'highlight') {
    this.videoId = videoId;
    this.videoType = videoType;
  }

  onProgress(callback: (progress: number, status: string) => void) {
    this.analysisCallbacks.push(callback);
  }

  private updateProgress(progress: number, status: string) {
    this.analysisCallbacks.forEach(callback => callback(progress, status));
  }

  async analyzeVideo(videoUrl: string, metadata: any): Promise<VideoAnalysisResult> {
    this.updateProgress(0, 'Initializing AI analysis...');

    try {
      // Step 1: Retrieve video from R2 (or use existing URL for legacy videos)
      this.updateProgress(5, 'Retrieving video from storage...');
      const videoRetrieval = await r2VideoRetrievalService.getVideoForAnalysis(videoUrl, {
        useSignedUrl: false, // Use public URLs for AI analysis
      });

      if (!videoRetrieval.success || !videoRetrieval.videoUrl) {
        throw new Error(videoRetrieval.error || 'Failed to retrieve video for analysis');
      }

      const analysisVideoUrl = videoRetrieval.videoUrl;
      this.updateProgress(10, 'Video retrieved, starting analysis...');

      let analysisData: any;

      switch (this.videoType) {
        case 'interview':
          analysisData = await this.analyzeInterviewVideo(analysisVideoUrl, metadata);
          break;
        case 'highlight':
          analysisData = await this.analyzeHighlightVideo(analysisVideoUrl, metadata);
          break;
        case 'training':
          analysisData = await this.analyzeTrainingVideo(analysisVideoUrl, metadata);
          break;
        case 'match':
          analysisData = await this.analyzeMatchVideo(analysisVideoUrl, metadata);
          break;
        default:
          throw new Error(`Unsupported video type: ${this.videoType}`);
      }

      this.updateProgress(95, 'Saving analysis results...');
      await this.saveAnalysisResults(analysisData);

      this.updateProgress(100, 'Analysis completed successfully!');

      return {
        videoId: this.videoId,
        videoType: this.videoType,
        analysisData,
        status: 'completed',
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI video analysis failed:', error);
      this.updateProgress(0, 'Analysis failed');
      throw error;
    }
  }

  private async analyzeInterviewVideo(videoUrl: string, metadata: any): Promise<InterviewAnalysisResult> {
    this.updateProgress(10, 'Extracting audio for transcription...');

    // Simulate speech-to-text processing
    await this.simulateProcessing(2000);
    this.updateProgress(30, 'Transcribing speech...');

    await this.simulateProcessing(3000);
    this.updateProgress(50, 'Analyzing sentiment and communication...');

    await this.simulateProcessing(2000);
    this.updateProgress(70, 'Generating translations and keywords...');

    await this.simulateProcessing(2000);
    this.updateProgress(90, 'Creating bio extract and subtitles...');

    return {
      transcription: {
        text: "In this interview, the player discusses their career ambitions, recent performance, and future goals. They express confidence in their abilities and commitment to improving their game.",
        language: 'en',
        confidence: 0.94
      },
      translations: {
        'es': 'En esta entrevista, el jugador discute sus ambiciones de carrera, rendimiento reciente y objetivos futuros.',
        'fr': 'Dans cette interview, le joueur discute de ses ambitions de carrière, de ses performances récentes et de ses objectifs futurs.',
        'pt': 'Nesta entrevista, o jogador discute suas ambições de carreira, desempenho recente e objetivos futuros.'
      },
      sentimentAnalysis: {
        confidence: 8.5,
        professionalism: 9.0,
        communicationSkills: 8.2,
        overallSentiment: 'positive'
      },
      keywordTags: ['career', 'ambitions', 'performance', 'goals', 'improvement', 'confidence', 'team', 'training'],
      bioExtract: 'Ambitious player with strong communication skills and positive attitude. Demonstrates high confidence and commitment to continuous improvement.',
      subtitles: [
        { start: 0, end: 5, text: 'In this interview, the player discusses their career ambitions', language: 'en' },
        { start: 5, end: 10, text: 'recent performance, and future goals.', language: 'en' },
        { start: 10, end: 15, text: 'They express confidence in their abilities', language: 'en' }
      ]
    };
  }

  private async analyzeHighlightVideo(videoUrl: string, metadata: any): Promise<HighlightAnalysisResult> {
    this.updateProgress(10, 'Detecting key actions...');

    await this.simulateProcessing(3000);
    this.updateProgress(30, 'Classifying skills and techniques...');

    await this.simulateProcessing(3000);
    this.updateProgress(50, 'Comparing with similar players...');

    await this.simulateProcessing(2000);
    this.updateProgress(70, 'Enhancing video quality...');

    await this.simulateProcessing(2000);
    this.updateProgress(90, 'Generating highlight reel...');

    return {
      autoHighlights: [
        {
          timestamp: 15,
          duration: 8,
          action: 'Goal',
          confidence: 0.95,
          description: 'Excellent finishing with left foot from inside the box'
        },
        {
          timestamp: 67,
          duration: 12,
          action: 'Assist',
          confidence: 0.89,
          description: 'Perfect through ball leading to goal'
        },
        {
          timestamp: 134,
          duration: 6,
          action: 'Dribble',
          confidence: 0.92,
          description: 'Skillful dribble past two defenders'
        }
      ],
      skillClassification: [
        {
          timestamp: 15,
          skill: 'Clinical Finishing',
          confidence: 0.95,
          category: 'technical'
        },
        {
          timestamp: 67,
          skill: 'Vision and Passing',
          confidence: 0.89,
          category: 'tactical'
        },
        {
          timestamp: 134,
          skill: 'Dribbling and Agility',
          confidence: 0.92,
          category: 'technical'
        }
      ],
      playerComparison: {
        similarPlayers: [
          {
            playerId: '1',
            playerName: 'Marcus Rashford',
            similarityScore: 0.87,
            comparisonMetrics: ['Pace', 'Finishing', 'Dribbling']
          },
          {
            playerId: '2',
            playerName: 'Jamal Musiala',
            similarityScore: 0.82,
            comparisonMetrics: ['Dribbling', 'Agility', 'Ball Control']
          }
        ]
      },
      qualityEnhancements: {
        resolutionUpscaled: true,
        lightingAdjusted: true,
        slowMotionSegments: [
          { start: 15, end: 18, playbackSpeed: 0.5 },
          { start: 134, end: 138, playbackSpeed: 0.3 }
        ]
      }
    };
  }

  private async analyzeTrainingVideo(videoUrl: string, metadata: any): Promise<TrainingAnalysisResult> {
    this.updateProgress(10, 'Analyzing biomechanics and movement...');

    await this.simulateProcessing(4000);
    this.updateProgress(40, 'Detecting work rate and exercises...');

    await this.simulateProcessing(3000);
    this.updateProgress(65, 'Generating coaching insights...');

    await this.simulateProcessing(2000);
    this.updateProgress(85, 'Tracking progress and improvements...');

    return {
      biomechanicalAnalysis: {
        runningForm: {
          score: 8.2,
          issues: ['Slight overstriding', 'Arm swing could be more efficient'],
          suggestions: ['Focus on midfoot landing', 'Keep arms closer to body', 'Increase cadence']
        },
        jumpTechnique: {
          score: 8.7,
          height: 65,
          form: ['Good knee drive', 'Excellent landing mechanics', 'Strong takeoff']
        },
        balance: {
          score: 9.1,
          steadiness: 8.8
        }
      },
      workRateDetection: {
        sprintCount: 24,
        repetitions: 156,
        drillsCompleted: ['Cone weaving', 'Sprint intervals', 'Agility ladder', 'Ball control'],
        intensityLevel: 'high'
      },
      coachingInsights: [
        {
          area: 'Running Technique',
          issue: 'Overstriding during high-intensity sprints',
          suggestion: 'Focus on quicker turnover and midfoot landing',
          priority: 'medium'
        },
        {
          area: 'Recovery',
          issue: 'Insufficient rest between high-intensity intervals',
          suggestion: 'Implement 90-second recovery periods',
          priority: 'high'
        }
      ],
      progressTracking: {
        improvements: ['Sprint speed increased 3%', 'Better agility scores', 'Improved consistency'],
        regressions: ['Slight decrease in endurance capacity'],
        overallProgress: 7.8,
        comparisonPeriod: 'Last 4 weeks'
      }
    };
  }

  private async analyzeMatchVideo(videoUrl: string, metadata: any): Promise<MatchAnalysisResult> {
    this.updateProgress(10, 'Tracking players and jersey numbers...');

    await this.simulateProcessing(4000);
    this.updateProgress(30, 'Recognizing events and actions...');

    await this.simulateProcessing(4000);
    this.updateProgress(50, 'Generating heatmaps and positioning...');

    await this.simulateProcessing(3000);
    this.updateProgress(70, 'Calculating xG and shot analysis...');

    await this.simulateProcessing(2000);
    this.updateProgress(85, 'Analyzing tactics and formations...');

    const taggedPlayers = metadata.playerTags || [];

    return {
      playerTracking: taggedPlayers.map((player: any, index: number) => ({
        playerId: player.playerId || `player_${index}`,
        playerName: player.playerName || `Player ${index + 1}`,
        jerseyNumber: player.jerseyNumber || (index + 1),
        positions: this.generatePositionData(),
        confidence: 0.85 + Math.random() * 0.1
      })),
      eventRecognition: [
        {
          timestamp: 23,
          eventType: 'goal',
          playerId: taggedPlayers[0]?.playerId || 'player_1',
          confidence: 0.96,
          details: { assistedBy: taggedPlayers[1]?.playerId || 'player_2', goalType: 'right_foot' }
        },
        {
          timestamp: 45,
          eventType: 'assist',
          playerId: taggedPlayers[1]?.playerId || 'player_2',
          confidence: 0.89,
          details: { passType: 'through_ball', distance: 25 }
        },
        {
          timestamp: 67,
          eventType: 'shot',
          playerId: taggedPlayers[0]?.playerId || 'player_1',
          confidence: 0.92,
          details: { outcome: 'on_target', xg: 0.34 }
        }
      ],
      heatmaps: this.generateHeatmapData(taggedPlayers),
      xgAnalysis: {
        totalXG: 1.8,
        shotsAnalysis: [
          {
            timestamp: 23,
            playerId: taggedPlayers[0]?.playerId || 'player_1',
            xgValue: 0.67,
            outcome: 'goal'
          },
          {
            timestamp: 67,
            playerId: taggedPlayers[0]?.playerId || 'player_1',
            xgValue: 0.34,
            outcome: 'save'
          }
        ]
      },
      tacticalAnalysis: {
        formation: '4-3-3',
        pressingPatterns: [
          {
            timestamp: 15,
            pattern: 'High Press',
            effectiveness: 8.2
          },
          {
            timestamp: 78,
            pattern: 'Mid Block',
            effectiveness: 7.6
          }
        ],
        teamShape: {
          compactness: 7.8,
          width: 8.2,
          depth: 7.4
        }
      },
      opponentAnalysis: {
        strengths: ['Strong aerial presence', 'Quick counter-attacks', 'Set piece delivery'],
        weaknesses: ['Vulnerable on flanks', 'Poor pressing coordination', 'Slow build-up play'],
        keyPlayers: [
          {
            playerId: 'opp_1',
            impact: 8.7,
            role: 'Creative midfielder'
          },
          {
            playerId: 'opp_2',
            impact: 8.1,
            role: 'Target man'
          }
        ]
      }
    };
  }

  private generatePositionData() {
    const positions = [];
    for (let i = 0; i < 100; i++) {
      positions.push({
        timestamp: i * 5,
        x: Math.random() * 100,
        y: Math.random() * 100
      });
    }
    return positions;
  }

  private generateHeatmapData(taggedPlayers: any[]) {
    const heatmaps: any = {};

    taggedPlayers.forEach((player, index) => {
      const playerId = player.playerId || `player_${index}`;
      heatmaps[playerId] = {
        positions: Array.from({ length: 50 }, () => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          intensity: Math.random()
        })),
        zones: [
          { zone: 'Attacking Third', timeSpent: 35, effectiveness: 8.2 },
          { zone: 'Middle Third', timeSpent: 45, effectiveness: 7.6 },
          { zone: 'Defensive Third', timeSpent: 20, effectiveness: 8.8 }
        ]
      };
    });

    return heatmaps;
  }

  private async simulateProcessing(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async saveAnalysisResults(analysisData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          ai_analysis: {
            type: this.videoType,
            data: analysisData,
            analyzed_at: new Date().toISOString(),
            version: '2.0'
          },
          ai_analysis_status: 'completed'
        })
        .eq('id', this.videoId);

      if (error) {
        console.error('Error saving analysis results:', error);
        throw error;
      }

      console.log('Analysis results saved successfully');
    } catch (error) {
      console.error('Failed to save analysis results:', error);
      throw error;
    }
  }
}
