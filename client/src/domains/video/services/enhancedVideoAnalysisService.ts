import { ComprehensiveAIAnalysisService } from './comprehensiveAIAnalysisService';
import { EnhancedPlayerTrackingService, PlayerTrackingData, TacticalAnalysis, MatchStatistics } from './enhancedPlayerTrackingService';
import { VideoFrameExtractor } from '@/utils/videoFrameExtractor';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EnhancedAnalysisResult {
  success: boolean;
  analysis: {
    summary: string;
    insights: string[];
    performanceRating: number;
    playerTracking: PlayerTrackingData[];
    tacticalAnalysis: TacticalAnalysis;
    matchStatistics: MatchStatistics;
    sportSpecificInsights: SportSpecificInsights;
    recommendations: string[];
    confidence: number;
    processingTime: number;
  };
  error?: string;
}

export interface SportSpecificInsights {
  formation: string;
  tacticalStyle: string;
  keyStrengths: string[];
  areasForImprovement: string[];
  criticalMoments: CriticalMoment[];
  performanceMetrics: PerformanceMetrics;
}

export interface CriticalMoment {
  timestamp: number;
  type: 'goal' | 'save' | 'tackle' | 'pass' | 'shot' | 'formation-change' | 'tactical-shift';
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  playersInvolved: string[];
  outcome: string;
}

export interface PerformanceMetrics {
  overallTeamRating: number;
  individualRatings: PlayerRating[];
  tacticalEffectiveness: number;
  physicalPerformance: number;
  technicalExecution: number;
}

export interface PlayerRating {
  playerId: string;
  playerName: string;
  overallRating: number;
  technicalRating: number;
  tacticalRating: number;
  physicalRating: number;
  keyActions: number;
  influence: number;
}

export class EnhancedVideoAnalysisService {
  private comprehensiveService: ComprehensiveAIAnalysisService;
  private playerTrackingService: EnhancedPlayerTrackingService;
  private frameExtractor: VideoFrameExtractor;
  private config: any;
  private genAI: GoogleGenerativeAI;

  constructor(config: any) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.API_KEY);
    this.comprehensiveService = new ComprehensiveAIAnalysisService();
    this.playerTrackingService = new EnhancedPlayerTrackingService({
      ...config,
      genAI: this.genAI
    });
    this.frameExtractor = new VideoFrameExtractor();
  }

  async analyzeVideo(request: {
    videoUrl: string;
    videoType: 'match' | 'training' | 'interview' | 'highlight';
    sport: string;
    metadata: {
      playerTags: any[];
      teamInfo: any;
      context: string;
      duration: number;
    };
  }): Promise<EnhancedAnalysisResult> {
    const startTime = Date.now();

    try {
      console.log('Starting enhanced video analysis...');

      // Extract frames optimized for speed while maintaining accuracy
      const frames = await this.frameExtractor.extractFrames(request.videoUrl, {
        frameRate: 1, // Balanced frame rate for efficient tracking
        maxFrames: 20, // Optimized frame count for faster analysis (reduced from 60)
        quality: 0.7, // Balanced quality for faster processing (reduced from 0.9)
        maxWidth: 640, // Reduced resolution for faster uploads (reduced from 1200)
        maxHeight: 480 // Reduced resolution for faster uploads (reduced from 800)
      });

      console.log(`Extracted ${frames.length} frames for analysis`);

      // Run comprehensive AI analysis
      const comprehensiveResult = await this.comprehensiveService.analyzeVideo({
        videoUrl: request.videoUrl,
        videoType: request.videoType,
        sport: request.sport,
        metadata: request.metadata,
        frames: frames
      });

      // Run enhanced player tracking analysis
      const playerTrackingResult = await this.playerTrackingService.analyzePlayerTracking(
        request.videoUrl,
        frames,
        request.metadata.playerTags,
        request.sport,
        request.videoType
      );

      // Generate sport-specific insights
      const sportSpecificInsights = await this.generateSportSpecificInsights(
        playerTrackingResult,
        request.sport,
        request.videoType
      );

      // Generate intelligent recommendations
      const recommendations = await this.generateIntelligentRecommendations(
        playerTrackingResult,
        sportSpecificInsights,
        request.videoType
      );

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(
        playerTrackingResult.playerTracking,
        playerTrackingResult.tacticalAnalysis
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analysis: {
          summary: comprehensiveResult.analysis.summary,
          insights: comprehensiveResult.analysis.insights,
          performanceRating: comprehensiveResult.analysis.performanceRating,
          playerActions: playerTrackingResult.playerActions,
          keyMoments: playerTrackingResult.keyMoments,
          playerTracking: playerTrackingResult.playerTracking,
          tacticalAnalysis: playerTrackingResult.tacticalAnalysis,
          matchStatistics: playerTrackingResult.matchStatistics,
          sportSpecificInsights: sportSpecificInsights,
          recommendations: recommendations,
          confidence: 0.95,
          processingTime: processingTime
        }
      };

    } catch (error) {
      console.error('Enhanced video analysis failed:', error);
      return {
        success: false,
        analysis: {
          summary: 'Analysis failed due to technical issues.',
          insights: ['Unable to complete analysis'],
          performanceRating: 0,
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
          recommendations: ['Please try again or contact support'],
          confidence: 0,
          processingTime: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async generateSportSpecificInsights(
    playerTrackingResult: any,
    sport: string,
    videoType: string
  ): Promise<SportSpecificInsights> {
    // Analyze formation from tactical data
    const formations = playerTrackingResult.tacticalAnalysis.formationChanges;
    const primaryFormation = formations.length > 0 ? formations[0].formation : 'Unknown';

    // Analyze tactical style based on pressing and build-up play
    const pressingMoments = playerTrackingResult.tacticalAnalysis.pressingMoments;
    const buildUpPlay = playerTrackingResult.tacticalAnalysis.buildUpPlay;

    let tacticalStyle = 'Balanced';
    if (pressingMoments.length > buildUpPlay.length * 1.5) {
      tacticalStyle = 'High Pressing';
    } else if (buildUpPlay.length > pressingMoments.length * 1.5) {
      tacticalStyle = 'Possession Based';
    }

    // Generate key strengths and areas for improvement
    const keyStrengths = this.identifyKeyStrengths(playerTrackingResult, sport);
    const areasForImprovement = this.identifyAreasForImprovement(playerTrackingResult, sport);

    // Identify critical moments
    const criticalMoments = this.identifyCriticalMoments(playerTrackingResult);

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(
      playerTrackingResult.playerTracking,
      playerTrackingResult.tacticalAnalysis
    );

    return {
      formation: primaryFormation,
      tacticalStyle: tacticalStyle,
      keyStrengths: keyStrengths,
      areasForImprovement: areasForImprovement,
      criticalMoments: criticalMoments,
      performanceMetrics: performanceMetrics
    };
  }

  private identifyKeyStrengths(playerTrackingResult: any, sport: string): string[] {
    const strengths: string[] = [];
    const { tacticalAnalysis, matchStatistics } = playerTrackingResult;

    // Analyze passing accuracy
    if (matchStatistics.passes.accuracy.home > 85) {
      strengths.push('High passing accuracy and ball retention');
    }

    // Analyze defensive actions
    const successfulTackles = tacticalAnalysis.defensiveActions.filter(
      (action: any) => action.success
    ).length;
    if (successfulTackles > tacticalAnalysis.defensiveActions.length * 0.7) {
      strengths.push('Strong defensive performance and tackling');
    }

    // Analyze pressing intensity
    const highIntensityPressing = tacticalAnalysis.pressingMoments.filter(
      (moment: any) => moment.intensity === 'high'
    ).length;
    if (highIntensityPressing > 0) {
      strengths.push('Effective high-intensity pressing');
    }

    // Analyze build-up play
    const successfulBuildUp = tacticalAnalysis.buildUpPlay.filter(
      (play: any) => play.outcome === 'successful'
    ).length;
    if (successfulBuildUp > tacticalAnalysis.buildUpPlay.length * 0.6) {
      strengths.push('Effective build-up play and ball progression');
    }

    return strengths.length > 0 ? strengths : ['Consistent team performance'];
  }

  private identifyAreasForImprovement(playerTrackingResult: any, sport: string): string[] {
    const improvements: string[] = [];
    const { tacticalAnalysis, matchStatistics } = playerTrackingResult;

    // Analyze passing accuracy
    if (matchStatistics.passes.accuracy.home < 75) {
      improvements.push('Improve passing accuracy and ball retention');
    }

    // Analyze defensive actions
    const failedTackles = tacticalAnalysis.defensiveActions.filter(
      (action: any) => !action.success
    ).length;
    if (failedTackles > tacticalAnalysis.defensiveActions.length * 0.4) {
      improvements.push('Reduce defensive errors and improve tackling success rate');
    }

    // Analyze attacking patterns
    const failedAttacks = tacticalAnalysis.attackingPatterns.filter(
      (pattern: any) => pattern.outcome === 'failed'
    ).length;
    if (failedAttacks > tacticalAnalysis.attackingPatterns.length * 0.5) {
      improvements.push('Improve attacking efficiency and final third execution');
    }

    // Analyze pressing coordination
    const unsuccessfulPressing = tacticalAnalysis.pressingMoments.filter(
      (moment: any) => !moment.success
    ).length;
    if (unsuccessfulPressing > tacticalAnalysis.pressingMoments.length * 0.4) {
      improvements.push('Improve pressing coordination and timing');
    }

    return improvements.length > 0 ? improvements : ['Continue current development and training'];
  }

  private identifyCriticalMoments(playerTrackingResult: any): CriticalMoment[] {
    const criticalMoments: CriticalMoment[] = [];
    const { tacticalAnalysis, matchStatistics } = playerTrackingResult;

    // Add goal moments
    matchStatistics.goals.forEach((goal: any) => {
      criticalMoments.push({
        timestamp: goal.timestamp,
        type: 'goal',
        description: `${goal.type} goal scored`,
        importance: 'critical',
        playersInvolved: [goal.playerId, goal.assistPlayerId].filter(Boolean),
        outcome: 'Goal scored'
      });
    });

    // Add formation changes
    tacticalAnalysis.formationChanges.forEach((change: any) => {
      criticalMoments.push({
        timestamp: change.timestamp,
        type: 'formation-change',
        description: `Formation changed to ${change.formation}`,
        importance: 'high',
        playersInvolved: change.positions.map((p: any) => p.playerId),
        outcome: 'Tactical adjustment'
      });
    });

    // Add high-intensity pressing moments
    tacticalAnalysis.pressingMoments
      .filter((moment: any) => moment.intensity === 'high' && moment.success)
      .forEach((moment: any) => {
        criticalMoments.push({
          timestamp: moment.timestamp,
          type: 'tactical-shift',
          description: 'High-intensity pressing triggered',
          importance: 'high',
          playersInvolved: moment.playersInvolved,
          outcome: 'Successful pressing'
        });
      });

    return criticalMoments.sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculatePerformanceMetrics(
    playerTracking: PlayerTrackingData[],
    tacticalAnalysis: TacticalAnalysis
  ): PerformanceMetrics {
    // Calculate individual player ratings
    const individualRatings: PlayerRating[] = playerTracking.map(player => {
      const keyActions = player.keyMoments.length;
      const influence = this.calculatePlayerInfluence(player, tacticalAnalysis);

      // Calculate ratings based on performance data
      const technicalRating = Math.min(10, Math.max(1,
        (keyActions * 0.5) + (player.totalDistance / 1000) * 0.3 + influence * 0.2
      ));

      const tacticalRating = Math.min(10, Math.max(1,
        influence * 0.6 + (player.keyMoments.filter(m => m.outcome === 'successful').length / Math.max(1, keyActions)) * 0.4
      ));

      const physicalRating = Math.min(10, Math.max(1,
        (player.totalDistance / 1000) * 0.4 + (player.maxSpeed / 10) * 0.3 + (player.averageSpeed / 5) * 0.3
      ));

      const overallRating = (technicalRating + tacticalRating + physicalRating) / 3;

      return {
        playerId: player.playerId,
        playerName: player.playerName,
        overallRating: Math.round(overallRating * 10) / 10,
        technicalRating: Math.round(technicalRating * 10) / 10,
        tacticalRating: Math.round(tacticalRating * 10) / 10,
        physicalRating: Math.round(physicalRating * 10) / 10,
        keyActions: keyActions,
        influence: Math.round(influence * 10) / 10
      };
    });

    // Calculate team metrics
    const overallTeamRating = individualRatings.reduce((sum, rating) => sum + rating.overallRating, 0) / individualRatings.length;

    const tacticalEffectiveness = this.calculateTacticalEffectiveness(tacticalAnalysis);
    const physicalPerformance = individualRatings.reduce((sum, rating) => sum + rating.physicalRating, 0) / individualRatings.length;
    const technicalExecution = individualRatings.reduce((sum, rating) => sum + rating.technicalRating, 0) / individualRatings.length;

    return {
      overallTeamRating: Math.round(overallTeamRating * 10) / 10,
      individualRatings: individualRatings,
      tacticalEffectiveness: Math.round(tacticalEffectiveness * 10) / 10,
      physicalPerformance: Math.round(physicalPerformance * 10) / 10,
      technicalExecution: Math.round(technicalExecution * 10) / 10
    };
  }

  private calculatePlayerInfluence(player: PlayerTrackingData, tacticalAnalysis: TacticalAnalysis): number {
    let influence = 0;

    // Influence from key moments
    influence += player.keyMoments.length * 0.3;

    // Influence from tactical involvement
    const pressingInvolvement = tacticalAnalysis.pressingMoments.filter(
      moment => moment.playersInvolved.includes(player.playerId)
    ).length;
    influence += pressingInvolvement * 0.2;

    const buildUpInvolvement = tacticalAnalysis.buildUpPlay.filter(
      play => play.playersInvolved.includes(player.playerId)
    ).length;
    influence += buildUpInvolvement * 0.2;

    const attackingInvolvement = tacticalAnalysis.attackingPatterns.filter(
      pattern => pattern.playersInvolved.includes(player.playerId)
    ).length;
    influence += attackingInvolvement * 0.3;

    return Math.min(10, influence);
  }

  private calculateTacticalEffectiveness(tacticalAnalysis: TacticalAnalysis): number {
    let effectiveness = 0;

    // Successful pressing percentage
    const successfulPressing = tacticalAnalysis.pressingMoments.filter(m => m.success).length;
    const pressingSuccessRate = tacticalAnalysis.pressingMoments.length > 0 ?
      successfulPressing / tacticalAnalysis.pressingMoments.length : 0.5;
    effectiveness += pressingSuccessRate * 0.3;

    // Successful build-up play percentage
    const successfulBuildUp = tacticalAnalysis.buildUpPlay.filter(p => p.outcome === 'successful').length;
    const buildUpSuccessRate = tacticalAnalysis.buildUpPlay.length > 0 ?
      successfulBuildUp / tacticalAnalysis.buildUpPlay.length : 0.5;
    effectiveness += buildUpSuccessRate * 0.3;

    // Successful defensive actions percentage
    const successfulDefensive = tacticalAnalysis.defensiveActions.filter(d => d.success).length;
    const defensiveSuccessRate = tacticalAnalysis.defensiveActions.length > 0 ?
      successfulDefensive / tacticalAnalysis.defensiveActions.length : 0.5;
    effectiveness += defensiveSuccessRate * 0.2;

    // Attacking pattern success rate
    const successfulAttacks = tacticalAnalysis.attackingPatterns.filter(a =>
      a.outcome === 'goal' || a.outcome === 'shot'
    ).length;
    const attackingSuccessRate = tacticalAnalysis.attackingPatterns.length > 0 ?
      successfulAttacks / tacticalAnalysis.attackingPatterns.length : 0.5;
    effectiveness += attackingSuccessRate * 0.2;

    return effectiveness * 10; // Scale to 0-10
  }

  private async generateIntelligentRecommendations(
    playerTrackingResult: any,
    sportSpecificInsights: SportSpecificInsights,
    videoType: string
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Tactical recommendations
    if (sportSpecificInsights.tacticalStyle === 'High Pressing') {
      recommendations.push('Consider varying pressing intensity to maintain energy levels throughout the match');
    }

    if (sportSpecificInsights.areasForImprovement.includes('Improve passing accuracy and ball retention')) {
      recommendations.push('Focus on passing drills and first touch training to improve ball retention');
    }

    // Individual player recommendations
    const lowRatedPlayers = sportSpecificInsights.performanceMetrics.individualRatings.filter(
      rating => rating.overallRating < 6
    );

    if (lowRatedPlayers.length > 0) {
      recommendations.push(`Provide additional coaching support for ${lowRatedPlayers.map(p => p.playerName).join(', ')} to improve overall performance`);
    }

    // Formation recommendations
    if (sportSpecificInsights.formation === 'Unknown' || sportSpecificInsights.formation === 'Unclear') {
      recommendations.push('Work on clearer formation structure and player positioning during training');
    }

    // Physical performance recommendations
    if (sportSpecificInsights.performanceMetrics.physicalPerformance < 7) {
      recommendations.push('Increase focus on physical conditioning and endurance training');
    }

    // Technical execution recommendations
    if (sportSpecificInsights.performanceMetrics.technicalExecution < 7) {
      recommendations.push('Implement more technical skill drills and ball work in training sessions');
    }

    // Tactical effectiveness recommendations
    if (sportSpecificInsights.performanceMetrics.tacticalEffectiveness < 7) {
      recommendations.push('Review tactical implementation and team coordination during match situations');
    }

    return recommendations.length > 0 ? recommendations : ['Continue current training approach and monitor progress'];
  }
}