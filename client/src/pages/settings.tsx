import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Globe, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { toast } = useToast();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<
    string | null
  >(null);

  const handleOpenPasswordRecovery = () => {
    setIsChangingPassword(true);
    setRecoverySuccessMessage(null);
  };

  const handleSendRecoveryEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recoveryEmail.trim()) {
      toast({
        title: "Email Required",
        description:
          "Please enter your email address to receive recovery instructions.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingRecovery(true);
    try {
      const response = await api.post<{ message?: string }>(
        "/api/recover-password",
        {
          email: recoveryEmail.trim(),
        }
      );

      const message =
        response?.message ||
        "If that email is registered, a recovery link has been sent.";

      setRecoverySuccessMessage(message);
      toast({
        title: "Recovery Email Sent",
        description: message,
      });
    } catch (err: any) {
      toast({
        title: "Error Sending Recovery Email",
        description: err.message || "Failed to send password recovery email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingRecovery(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">
          Account
        </p>
        <h1
          className="text-3xl font-bold tracking-tight"
          data-testid="text-page-title"
        >
          Settings
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Profile Settings</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                data-testid="input-last-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email address"
              data-testid="input-email"
            />
          </div>
          <Button data-testid="button-save-profile">Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>
                Configure how you receive alerts
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch data-testid="switch-email-notifications" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Document Alerts</p>
              <p className="text-sm text-muted-foreground">
                Get notified when documents are generated
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-document-alerts" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Eligibility Updates</p>
              <p className="text-sm text-muted-foreground">
                Alerts when player eligibility scores change
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-eligibility-updates" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Platform Preferences</CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Default Visa Standards</p>
              <p className="text-sm text-muted-foreground">
                Automatically calculate against preferred standards
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-configure-standards"
            >
              Configure
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Data Export Format</p>
              <p className="text-sm text-muted-foreground">
                Choose your preferred export format
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-export-settings"
            >
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-muted-foreground">
                  Update your account password
                </p>
              </div>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPasswordRecovery}
                  data-testid="button-change-password"
                >
                  Change
                </Button>
              )}
            </div>

            {isChangingPassword && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <form onSubmit={handleSendRecoveryEmail} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="recovery-email"
                      className="text-sm font-medium"
                    >
                      Where should we send the password recovery email?
                    </Label>
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      disabled={isSendingRecovery}
                      required
                      autoFocus
                      data-testid="input-recovery-email"
                    />
                  </div>

                  {recoverySuccessMessage && (
                    <div className="flex items-start gap-2 p-3 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{recoverySuccessMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSendingRecovery || !recoveryEmail.trim()}
                      data-testid="button-send-recovery"
                    >
                      {isSendingRecovery && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isSendingRecovery ? "Sending..." : "Send"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setRecoverySuccessMessage(null);
                      }}
                      disabled={isSendingRecovery}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <Button variant="outline" size="sm" data-testid="button-enable-2fa">
              Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
