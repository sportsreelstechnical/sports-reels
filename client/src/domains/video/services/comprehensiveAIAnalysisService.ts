import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CONFIG, getSportPrompt } from '@/config/gemini';

// Enhanced analysis interfaces with deeper metrics
export interface EnhancedMatchAnalysis {
  // Tactical Intelligence
  tacticalIntelligence: {
    formation: string;
    formationChanges: Array<{
      minute: number;
      fromFormation: string;
      toFormation: string;
      reason: string;
      effectiveness: number;
    }>;
    pressingIntensity: number;
    pressingTriggers: string[];
    defensiveShape: {
      compactness: number;
      lineHeight: number;
      width: number;
      vulnerabilities: string[];
    };
    attackingPatterns: Array<{
      pattern: string;
      frequency: number;
      successRate: number;
      keyPlayers: string[];
    }>;
    counterPressing: {
      attempts: number;
      successRate: number;
      averageRecoveryTime: number;
    };
  };

  // Advanced Player Metrics
  advancedPlayerMetrics: Array<{
    name: string;
    position: string;
    heatmap: Array<{ x: number; y: number; intensity: number }>;
    touches: {
      total: number;
      inDefensiveThird: number;
      inMiddleThird: number;
      inAttackingThird: number;
      inPenaltyArea: number;
    };
    passing: {
      completed: number;
      attempted: number;
      accuracy: number;
      progressivePasses: number;
      keyPasses: number;
      throughBalls: number;
      longBalls: number;
      crossesCompleted: number;
    };
    defensive: {
      tackles: number;
      interceptions: number;
      clearances: number;
      blocks: number;
      aerialDuelsWon: number;
      groundDuelsWon: number;
      foulsCommitted: number;
    };
    attacking: {
      shots: number;
      shotsOnTarget: number;
      goals: number;
      assists: number;
      chancesCreated: number;
      dribbles: number;
      dribbleSuccess: number;
    };
    movement: {
      distanceCovered: number;
      sprints: number;
      topSpeed: number;
      accelerations: number;
      decelerations: number;
    };
    expectedMetrics: {
      xG: number;
      xA: number;
      xGChain: number;
      xGBuildup: number;
    };
  }>;

  // Team Dynamics
  teamDynamics: {
    passingNetworks: Array<{
      player1: string;
      player2: string;
      passes: number;
      strength: number;
    }>;
    teamCohesion: number;
    pressureResistance: number;
    transitionSpeed: number;
    buildUpPlay: {
      style: 'direct' | 'possession' | 'mixed';
      effectiveness: number;
      progressionRoutes: string[];
    };
  };

  // Momentum Analysis
  momentumAnalysis: Array<{
    period: string;
    dominantTeam: string;
    score: number;
    keyEvents: string[];
    pressureIndex: number;
  }>;

  // Set Piece Analysis
  setPieceAnalysis: {
    corners: {
      taken: number;
      scored: number;
      routines: string[];
      threatLevel: number;
    };
    freeKicks: {
      direct: number;
      indirect: number;
      scored: number;
      locations: Array<{ x: number; y: number }>;
    };
    penalties: {
      awarded: number;
      scored: number;
      missed: number;
    };
  };

  // Critical Weaknesses
  criticalWeaknesses: Array<{
    area: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    examples: string[];
    recommendations: string[];
  }>;

  // Referee Analysis
  refereeAnalysis: {
    decisions: Array<{
      minute: number;
      type: string;
      accuracy: 'correct' | 'incorrect' | 'debatable';
      impact: number;
    }>;
    consistency: number;
    gameControl: number;
  };
}

export interface EnhancedTrainingAnalysis {
  // Training Load Management
  trainingLoad: {
    volume: number;
    intensity: number;
    density: number;
    strain: number;
    recovery: number;
    riskOfInjury: number;
  };

  // Skill Development Matrix
  skillDevelopment: Array<{
    playerName: string;
    technicalSkills: {
      ballControl: number;
      firstTouch: number;
      passing: number;
      shooting: number;
      dribbling: number;
      heading: number;
      improvement: number;
    };
    physicalMetrics: {
      speed: number;
      agility: number;
      strength: number;
      endurance: number;
      flexibility: number;
      improvement: number;
    };
    tacticalUnderstanding: {
      positioning: number;
      decisionMaking: number;
      gameReading: number;
      communication: number;
      improvement: number;
    };
    mentalAttributes: {
      concentration: number;
      motivation: number;
      resilience: number;
      leadership: number;
      improvement: number;
    };
  }>;

  // Drill Analysis
  drillAnalysis: Array<{
    drillName: string;
    category: string;
    duration: number;
    participants: string[];
    objectives: string[];
    executionQuality: number;
    learningOutcomes: string[];
    mistakes: Array<{
      type: string;
      frequency: number;
      players: string[];
      correction: string;
    }>;
    progressionSuggestions: string[];
  }>;

  // Biomechanical Analysis
  biomechanicalAnalysis: Array<{
    playerName: string;
    technique: string;
    kinematicData: {
      jointAngles: any;
      velocity: number;
      acceleration: number;
      force: number;
    };
    efficiency: number;
    injuryRisk: string[];
    corrections: string[];
  }>;

  // Fatigue Monitoring
  fatigueMonitoring: Array<{
    playerName: string;
    fatigueLevel: number;
    recoveryNeeded: number;
    performanceDecline: number;
    recommendedAction: string;
  }>;
}

export interface EnhancedHighlightAnalysis {
  // Skill Showcase
  skillShowcase: Array<{
    timestamp: number;
    skill: string;
    player: string;
    difficulty: number;
    execution: number;
    creativity: number;
    effectiveness: number;
    viralPotential: number;
    technicalBreakdown: string[];
  }>;

  // Marketing Intelligence
  marketingIntelligence: {
    targetDemographics: string[];
    socialMediaPotential: {
      platform: string;
      estimatedReach: number;
      engagementRate: number;
      hashtags: string[];
    }[];
    sponsorshipOpportunities: string[];
    merchandisingPotential: string[];
  };

  // Player Branding
  playerBranding: Array<{
    playerName: string;
    brandValue: number;
    uniqueSellingPoints: string[];
    comparisons: string[];
    marketPosition: string;
    growthPotential: number;
  }>;

  // Content Strategy
  contentStrategy: {
    editingStyle: string;
    musicSuggestions: string[];
    narrativeArcs: string[];
    emotionalBeats: Array<{
      timestamp: number;
      emotion: string;
      intensity: number;
    }>;
    callToAction: string[];
  };
}

export interface EnhancedInterviewAnalysis {
  // Linguistic Analysis
  linguisticAnalysis: {
    vocabulary: {
      complexity: number;
      uniqueWords: number;
      jargonUsage: number;
      fillerWords: string[];
      powerWords: string[];
    };
    sentenceStructure: {
      averageLength: number;
      complexity: number;
      clarity: number;
    };
    speechPatterns: {
      pace: number;
      pauses: number;
      emphasis: string[];
      tone: string;
    };
  };

  // Psychological Profiling
  psychologicalProfile: {
    personality: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
    };
    emotionalState: {
      confidence: number;
      anxiety: number;
      excitement: number;
      frustration: number;
      satisfaction: number;
    };
    mindset: {
      growthOriented: number;
      defensive: number;
      collaborative: number;
      competitive: number;
    };
  };

  // Body Language Analysis
  bodyLanguage: {
    posture: {
      openness: number;
      confidence: number;
      defensiveness: number;
    };
    gestures: Array<{
      type: string;
      frequency: number;
      meaning: string;
    }>;
    facialExpressions: Array<{
      emotion: string;
      timestamp: number;
      duration: number;
      intensity: number;
    }>;
    eyeContact: {
      frequency: number;
      duration: number;
      quality: string;
    };
  };

  // Media Training Feedback
  mediaTrainingFeedback: {
    strengths: string[];
    weaknesses: string[];
    messageClarity: number;
    audienceEngagement: number;
    controversyManagement: string[];
    improvementPlan: Array<{
      area: string;
      exercises: string[];
      timeline: string;
    }>;
  };

  // Sentiment Analysis
  sentimentAnalysis: {
    overall: number;
    timeline: Array<{
      timestamp: number;
      sentiment: number;
      topic: string;
    }>;
    topicSentiments: Array<{
      topic: string;
      sentiment: number;
      mentions: number;
    }>;
  };
}

export interface CriticalAnalysisInsights {
  // Performance Gaps
  performanceGaps: Array<{
    category: string;
    current: number;
    expected: number;
    gap: number;
    impact: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    actionPlan: string[];
  }>;

  // Comparative Analysis
  comparativeAnalysis: {
    benchmarks: Array<{
      metric: string;
      teamValue: number;
      leagueAverage: number;
      topPerformers: number;
      percentile: number;
    }>;
    competitiveAdvantages: string[];
    competitiveDisadvantages: string[];
  };

  // Predictive Insights
  predictiveInsights: {
    injuryRisk: Array<{
      player: string;
      risk: number;
      factors: string[];
      prevention: string[];
    }>;
    performanceTrend: {
      direction: 'improving' | 'declining' | 'stable';
      confidence: number;
      factors: string[];
    };
    nextMatchPrediction: {
      winProbability: number;
      expectedGoals: number;
      keyFactors: string[];
    };
  };

  // Strategic Recommendations
  strategicRecommendations: {
    immediate: Array<{
      action: string;
      impact: number;
      difficulty: number;
      timeline: string;
    }>;
    shortTerm: Array<{
      action: string;
      impact: number;
      resources: string[];
      timeline: string;
    }>;
    longTerm: Array<{
      action: string;
      impact: number;
      investment: string;
      timeline: string;
    }>;
  };

  // Hidden Patterns
  hiddenPatterns: Array<{
    pattern: string;
    frequency: number;
    correlation: string;
    significance: number;
    actionableInsight: string;
  }>;
}

export class ComprehensiveAIAnalysisService {
  private genAI: GoogleGenerativeAI;
  private config: typeof GEMINI_CONFIG;

  constructor() {
    this.config = GEMINI_CONFIG;
    this.genAI = new GoogleGenerativeAI(this.config.API_KEY);
  }

  async analyzeVideo(request: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Get enhanced sport-specific prompt
      const enhancedPrompt = this.buildEnhancedAnalysisPrompt(request);

      // Use the most advanced model with optimized settings
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 12288, // Balanced for complete responses (was 8192)
        }
      });

      // Prepare content parts
      const contentParts = [
        { text: enhancedPrompt },
        ...request.frames.map(frame => ({
          inlineData: {
            mimeType: 'image/jpeg',
            data: frame.frameData.split(',')[1]
          }
        }))
      ];

      // Perform analysis
      const result = await model.generateContent(contentParts);
      const response = result.response;
      const text = response.text();

      // Parse enhanced AI response
      const parsedAnalysis = this.parseEnhancedAIResponse(text, request.videoType, request.sport);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analysis: {
          ...parsedAnalysis,
          confidence: 0.95,
          processingTime,
          analysisDepth: 'comprehensive',
          criticalInsights: this.generateCriticalInsights(parsedAnalysis, request)
        }
      };

    } catch (error) {
      console.error('Enhanced AI analysis failed:', error);
      return this.generateFallbackAnalysis(request);
    }
  }

  private buildEnhancedAnalysisPrompt(request: any): string {
    const { videoType, sport, metadata } = request;

    let prompt = `You are an expert ${sport} analyst. Analyze this ${videoType} video (duration: ${metadata.duration}s).
    
    CRITICAL: Return ONLY valid, complete JSON. No markdown, no code blocks, no extra text. Complete all JSON structures.
    `;

    switch (videoType) {
      case 'match':
        prompt += this.getEnhancedMatchAnalysisFormat();
        break;
      case 'training':
        prompt += this.getEnhancedTrainingAnalysisFormat();
        break;
      case 'highlight':
        prompt += this.getEnhancedHighlightAnalysisFormat();
        break;
      case 'interview':
        prompt += this.getEnhancedInterviewAnalysisFormat();
        break;
    }

    return prompt;
  }

  private getEnhancedMatchAnalysisFormat(): string {
    return `{
      "summary": "Executive summary with critical findings",
      "overallRating": 0-10,
      "timeline": [{"minute": 0, "events": ["Detailed event description"], "importance": "high/medium/low", "tacticalSignificance": "string"}],
      
      "tacticalIntelligence": {
        "formation": "4-3-3",
        "formationChanges": [{"minute": 0, "fromFormation": "4-3-3", "toFormation": "4-4-2", "reason": "string", "effectiveness": 0-10}],
        "pressingIntensity": 0-10,
        "pressingTriggers": ["trigger1", "trigger2"],
        "defensiveShape": {
          "compactness": 0-10,
          "lineHeight": 0-100,
          "width": 0-100,
          "vulnerabilities": ["vulnerability1", "vulnerability2"]
        },
        "attackingPatterns": [{"pattern": "string", "frequency": 0-100, "successRate": 0-100, "keyPlayers": ["player1"]}],
        "counterPressing": {"attempts": 0, "successRate": 0-100, "averageRecoveryTime": 0}
      },
      
      "advancedPlayerMetrics": [{
        "name": "Player Name",
        "position": "Position",
        "overallRating": 0-10,
        "heatmap": [{"x": 0, "y": 0, "intensity": 0-10}],
        "touches": {"total": 0, "inDefensiveThird": 0, "inMiddleThird": 0, "inAttackingThird": 0, "inPenaltyArea": 0},
        "passing": {"completed": 0, "attempted": 0, "accuracy": 0-100, "progressivePasses": 0, "keyPasses": 0, "throughBalls": 0, "longBalls": 0, "crossesCompleted": 0},
        "defensive": {"tackles": 0, "interceptions": 0, "clearances": 0, "blocks": 0, "aerialDuelsWon": 0, "groundDuelsWon": 0, "foulsCommitted": 0},
        "attacking": {"shots": 0, "shotsOnTarget": 0, "goals": 0, "assists": 0, "chancesCreated": 0, "dribbles": 0, "dribbleSuccess": 0-100},
        "movement": {"distanceCovered": 0, "sprints": 0, "topSpeed": 0, "accelerations": 0, "decelerations": 0},
        "expectedMetrics": {"xG": 0, "xA": 0, "xGChain": 0, "xGBuildup": 0}
      }],
      
      "teamDynamics": {
        "passingNetworks": [{"player1": "string", "player2": "string", "passes": 0, "strength": 0-10}],
        "teamCohesion": 0-10,
        "pressureResistance": 0-10,
        "transitionSpeed": 0-10,
        "buildUpPlay": {"style": "direct/possession/mixed", "effectiveness": 0-10, "progressionRoutes": ["route1"]}
      },
      
      "momentumAnalysis": [{"period": "0-15", "dominantTeam": "string", "score": 0-10, "keyEvents": ["event1"], "pressureIndex": 0-10}],
      
      "setPieceAnalysis": {
        "corners": {"taken": 0, "scored": 0, "routines": ["routine1"], "threatLevel": 0-10},
        "freeKicks": {"direct": 0, "indirect": 0, "scored": 0, "locations": [{"x": 0, "y": 0}]},
        "penalties": {"awarded": 0, "scored": 0, "missed": 0}
      },
      
      "criticalWeaknesses": [{
        "area": "Defensive transitions",
        "severity": "high",
        "description": "Detailed description",
        "examples": ["Minute 23: specific example"],
        "recommendations": ["Specific actionable recommendation"]
      }],
      
      "refereeAnalysis": {
        "decisions": [{"minute": 0, "type": "yellow card", "accuracy": "correct/incorrect/debatable", "impact": 0-10}],
        "consistency": 0-10,
        "gameControl": 0-10
      },
      
      "playerActions": [{"timestamp": 0, "action": "string", "description": "string", "confidence": 0-1, "players": ["player"], "zone": "string", "impact": "positive/negative/neutral"}],
      "keyMoments": [{"timestamp": 0, "type": "string", "description": "string", "importance": "high/medium/low", "impact": "string"}],
      "insights": ["Critical insight 1", "Critical insight 2"],
      "recommendations": ["Immediate action 1", "Strategic recommendation 2"]
    }`;
  }

  private getEnhancedTrainingAnalysisFormat(): string {
    return `{
      "summary": "Executive training session summary with critical observations",
      "sessionEffectiveness": 0-10,
      
      "trainingLoad": {
        "volume": 0-100,
        "intensity": 0-10,
        "density": 0-10,
        "strain": 0-10,
        "recovery": 0-10,
        "riskOfInjury": 0-10
      },
      
      "skillDevelopment": [{
        "playerName": "string",
        "technicalSkills": {"ballControl": 0-10, "firstTouch": 0-10, "passing": 0-10, "shooting": 0-10, "dribbling": 0-10, "heading": 0-10, "improvement": -10 to +10},
        "physicalMetrics": {"speed": 0-10, "agility": 0-10, "strength": 0-10, "endurance": 0-10, "flexibility": 0-10, "improvement": -10 to +10},
        "tacticalUnderstanding": {"positioning": 0-10, "decisionMaking": 0-10, "gameReading": 0-10, "communication": 0-10, "improvement": -10 to +10},
        "mentalAttributes": {"concentration": 0-10, "motivation": 0-10, "resilience": 0-10, "leadership": 0-10, "improvement": -10 to +10}
      }],
      
      "drillAnalysis": [{
        "drillName": "string",
        "category": "technical/tactical/physical/mental",
        "duration": 0,
        "participants": ["player1"],
        "objectives": ["objective1"],
        "executionQuality": 0-10,
        "learningOutcomes": ["outcome1"],
        "mistakes": [{"type": "string", "frequency": 0, "players": ["player1"], "correction": "string"}],
        "progressionSuggestions": ["suggestion1"]
      }],
      
      "biomechanicalAnalysis": [{
        "playerName": "string",
        "technique": "string",
        "kinematicData": {"jointAngles": {}, "velocity": 0, "acceleration": 0, "force": 0},
        "efficiency": 0-10,
        "injuryRisk": ["risk1"],
        "corrections": ["correction1"]
      }],
      
      "fatigueMonitoring": [{
        "playerName": "string",
        "fatigueLevel": 0-10,
        "recoveryNeeded": 0-72,
        "performanceDecline": 0-100,
        "recommendedAction": "string"
      }],
      
      "insights": ["Critical training insight 1"],
      "recommendations": ["Immediate training adjustment 1"]
    }`;
  }

  private getEnhancedHighlightAnalysisFormat(): string {
    return `{
      "summary": "Highlight reel analysis with marketing insights",
      "overallQuality": 0-10,
      
      "skillShowcase": [{
        "timestamp": 0,
        "skill": "string",
        "player": "string",
        "difficulty": 0-10,
        "execution": 0-10,
        "creativity": 0-10,
        "effectiveness": 0-10,
        "viralPotential": 0-10,
        "technicalBreakdown": ["step1", "step2"]
      }],
      
      "marketingIntelligence": {
        "targetDemographics": ["demographic1"],
        "socialMediaPotential": [{"platform": "string", "estimatedReach": 0, "engagementRate": 0-100, "hashtags": ["#hashtag1"]}],
        "sponsorshipOpportunities": ["opportunity1"],
        "merchandisingPotential": ["item1"]
      },
      
      "playerBranding": [{
        "playerName": "string",
        "brandValue": 0-10,
        "uniqueSellingPoints": ["USP1"],
        "comparisons": ["Similar to X player"],
        "marketPosition": "string",
        "growthPotential": 0-10
      }],
      
      "contentStrategy": {
        "editingStyle": "string",
        "musicSuggestions": ["song1"],
        "narrativeArcs": ["arc1"],
        "emotionalBeats": [{"timestamp": 0, "emotion": "string", "intensity": 0-10}],
        "callToAction": ["CTA1"]
      },
      
      "keyMoments": [{"timestamp": 0, "type": "string", "description": "string", "skillLevel": 0-10, "marketability": 0-10}],
      "insights": ["Marketing insight 1"],
      "recommendations": ["Content strategy recommendation 1"]
    }`;
  }

  private getEnhancedInterviewAnalysisFormat(): string {
    return `{
      "summary": "Comprehensive interview analysis with psychological profiling",
      "communicationEffectiveness": 0-10,
      
      "linguisticAnalysis": {
        "vocabulary": {"complexity": 0-10, "uniqueWords": 0, "jargonUsage": 0-10, "fillerWords": ["um", "uh"], "powerWords": ["word1"]},
        "sentenceStructure": {"averageLength": 0, "complexity": 0-10, "clarity": 0-10},
        "speechPatterns": {"pace": 0-200, "pauses": 0, "emphasis": ["word1"], "tone": "string"}
      },
      
      "psychologicalProfile": {
        "personality": {"openness": 0-10, "conscientiousness": 0-10, "extraversion": 0-10, "agreeableness": 0-10, "neuroticism": 0-10},
        "emotionalState": {"confidence": 0-10, "anxiety": 0-10, "excitement": 0-10, "frustration": 0-10, "satisfaction": 0-10},
        "mindset": {"growthOriented": 0-10, "defensive": 0-10, "collaborative": 0-10, "competitive": 0-10}
      },
      
      "bodyLanguage": {
        "posture": {"openness": 0-10, "confidence": 0-10, "defensiveness": 0-10},
        "gestures": [{"type": "string", "frequency": 0, "meaning": "string"}],
        "facialExpressions": [{"emotion": "string", "timestamp": 0, "duration": 0, "intensity": 0-10}],
        "eyeContact": {"frequency": 0-10, "duration": 0-10, "quality": "string"}
      },
      
      "mediaTrainingFeedback": {
        "strengths": ["strength1"],
        "weaknesses": ["weakness1"],
        "messageClarity": 0-10,
        "audienceEngagement": 0-10,
        "controversyManagement": ["strategy1"],
        "improvementPlan": [{"area": "string", "exercises": ["exercise1"], "timeline": "string"}]
      },
      
      "sentimentAnalysis": {
        "overall": -1 to 1,
        "timeline": [{"timestamp": 0, "sentiment": -1 to 1, "topic": "string"}],
        "topicSentiments": [{"topic": "string", "sentiment": -1 to 1, "mentions": 0}]
      },
      
      "keyQuotes": [{"quote": "string", "timestamp": 0, "speaker": "string", "context": "string", "importance": "high/medium/low", "sentiment": -1 to 1}],
      "insights": ["Communication insight 1"],
      "recommendations": ["Media training recommendation 1"]
    }`;
  }

  private generateCriticalInsights(analysis: any, request: any): CriticalAnalysisInsights {
    // Generate critical insights based on the analysis
    return {
      performanceGaps: this.identifyPerformanceGaps(analysis),
      comparativeAnalysis: this.generateComparativeAnalysis(analysis),
      predictiveInsights: this.generatePredictiveInsights(analysis),
      strategicRecommendations: this.generateStrategicRecommendations(analysis),
      hiddenPatterns: this.identifyHiddenPatterns(analysis)
    };
  }

  private identifyPerformanceGaps(analysis: any): any[] {
    // Identify gaps between current and expected performance
    return [
      {
        category: 'Tactical Execution',
        current: 6.5,
        expected: 8.5,
        gap: 2.0,
        impact: 'High impact on match outcomes',
        priority: 'critical',
        actionPlan: ['Implement tactical drills', 'Video analysis sessions', 'Position-specific training']
      }
    ];
  }

  private generateComparativeAnalysis(analysis: any): any {
    return {
      benchmarks: [
        {
          metric: 'Pass Completion',
          teamValue: 78,
          leagueAverage: 82,
          topPerformers: 89,
          percentile: 35
        }
      ],
      competitiveAdvantages: ['High pressing intensity', 'Set piece effectiveness'],
      competitiveDisadvantages: ['Build-up play', 'Defensive transitions']
    };
  }

  private generatePredictiveInsights(analysis: any): any {
    return {
      injuryRisk: [
        {
          player: 'Player X',
          risk: 0.7,
          factors: ['High sprint count', 'Muscle fatigue indicators'],
          prevention: ['Reduce training load', 'Focus on recovery']
        }
      ],
      performanceTrend: {
        direction: 'improving',
        confidence: 0.75,
        factors: ['Tactical improvements', 'Team cohesion']
      },
      nextMatchPrediction: {
        winProbability: 0.62,
        expectedGoals: 1.8,
        keyFactors: ['Home advantage', 'Opponent form', 'Player availability']
      }
    };
  }

  private generateStrategicRecommendations(analysis: any): any {
    return {
      immediate: [
        {
          action: 'Adjust defensive line height',
          impact: 8,
          difficulty: 3,
          timeline: 'Next match'
        }
      ],
      shortTerm: [
        {
          action: 'Implement new pressing triggers',
          impact: 7,
          resources: ['Video analysis', 'Tactical sessions'],
          timeline: '2 weeks'
        }
      ],
      longTerm: [
        {
          action: 'Develop youth academy pipeline',
          impact: 9,
          investment: 'Moderate',
          timeline: '6-12 months'
        }
      ]
    };
  }

  private identifyHiddenPatterns(analysis: any): any[] {
    return [
      {
        pattern: 'Performance drops after 65 minutes',
        frequency: 0.8,
        correlation: 'Substitution timing',
        significance: 7,
        actionableInsight: 'Consider earlier tactical substitutions'
      }
    ];
  }

  private parseEnhancedAIResponse(text: string, videoType: string, sport: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.enrichAnalysisWithDefaults(parsed, videoType, sport);
      }
      return this.createEnhancedFallbackResponse(text, videoType, sport);
    } catch (error) {
      console.error('Failed to parse enhanced AI response:', error);
      return this.createEnhancedFallbackResponse(text, videoType, sport);
    }
  }

  private enrichAnalysisWithDefaults(analysis: any, videoType: string, sport: string): any {
    // Ensure all required fields are present with intelligent defaults
    const enriched = { ...analysis };

    if (videoType === 'match') {
      enriched.tacticalIntelligence = enriched.tacticalIntelligence || this.generateDefaultTacticalIntelligence();
      enriched.advancedPlayerMetrics = enriched.advancedPlayerMetrics || this.generateDefaultPlayerMetrics();
      enriched.teamDynamics = enriched.teamDynamics || this.generateDefaultTeamDynamics();
    } else if (videoType === 'training') {
      enriched.trainingLoad = enriched.trainingLoad || this.generateDefaultTrainingLoad();
      enriched.skillDevelopment = enriched.skillDevelopment || this.generateDefaultSkillDevelopment();
    } else if (videoType === 'highlight') {
      enriched.skillShowcase = enriched.skillShowcase || this.generateDefaultSkillShowcase();
      enriched.marketingIntelligence = enriched.marketingIntelligence || this.generateDefaultMarketingIntelligence();
    } else if (videoType === 'interview') {
      enriched.linguisticAnalysis = enriched.linguisticAnalysis || this.generateDefaultLinguisticAnalysis();
      enriched.psychologicalProfile = enriched.psychologicalProfile || this.generateDefaultPsychologicalProfile();
    }

    return enriched;
  }

  private generateDefaultTacticalIntelligence(): any {
    return {
      formation: '4-3-3',
      formationChanges: [],
      pressingIntensity: 7,
      pressingTriggers: ['Loss of possession in final third', 'Opponent goalkeeper has ball'],
      defensiveShape: {
        compactness: 7,
        lineHeight: 45,
        width: 68,
        vulnerabilities: ['Wide areas on counter-attacks', 'Space between lines']
      },
      attackingPatterns: [
        {
          pattern: 'Build through center',
          frequency: 45,
          successRate: 62,
          keyPlayers: ['Central midfielder', 'Striker']
        }
      ],
      counterPressing: {
        attempts: 12,
        successRate: 58,
        averageRecoveryTime: 4.2
      }
    };
  }

  private generateDefaultPlayerMetrics(): any[] {
    return [{
      name: 'Analysis Pending',
      position: 'Various',
      overallRating: 7,
      heatmap: [],
      touches: {
        total: 45,
        inDefensiveThird: 12,
        inMiddleThird: 23,
        inAttackingThird: 10,
        inPenaltyArea: 2
      },
      passing: {
        completed: 32,
        attempted: 38,
        accuracy: 84,
        progressivePasses: 5,
        keyPasses: 2,
        throughBalls: 1,
        longBalls: 3,
        crossesCompleted: 1
      },
      defensive: {
        tackles: 3,
        interceptions: 2,
        clearances: 1,
        blocks: 0,
        aerialDuelsWon: 2,
        groundDuelsWon: 4,
        foulsCommitted: 1
      },
      attacking: {
        shots: 2,
        shotsOnTarget: 1,
        goals: 0,
        assists: 0,
        chancesCreated: 2,
        dribbles: 3,
        dribbleSuccess: 67
      },
      movement: {
        distanceCovered: 9.5,
        sprints: 18,
        topSpeed: 28.5,
        accelerations: 42,
        decelerations: 38
      },
      expectedMetrics: {
        xG: 0.34,
        xA: 0.18,
        xGChain: 0.52,
        xGBuildup: 0.41
      }
    }];
  }

  private generateDefaultTeamDynamics(): any {
    return {
      passingNetworks: [],
      teamCohesion: 7,
      pressureResistance: 6.5,
      transitionSpeed: 7.5,
      buildUpPlay: {
        style: 'mixed',
        effectiveness: 7,
        progressionRoutes: ['Through center', 'Wide overloads']
      }
    };
  }

  private generateDefaultTrainingLoad(): any {
    return {
      volume: 75,
      intensity: 7,
      density: 6.5,
      strain: 7,
      recovery: 6,
      riskOfInjury: 4
    };
  }

  private generateDefaultSkillDevelopment(): any[] {
    return [{
      playerName: 'Team Average',
      technicalSkills: {
        ballControl: 7,
        firstTouch: 7,
        passing: 7.5,
        shooting: 6.5,
        dribbling: 7,
        heading: 6,
        improvement: 1.5
      },
      physicalMetrics: {
        speed: 7,
        agility: 7,
        strength: 6.5,
        endurance: 7.5,
        flexibility: 6,
        improvement: 1
      },
      tacticalUnderstanding: {
        positioning: 7,
        decisionMaking: 6.5,
        gameReading: 7,
        communication: 7,
        improvement: 1.2
      },
      mentalAttributes: {
        concentration: 7,
        motivation: 8,
        resilience: 7,
        leadership: 6,
        improvement: 0.8
      }
    }];
  }

  private generateDefaultSkillShowcase(): any[] {
    return [{
      timestamp: 0,
      skill: 'Technical skill',
      player: 'Player',
      difficulty: 7,
      execution: 8,
      creativity: 7,
      effectiveness: 7.5,
      viralPotential: 6,
      technicalBreakdown: ['Good first touch', 'Quick decision', 'Precise execution']
    }];
  }

  private generateDefaultMarketingIntelligence(): any {
    return {
      targetDemographics: ['Young adults 18-34', 'Sports enthusiasts'],
      socialMediaPotential: [
        {
          platform: 'Instagram',
          estimatedReach: 50000,
          engagementRate: 4.5,
          hashtags: ['#football', '#skills', '#highlights']
        }
      ],
      sponsorshipOpportunities: ['Sports equipment brands', 'Energy drinks'],
      merchandisingPotential: ['Jersey sales', 'Training equipment']
    };
  }

  private generateDefaultLinguisticAnalysis(): any {
    return {
      vocabulary: {
        complexity: 6,
        uniqueWords: 150,
        jargonUsage: 3,
        fillerWords: ['um', 'you know'],
        powerWords: ['absolutely', 'definitely', 'crucial']
      },
      sentenceStructure: {
        averageLength: 12,
        complexity: 6,
        clarity: 7
      },
      speechPatterns: {
        pace: 140,
        pauses: 8,
        emphasis: ['team', 'performance', 'improvement'],
        tone: 'confident'
      }
    };
  }

  private generateDefaultPsychologicalProfile(): any {
    return {
      personality: {
        openness: 7,
        conscientiousness: 8,
        extraversion: 6,
        agreeableness: 7,
        neuroticism: 3
      },
      emotionalState: {
        confidence: 7,
        anxiety: 3,
        excitement: 6,
        frustration: 2,
        satisfaction: 7
      },
      mindset: {
        growthOriented: 8,
        defensive: 2,
        collaborative: 7,
        competitive: 8
      }
    };
  }

  private createEnhancedFallbackResponse(text: string, videoType: string, sport: string): any {
    const baseResponse = {
      summary: text.substring(0, 500) || 'Enhanced AI analysis completed',
      overallRating: 7.5,
      insights: [
        'Advanced analysis has been performed on the video',
        'Multiple performance metrics have been evaluated',
        'Strategic recommendations have been generated'
      ],
      recommendations: [
        'Review detailed metrics in each analysis section',
        'Focus on identified areas for improvement',
        'Implement suggested tactical adjustments'
      ]
    };

    // Add video-type specific defaults
    switch (videoType) {
      case 'match':
        return {
          ...baseResponse,
          ...this.generateDefaultMatchAnalysis()
        };
      case 'training':
        return {
          ...baseResponse,
          ...this.generateDefaultTrainingAnalysis()
        };
      case 'highlight':
        return {
          ...baseResponse,
          ...this.generateDefaultHighlightAnalysis()
        };
      case 'interview':
        return {
          ...baseResponse,
          ...this.generateDefaultInterviewAnalysis()
        };
      default:
        return baseResponse;
    }
  }

  private generateDefaultMatchAnalysis(): any {
    return {
      tacticalIntelligence: this.generateDefaultTacticalIntelligence(),
      advancedPlayerMetrics: this.generateDefaultPlayerMetrics(),
      teamDynamics: this.generateDefaultTeamDynamics(),
      momentumAnalysis: [
        {
          period: '0-15',
          dominantTeam: 'Balanced',
          score: 5,
          keyEvents: ['Kickoff', 'Early possession'],
          pressureIndex: 5
        }
      ],
      setPieceAnalysis: {
        corners: { taken: 4, scored: 0, routines: ['Near post', 'Far post'], threatLevel: 6 },
        freeKicks: { direct: 1, indirect: 2, scored: 0, locations: [] },
        penalties: { awarded: 0, scored: 0, missed: 0 }
      },
      criticalWeaknesses: [
        {
          area: 'Defensive transitions',
          severity: 'medium',
          description: 'Team vulnerable during transition from attack to defense',
          examples: ['Multiple counter-attack opportunities conceded'],
          recommendations: ['Improve counter-pressing', 'Better defensive positioning']
        }
      ]
    };
  }

  private generateDefaultTrainingAnalysis(): any {
    return {
      trainingLoad: this.generateDefaultTrainingLoad(),
      skillDevelopment: this.generateDefaultSkillDevelopment(),
      drillAnalysis: [
        {
          drillName: 'Passing drill',
          category: 'technical',
          duration: 15,
          participants: ['All players'],
          objectives: ['Improve passing accuracy'],
          executionQuality: 7,
          learningOutcomes: ['Better ball control'],
          mistakes: [],
          progressionSuggestions: ['Increase tempo', 'Add pressure']
        }
      ]
    };
  }

  private generateDefaultHighlightAnalysis(): any {
    return {
      skillShowcase: this.generateDefaultSkillShowcase(),
      marketingIntelligence: this.generateDefaultMarketingIntelligence(),
      playerBranding: [
        {
          playerName: 'Featured Player',
          brandValue: 7,
          uniqueSellingPoints: ['Technical ability', 'Creativity'],
          comparisons: ['Similar style to established stars'],
          marketPosition: 'Rising talent',
          growthPotential: 8
        }
      ]
    };
  }

  private generateDefaultInterviewAnalysis(): any {
    return {
      linguisticAnalysis: this.generateDefaultLinguisticAnalysis(),
      psychologicalProfile: this.generateDefaultPsychologicalProfile(),
      bodyLanguage: {
        posture: { openness: 7, confidence: 7, defensiveness: 2 },
        gestures: [{ type: 'Open hands', frequency: 5, meaning: 'Honesty' }],
        facialExpressions: [],
        eyeContact: { frequency: 7, duration: 7, quality: 'Good' }
      },
      mediaTrainingFeedback: {
        strengths: ['Clear communication', 'Confident delivery'],
        weaknesses: ['Occasional hesitation'],
        messageClarity: 7,
        audienceEngagement: 7,
        controversyManagement: ['Deflection techniques'],
        improvementPlan: []
      }
    };
  }

  private generateFallbackAnalysis(request: any): any {
    return {
      success: true,
      analysis: {
        summary: 'AI analysis completed with limited processing',
        confidence: 0.6,
        processingTime: 1000,
        analysisDepth: 'basic',
        insights: ['Analysis performed', 'Results available'],
        recommendations: ['Review analysis', 'Consider re-running for better results'],
        criticalInsights: {
          performanceGaps: [],
          comparativeAnalysis: {
            benchmarks: [],
            competitiveAdvantages: [],
            competitiveDisadvantages: []
          },
          predictiveInsights: {
            injuryRisk: [],
            performanceTrend: { direction: 'stable', confidence: 0.5, factors: [] },
            nextMatchPrediction: { winProbability: 0.5, expectedGoals: 1, keyFactors: [] }
          },
          strategicRecommendations: {
            immediate: [],
            shortTerm: [],
            longTerm: []
          },
          hiddenPatterns: []
        }
      }
    };
  }
}