import React, { useState } from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import { useTranslation, useBatchTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Settings, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const TranslationDemo: React.FC = () => {
  const {
    currentLanguage,
    setLanguage,
    availableLanguages,
    isLoading,
    translationMode,
    setTranslationMode,
    clearCache
  } = useGoogleTranslation();

  // Sample texts to demonstrate translation
  const sampleTexts = [
    "Welcome to Reel Connect Sports Hub",
    "Discover talented players from around the world",
    "Upload and analyze your game footage",
    "Connect with scouts and agents",
    "Build your professional sports network"
  ];

  // Single text translation demo
  const welcomeTranslation = useTranslation("Welcome to our sports platform!");

  // Batch translation demo
  const batchTranslation = useBatchTranslation(sampleTexts);

  // Manual translation demo
  const [manualText, setManualText] = useState("Enter text to translate...");
  const [manualTranslation, setManualTranslation] = useState("");
  const [isManualTranslating, setIsManualTranslating] = useState(false);

  const { translateText } = useGoogleTranslation();

  const handleManualTranslate = async () => {
    if (!manualText.trim()) return;

    setIsManualTranslating(true);
    try {
      const result = await translateText(manualText);
      setManualTranslation(result);
    } catch (error) {
      console.error('Manual translation failed:', error);
      setManualTranslation("Translation failed");
    } finally {
      setIsManualTranslating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Google Cloud Translation Demo
          </CardTitle>
          <CardDescription>
            Automatic translation of all text content when language is changed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="language-select">Language:</Label>
              <Select value={currentLanguage} onValueChange={setLanguage}>
                <SelectTrigger id="language-select" className="w-48">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName || lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant={currentLanguage === 'en' ? 'secondary' : 'default'}>
              {availableLanguages.find(l => l.code === currentLanguage)?.name || currentLanguage}
            </Badge>

            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {/* Translation Mode Toggle */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <Settings className="h-4 w-4" />
            <div className="flex items-center space-x-2">
              <Switch
                id="translation-mode"
                checked={translationMode === 'backend'}
                onCheckedChange={(checked) => setTranslationMode(checked ? 'backend' : 'frontend')}
              />
              <Label htmlFor="translation-mode">
                Use Backend Translation ({translationMode === 'backend' ? 'Service Account' : 'API Key'})
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={clearCache}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single Text Translation Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Single Text Translation</CardTitle>
          <CardDescription>
            This text automatically updates when you change the language
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-lg font-medium">
              {welcomeTranslation.translatedText}
            </p>
            {welcomeTranslation.isTranslating && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Translating...
              </div>
            )}
            {welcomeTranslation.error && (
              <p className="text-sm text-red-500 mt-2">
                Error: {welcomeTranslation.error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Translation Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Translation Demo</CardTitle>
          <CardDescription>
            Multiple texts translated simultaneously
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {batchTranslation.translatedTexts.map((text, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{text}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Original: {batchTranslation.originalTexts[index]}
                </p>
              </div>
            ))}
            {batchTranslation.isTranslating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Translating batch...
              </div>
            )}
            {batchTranslation.error && (
              <p className="text-sm text-red-500">
                Error: {batchTranslation.error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Translation Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Translation</CardTitle>
          <CardDescription>
            Enter custom text to translate on demand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-text">Text to translate:</Label>
            <textarea
              id="manual-text"
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Enter text to translate..."
            />
          </div>

          <Button
            onClick={handleManualTranslate}
            disabled={isManualTranslating || !manualText.trim()}
            className="w-full"
          >
            {isManualTranslating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Translate to {availableLanguages.find(l => l.code === currentLanguage)?.name}
              </>
            )}
          </Button>

          {manualTranslation && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Translation:</Label>
              <p className="mt-1">{manualTranslation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Frontend-only approach (API Key):</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Set your API key in <code>.env</code>: <code>VITE_GOOGLE_TRANSLATE_API_KEY=your_key</code></li>
              <li>Uses direct calls to Google Translate API from the browser</li>
              <li>Simpler setup but exposes API key to client</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Backend approach (Service Account):</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Run the Express server: <code>cd server && npm install && npm run dev</code></li>
              <li>Uses service account JSON for secure authentication</li>
              <li>More secure and supports advanced features</li>
              <li>Set backend URL in <code>.env</code>: <code>VITE_BACKEND_URL=http://localhost:3001</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationDemo;
