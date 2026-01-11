import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';

interface Language {
  code: string;
  name: string;
  flag: string;
  rtl?: boolean;
  nativeName?: string;
}

interface TranslationCache {
  [key: string]: {
    [targetLang: string]: string;
  };
}

interface GoogleTranslationContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translateText: (text: string, targetLang?: string) => Promise<string>;
  translateTextSync: (text: string, targetLang?: string) => string;
  availableLanguages: Language[];
  isLoading: boolean;
  translationMode: 'backend'; // Always backend
  clearCache: () => void;
  translationCache: TranslationCache;
  updateTrigger: number;
}

const GoogleTranslationContext = createContext<GoogleTranslationContextType | undefined>(undefined);

// Supported languages for Google Translate
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', rtl: true, nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', flag: '🇩🇰', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮', nativeName: 'Suomi' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' }
];

// Google Translate API key - Required for frontend fallback translation
const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://sportsreelstranslationserver.onrender.com');

// Check if API key is configured in development mode
if (import.meta.env.DEV && !GOOGLE_TRANSLATE_API_KEY) {
  console.warn('⚠️ VITE_GOOGLE_TRANSLATE_API_KEY is not set. Frontend translation fallback will not work.');
  console.warn('   Create a .env file in the frontend root with: VITE_GOOGLE_TRANSLATE_API_KEY=your_api_key');
}

export const GoogleTranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const translationMode = 'backend'; // Always use backend
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Load saved preferences
  useEffect(() => {
    const savedLanguage = localStorage.getItem('google-translate-language');
    const savedCache = localStorage.getItem('google-translate-cache');

    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
    if (savedCache) {
      try {
        setTranslationCache(JSON.parse(savedCache));
      } catch (error) {
        console.error('Error loading translation cache:', error);
      }
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('google-translate-language', currentLanguage);
    localStorage.setItem('google-translate-cache', JSON.stringify(translationCache));
  }, [currentLanguage, translationCache]);

  const setLanguage = useCallback((lang: string) => {
    if (lang && lang.trim() !== '') {
      setCurrentLanguage(lang.trim());
    }
  }, []);

  const clearCache = useCallback(() => {
    setTranslationCache({});
    localStorage.removeItem('google-translate-cache');
  }, []);

  // Frontend translation using Google Translate API directly
  const translateWithFrontend = async (text: string, targetLang: string): Promise<string> => {
    if (!GOOGLE_TRANSLATE_API_KEY) {
      throw new Error('Google Translate API key is not configured. Please set VITE_GOOGLE_TRANSLATE_API_KEY in your .env file.');
    }

    try {
      // Google Translate REST API v2 expects form-encoded data
      const params = new URLSearchParams();
      params.append('q', text);
      params.append('target', targetLang);
      params.append('source', 'en');
      params.append('format', 'text');
      params.append('key', GOOGLE_TRANSLATE_API_KEY);

      const response = await axios.post(
        'https://translation.googleapis.com/language/translate/v2',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      );

      return response.data.data.translations[0].translatedText;
    } catch (error: any) {
      console.error('Frontend translation error:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      throw error;
    }
  };

  // Backend translation using Express server
  const translateWithBackend = async (text: string, targetLang: string): Promise<string> => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/translate`, {
        text,
        targetLanguage: targetLang,
        sourceLanguage: 'en'
      });

      return response.data.translatedText;
    } catch (error) {
      console.error('Backend translation error:', error);
      throw error;
    }
  };

  const translateText = useCallback(async (text: string, targetLang?: string): Promise<string> => {
    const target = targetLang || currentLanguage;

    // Return original text if target is English or same as source
    if (target === 'en' || !text.trim()) {
      return text;
    }

    // Check cache first
    const cacheKey = text.trim();
    if (translationCache[cacheKey] && translationCache[cacheKey][target]) {
      return translationCache[cacheKey][target];
    }

    setIsLoading(true);
    try {
      let translatedText: string;

      // Always try backend first, with frontend fallback
      try {
        translatedText = await translateWithBackend(text, target);
      } catch (backendError) {
        console.warn('Backend translation failed, falling back to frontend:', backendError);
        // Fallback to frontend translation
        translatedText = await translateWithFrontend(text, target);
      }

      // Update cache
      setTranslationCache(prev => ({
        ...prev,
        [cacheKey]: {
          ...prev[cacheKey],
          [target]: translatedText
        }
      }));

      return translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on error
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage, translationCache]);

  // Synchronous version that returns cached translation or original text
  const translateTextSync = useCallback((text: string, targetLang?: string): string => {
    const target = targetLang || currentLanguage;

    if (target === 'en' || !text.trim()) {
      return text;
    }

    const cacheKey = text.trim();
    if (translationCache[cacheKey] && translationCache[cacheKey][target]) {
      return translationCache[cacheKey][target];
    }

    // Don't trigger translation during render - just return original text
    // Translation will be handled by the AutoTranslateProvider's re-render mechanism
    return text;
  }, [currentLanguage, translationCache]);

  return (
    <GoogleTranslationContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        translateText,
        translateTextSync,
        availableLanguages: SUPPORTED_LANGUAGES,
        isLoading,
        translationMode,
        clearCache,
        translationCache,
        updateTrigger
      }}
    >
      {children}
    </GoogleTranslationContext.Provider>
  );
};

export const useGoogleTranslation = () => {
  const context = useContext(GoogleTranslationContext);
  if (context === undefined) {
    throw new Error('useGoogleTranslation must be used within a GoogleTranslationProvider');
  }
  return context;
};
