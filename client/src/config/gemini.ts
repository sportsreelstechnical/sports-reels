export const GEMINI_CONFIG = {
  // API Configuration
  API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  BASE_URL: 'https://generativelanguage.googleapis.com',

  // Model Configuration
  MODELS: {
    PRO: 'gemini-1.5-pro'
  },

  // Default Settings
  DEFAULT_MODEL: 'gemini-1.5-pro',
  DEFAULT_TEMPERATURE: 0.1,
  DEFAULT_MAX_TOKENS: 8192,

  // Video Analysis Settings
  VIDEO_ANALYSIS: {
    MAX_FRAMES: 30,
    FRAME_RATE: 1,
    QUALITY: 0.8,
    MAX_WIDTH: 800,
    MAX_HEIGHT: 600
  },

  // Sports-specific prompts
  SPORTS_PROMPTS: {
    football: {
      match: 'Analyze this football match comprehensively. Focus on: 1) Formations and tactical setups, 2) Pressing patterns and defensive organization, 3) Player movements and positioning, 4) Key events (goals, assists, saves, tackles), 5) Team transitions and counter-attacks, 6) Set piece effectiveness, 7) Individual player performance metrics, 8) Areas for tactical improvement. Provide detailed analysis with specific timestamps, player actions, and tactical insights.',
      training: 'Evaluate this football training session thoroughly. Assess: 1) Training session structure and progression, 2) Individual player technique and skill execution, 3) Work rate and intensity levels, 4) Team coordination and communication, 5) Drill effectiveness and completion rates, 6) Individual skill development areas, 7) Coaching recommendations for improvement, 8) Session effectiveness metrics. Provide specific feedback on technique, skill progression, and areas needing attention.',
      highlight: 'Analyze this football highlight video comprehensively. Focus on: 1) Key moments and exceptional plays, 2) Skill execution quality and difficulty, 3) Individual player performances, 4) Team coordination and strategy, 5) Marketable moments for recruitment, 6) Performance insights and statistics, 7) Skill demonstration effectiveness, 8) Content creation recommendations. Identify the most impressive and marketable aspects of the video.',
      interview: 'Analyze this football interview comprehensively. Focus on: 1) Key talking points and main themes, 2) Emotional moments and responses, 3) Important statements and quotes, 4) Communication effectiveness and confidence, 5) Key message delivery and clarity, 6) Interview structure and flow, 7) Communication patterns and style, 8) Recommendations for future interviews. Provide transcript summary, key quotes, and communication insights.'
    },
    basketball: {
      match: 'Analyze this basketball game comprehensively. Focus on: 1) Offensive and defensive strategies, 2) Player positioning and movement patterns, 3) Shot selection and accuracy, 4) Team coordination and communication, 5) Key plays and momentum shifts, 6) Individual player performance metrics, 7) Tactical adjustments and effectiveness, 8) Areas for improvement. Provide detailed analysis with specific plays, player actions, and strategic insights.',
      training: 'Evaluate this basketball training session thoroughly. Assess: 1) Training session structure and progression, 2) Shooting technique and accuracy, 3) Dribbling skills and ball control, 4) Defensive positioning and footwork, 5) Team coordination and communication, 6) Individual skill development areas, 7) Training effectiveness and intensity, 8) Coaching recommendations. Provide specific feedback on technique, skill progression, and improvement areas.',
      highlight: 'Analyze this basketball highlight video comprehensively. Focus on: 1) Exceptional plays and skill demonstrations, 2) Individual player performances, 3) Skill execution quality and difficulty, 4) Team coordination and strategy, 5) Marketable moments for recruitment, 6) Performance insights and statistics, 7) Highlight-worthy plays, 8) Content creation recommendations. Identify the most impressive and marketable aspects.',
      interview: 'Analyze this basketball interview comprehensively. Focus on: 1) Key talking points and main themes, 2) Emotional moments and responses, 3) Important statements and quotes, 4) Communication effectiveness and confidence, 5) Key message delivery and clarity, 6) Interview structure and flow, 7) Communication patterns and style, 8) Recommendations for future interviews. Provide transcript summary, key quotes, and communication insights.'
    },
    rugby: {
      match: 'Analyze this rugby match comprehensively. Focus on: 1) Team formations and tactical setups, 2) Tackling effectiveness and defensive organization, 3) Lineout and scrum performance, 4) Player positioning and movement patterns, 5) Key plays and momentum shifts, 6) Individual player performance metrics, 7) Team coordination and communication, 8) Areas for tactical improvement. Provide detailed analysis with specific plays, player actions, and strategic insights.',
      training: 'Evaluate this rugby training session thoroughly. Assess: 1) Training session structure and progression, 2) Tackling technique and safety, 3) Lineout and scrum practice effectiveness, 4) Passing and ball handling skills, 5) Team coordination and communication, 6) Individual skill development areas, 7) Training intensity and safety protocols, 8) Coaching recommendations. Provide specific feedback on technique, skill progression, and safety.',
      highlight: 'Analyze this rugby highlight video comprehensively. Focus on: 1) Exceptional plays and skill demonstrations, 2) Individual player performances, 3) Skill execution quality and difficulty, 4) Team coordination and strategy, 5) Marketable moments for recruitment, 6) Performance insights and statistics, 7) Highlight-worthy plays, 8) Content creation recommendations. Identify the most impressive and marketable aspects.',
      interview: 'Analyze this rugby interview comprehensively. Focus on: 1) Key talking points and main themes, 2) Emotional moments and responses, 3) Important statements and quotes, 4) Communication effectiveness and confidence, 5) Key message delivery and clarity, 6) Interview structure and flow, 7) Communication patterns and style, 8) Recommendations for future interviews. Provide transcript summary, key quotes, and communication insights.'
    },
    tennis: {
      match: 'Analyze this tennis match comprehensively. Focus on: 1) Serve accuracy and effectiveness, 2) Groundstroke consistency and quality, 3) Net play effectiveness and positioning, 4) Match strategy and mental game, 5) Key points and momentum shifts, 6) Individual player performance metrics, 7) Tactical adjustments and effectiveness, 8) Areas for improvement. Provide detailed analysis with specific shots, player actions, and strategic insights.',
      training: 'Evaluate this tennis training session thoroughly. Assess: 1) Training session structure and progression, 2) Serve technique and accuracy, 3) Footwork and movement patterns, 4) Stroke mechanics and consistency, 5) Match strategy development, 6) Individual skill development areas, 7) Training effectiveness and intensity, 8) Coaching recommendations. Provide specific feedback on technique, skill progression, and improvement areas.',
      highlight: 'Analyze this tennis highlight video comprehensively. Focus on: 1) Exceptional shots and skill demonstrations, 2) Individual player performances, 3) Skill execution quality and difficulty, 4) Match strategy and tactics, 5) Marketable moments for recruitment, 6) Performance insights and statistics, 7) Highlight-worthy plays, 8) Content creation recommendations. Identify the most impressive and marketable aspects.',
      interview: 'Analyze this tennis interview comprehensively. Focus on: 1) Key talking points and main themes, 2) Emotional moments and responses, 3) Important statements and quotes, 4) Communication effectiveness and confidence, 5) Key message delivery and clarity, 6) Interview structure and flow, 7) Communication patterns and style, 8) Recommendations for future interviews. Provide transcript summary, key quotes, and communication insights.'
    },
    volleyball: {
      match: 'Analyze this volleyball match comprehensively. Focus on: 1) Serving accuracy and effectiveness, 2) Blocking effectiveness and positioning, 3) Attack patterns and execution, 4) Team communication and coordination, 5) Key plays and momentum shifts, 6) Individual player performance metrics, 7) Tactical adjustments and effectiveness, 8) Areas for improvement. Provide detailed analysis with specific plays, player actions, and strategic insights.',
      training: 'Evaluate this volleyball training session thoroughly. Assess: 1) Training session structure and progression, 2) Serving technique and accuracy, 3) Blocking form and positioning, 4) Attack approach and execution, 5) Team coordination and communication, 6) Individual skill development areas, 7) Training effectiveness and intensity, 8) Coaching recommendations. Provide specific feedback on technique, skill progression, and improvement areas.',
      highlight: 'Analyze this volleyball highlight video comprehensively. Focus on: 1) Exceptional plays and skill demonstrations, 2) Individual player performances, 3) Skill execution quality and difficulty, 4) Team coordination and strategy, 5) Marketable moments for recruitment, 6) Performance insights and statistics, 7) Highlight-worthy plays, 8) Content creation recommendations. Identify the most impressive and marketable aspects.',
      interview: 'Analyze this volleyball interview comprehensively. Focus on: 1) Key talking points and main themes, 2) Emotional moments and responses, 3) Important statements and quotes, 4) Communication effectiveness and confidence, 5) Key message delivery and clarity, 6) Interview structure and flow, 7) Communication patterns and style, 8) Recommendations for future interviews. Provide transcript summary, key quotes, and communication insights.'
    },
    baseball: {
      match: 'Analyze this baseball game comprehensively. Focus on: 1) Pitching effectiveness and strategy, 2) Batting performance and technique, 3) Fielding and defensive plays, 4) Base running and strategy, 5) Key plays and momentum shifts, 6) Individual player performance metrics, 7) Tactical adjustments and effectiveness, 8) Areas for improvement. Provide detailed analysis with specific plays, player actions, and strategic insights.',
      training: 'Evaluate this baseball training session thoroughly. Assess: 1) Training session structure and progression, 2) Pitching technique and accuracy, 3) Batting technique and power, 4) Fielding skills and positioning, 5) Base running technique and strategy, 6) Individual skill development areas, 7) Training effectiveness and intensity, 8) Coaching recommendations. Provide specific feedback on technique, skill progression, and improvement areas.',
      highlight: 'Analyze this baseball highlight video comprehensively. Focus on: 1) Exceptional plays and skill demonstrations, 2) Individual player performances, 3) Skill execution quality and difficulty, 4) Game strategy and tactics, 5) Marketable moments for recruitment, 6) Performance insights and statistics, 7) Highlight-worthy plays, 8) Content creation recommendations. Identify the most impressive and marketable aspects.',
      interview: 'Analyze this baseball interview comprehensively. Focus on: 1) Key talking points and main themes, 2) Emotional moments and responses, 3) Important statements and quotes, 4) Communication effectiveness and confidence, 5) Key message delivery and clarity, 6) Interview structure and flow, 7) Communication patterns and style, 8) Recommendations for future interviews. Provide transcript summary, key quotes, and communication insights.'
    }
  },

  // Error Messages
  ERRORS: {
    NO_API_KEY: 'Gemini API key is required. Please set VITE_GEMINI_API_KEY in your environment variables.',
    INVALID_VIDEO: 'Invalid video format. Please upload a supported video file.',
    ANALYSIS_FAILED: 'Video analysis failed. Please try again or contact support.',
    FRAME_EXTRACTION_FAILED: 'Failed to extract video frames. Please check video format and try again.',
    API_RATE_LIMIT: 'API rate limit exceeded. Please wait a moment and try again.',
    NETWORK_ERROR: 'Network error occurred. Please check your connection and try again.'
  },

  // Success Messages
  SUCCESS: {
    ANALYSIS_COMPLETED: 'Video analysis completed successfully!',
    FRAMES_EXTRACTED: 'Video frames extracted successfully',
    AI_PROCESSING: 'AI analysis in progress...',
    RESULTS_SAVED: 'Analysis results saved to database'
  }
};

// Validation functions
export const validateGeminiConfig = () => {
  if (!GEMINI_CONFIG.API_KEY) {
    throw new Error(GEMINI_CONFIG.ERRORS.NO_API_KEY);
  }
  return true;
};

export const getModelForVideoType = (videoType: string, sport: string = 'football') => {
  // Always use gemini-1.5-pro for all video types
  return GEMINI_CONFIG.MODELS.PRO;
};

export const getSportPrompt = (sport: string, videoType: string) => {
  const prompts = GEMINI_CONFIG.SPORTS_PROMPTS[sport as keyof typeof GEMINI_CONFIG.SPORTS_PROMPTS];
  if (prompts && prompts[videoType as keyof typeof prompts]) {
    return prompts[videoType as keyof typeof prompts];
  }
  // Default prompt for unknown sports
  return `Analyze this ${sport} ${videoType} video with expert sports analysis focusing on performance, technique, and strategic insights.`;
};
