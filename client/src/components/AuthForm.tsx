import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import InfoTooltip from '@/components/InfoTooltip';
import { Checkbox } from '@/components/ui/checkbox';
import GoogleLanguageSelector from '@/components/GoogleLanguageSelector';
import TranslatedText from '@/components/TranslatedText';

const AuthForm = () => {
  // Authentication and form state
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [userType, setUserType] = useState<'team' | 'agent'>('team');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Video player configuration
  const videoUrls = [
    "/sportsreelsvideos/101290-video-720.mp4",
    "/sportsreelsvideos/mixkit-baseball-player-pitching-the-ball-856-hd-ready.mp4",
    "/sportsreelsvideos/mixkit-basketball-player-dribbling-then-dunking-2285-hd-ready.mp4",
    "/sportsreelsvideos/mixkit-man-swimming-in-a-pool-3168-hd-ready.mp4",
    "/sportsreelsvideos/mixkit-portrait-of-a-confident-football-player-42566-hd-ready.mp4",
    "/sportsreelsvideos/mixkit-tennis-players-at-an-outdoor-court-869-hd-ready.mp4",
    "/sportsreelsvideos/mixkit-two-men-on-a-ring-fighting-in-a-boxing-match-40974-hd-ready.mp4",
    "/sportsreelsvideos/mixkit-young-woman-getting-into-position-for-sprinting-32800-hd-ready.mp4",
  ];
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [remainingVideos, setRemainingVideos] = useState<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transitionTimeout = useRef<NodeJS.Timeout>();
  const fadeTimeout = useRef<NodeJS.Timeout>();

  // Form height synchronization
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState('auto');
  const [userInteracted, setUserInteracted] = useState(false);

  // Initialize video queue with all indices
  useEffect(() => {
    const initialIndices = Array.from({ length: videoUrls.length }, (_, i) => i);
    setRemainingVideos(initialIndices.slice(1)); // Start with first video, keep rest in queue
    setCurrentVideoIndex(0);
  }, []);

  // Handle form height changes
  useEffect(() => {
    const updateHeight = () => {
      if (formContainerRef.current) {
        setFormHeight(`${formContainerRef.current.offsetHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Video transition logic
  useEffect(() => {
    const startTransition = () => {
      // Start fade out (0.5s duration)
      if (videoRef.current) {
        videoRef.current.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        videoRef.current.style.opacity = '0';
      }

      // After fade completes, change video and fade in
      fadeTimeout.current = setTimeout(() => {
        setRemainingVideos(prev => {
          let nextIndex;
          let newRemaining;

          if (prev.length === 0) {
            // If no videos left, reshuffle all except current one
            const allIndices = Array.from({ length: videoUrls.length }, (_, i) => i);
            newRemaining = allIndices.filter(i => i !== currentVideoIndex);

            // Fisher-Yates shuffle
            for (let i = newRemaining.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [newRemaining[i], newRemaining[j]] = [newRemaining[j], newRemaining[i]];
            }

            nextIndex = newRemaining.shift()!;
          } else {
            // Take next video from queue
            nextIndex = prev[0];
            newRemaining = prev.slice(1);
          }

          setCurrentVideoIndex(nextIndex);
          return newRemaining;
        });

        if (videoRef.current) {
          // Reset transition for instant opacity change
          videoRef.current.style.transition = 'none';
          videoRef.current.style.opacity = '0';

          // Small delay before fade in to ensure video is ready
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
              videoRef.current.style.opacity = '1';
            }
          }, 50);
        }

        // Schedule next transition after 3.5 seconds display time
        transitionTimeout.current = setTimeout(startTransition, 3500);
      }, 500); // 0.5s fade out duration
    };

    // Initial transition after 3.5 seconds display + 0.5s fade = 4s total
    transitionTimeout.current = setTimeout(startTransition, 4000);

    return () => {
      clearTimeout(transitionTimeout.current);
      clearTimeout(fadeTimeout.current);
    };
  }, [currentVideoIndex]);

  // Handle video playback
  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        const video = videoRef.current;
        video.currentTime = 0;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        
        // Add load event listener to ensure video is loaded before playing
        const handleLoadedData = async () => {
          if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA
            try {
              // Check if document is visible and user has interacted to avoid power saving issues
              if (document.visibilityState === 'visible') {
                await video.play();
              } else {
                // If document is hidden, wait for it to become visible
                const handleVisibilityChange = async () => {
                  if (document.visibilityState === 'visible' && video) {
                    try {
                      await video.play();
                    } catch (e) {
                      console.log("Video play error on visibility change:", e);
                    }
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                  }
                };
                document.addEventListener('visibilitychange', handleVisibilityChange);
              }
            } catch (e) {
              console.log("Video play error:", e);
              // Fallback: try to play again after a short delay
              setTimeout(async () => {
                if (video && document.visibilityState === 'visible') {
                  try {
                    await video.play();
                  } catch (retryError) {
                    console.log("Video retry play error:", retryError);
                  }
                }
              }, 1000);
            }
          }
        };

        const handleCanPlay = () => {
          handleLoadedData();
        };

        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.load(); // Force reload the video
        
        return () => {
          if (video) {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
          }
        };
      }
    };

    playVideo();
  }, [currentVideoIndex]);

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      toast({
        title: "Terms Not Accepted",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Clear any existing pending user type
      localStorage.removeItem('pending_user_type');

      // Store the selected user type
      localStorage.setItem('pending_user_type', userType);
      console.log('Setting user type in localStorage:', userType);

      await signInWithGoogle();
      toast({
        title: "Welcome",
        description: "Signing in with Google.",
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle user interaction for video autoplay
  const handleUserInteraction = () => {
    if (!userInteracted) {
      setUserInteracted(true);
      // Try to play video after user interaction
      if (videoRef.current && document.visibilityState === 'visible') {
        videoRef.current.play().catch(e => console.log("Video play after interaction error:", e));
      }
    }
  };

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center bg-black px-4 py-6 sm:px-8 sm:py-10 lg:px-0 lg:py-0"
      onClick={handleUserInteraction}
      onKeyDown={handleUserInteraction}
    >
      <Link
        to="/"
        className="absolute left-4 top-4 sm:left-6 sm:top-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-poppins text-white transition hover:border-white/40 hover:bg-white/10 lg:text-base"
        style={{ zIndex: 5 }}
      >
        ← Back to Home
      </Link>
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-stretch gap-6 lg:gap-0">
        {/* Left Panel - Form Section */}
        <div
          ref={formContainerRef}
          className="w-full lg:w-1/2 flex items-center justify-center rounded-2xl lg:rounded-r-none lg:rounded-l-[1rem] p-6 sm:p-8 lg:p-12 bg-[#1a1a1a]"
        >
          <div className="w-full max-w-md mx-auto">
            {/* Logo and Header */}
            <div className="text-center space-y-4 mb-8">
              <div className="flex justify-center">
                <img
                  src="lovable-uploads/41a57d3e-b9e8-41da-b5d5-bd65db3af6ba.png"
                  alt="Sports Reels Logo"
                  className="w-16 h-16 transition-transform hover:scale-105"
                />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-polysans">
                  <TranslatedText>Welcome</TranslatedText>
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  <TranslatedText>Sign in to access your personalized dashboard</TranslatedText>
                </p>
              </div>
            </div>

            {/* Google Translation Language Selector */}
            <div className="flex justify-center mb-6">
              <GoogleLanguageSelector 
                variant="select" 
                showFlag={true} 
                showNativeName={true}
                showModeToggle={false}
                size="md"
                className="min-w-[200px]"
              />
            </div>

            {/* Form Container */}
            <div className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-gray-300 font-medium text-sm">
                    <TranslatedText>Select your role:</TranslatedText>
                  </Label>
                  <InfoTooltip content="Teams get access to player analytics. Agents can manage player portfolios." />
                </div>
                <Select
                  value={userType}
                  onValueChange={(value: 'team' | 'agent') => {
                    console.log('User type changed to:', value);
                    setUserType(value);
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white focus:ring-2 focus:ring-rosegold focus:border-rosegold h-12 rounded-lg">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a] rounded-lg shadow-lg">
                    <SelectItem
                      value="team"
                      className="text-white hover:bg-[#3a3a3a] py-3"
                    >
                      <span className="flex items-center gap-2">
                        <TranslatedText>Team Manager/Administrator</TranslatedText>
                        <span>⚽</span>
                      </span>
                    </SelectItem>
                    <SelectItem
                      value="agent"
                      className="text-white hover:bg-[#3a3a3a] py-3"
                    >
                      <span className="flex items-center gap-2">
                        <TranslatedText>Agent/Scout</TranslatedText>
                        <span>🔍</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  className="mt-0.5 border-gray-400 data-[state=checked]:bg-rosegold data-[state=checked]:border-rosegold"
                />
                <label htmlFor="terms" className="text-xs text-gray-400 leading-snug">
                  <TranslatedText>I accept the terms and conditions and privacy policy</TranslatedText>
                </label>
              </div>

              {/* Google Button */}
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading || !termsAccepted}
                className={`w-full ${termsAccepted ? 'bg-rosegold/10 border-rosegold/30 hover:bg-rosegold/20 text-white' : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-500'} h-12 rounded-lg flex items-center justify-center gap-3 transition-colors`}
              >
                {loading ? (
                  <span className="h-5 w-5 border-gray-300 border-t-rosegold rounded-full animate-spin"></span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="font-medium">
                      <TranslatedText>Sign in with Google</TranslatedText>
                    </span>
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3a3a3a]"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[#1a1a1a] text-gray-500 text-xs">
                    OR
                  </span>
                </div>
              </div>

              {/* Create Account */}

            </div>
          </div>
        </div>

        {/* Right Panel - Video Section */}
        <div
          className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center bg-no-repeat overflow-hidden rounded-2xl lg:rounded-l-none lg:rounded-r-[1rem]"
          style={{
            backgroundImage: "url('/lovable-uploads/Untitled design (49).png')",
            height: formHeight
          }}
        >
          <video
            ref={videoRef}
            key={currentVideoIndex}
            src={videoUrls[currentVideoIndex]}
            className="absolute inset-0 w-full h-full object-cover opacity-100"
            playsInline
            muted
            loop
            autoPlay
            preload="metadata"
            onError={(e) => console.error('Video error:', e)}
            onLoadStart={() => console.log('Video loading:', videoUrls[currentVideoIndex])}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/20" />
        </div>
      </div>
    </div>
  );
};

export default AuthForm;