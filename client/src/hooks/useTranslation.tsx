import { useEffect, useState } from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';

interface UseTranslationOptions {
  immediate?: boolean; // Whether to translate immediately or wait for language change
  fallback?: string; // Fallback text if translation fails
}

export const useTranslation = (text: string, options: UseTranslationOptions = {}) => {
  const { translateText, translateTextSync, currentLanguage } = useGoogleTranslation();
  const [translatedText, setTranslatedText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { immediate = true, fallback } = options;

  useEffect(() => {
    if (!immediate || currentLanguage === 'en' || !text.trim()) {
      setTranslatedText(text);
      return;
    }

    const performTranslation = async () => {
      setIsTranslating(true);
      setError(null);
      
      try {
        const result = await translateText(text);
        setTranslatedText(result);
      } catch (err) {
        console.error('Translation error:', err);
        setError(err instanceof Error ? err.message : 'Translation failed');
        setTranslatedText(fallback || text);
      } finally {
        setIsTranslating(false);
      }
    };

    performTranslation();
  }, [text, currentLanguage, immediate, translateText, fallback]);

  return {
    translatedText,
    isTranslating,
    error,
    originalText: text
  };
};

// Hook for translating multiple texts at once
export const useBatchTranslation = (texts: string[], options: UseTranslationOptions = {}) => {
  const { translateText, currentLanguage } = useGoogleTranslation();
  const [translatedTexts, setTranslatedTexts] = useState<string[]>(texts);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { immediate = true, fallback } = options;

  useEffect(() => {
    if (!immediate || currentLanguage === 'en' || texts.length === 0) {
      setTranslatedTexts(texts);
      return;
    }

    const performBatchTranslation = async () => {
      setIsTranslating(true);
      setError(null);
      
      try {
        const results = await Promise.all(
          texts.map(text => translateText(text).catch(() => fallback || text))
        );
        setTranslatedTexts(results);
      } catch (err) {
        console.error('Batch translation error:', err);
        setError(err instanceof Error ? err.message : 'Batch translation failed');
        setTranslatedTexts(texts.map(text => fallback || text));
      } finally {
        setIsTranslating(false);
      }
    };

    performBatchTranslation();
  }, [texts, currentLanguage, immediate, translateText, fallback]);

  return {
    translatedTexts,
    isTranslating,
    error,
    originalTexts: texts
  };
};