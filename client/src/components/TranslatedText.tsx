import React, { useMemo } from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Loader2 } from 'lucide-react';

interface TranslatedTextProps {
  children: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  showLoader?: boolean;
  fallback?: string;
  immediate?: boolean;
}

/**
 * TranslatedText component that automatically translates text content
 * based on the current language selection.
 * 
 * Usage:
 * <TranslatedText>Welcome to our platform</TranslatedText>
 * <TranslatedText as="h1" className="text-2xl">Dashboard</TranslatedText>
 */
const TranslatedText: React.FC<TranslatedTextProps> = ({
  children,
  className = '',
  as: Component = 'span',
  showLoader = false,
  fallback,
  immediate = true
}) => {
  const { currentLanguage, translateTextSync } = useGoogleTranslation();
  
  // Use translateTextSync which is a pure function and doesn't cause re-renders
  const displayText = useMemo(() => {
    if (currentLanguage === 'en' || !children.trim()) {
      return children;
    }
    
    // Use translateTextSync which returns cached translation or original text
    // The AutoTranslateProvider will handle the actual translation
    return translateTextSync(children.trim(), currentLanguage);
  }, [children, currentLanguage, translateTextSync]);

  return (
    <Component className={className}>
      {displayText}
    </Component>
  );
};

export default TranslatedText;
