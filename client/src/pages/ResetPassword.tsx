import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

  const rawToken = searchParams.get("resetToken") || "";
  // Handle resetToken with or without quotes (e.g. ?resetToken='someToken' or ?resetToken=someToken)
  const resetToken = rawToken.replace(/^['"]|['"]$/g, "").trim();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken) {
      setErrorMessage(
        "Reset token is missing. Please use the link provided in your email."
      );
      return;
    }

    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = `/api/reset-password?resetToken=${encodeURIComponent(
        resetToken
      )}`;
      const response = await api.post<{ message?: string }>(url, {
        password: newPassword,
      });

      setIsSuccess(true);
      toast({
        title: "Password Reset Successful",
        description:
          response?.message ||
          "Your password has been reset successfully. You can now log in.",
      });
    } catch (err: any) {
      const msg =
        err.message || "An error occurred while resetting your password.";
      setErrorMessage(msg);
      toast({
        title: "Reset Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sports Reels</h1>
          <p className="text-sm text-muted-foreground">
            Account Security & Password Recovery
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {isSuccess
                ? "Your password has been changed"
                : "Enter and confirm your new account password"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center text-center space-y-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  <div className="space-y-1">
                    <p className="font-semibold text-base">
                      Password Reset Successfully
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can now sign in using your new credentials.
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full font-semibold"
                  onClick={handleSignOut}
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
              </div>
            ) : !resetToken ? (
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">Missing Reset Token</p>
                    <p className="text-xs opacity-90 leading-relaxed">
                      No reset token was found in the link. Please make sure you
                      clicked the full link provided in your recovery email, or
                      request a new one.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-xs">{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password (min. 8 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                      autoFocus
                      required
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                      required
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isSubmitting}
                  data-testid="button-reset-password"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Resetting Password..." : "Send"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-4">
            <Link
              to="/auth"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
