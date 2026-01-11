import { useEffect } from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';

/**
 * Hook that automatically translates all text content in a component
 * Usage: Add `useAutoTranslate()` to any component to make it translatable
 */
export const useAutoTranslate = (containerRef?: React.RefObject<HTMLElement>) => {
  const { currentLanguage, translateText, translationCache } = useGoogleTranslation();

  useEffect(() => {
    if (currentLanguage === 'en') {
      return; // No translation needed for English
    }

    const translateContainer = async () => {
      const container = containerRef?.current || document.body;
      
      // Get all text nodes in the container
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const text = node.textContent?.trim();
            // Skip empty text, scripts, styles, and already translated nodes
            if (!text || 
                text.length < 2 ||
                node.parentElement?.tagName === 'SCRIPT' || 
                node.parentElement?.tagName === 'STYLE' ||
                node.parentElement?.hasAttribute('data-auto-translated') ||
                // Skip technical content
                text.includes('http') || 
                text.includes('www.') ||
                text.includes('console.') ||
                text.match(/^[A-Z_]+$/) ||
                text.match(/^\d+$/) ||
                text.includes('px') ||
                text.includes('rem') ||
                text.includes('vh') ||
                text.includes('vw')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes: Text[] = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node as Text);
      }

      // Translate in small batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (textNode) => {
          const originalText = textNode.textContent?.trim();
          if (!originalText) return;

          try {
            // Check cache first
            const cacheKey = originalText;
            if (translationCache[cacheKey] && translationCache[cacheKey][currentLanguage]) {
              textNode.textContent = translationCache[cacheKey][currentLanguage];
              textNode.parentElement?.setAttribute('data-auto-translated', 'true');
              return;
            }

            // Translate the text
            const translatedText = await translateText(originalText);
            if (translatedText && translatedText !== originalText) {
              textNode.textContent = translatedText;
              textNode.parentElement?.setAttribute('data-auto-translated', 'true');
            }
          } catch (error) {
            console.warn('Auto-translation failed for:', originalText);
          }
        }));

        // Small delay between batches
        if (i + batchSize < textNodes.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    };

    // Debounce translation
    const timeoutId = setTimeout(translateContainer, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentLanguage, translateText, translationCache, containerRef]);
};

export default useAutoTranslate;
