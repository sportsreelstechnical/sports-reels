
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyA2cd1hCSDn4TvWYiEBOcnxGb4g7Q3Dpns');

interface PlayerWithJersey {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
}

export interface AnalysisParams {
  videoUrl: string;
  videoType: 'match' | 'interview' | 'training' | 'highlight';
  videoTitle: string;
  videoDescription?: string;
  opposingTeam?: string;
  taggedPlayers: PlayerWithJersey[];
  playerStats?: Record<string, any>;
}

// Use a simple string return type that matches what we store in the database
export const analyzeVideoWithGemini = async (params: AnalysisParams): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Create detailed prompt based on video type
    let analysisPrompt = '';

    switch (params.videoType) {
      case 'match':
        analysisPrompt = `Analyze this football match video titled "${params.videoTitle}". ${params.videoDescription ? `Description: ${params.videoDescription}` : ''}
        
This is a match against ${params.opposingTeam}. The following players were tagged in this video: ${params.taggedPlayers.map((p: any) => `${p.playerName} (#${p.jerseyNumber})`).join(', ')}.

Please provide a comprehensive match analysis including:

**MATCH OVERVIEW:**
- Overall match summary and flow
- Key turning points and decisive moments
- Match tempo and style of play
- Weather/pitch conditions impact (if observable)

**TEAM PERFORMANCE:**
- Overall team coordination and chemistry
- Defensive organization and structure
- Attacking patterns and creativity
- Set piece execution (corners, free kicks, throw-ins)
- Transition play (defense to attack and vice versa)

**INDIVIDUAL PLAYER ANALYSIS:**
For each tagged player (${params.taggedPlayers.map(p => p.playerName).join(', ')}), provide detailed assessment of:
- Technical skills displayed (passing accuracy, first touch, ball control)
- Physical performance (pace, strength, endurance)
- Tactical awareness and positioning
- Decision-making under pressure
- Key moments and contributions
- Areas of excellence and improvement needed

**TACTICAL ANALYSIS:**
- Formation and tactical setup
- Strategic adjustments during the match
- Pressing triggers and defensive shape
- Build-up play patterns
- Counter-attacking effectiveness

**KEY STATISTICS & EVENTS:**
- Goals, assists, shots on/off target
- Successful passes, crosses, dribbles
- Tackles, interceptions, clearances
- Fouls, cards, and disciplinary actions
- Substitutions and their tactical impact

**RECOMMENDATIONS:**
- Individual player development areas
- Team tactical improvements
- Training focus suggestions
- Strategic recommendations for future matches

Provide specific examples and timestamps where possible. Focus on constructive feedback that can help improve performance.`;
        break;

      case 'training':
        analysisPrompt = `Analyze this training session video titled "${params.videoTitle}". ${params.videoDescription ? `Description: ${params.videoDescription}` : ''}

The following players were featured in this training session: ${params.taggedPlayers.map((p: any) => `${p.playerName} (#${p.jerseyNumber})`).join(', ')}.

Please provide a comprehensive training analysis including:

**SESSION OVERVIEW:**
- Training objectives and primary focus areas
- Duration and intensity level of the session
- Weather and training ground conditions
- Overall session structure and progression

**DRILL ANALYSIS:**
- Technical drills and their effectiveness
- Tactical exercises and their purpose
- Physical conditioning components
- Skill-specific training elements
- Small-sided games and scrimmages

**INDIVIDUAL PLAYER ASSESSMENT:**
For each tagged player (${params.taggedPlayers.map(p => p.playerName).join(', ')}):
- Engagement level and attitude
- Technical execution quality
- Physical effort and intensity
- Learning and adaptation rate
- Areas of visible improvement
- Challenges and difficulties observed

**COACHING EFFECTIVENESS:**
- Instruction clarity and delivery
- Player response to coaching points
- Use of training equipment and space
- Session organization and flow
- Individual attention and feedback

**DEVELOPMENT INSIGHTS:**
- Skills being developed successfully
- Areas needing additional focus
- Player readiness for match situations
- Team chemistry and communication
- Leadership qualities displayed

**RECOMMENDATIONS:**
- Suggested improvements for future sessions
- Individual player development plans
- Equipment or drill modifications
- Intensity or duration adjustments
- Focus areas for upcoming matches

Provide actionable insights that can enhance training effectiveness and player development.`;
        break;

      case 'interview':
        analysisPrompt = `Analyze this sports interview video titled "${params.videoTitle}". ${params.videoDescription ? `Description: ${params.videoDescription}` : ''}

Please provide a comprehensive interview analysis including:

**INTERVIEW OVERVIEW:**
- Context and setting of the interview
- Main purpose and objectives
- Interview style and format
- Duration and key segments

**CONTENT ANALYSIS:**
- Primary topics and themes discussed
- Key quotes and memorable statements
- Important revelations or announcements
- Strategic information shared
- Personal insights revealed

**COMMUNICATION ASSESSMENT:**
- Speaking clarity and confidence
- Body language and non-verbal cues
- Emotional state and mood
- Professionalism and media handling
- Authenticity and genuineness

**KEY INSIGHTS:**
- Player/coach perspectives on recent performances
- Team dynamics and relationships
- Future plans and ambitions
- Challenges and obstacles discussed
- Motivational factors and drivers

**STRATEGIC IMPLICATIONS:**
- Information relevant to team strategy
- Hints about future lineup changes
- Transfer or contract discussions
- Injury updates or fitness concerns
- Tactical preferences revealed

**MEDIA RELATIONS:**
- Handling of difficult questions
- Relationship with media and fans
- Public image and reputation impact
- Message consistency and clarity
- Crisis management (if applicable)

**RECOMMENDATIONS:**
- Areas for improved media training
- Communication strengths to leverage
- Message refinement suggestions
- Future interview preparation tips

Extract meaningful insights that provide value for team management, fans, and stakeholders.`;
        break;

      case 'highlight':
        analysisPrompt = `Analyze this sports highlight video titled "${params.videoTitle}". ${params.videoDescription ? `Description: ${params.videoDescription}` : ''}

Featured players in these highlights: ${params.taggedPlayers.map((p: any) => `${p.playerName} (#${p.jerseyNumber})`).join(', ')}.

Please provide a comprehensive highlight analysis including:

**HIGHLIGHT OVERVIEW:**
- Summary of featured moments and plays
- Time period or matches covered
- Overall quality and entertainment value
- Selection criteria and editorial choices

**STANDOUT PERFORMANCES:**
For each featured player (${params.taggedPlayers.map(p => p.playerName).join(', ')}):
- Most impressive moments showcased
- Technical skills on display
- Physical attributes highlighted
- Mental strength and composure
- Consistency across different situations
- Unique talents and specializations

**TECHNICAL EXCELLENCE:**
- Ball control and first touch quality
- Passing range and accuracy
- Shooting technique and power
- Dribbling skills and creativity
- Defensive actions and timing
- Aerial ability and heading

**TACTICAL AWARENESS:**
- Positioning and spatial awareness
- Decision-making speed and quality
- Team play and collaboration
- Leadership moments and communication
- Adaptability to different game situations

**PHYSICAL ATTRIBUTES:**
- Speed and acceleration
- Strength and power
- Agility and balance
- Endurance and work rate
- Injury resilience and durability

**IMPACT ANALYSIS:**
- Game-changing moments
- Clutch performances under pressure
- Consistency across different opponents
- Contribution to team success
- Fan and media reaction potential

**SCOUTING INSIGHTS:**
- Professional level assessment
- Market value implications
- Transfer potential and attractiveness
- Development trajectory
- Comparison with similar players

**RECOMMENDATIONS:**
- Continued development areas
- Optimal playing positions
- Tactical systems that suit the player
- Next career steps and opportunities

Provide detailed analysis that would be valuable for scouts, agents, coaches, and the players themselves.`;
        break;

      default:
        analysisPrompt = `Analyze this sports video titled "${params.videoTitle}". ${params.videoDescription ? `Description: ${params.videoDescription}` : ''}

Featured players: ${params.taggedPlayers.map((p: any) => `${p.playerName} (#${p.jerseyNumber})`).join(', ')}.

Please provide a comprehensive analysis of the video content, focusing on player performances, tactical insights, and actionable recommendations for improvement.`;
    }

    console.log('Sending request to Gemini API for video analysis...');

    const result = await model.generateContent(analysisPrompt);
    const response = result.response;
    const analysisText = response.text();

    if (!analysisText) {
      throw new Error('No analysis text received from Gemini API');
    }

    console.log('AI analysis completed successfully');
    return analysisText;

  } catch (error) {
    console.error('Error analyzing video with Gemini:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
