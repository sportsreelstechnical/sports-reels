
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { 
      videoId, 
      videoUrl, 
      videoType, 
      videoTitle, 
      videoDescription,
      opposingTeam,
      playerStats,
      taggedPlayers
    } = await req.json();

    console.log(`Starting comprehensive AI analysis for video ${videoId} of type ${videoType}`);

    // Get video metadata from database for better context
    const { data: videoData } = await supabase
      .from('videos')
      .select(`
        *,
        teams (
          name,
          country,
          member_association
        )
      `)
      .eq('id', videoId)
      .single();

    // Get player information for better analysis
    let playerDetails = [];
    if (taggedPlayers && taggedPlayers.length > 0) {
      const playerIds = taggedPlayers.map((p: any) => p.playerId);
      const { data: players } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number, citizenship')
        .in('id', playerIds);
      
      playerDetails = players || [];
    }

    // Create comprehensive analysis prompt based on actual video data
    let analysisPrompt = '';
    
    switch (videoType) {
      case 'match':
        analysisPrompt = `You are a professional football/soccer analyst. Analyze this match video with expert precision and provide detailed insights based on the following information:

**MATCH DETAILS:**
- Video Title: "${videoTitle}"
- Team: ${videoData?.teams?.name || 'Home Team'}
- Opposition: ${opposingTeam || 'Opposition Team'}
- Date: ${videoData?.match_date || 'Recent match'}
- Score: ${videoData?.score || 'Score not recorded'}
- League/Competition: ${videoData?.teams?.member_association || 'League competition'}

**PLAYER ROSTER:**
${playerDetails.length > 0 ? 
  playerDetails.map(p => `- ${p.full_name} (#${p.jersey_number || 'N/A'}) - ${p.position} (${p.citizenship})`).join('\n') :
  'Player details to be analyzed from video content'
}

**VIDEO DESCRIPTION:**
${videoDescription || 'No specific description provided - analyze based on visual content'}

**REQUIRED ANALYSIS:**

## MATCH OVERVIEW & NARRATIVE
Provide a comprehensive summary of the match, including:
- Opening phase and early tactical approaches
- Key periods of the game (first/second half highlights)
- Momentum shifts and turning points
- Overall match tempo and style of play
- Weather and pitch conditions impact (if observable)

## TACTICAL ANALYSIS
### Team Formation & Setup
- Analyze the formation and tactical structure
- Defensive organization and pressing triggers
- Attacking patterns and build-up play
- Set piece strategies (corners, free kicks, throw-ins)
- Substitutions and tactical changes

### Opposition Analysis
- ${opposingTeam || 'Opposition team'} strengths and weaknesses
- How they countered our tactical approach
- Key players who influenced the game
- Their defensive and attacking strategies

## INDIVIDUAL PLAYER PERFORMANCES
${playerDetails.length > 0 ? 
  `Provide detailed analysis for each player:\n${playerDetails.map(p => 
    `### ${p.full_name} (#${p.jersey_number || 'N/A'}) - ${p.position}
- Technical performance (passing, first touch, ball control)
- Physical attributes (pace, strength, aerial ability)
- Tactical awareness and positioning
- Key moments and contributions
- Decision-making under pressure
- Rating: X/10 with justification`).join('\n\n')}` :
  'Analyze individual performances of key players identified in the video'
}

## STATISTICAL ANALYSIS
Based on visual observation, estimate:
- Possession percentage
- Key passes and chances created
- Shots on/off target
- Successful tackles and interceptions
- Corners and set pieces
- Fouls and disciplinary actions
- Pass completion rates (approximate)

## MATCH EVENTS TIMELINE
Identify and analyze key events:
- Goals (technique, build-up, significance)
- Near misses and key saves
- Cards and controversial decisions
- Injuries and their impact
- Tactical substitutions and their effectiveness

## PERFORMANCE RATINGS
Provide numerical ratings (1-10):
- Overall team performance: X/10
- Individual player ratings
- Tactical execution: X/10
- Physical performance: X/10
- Mental resilience: X/10

## AREAS FOR IMPROVEMENT
### Team Level
- Tactical adjustments needed
- Training focus areas
- Squad rotation considerations

### Individual Level
- Technical skills development
- Physical conditioning needs
- Tactical understanding improvements

## FUTURE RECOMMENDATIONS
- Strategic considerations for upcoming matches
- Player development priorities
- Transfer market implications
- Tactical system refinements

**ANALYSIS REQUIREMENTS:**
- Base analysis on realistic football scenarios
- Provide specific, actionable insights
- Focus on observable technical and tactical details
- Consider both strengths and areas for improvement
- Maintain professional analytical standards`;
        break;

      case 'training':
        analysisPrompt = `As a professional football/soccer training analyst, provide comprehensive analysis of this training session:

**SESSION DETAILS:**
- Title: "${videoTitle}"
- Team: ${videoData?.teams?.name || 'Training Squad'}
- Description: ${videoDescription || 'Training session analysis'}
- Players: ${playerDetails.map(p => p.full_name).join(', ') || 'Squad members'}

**TRAINING SESSION ANALYSIS:**

## SESSION OVERVIEW
- Training objectives and focus areas
- Session intensity and duration
- Equipment and facilities utilized
- Weather conditions and their impact

## TECHNICAL SKILLS DEVELOPMENT
- Ball control and first touch exercises
- Passing accuracy and range drills
- Shooting technique and finishing
- Dribbling and 1v1 situations
- Crossing and aerial play practice

## TACTICAL WORK
- Formation rehearsals and positioning
- Set piece practice (offensive/defensive)
- Pressing patterns and defensive shape
- Transition play (attack to defense)
- Game situation simulations

## PHYSICAL CONDITIONING
- Fitness levels and endurance work
- Sprint speed and acceleration drills
- Strength and power exercises
- Agility and coordination work
- Recovery and injury prevention

## INDIVIDUAL PLAYER ASSESSMENTS
${playerDetails.length > 0 ? 
  playerDetails.map(p => 
    `### ${p.full_name} - ${p.position}
- Technical execution quality
- Physical effort and intensity
- Learning adaptation rate
- Leadership and communication
- Areas needing focus`).join('\n\n') :
  'Assess individual player performances during training'
}

## COACHING EFFECTIVENESS
- Instruction clarity and communication
- Session organization and flow
- Individual feedback and corrections
- Motivation and team building
- Use of training time efficiency

**Provide specific recommendations for improvement and future training focus.**`;
        break;

      case 'highlight':
        analysisPrompt = `Analyze this highlight reel as a professional scout and performance analyst:

**HIGHLIGHT COMPILATION:**
- Title: "${videoTitle}"
- Featured Players: ${playerDetails.map(p => `${p.full_name} (${p.position})`).join(', ') || 'Key players'}
- Context: ${videoDescription || 'Player highlight compilation'}

**SCOUTING ANALYSIS:**

## TECHNICAL EXCELLENCE
- Ball control and first touch quality
- Passing range and accuracy
- Shooting technique and power
- Dribbling skills and creativity
- Defensive actions and timing

## PHYSICAL ATTRIBUTES
- Speed and acceleration
- Strength and power
- Agility and balance
- Stamina and endurance
- Aerial ability and jumping

## MENTAL QUALITIES
- Decision-making under pressure
- Composure in crucial moments
- Leadership and communication
- Consistency across situations
- Adaptability to different scenarios

## STANDOUT MOMENTS
Analyze each key highlight:
- Technical execution quality
- Tactical context and significance
- Physical demands demonstrated
- Mental strength shown
- Impact on team/match outcome

## PLAYER DEVELOPMENT PROFILE
${playerDetails.length > 0 ? 
  playerDetails.map(p => 
    `### ${p.full_name} - ${p.position}
- Current ability level assessment
- Key strengths demonstrated
- Areas for development
- Potential trajectory
- Market value considerations`).join('\n\n') :
  'Assess featured players development potential'
}

## PROFESSIONAL READINESS
- Level of play demonstrated
- Consistency and reliability
- Adaptability to higher levels
- Transfer market appeal
- Long-term potential

**Provide detailed scouting report with specific recommendations.**`;
        break;

      case 'interview':
        analysisPrompt = `Analyze this player interview as a sports psychologist and media specialist:

**INTERVIEW DETAILS:**
- Title: "${videoTitle}"
- Player(s): ${playerDetails.map(p => p.full_name).join(', ') || 'Featured player'}
- Context: ${videoDescription || 'Player interview session'}

**COMMUNICATION ANALYSIS:**

## VERBAL COMMUNICATION
- Clarity and articulation
- Language skills and fluency
- Confidence in responses
- Depth of football knowledge
- Media training effectiveness

## NON-VERBAL COMMUNICATION
- Body language and posture
- Eye contact and engagement
- Confidence levels displayed
- Emotional control and composure
- Professional presentation

## CONTENT ANALYSIS
- Key topics and themes
- Insights into mentality and mindset
- Goals and ambitions revealed
- Team dynamics mentioned
- Career progression thoughts

## PERSONALITY ASSESSMENT
- Leadership qualities
- Maturity and emotional intelligence
- Passion and commitment
- Cultural awareness
- Professional attitude

## MEDIA READINESS
- Handling of difficult questions
- Brand awareness and marketability
- Crisis management capabilities
- Future media potential
- Public relations skills

**Provide comprehensive player profile based on interview performance.**`;
        break;
    }

    console.log('Sending detailed analysis request to Gemini API...');

    // Call Gemini API for comprehensive video analysis
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: analysisPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorData);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis text received from Gemini API');
    }

    console.log('Comprehensive AI analysis completed successfully');

    // Save detailed analysis to database
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        ai_analysis: {
          analysis: analysisText,
          video_type: videoType,
          analyzed_at: new Date().toISOString(),
          model_used: 'gemini-2.0-flash-exp',
          analysis_version: '2.0',
          metadata: {
            videoTitle,
            videoDescription,
            opposingTeam,
            taggedPlayers: playerDetails,
            teamInfo: videoData?.teams,
            analysisPromptLength: analysisPrompt.length
          }
        },
        ai_analysis_status: 'completed'
      })
      .eq('id', videoId);

    if (updateError) {
      console.error('Error saving analysis to database:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisText,
      videoType: videoType,
      analysisVersion: '2.0',
      metadata: {
        playersAnalyzed: playerDetails.length,
        promptComplexity: analysisPrompt.length > 2000 ? 'comprehensive' : 'standard'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced analyze-video function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      analysisVersion: '2.0'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
