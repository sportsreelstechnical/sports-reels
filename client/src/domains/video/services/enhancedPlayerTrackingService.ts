export interface PlayerPosition {
    x: number;
    y: number;
    timestamp: number;
    confidence: number;
}

export interface PlayerTrackingData {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    position: string;
    positions: PlayerPosition[];
    totalDistance: number;
    averageSpeed: number;
    maxSpeed: number;
    heatMapData: HeatMapPoint[];
    keyMoments: PlayerKeyMoment[];
}

export interface HeatMapPoint {
    x: number;
    y: number;
    intensity: number;
    timestamp: number;
}

export interface PlayerKeyMoment {
    timestamp: number;
    type: 'goal' | 'assist' | 'save' | 'tackle' | 'pass' | 'shot' | 'foul' | 'substitution';
    description: string;
    confidence: number;
    fieldPosition: string;
    outcome?: 'successful' | 'failed';
}

export interface FormationData {
    formation: string;
    positions: FormationPosition[];
    confidence: number;
    timestamp: number;
}

export interface FormationPosition {
    playerId: string;
    position: string;
    x: number;
    y: number;
}

export interface TacticalAnalysis {
    formationChanges: FormationData[];
    pressingMoments: PressingMoment[];
    buildUpPlay: BuildUpPlay[];
    defensiveActions: DefensiveAction[];
    attackingPatterns: AttackingPattern[];
}

export interface PressingMoment {
    timestamp: number;
    duration: number;
    intensity: 'low' | 'medium' | 'high';
    playersInvolved: string[];
    success: boolean;
}

export interface BuildUpPlay {
    timestamp: number;
    duration: number;
    playersInvolved: string[];
    passes: number;
    outcome: 'successful' | 'failed';
}

export interface DefensiveAction {
    timestamp: number;
    type: 'tackle' | 'interception' | 'clearance' | 'block';
    playerId: string;
    success: boolean;
    fieldPosition: string;
}

export interface AttackingPattern {
    timestamp: number;
    type: 'counter-attack' | 'possession-play' | 'set-piece' | 'individual-run';
    playersInvolved: string[];
    outcome: 'goal' | 'shot' | 'corner' | 'failed';
}

export interface MatchStatistics {
    possession: {
        home: number;
        away: number;
    };
    shots: {
        home: number;
        away: number;
    };
    passes: {
        home: number;
        away: number;
        accuracy: {
            home: number;
            away: number;
        };
    };
    goals: GoalEvent[];
    cards: CardEvent[];
    substitutions: SubstitutionEvent[];
}

export interface GoalEvent {
    timestamp: number;
    playerId: string;
    team: 'home' | 'away';
    type: 'open-play' | 'penalty' | 'free-kick' | 'corner' | 'own-goal';
    assistPlayerId?: string;
    fieldPosition: string;
}

export interface CardEvent {
    timestamp: number;
    playerId: string;
    team: 'home' | 'away';
    type: 'yellow' | 'red';
    reason: string;
}

export interface SubstitutionEvent {
    timestamp: number;
    playerOut: string;
    playerIn: string;
    team: 'home' | 'away';
    reason: 'tactical' | 'injury' | 'performance';
}

import { GoogleGenerativeAI } from '@google/generative-ai';

export class EnhancedPlayerTrackingService {
    private genAI: GoogleGenerativeAI;
    private config: any;

    constructor(config: any) {
        this.config = config;
        this.genAI = config.genAI || new GoogleGenerativeAI(config.API_KEY);
    }

    async analyzePlayerTracking(
        videoUrl: string,
        frames: any[],
        taggedPlayers: any[],
        sport: string,
        videoType: string
    ): Promise<{
        playerActions: any[];
        keyMoments: any[];
        playerTracking: PlayerTrackingData[];
        tacticalAnalysis: TacticalAnalysis;
        matchStatistics: MatchStatistics;
    }> {
        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-2.5-flash', // Using faster flash model (changed from 2.5-pro)
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 16384, // Increased for complete responses (was 8192)
                }
            });

            const prompt = this.buildPlayerTrackingPrompt(sport, videoType, taggedPlayers);

            const contentParts = [
                { text: prompt },
                ...frames.map(frame => ({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: frame.frameData.split(',')[1]
                    }
                }))
            ];

            const result = await model.generateContent(contentParts);
            const response = result.response;
            const text = response.text();

            // Check if response is empty
            if (!text || text.trim().length === 0) {
                console.error('AI returned empty response, using default analysis');
                return {
                    playerActions: [],
                    keyMoments: [],
                    playerTracking: this.generateDefaultAnalysis(taggedPlayers).playerTracking,
                    tacticalAnalysis: this.generateDefaultAnalysis(taggedPlayers).tacticalAnalysis,
                    matchStatistics: this.generateDefaultAnalysis(taggedPlayers).matchStatistics
                };
            }

            return this.parsePlayerTrackingResponse(text, taggedPlayers);
        } catch (error) {
            console.error('Enhanced player tracking failed:', error);
            // Return default analysis instead of throwing error
            return {
                playerActions: [],
                keyMoments: [],
                playerTracking: this.generateDefaultAnalysis(taggedPlayers).playerTracking,
                tacticalAnalysis: this.generateDefaultAnalysis(taggedPlayers).tacticalAnalysis,
                matchStatistics: this.generateDefaultAnalysis(taggedPlayers).matchStatistics
            };
        }
    }

    private buildPlayerTrackingPrompt(sport: string, videoType: string, taggedPlayers: any[]): string {
        const playerList = taggedPlayers.map(p => {
            const jerseyInfo = p.jerseyNumber ? `#${p.jerseyNumber}` : 'No Jersey';
            const positionInfo = p.position !== 'Unknown' ? ` (${p.position})` : '';
            return `${p.playerName} ${jerseyInfo}${positionInfo}`;
        }).join(', ');

        return `
Analyze this ${sport} ${videoType} video. Tagged players: ${playerList}.

CRITICAL RULES:
1. Return ONLY valid, complete JSON - no markdown, no code blocks, no extra text
2. Use exact player names: ${taggedPlayers.map(p => p.playerName).join(', ')}
3. All timestamps must be in VIDEO SECONDS (0-300), NOT Unix timestamps
4. MUST complete ALL JSON structures - close all arrays ] and objects }
5. Do NOT truncate the response - provide complete analysis

Required Analysis:
1. playerActions: All significant actions (goals, assists, tackles, passes, shots, saves, fouls, cards, dribbles, crosses, etc.)
2. keyMoments: Special events (referee decisions, celebrations, tactical changes, VAR, controversies, etc.)
3. playerTracking: Player positions and movements throughout the video with timestamps
4. tacticalAnalysis: Team formations, pressing patterns, and build-up play
5. matchStatistics: Overall game statistics (possession, shots, passes, goals, cards)

IMPORTANT: You must provide data for ALL players: ${taggedPlayers.map(p => p.playerName).join(', ')}

${this.getSportSpecificPrompt(sport)}

Return your analysis in the following JSON format:
{
  "playerActions": [
    {
      "timestamp": number,
      "action": "goal|assist|tackle|pass|shot|save|interception|foul|substitution|dribble|cross|corner|free_kick|throw_in|penalty|offside|yellow_card|red_card|block|clearance|header|volley|through_ball|long_ball|short_pass|key_pass|big_chance|missed_shot|shot_on_target|shot_off_target|saves|clean_sheet|goal_conceded|own_goal|handball|dive|time_wasting|celebration|injury|recovery|sprint|jog|walk|position_change|formation_change|tactical_foul|professional_foul|last_man_tackle|sliding_tackle|standing_tackle|aerial_duel|ground_duel|ball_recovery|turnover|mistake|error|brilliant_save|catches|punches|distribution|communication|leadership|motivation",
      "description": "string",
      "players": ["playerName"],
      "confidence": number,
      "outcome": "successful|failed|partial|neutral",
      "zone": "string",
      "intensity": "low|medium|high|critical",
      "impact": "positive|negative|neutral"
    }
  ],
  "keyMoments": [
    {
      "timestamp": number,
      "type": "referee_decision|commentary|substitution|injury|celebration|controversy|tactical_change|weather_impact|crowd_reaction|VAR_review|penalty_awarded|red_card_incident|goal_celebration|save_of_match|turning_point|momentum_shift|clutch_performance|comeback_start|lead_change|equalizer|winner|missed_penalty|brilliant_tackle|spectacular_save|world_class_goal|assist_of_match|leadership_moment|team_huddle|coach_instruction|fan_interaction|media_moment|historical_moment|record_breaking|milestone_achievement|emotional_moment|dramatic_finish",
      "description": "string",
      "participants": ["playerName|referee|commentator|coach"],
      "importance": "low|medium|high|critical",
      "context": "string",
      "impact": "positive|negative|neutral|dramatic",
      "source": "referee|commentator|coach|player|crowd|VAR|official"
    }
  ],
  "playerTracking": [
    {
      "playerId": "string",
      "playerName": "string", 
      "jerseyNumber": number,
      "position": "string",
      "positions": [
        {
          "x": number,
          "y": number,
          "timestamp": number,
          "confidence": number
        }
      ],
      "totalDistance": number,
      "averageSpeed": number,
      "maxSpeed": number,
      "heatMapData": [
        {
          "x": number,
          "y": number,
          "intensity": number,
          "timestamp": number
        }
      ],
      "keyMoments": [
        {
          "timestamp": number,
          "type": "goal|assist|save|tackle|pass|shot|foul|substitution",
          "description": "string",
          "confidence": number,
          "fieldPosition": "string",
          "outcome": "successful|failed"
        }
      ]
    }
  ],
  "tacticalAnalysis": {
    "formationChanges": [
      {
        "formation": "string",
        "positions": [
          {
            "playerId": "string",
            "position": "string",
            "x": number,
            "y": number
          }
        ],
        "confidence": number,
        "timestamp": number
      }
    ],
    "pressingMoments": [
      {
        "timestamp": number,
        "duration": number,
        "intensity": "low|medium|high",
        "playersInvolved": ["string"],
        "success": boolean
      }
    ],
    "buildUpPlay": [
      {
        "timestamp": number,
        "duration": number,
        "playersInvolved": ["string"],
        "passes": number,
        "outcome": "successful|failed"
      }
    ],
    "defensiveActions": [
      {
        "timestamp": number,
        "type": "tackle|interception|clearance|block",
        "playerId": "string",
        "success": boolean,
        "fieldPosition": "string"
      }
    ],
    "attackingPatterns": [
      {
        "timestamp": number,
        "type": "counter-attack|possession-play|set-piece|individual-run",
        "playersInvolved": ["string"],
        "outcome": "goal|shot|corner|failed"
      }
    ]
  },
  "matchStatistics": {
    "possession": {
      "home": number,
      "away": number
    },
    "shots": {
      "home": number,
      "away": number
    },
    "passes": {
      "home": number,
      "away": number,
      "accuracy": {
        "home": number,
        "away": number
      }
    },
    "goals": [
      {
        "timestamp": number,
        "playerId": "string",
        "team": "home|away",
        "type": "open-play|penalty|free-kick|corner|own-goal",
        "assistPlayerId": "string",
        "fieldPosition": "string"
      }
    ],
    "cards": [
      {
        "timestamp": number,
        "playerId": "string",
        "team": "home|away",
        "type": "yellow|red",
        "reason": "string"
      }
    ],
    "substitutions": [
      {
        "timestamp": number,
        "playerOut": "string",
        "playerIn": "string",
        "team": "home|away",
        "reason": "tactical|injury|performance"
      }
    ]
  }
}

Analyze the video frames carefully and provide accurate, detailed analysis based on what you observe.`;
    }

    private getSportSpecificPrompt(sport: string): string {
        const sportLower = sport.toLowerCase();

        if (sportLower === 'football' || sportLower === 'soccer') {
            return `
- Detect set pieces (corners, free kicks, penalties)
- Analyze passing networks and key passes
- Identify pressing triggers and defensive lines
- Track goalkeeper distribution and saves
- Monitor offside situations and VAR decisions
- Analyze crossing patterns and aerial duels
- Track counter-attacking opportunities
- Monitor defensive transitions`;
        }

        if (sportLower === 'basketball') {
            return `
- Analyze shot selection and efficiency (2-pointers, 3-pointers, free throws)
- Detect pick and roll situations and defensive switches
- Track rebounding patterns (offensive/defensive)
- Monitor fast break opportunities and transition play
- Identify defensive rotations and help defense
- Analyze ball movement and assists
- Track player spacing and court positioning
- Monitor shot clock management`;
        }

        if (sportLower === 'rugby') {
            return `
- Track ruck and maul formations and success rates
- Analyze lineout strategies and throwing accuracy
- Monitor scrum engagement and stability
- Detect tackle techniques and outcomes
- Track territorial kicking and field position
- Analyze breakdown play and turnovers
- Monitor defensive line speed and organization
- Track ball handling and offloading`;
        }

        if (sportLower === 'tennis') {
            return `
- Analyze serve patterns, speeds, and placement
- Track rally lengths and shot types (forehand, backhand, volley)
- Monitor court positioning and movement
- Detect unforced errors and winners
- Track momentum shifts in matches
- Analyze return positioning and strategy
- Monitor net play and approach shots
- Track break point situations`;
        }

        if (sportLower === 'volleyball') {
            return `
- Analyze serving patterns, aces, and service errors
- Track blocking formations and touches
- Monitor attacking angles and power
- Detect defensive positioning and digs
- Track setter distribution patterns
- Analyze reception quality and passing
- Monitor transition play and counter-attacks
- Track rotation patterns and substitutions`;
        }

        if (sportLower === 'baseball') {
            return `
- Analyze pitching patterns and pitch selection
- Track batting stance and swing mechanics
- Monitor base running and stealing attempts
- Detect defensive positioning and shifts
- Track fielding plays and errors
- Analyze catcher framing and game calling
- Monitor bullpen usage and matchups
- Track situational hitting and RBI opportunities`;
        }

        if (sportLower === 'hockey') {
            return `
- Analyze skating speed and edge work
- Track passing accuracy and breakout plays
- Monitor forechecking and backchecking
- Detect shot selection and accuracy
- Track faceoff techniques and success rates
- Analyze defensive zone coverage
- Monitor power play and penalty kill
- Track physical play and body checking`;
        }

        if (sportLower === 'cricket') {
            return `
- Analyze batting technique and shot selection
- Track bowling variations and accuracy
- Monitor fielding positioning and catches
- Detect wicket-keeping techniques
- Track running between wickets
- Analyze captaincy decisions and field placements
- Monitor powerplay and death overs
- Track spin bowling variations`;
        }

        // Default for other sports
        return `
- Analyze sport-specific movements and patterns
- Track key performance indicators relevant to ${sport}
- Monitor tactical decisions and execution
- Detect critical moments and turning points
- Analyze individual skill execution
- Track team coordination and communication
- Monitor physical performance metrics
- Detect strategic adjustments and adaptations`;
    }

    private parsePlayerTrackingResponse(text: string, taggedPlayers: any[]): any {
        try {
            // Clean the response text first
            let cleanedText = text.trim();

            // Remove any markdown formatting
            cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Try to find JSON object boundaries
            let jsonStart = cleanedText.indexOf('{');
            let jsonEnd = cleanedText.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
                console.warn('No valid JSON boundaries found, attempting to parse entire response');
                jsonStart = 0;
                jsonEnd = cleanedText.length;
            }

            let jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);

            // Try to fix common JSON issues
            jsonText = this.fixMalformedJSON(jsonText);

            console.log('Attempting to parse JSON:', jsonText.substring(0, 500) + '...');

            // Parse the JSON
            const analysis = JSON.parse(jsonText);

            // Convert Unix timestamps to video seconds
            const convertedAnalysis = this.convertTimestamps(analysis);

            // Validate and enhance the analysis data
            return {
                playerActions: this.validatePlayerActions(convertedAnalysis.playerActions || []),
                keyMoments: this.validateKeyMoments(convertedAnalysis.keyMoments || []),
                playerTracking: this.validatePlayerTracking(convertedAnalysis.playerTracking || [], taggedPlayers),
                tacticalAnalysis: this.validateTacticalAnalysis(convertedAnalysis.tacticalAnalysis || {}),
                matchStatistics: this.validateMatchStatistics(convertedAnalysis.matchStatistics || {})
            };
        } catch (error) {
            console.error('Error parsing player tracking response:', error);
            console.error('Response text:', text.substring(0, 1000));

            // Try to extract partial data from malformed JSON
            const partialData = this.extractPartialData(text, taggedPlayers);
            if (partialData) {
                console.log('Using partial data from malformed JSON');
                return partialData;
            }

            // Return default structure with tagged players if parsing fails
            return this.generateDefaultAnalysis(taggedPlayers);
        }
    }

    private convertTimestamps(analysis: any): any {
        try {
            // Get the earliest timestamp to use as baseline
            let earliestTimestamp = Infinity;

            // Find earliest timestamp in player actions
            if (analysis.playerActions) {
                analysis.playerActions.forEach((action: any) => {
                    if (action.timestamp && action.timestamp > 1000000000) { // Unix timestamp check
                        earliestTimestamp = Math.min(earliestTimestamp, action.timestamp);
                    }
                });
            }

            // Find earliest timestamp in player tracking positions
            if (analysis.playerTracking) {
                analysis.playerTracking.forEach((player: any) => {
                    if (player.positions) {
                        player.positions.forEach((pos: any) => {
                            if (pos.timestamp && pos.timestamp > 1000000000) { // Unix timestamp check
                                earliestTimestamp = Math.min(earliestTimestamp, pos.timestamp);
                            }
                        });
                    }
                });
            }

            // Find earliest timestamp in tactical analysis
            if (analysis.tacticalAnalysis) {
                Object.values(analysis.tacticalAnalysis).forEach((items: any) => {
                    if (Array.isArray(items)) {
                        items.forEach((item: any) => {
                            if (item.timestamp && item.timestamp > 1000000000) {
                                earliestTimestamp = Math.min(earliestTimestamp, item.timestamp);
                            }
                        });
                    }
                });
            }

            // If no valid timestamps found, return original
            if (earliestTimestamp === Infinity) {
                console.log('No Unix timestamps found, returning original analysis');
                return analysis;
            }

            console.log('Converting Unix timestamps. Earliest timestamp:', earliestTimestamp);

            // Convert player actions timestamps
            if (analysis.playerActions) {
                analysis.playerActions.forEach((action: any) => {
                    if (action.timestamp && action.timestamp > 1000000000) {
                        action.timestamp = Math.round((action.timestamp - earliestTimestamp) / 1000); // Convert to seconds
                    }
                });
            }

            // Convert player tracking timestamps
            if (analysis.playerTracking) {
                analysis.playerTracking.forEach((player: any) => {
                    if (player.positions) {
                        player.positions.forEach((pos: any) => {
                            if (pos.timestamp && pos.timestamp > 1000000000) {
                                pos.timestamp = Math.round((pos.timestamp - earliestTimestamp) / 1000); // Convert to seconds
                            }
                        });
                    }
                    if (player.heatMapData) {
                        player.heatMapData.forEach((point: any) => {
                            if (point.timestamp && point.timestamp > 1000000000) {
                                point.timestamp = Math.round((point.timestamp - earliestTimestamp) / 1000);
                            }
                        });
                    }
                    if (player.keyMoments) {
                        player.keyMoments.forEach((moment: any) => {
                            if (moment.timestamp && moment.timestamp > 1000000000) {
                                moment.timestamp = Math.round((moment.timestamp - earliestTimestamp) / 1000);
                            }
                        });
                    }
                });
            }

            // Convert tactical analysis timestamps
            if (analysis.tacticalAnalysis) {
                Object.values(analysis.tacticalAnalysis).forEach((items: any) => {
                    if (Array.isArray(items)) {
                        items.forEach((item: any) => {
                            if (item.timestamp && item.timestamp > 1000000000) {
                                item.timestamp = Math.round((item.timestamp - earliestTimestamp) / 1000);
                            }
                        });
                    }
                });
            }

            // Convert match statistics timestamps
            if (analysis.matchStatistics) {
                if (analysis.matchStatistics.goals) {
                    analysis.matchStatistics.goals.forEach((goal: any) => {
                        if (goal.timestamp && goal.timestamp > 1000000000) {
                            goal.timestamp = Math.round((goal.timestamp - earliestTimestamp) / 1000);
                        }
                    });
                }
                if (analysis.matchStatistics.cards) {
                    analysis.matchStatistics.cards.forEach((card: any) => {
                        if (card.timestamp && card.timestamp > 1000000000) {
                            card.timestamp = Math.round((card.timestamp - earliestTimestamp) / 1000);
                        }
                    });
                }
                if (analysis.matchStatistics.substitutions) {
                    analysis.matchStatistics.substitutions.forEach((sub: any) => {
                        if (sub.timestamp && sub.timestamp > 1000000000) {
                            sub.timestamp = Math.round((sub.timestamp - earliestTimestamp) / 1000);
                        }
                    });
                }
            }

            console.log('Timestamp conversion completed');
            return analysis;
        } catch (error) {
            console.error('Error converting timestamps:', error);
            return analysis;
        }
    }

    private fixMalformedJSON(jsonText: string): string {
        try {
            // Try to fix incomplete values
            jsonText = jsonText.replace(/:\s*"([^"]*)$/gm, ': ""');
            jsonText = jsonText.replace(/:\s*(\d*\.?\d*)$/gm, ': 0');
            jsonText = jsonText.replace(/,\s*$/, '');

            // Try to close incomplete arrays and objects
            const openBraces = (jsonText.match(/\{/g) || []).length;
            const closeBraces = (jsonText.match(/\}/g) || []).length;
            const openBrackets = (jsonText.match(/\[/g) || []).length;
            const closeBrackets = (jsonText.match(/\]/g) || []).length;

            // Add missing closing brackets
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
                jsonText += ']';
            }

            // Add missing closing braces
            for (let i = 0; i < openBraces - closeBraces; i++) {
                jsonText += '}';
            }

            return jsonText;
        } catch (error) {
            console.warn('Error fixing malformed JSON:', error);
            return jsonText;
        }
    }

    private extractPartialData(text: string, taggedPlayers: any[]): any | null {
        try {
            // Try to extract what we can from the malformed JSON
            const playerActionsMatch = text.match(/"playerActions":\s*\[([\s\S]*?)(?=\]|\s*"playerTracking"|\s*"tacticalAnalysis"|\s*"matchStatistics"|$)/);
            const playerTrackingMatch = text.match(/"playerTracking":\s*\[([\s\S]*?)(?=\]|\s*"tacticalAnalysis"|\s*"matchStatistics"|$)/);
            const tacticalMatch = text.match(/"tacticalAnalysis":\s*\{([\s\S]*?)(?=\}|\s*"matchStatistics"|$)/);
            const matchStatsMatch = text.match(/"matchStatistics":\s*\{([\s\S]*?)(?=\}|$)/);

            let playerActions = [];
            let playerTracking = [];
            let tacticalAnalysis = {};
            let matchStatistics = {};

            if (playerActionsMatch) {
                try {
                    // Try to parse partial player actions data
                    const partialActionsData = '[' + playerActionsMatch[1] + ']';
                    const fixedPartial = this.fixMalformedJSON(partialActionsData);
                    playerActions = JSON.parse(fixedPartial) || [];

                    // Convert timestamps in partial data
                    const convertedData = this.convertTimestamps({ playerActions });
                    playerActions = convertedData.playerActions || [];
                } catch (e) {
                    console.warn('Could not parse partial player actions data');
                }
            }

            if (playerTrackingMatch) {
                try {
                    // Try to parse partial player tracking data
                    const partialPlayerData = '[' + playerTrackingMatch[1] + ']';
                    const fixedPartial = this.fixMalformedJSON(partialPlayerData);
                    playerTracking = JSON.parse(fixedPartial) || [];

                    // Convert timestamps in partial data
                    const convertedData = this.convertTimestamps({ playerTracking });
                    playerTracking = convertedData.playerTracking || [];
                } catch (e) {
                    console.warn('Could not parse partial player tracking data');
                }
            }

            if (tacticalMatch) {
                try {
                    const partialTactical = '{' + tacticalMatch[1] + '}';
                    const fixedPartial = this.fixMalformedJSON(partialTactical);
                    tacticalAnalysis = JSON.parse(fixedPartial) || {};
                } catch (e) {
                    console.warn('Could not parse partial tactical analysis data');
                }
            }

            if (matchStatsMatch) {
                try {
                    const partialMatchStats = '{' + matchStatsMatch[1] + '}';
                    const fixedPartial = this.fixMalformedJSON(partialMatchStats);
                    matchStatistics = JSON.parse(fixedPartial) || {};
                } catch (e) {
                    console.warn('Could not parse partial match statistics data');
                }
            }

            return {
                playerActions: this.validatePlayerActions(playerActions),
                keyMoments: this.validateKeyMoments([]), // Will be extracted from player tracking if needed
                playerTracking: this.validatePlayerTracking(playerTracking, taggedPlayers),
                tacticalAnalysis: this.validateTacticalAnalysis(tacticalAnalysis),
                matchStatistics: this.validateMatchStatistics(matchStatistics)
            };
        } catch (error) {
            console.warn('Error extracting partial data:', error);
            return null;
        }
    }

    private generateDefaultAnalysis(taggedPlayers: any[]): any {
        return {
            playerActions: [],
            keyMoments: [],
            playerTracking: taggedPlayers.map(player => ({
                playerId: player.playerId,
                playerName: player.playerName,
                jerseyNumber: player.jerseyNumber,
                position: 'Unknown',
                positions: [],
                totalDistance: 0,
                averageSpeed: 0,
                maxSpeed: 0,
                heatMapData: [],
                keyMoments: []
            })),
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
            }
        };
    }

    private validatePlayerActions(playerActions: any[]): any[] {
        if (!Array.isArray(playerActions)) {
            return [];
        }

        return playerActions.map(action => ({
            timestamp: typeof action.timestamp === 'number' ? action.timestamp : 0,
            action: typeof action.action === 'string' ? action.action : 'unknown',
            description: typeof action.description === 'string' ? action.description : 'No description',
            players: Array.isArray(action.players) ? action.players : [],
            confidence: typeof action.confidence === 'number' ? action.confidence : 0,
            outcome: typeof action.outcome === 'string' ? action.outcome : 'unknown',
            zone: typeof action.zone === 'string' ? action.zone : 'Unknown zone',
            intensity: typeof action.intensity === 'string' ? action.intensity : 'medium',
            impact: typeof action.impact === 'string' ? action.impact : 'neutral'
        }));
    }

    private validateKeyMoments(keyMoments: any[]): any[] {
        if (!Array.isArray(keyMoments)) {
            return [];
        }

        return keyMoments.map(moment => ({
            timestamp: typeof moment.timestamp === 'number' ? moment.timestamp : 0,
            type: typeof moment.type === 'string' ? moment.type : 'unknown',
            description: typeof moment.description === 'string' ? moment.description : 'No description',
            participants: Array.isArray(moment.participants) ? moment.participants : [],
            importance: typeof moment.importance === 'string' ? moment.importance : 'medium',
            context: typeof moment.context === 'string' ? moment.context : 'No context',
            impact: typeof moment.impact === 'string' ? moment.impact : 'neutral',
            source: typeof moment.source === 'string' ? moment.source : 'unknown'
        }));
    }

    private validatePlayerTracking(playerTracking: any[], taggedPlayers: any[]): PlayerTrackingData[] {
        return taggedPlayers.map(player => {
            // Try to find tracked player by multiple criteria
            const trackedPlayer = playerTracking.find(p =>
                p.playerId === player.playerId ||
                p.playerName === player.playerName ||
                (p.playerName && player.playerName && p.playerName.toLowerCase().includes(player.playerName.toLowerCase())) ||
                (p.playerName && player.playerName && player.playerName.toLowerCase().includes(p.playerName.toLowerCase()))
            );

            if (trackedPlayer) {
                return {
                    playerId: player.playerId,
                    playerName: player.playerName,
                    jerseyNumber: trackedPlayer.jerseyNumber || player.jerseyNumber,
                    position: trackedPlayer.position || player.position || 'Unknown',
                    positions: trackedPlayer.positions || [],
                    totalDistance: trackedPlayer.totalDistance || 0,
                    averageSpeed: trackedPlayer.averageSpeed || 0,
                    maxSpeed: trackedPlayer.maxSpeed || 0,
                    heatMapData: trackedPlayer.heatMapData || [],
                    keyMoments: trackedPlayer.keyMoments || []
                };
            }

            // Return default data if no tracking found
            return {
                playerId: player.playerId,
                playerName: player.playerName,
                jerseyNumber: player.jerseyNumber,
                position: player.position || 'Unknown',
                positions: [],
                totalDistance: 0,
                averageSpeed: 0,
                maxSpeed: 0,
                heatMapData: [],
                keyMoments: []
            };
        });
    }

    private validateTacticalAnalysis(tacticalAnalysis: any): TacticalAnalysis {
        return {
            formationChanges: tacticalAnalysis.formationChanges || [],
            pressingMoments: tacticalAnalysis.pressingMoments || [],
            buildUpPlay: tacticalAnalysis.buildUpPlay || [],
            defensiveActions: tacticalAnalysis.defensiveActions || [],
            attackingPatterns: tacticalAnalysis.attackingPatterns || []
        };
    }

    private validateMatchStatistics(matchStatistics: any): MatchStatistics {
        return {
            possession: matchStatistics.possession || { home: 50, away: 50 },
            shots: matchStatistics.shots || { home: 0, away: 0 },
            passes: matchStatistics.passes || { home: 0, away: 0, accuracy: { home: 0, away: 0 } },
            goals: matchStatistics.goals || [],
            cards: matchStatistics.cards || [],
            substitutions: matchStatistics.substitutions || []
        };
    }
}
