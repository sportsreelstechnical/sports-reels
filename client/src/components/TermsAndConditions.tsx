import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react';

interface TermsAndConditionsProps {
    onAccept: (consent: {
        termsAccepted: boolean;
        emailConsent: boolean;
        newsletterConsent: boolean;
    }) => void;
    onDecline: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
    onAccept,
    onDecline
}) => {
    const [consent, setConsent] = useState({
        termsAccepted: false,
        emailConsent: false,
        newsletterConsent: false
    });

    const handleAccept = () => {
        if (!consent.termsAccepted) {
            return;
        }
        onAccept(consent);
    };

    const handleCheckboxChange = (key: keyof typeof consent, checked: boolean) => {
        setConsent(prev => ({
            ...prev,
            [key]: checked
        }));
    };

    return (
        <Card className="max-w-2xl mx-auto bg-[#1a1a1a] border-gray-700">
            <CardHeader>
                <CardTitle className="text-white font-polysans text-center">
                    Terms and Conditions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Terms and Conditions Text */}
                <div className="bg-gray-800 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <div className="text-gray-300 text-sm space-y-4">
                        <h3 className="font-semibold text-white">Welcome to Reel Connect Sports Hub</h3>

                        <p>
                            By using our platform, you agree to these terms and conditions. Reel Connect Sports Hub
                            is a platform designed to connect sports teams, players, and agents for transfer opportunities.
                        </p>

                        <h4 className="font-semibold text-white">1. Platform Usage</h4>
                        <p>
                            You agree to use the platform responsibly and in accordance with all applicable laws.
                            You are responsible for the accuracy of all information you provide.
                        </p>

                        <h4 className="font-semibold text-white">2. Data Privacy</h4>
                        <p>
                            We collect and process your personal data in accordance with our Privacy Policy.
                            Your data is used to provide our services and improve your experience.
                        </p>

                        <h4 className="font-semibold text-white">3. Communication</h4>
                        <p>
                            The platform facilitates communication between users. You agree to communicate
                            professionally and not share personal contact information in messages.
                        </p>

                        <h4 className="font-semibold text-white">4. Service Charges</h4>
                        <p>
                            A 15% service charge applies to all successful transfers facilitated through the platform.
                            This charge is automatically calculated and applied.
                        </p>

                        <h4 className="font-semibold text-white">5. Account Security</h4>
                        <p>
                            You are responsible for maintaining the security of your account credentials.
                            Notify us immediately of any unauthorized access.
                        </p>

                        <h4 className="font-semibold text-white">6. Prohibited Activities</h4>
                        <p>
                            You may not use the platform for illegal activities, spam, or harassment.
                            Violations may result in account suspension or termination.
                        </p>

                        <h4 className="font-semibold text-white">7. Limitation of Liability</h4>
                        <p>
                            Reel Connect Sports Hub is not responsible for the outcome of transfer negotiations
                            or agreements made between users. We facilitate connections but do not guarantee results.
                        </p>

                        <h4 className="font-semibold text-white">8. Changes to Terms</h4>
                        <p>
                            We may update these terms from time to time. Continued use of the platform
                            constitutes acceptance of any changes.
                        </p>
                    </div>
                </div>

                {/* Consent Checkboxes */}
                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="terms"
                            checked={consent.termsAccepted}
                            onCheckedChange={(checked) => handleCheckboxChange('termsAccepted', checked as boolean)}
                            className="mt-1"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="terms" className="text-white font-medium">
                                I accept the Terms and Conditions
                            </Label>
                            <p className="text-sm text-gray-400">
                                You must accept the terms and conditions to use the platform
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="email"
                            checked={consent.emailConsent}
                            onCheckedChange={(checked) => handleCheckboxChange('emailConsent', checked as boolean)}
                            className="mt-1"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="email" className="text-white font-medium">
                                Email Notifications
                            </Label>
                            <p className="text-sm text-gray-400">
                                Receive important updates about your account, transfers, and messages via email
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <Checkbox
                            id="newsletter"
                            checked={consent.newsletterConsent}
                            onCheckedChange={(checked) => handleCheckboxChange('newsletterConsent', checked as boolean)}
                            className="mt-1"
                        />
                        <div className="space-y-1">
                            <Label htmlFor="newsletter" className="text-white font-medium">
                                Newsletter Subscription
                            </Label>
                            <p className="text-sm text-gray-400">
                                Receive our newsletter with platform updates, industry news, and tips
                            </p>
                        </div>
                    </div>
                </div>

                {/* Information Alert */}
                <Alert className="border-blue-500/20 bg-blue-500/10">
                    <Bell className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-300">
                        You can change your notification preferences at any time in your account settings.
                    </AlertDescription>
                </Alert>

                {/* Warning for Terms */}
                {!consent.termsAccepted && (
                    <Alert className="border-yellow-500/20 bg-yellow-500/10">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <AlertDescription className="text-yellow-300">
                            You must accept the terms and conditions to continue.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                    <Button
                        onClick={handleAccept}
                        disabled={!consent.termsAccepted}
                        className="flex-1 bg-rosegold hover:bg-rosegold/90 text-white font-polysans"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept & Continue
                    </Button>
                    <Button
                        onClick={onDecline}
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-700"
                    >
                        Decline
                    </Button>
                </div>

                {/* Additional Information */}
                <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
                    <p>
                        By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by them.
                    </p>
                    <p className="mt-2">
                        For questions about these terms, please contact our support team.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default TermsAndConditions; 