import React, { useEffect, ReactNode, useState } from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';

interface AutoTranslateProviderProps {
  children: ReactNode;
}

/**
 * Global Auto-Translation Provider
 * Uses instant re-render approach for smooth, fast translation
 */
const AutoTranslateProvider: React.FC<AutoTranslateProviderProps> = ({ children }) => {
  const { currentLanguage, translateText } = useGoogleTranslation();
  const [renderKey, setRenderKey] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  const translateAllTextContent = async () => {
    if (isTranslating) {
      return;
    }

    setIsTranslating(true);
    
    try {
      if (currentLanguage === 'en') {
        // Reset to English - restore original text
        document.querySelectorAll('[data-original-text]').forEach((element) => {
          const originalText = element.getAttribute('data-original-text');
          if (originalText && element.textContent !== originalText) {
            element.textContent = originalText;
          }
        });
        return;
      }

    // Get all text nodes in the document
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const text = node.textContent?.trim();
            const parent = node.parentElement;
            
            // Skip empty text, scripts, styles, and form inputs
            if (
              !text ||
              text.length < 1 ||
              !parent ||
              parent.tagName === 'SCRIPT' ||
              parent.tagName === 'STYLE' ||
              parent.tagName === 'NOSCRIPT' ||
              parent.tagName === 'INPUT' ||
              parent.tagName === 'TEXTAREA' ||
              parent.tagName === 'SELECT' ||
              parent.contentEditable === 'true' ||
              parent.hasAttribute('data-no-translate') ||
              // Skip only obvious technical content
              text.includes('http://') ||
              text.includes('https://') ||
              text.includes('www.') ||
              text.includes('console.log') ||
              text.match(/^\d+px$/) ||
              text.match(/^\d+rem$/) ||
              text.match(/^#[0-9a-fA-F]{6}$/) // hex colors
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip language selector and translation-related components
            let currentElement = parent;
            while (currentElement) {
              const classNames = currentElement.className || '';
              const dataAttributes = Array.from(currentElement.attributes || [])
                .map(attr => attr.name)
                .join(' ');
              
              // Skip if inside language selector or translation components
              if (
                classNames.includes('language-selector') ||
                classNames.includes('google-translate') ||
                classNames.includes('translation-') ||
                dataAttributes.includes('data-language-selector') ||
                dataAttributes.includes('data-translate-component') ||
                currentElement.hasAttribute('data-no-translate') ||
                // Skip specific component selectors (Radix UI select components)
                currentElement.getAttribute('data-radix-select-content') ||
                currentElement.getAttribute('data-radix-select-item') ||
                currentElement.getAttribute('data-radix-select-trigger') ||
                currentElement.getAttribute('data-radix-select-viewport') ||
                // Skip if parent has these classes
                classNames.includes('select-content') ||
                classNames.includes('select-item') ||
                classNames.includes('select-trigger')
              ) {
                return NodeFilter.FILTER_REJECT;
              }
              
              currentElement = currentElement.parentElement;
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

    if (textNodes.length === 0) {
      return;
    }

    // Collect all translations first, then apply them all at once for smooth effect
    const translationPromises = textNodes.map(async (textNode) => {
      const originalText = textNode.textContent?.trim();
      if (!originalText) return null;

      // Store original text for reverting to English
      const parentElement = textNode.parentElement;
      if (parentElement && !parentElement.hasAttribute('data-original-text')) {
        parentElement.setAttribute('data-original-text', originalText);
      }

      try {
        const translatedText = await translateText(originalText, currentLanguage);
        return {
          node: textNode,
          originalText,
          translatedText: translatedText || originalText
        };
      } catch (error) {
        return {
          node: textNode,
          originalText,
          translatedText: originalText
        };
      }
    });

    // Wait for ALL translations to complete
    const translations = await Promise.all(translationPromises);

    // Apply all translations simultaneously for smooth visual effect
    translations.forEach(translation => {
      if (translation && translation.translatedText !== translation.originalText) {
        translation.node.textContent = translation.translatedText;
      }
    });
    } finally {
      setIsTranslating(false);
    }
  };

  // Expose translation function globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).forceTranslation = () => {
      if (!isTranslating) {
        translateAllTextContent();
      }
    };
  }

  useEffect(() => {
    // Simple, single timeout to avoid loops
    const timeout = setTimeout(() => {
      setRenderKey(prev => prev + 1);
      
      // Trigger translation after a shorter delay for better UX
      setTimeout(() => {
        if (!isTranslating) {
          translateAllTextContent();
        }
      }, 500); // Reduced delay for faster response
    }, 300); // Reduced debounce for faster response

    return () => {
      clearTimeout(timeout);
    };
  }, [currentLanguage]);

  // Set up mutation observer to handle lazy-loaded content
  useEffect(() => {
    if (currentLanguage === 'en') return;

    let observerTimeout: NodeJS.Timeout;
    let translationInProgress = false;

    const observer = new MutationObserver((mutations) => {
      // Skip if we're currently translating to avoid loops
      if (isTranslating || translationInProgress) return;

      let hasNewContent = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Skip if this is a translation-related change
              if (element.hasAttribute('data-original-text') || 
                  element.hasAttribute('data-no-translate') ||
                  element.closest('[data-no-translate]')) {
                return;
              }

              // Check if the new content has substantial text and isn't just a translation update
              const textContent = element.textContent?.trim();
              if (textContent && textContent.length > 10) {
                // Additional check: make sure this isn't just a text node change from translation
                const hasNewElements = element.querySelectorAll('*').length > 0 || 
                                     element.tagName !== 'SPAN';
                
                if (hasNewElements) {
                  hasNewContent = true;
                }
              }
            }
          });
        }
      });

      if (hasNewContent && !isTranslating) {
        // Clear previous timeout
        if (observerTimeout) {
          clearTimeout(observerTimeout);
        }
        
        // Debounce new content translation
        observerTimeout = setTimeout(() => {
          if (!isTranslating && !translationInProgress) {
            translationInProgress = true;
            translateAllTextContent().finally(() => {
              translationInProgress = false;
            });
          }
        }, 1500); // Longer delay for lazy content to avoid conflicts
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false // Don't observe text changes to avoid loops
    });

    return () => {
      observer.disconnect();
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
    };
  }, [currentLanguage, isTranslating]);

  // Don't trigger re-render on updateTrigger to avoid loops
  // useEffect(() => {
  //   if (updateTrigger > 0) {
  //     setRenderKey(prev => prev + 1);
  //   }
  // }, [updateTrigger]);

  return <div key={renderKey}>{children}</div>;
};

export default AutoTranslateProvider;
