import React from 'react';
import GoogleLanguageSelector from '@/components/GoogleLanguageSelector';
import TranslatedText from '@/components/TranslatedText';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LanguageSelectorDemo: React.FC = () => {
  const { currentLanguage, translationMode } = useGoogleTranslation();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <TranslatedText>Language Selector Integration Demo</TranslatedText>
          </CardTitle>
          <CardDescription>
            <TranslatedText>Testing language selectors in AuthForm and Layout header</TranslatedText>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              <TranslatedText>Current Language</TranslatedText>: {currentLanguage.toUpperCase()}
            </Badge>
            <Badge variant={translationMode === 'backend' ? 'default' : 'secondary'}>
              <TranslatedText>Mode</TranslatedText>: {translationMode === 'backend' ? 'Backend' : 'Frontend'}
            </Badge>
          </div>

          {/* Sample Translated Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              <TranslatedText>Sample Translated Content</TranslatedText>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <TranslatedText>Authentication Form Text</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><TranslatedText>Welcome</TranslatedText></p>
                  <p><TranslatedText>Sign in to access your personalized dashboard</TranslatedText></p>
                  <p><TranslatedText>Select your role:</TranslatedText></p>
                  <p><TranslatedText>Team Manager/Administrator</TranslatedText></p>
                  <p><TranslatedText>Agent/Scout</TranslatedText></p>
                  <p><TranslatedText>I accept the terms and conditions and privacy policy</TranslatedText></p>
                  <p><TranslatedText>Sign in with Google</TranslatedText></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <TranslatedText>Layout Header Text</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><TranslatedText>Sign Out</TranslatedText></p>
                  <p><TranslatedText>Dashboard</TranslatedText></p>
                  <p><TranslatedText>Players</TranslatedText></p>
                  <p><TranslatedText>Videos</TranslatedText></p>
                  <p><TranslatedText>Messages</TranslatedText></p>
                  <p><TranslatedText>Profile</TranslatedText></p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Language Selector Variants */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              <TranslatedText>Language Selector Variants</TranslatedText>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    <TranslatedText>Select Variant (AuthForm)</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GoogleLanguageSelector 
                    variant="select" 
                    showFlag={true} 
                    showNativeName={true}
                    showModeToggle={false}
                    size="md"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    <TranslatedText>Popover Variant (Layout)</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GoogleLanguageSelector 
                    variant="popover" 
                    showFlag={true} 
                    showNativeName={false}
                    showModeToggle={true}
                    size="sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    <TranslatedText>Button Variant</TranslatedText>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GoogleLanguageSelector 
                    variant="button" 
                    showFlag={true} 
                    showNativeName={false}
                    size="md"
                  />
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
              <li><TranslatedText>Change language using any selector above</TranslatedText></li>
              <li><TranslatedText>Watch all text content update automatically</TranslatedText></li>
              <li><TranslatedText>Test the AuthForm at /auth (sign out first)</TranslatedText></li>
              <li><TranslatedText>Test the Layout header language selector</TranslatedText></li>
              <li><TranslatedText>Toggle between Frontend and Backend translation modes</TranslatedText></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LanguageSelectorDemo;
