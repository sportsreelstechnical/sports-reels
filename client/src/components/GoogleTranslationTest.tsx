import React from 'react';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GoogleLanguageSelector from '@/components/GoogleLanguageSelector';
import TranslatedText from '@/components/TranslatedText';

const GoogleTranslationTest: React.FC = () => {
  const { currentLanguage, translationMode, translateTextSync } = useGoogleTranslation();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <TranslatedText>Google Translation System Test</TranslatedText>
          </CardTitle>
          <CardDescription>
            <TranslatedText>Testing the Google Cloud Translation API integration</TranslatedText>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              <TranslatedText>Language</TranslatedText>: {currentLanguage.toUpperCase()}
            </Badge>
            <Badge variant={translationMode === 'backend' ? 'default' : 'secondary'}>
              <TranslatedText>Mode</TranslatedText>: {translationMode}
            </Badge>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              <TranslatedText>Language Selector</TranslatedText>
            </h3>
            <GoogleLanguageSelector 
              variant="select" 
              showFlag={true} 
              showNativeName={true}
              showModeToggle={true}
              size="md"
            />
          </div>

          {/* Navigation Translation Tests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              <TranslatedText>Navigation Items (using translateTextSync)</TranslatedText>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <TranslatedText>Navigation Items</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Dashboard:</strong> {translateTextSync('Dashboard')}</p>
                  <p><strong>Players:</strong> {translateTextSync('Players')}</p>
                  <p><strong>Videos:</strong> {translateTextSync('Videos')}</p>
                  <p><strong>Messages:</strong> {translateTextSync('Messages')}</p>
                  <p><strong>Profile:</strong> {translateTextSync('Profile')}</p>
                  <p><strong>Contracts:</strong> {translateTextSync('Contracts')}</p>
                  <p><strong>Wallet:</strong> {translateTextSync('Wallet')}</p>
                  <p><strong>Notifications:</strong> {translateTextSync('Notifications')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <TranslatedText>Common Actions</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Welcome:</strong> {translateTextSync('Welcome')}</p>
                  <p><strong>Login:</strong> {translateTextSync('Login')}</p>
                  <p><strong>Logout:</strong> {translateTextSync('Logout')}</p>
                  <p><strong>Save:</strong> {translateTextSync('Save')}</p>
                  <p><strong>Cancel:</strong> {translateTextSync('Cancel')}</p>
                  <p><strong>Loading:</strong> {translateTextSync('Loading')}</p>
                  <p><strong>Success:</strong> {translateTextSync('Success')}</p>
                  <p><strong>Error:</strong> {translateTextSync('Error')}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Direct Translation Tests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              <TranslatedText>Direct Google Translations (using TranslatedText)</TranslatedText>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <TranslatedText>Sports Terms</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><TranslatedText>Football Player</TranslatedText></p>
                  <p><TranslatedText>Basketball Court</TranslatedText></p>
                  <p><TranslatedText>Swimming Pool</TranslatedText></p>
                  <p><TranslatedText>Tennis Match</TranslatedText></p>
                  <p><TranslatedText>Boxing Ring</TranslatedText></p>
                  <p><TranslatedText>Athletic Performance</TranslatedText></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <TranslatedText>Business Terms</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><TranslatedText>Contract Negotiation</TranslatedText></p>
                  <p><TranslatedText>Transfer Agreement</TranslatedText></p>
                  <p><TranslatedText>Player Scouting</TranslatedText></p>
                  <p><TranslatedText>Team Management</TranslatedText></p>
                  <p><TranslatedText>Performance Analytics</TranslatedText></p>
                  <p><TranslatedText>Financial Terms</TranslatedText></p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">
              <TranslatedText>How to Test</TranslatedText>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><TranslatedText>Change language using the selector above</TranslatedText></li>
              <li><TranslatedText>Watch both sync translations and reactive translations update</TranslatedText></li>
              <li><TranslatedText>Test different languages like Spanish, French, German, Chinese</TranslatedText></li>
              <li><TranslatedText>Toggle between Frontend and Backend translation modes</TranslatedText></li>
              <li><TranslatedText>Check that sidebar navigation items also translate</TranslatedText></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleTranslationTest;