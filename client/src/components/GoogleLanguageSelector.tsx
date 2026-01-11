import React, { useState } from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Globe, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleLanguageSelectorProps {
  variant?: 'button' | 'select' | 'popover';
  className?: string;
  showFlag?: boolean;
  showNativeName?: boolean;
  showModeToggle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const GoogleLanguageSelector: React.FC<GoogleLanguageSelectorProps> = ({
  variant = 'select',
  className,
  showFlag = true,
  showNativeName = false,
  showModeToggle = false,
  size = 'md'
}) => {
  const {
    currentLanguage,
    setLanguage,
    availableLanguages,
    isLoading,
    translationMode
  } = useGoogleTranslation();
  const [open, setOpen] = useState(false);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = (languageCode: string) => {
    setLanguage(languageCode);
    setOpen(false);
  };

  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-9 text-sm',
    lg: 'h-10 text-base'
  };

  if (isLoading) {
    return (
      <div className={cn("animate-pulse bg-gray-700 rounded flex items-center gap-2", sizeClasses[size], className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <div className="space-y-2" data-no-translate="true">
        <Select key={currentLanguage} value={currentLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger className={cn(
            "w-auto bg-transparent border-gray-600 text-white hover:bg-gray-700/50 transition-colors",
            sizeClasses[size],
            className
          )} data-no-translate="true">
            <SelectValue>
              <div className="flex items-center gap-2" data-no-translate="true">
                <Globe className="h-4 w-4 text-gray-400" />
                {showFlag && currentLang?.flag && (
                  <span className="text-sm" data-no-translate="true">{currentLang.flag}</span>
                )}
                <span className={cn(
                  size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
                )} data-no-translate="true">
                  {showNativeName ? currentLang?.nativeName || currentLang?.name : currentLang?.name}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-gray-600 max-h-60 overflow-y-auto" data-no-translate="true">
            {availableLanguages.map((language) => (
              <SelectItem
                key={language.code}
                value={language.code}
                className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                data-no-translate="true"
              >
                <div className="flex items-center gap-2" data-no-translate="true">
                  {showFlag && language.flag && (
                    <span className="text-sm" data-no-translate="true">{language.flag}</span>
                  )}
                  <span data-no-translate="true">{showNativeName ? language.nativeName || language.name : language.name}</span>
                  {language.code === currentLanguage && (
                    <Check className="h-4 w-4 ml-auto text-green-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>
    );
  }

  if (variant === 'popover') {
    return (
      <Popover key={currentLanguage} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "justify-start text-white hover:bg-gray-700/50 border-gray-600",
              sizeClasses[size],
              className
            )}
            data-no-translate="true"
          >
            <Globe className="h-4 w-4 mr-2 text-gray-400" />
            {showFlag && currentLang?.flag && (
              <span className="mr-2" data-no-translate="true">{currentLang.flag}</span>
            )}
            <span data-no-translate="true">{showNativeName ? currentLang?.nativeName || currentLang?.name : currentLang?.name}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 bg-[#1a1a1a] border-gray-600" align="start" data-no-translate="true">
          <div className="p-2" data-no-translate="true">
            <div className="text-sm font-medium text-white mb-2 px-2" data-no-translate="true">Select Language</div>
            <div className="max-h-60 overflow-y-auto" data-no-translate="true">
              {availableLanguages.map((language) => (
                <Button
                  key={language.code}
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-gray-700 h-9"
                  onClick={() => handleLanguageChange(language.code)}
                  data-no-translate="true"
                >
                  <div className="flex items-center gap-2 w-full" data-no-translate="true">
                    {showFlag && language.flag && (
                      <span className="text-sm" data-no-translate="true">{language.flag}</span>
                    )}
                    <span className="flex-1 text-left" data-no-translate="true">
                      {showNativeName ? language.nativeName || language.name : language.name}
                    </span>
                    {language.code === currentLanguage && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
            
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Default button variant
  return (
    <Button
      variant="ghost"
      className={cn(
        "justify-start text-white hover:bg-gray-700/50 border border-gray-600",
        sizeClasses[size],
        className
      )}
      onClick={() => setOpen(!open)}
    >
      <Globe className="h-4 w-4 mr-2 text-gray-400" />
      {showFlag && currentLang?.flag && (
        <span className="mr-2">{currentLang.flag}</span>
      )}
      <span>{showNativeName ? currentLang?.nativeName || currentLang?.name : currentLang?.name}</span>
    </Button>
  );
};

export default GoogleLanguageSelector;
