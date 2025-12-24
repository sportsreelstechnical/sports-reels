import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserPlus, Building2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UserRole, LeagueBand } from "@/lib/types";
import { LEAGUE_BANDS } from "@/lib/types";

interface SignupData {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  teamName: string;
  clubName: string;
  country: string;
  leagueBand: LeagueBand;
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<SignupData>({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "scout",
    teamName: "",
    clubName: "",
    country: "",
    leagueBand: 3,
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate auth query to trigger re-fetch of user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "Account created",
        description: "Welcome to Sports Reels!",
      });
      
      // Redirect based on role
      const role = data.role || data.user?.role;
      if (role === "embassy") {
        setLocation("/embassy");
      } else if (role === "scout" || role === "agent") {
        setLocation("/scout");
      } else {
        setLocation("/");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.username || !formData.password || !formData.email) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else {
      if (!formData.teamName || !formData.clubName) {
        toast({
          title: "Missing fields",
          description: "Please fill in team details",
          variant: "destructive",
        });
        return;
      }
      signupMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="page-signup">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-3 bg-primary rounded-md w-fit">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Join Sports Reels</CardTitle>
            <CardDescription>
              {step === 1 ? "Create your account" : "Set up your team"}
            </CardDescription>
          </div>
          <div className="flex justify-center gap-2">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@club.com"
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="johnsmith"
                    required
                    data-testid="input-username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 characters"
                    required
                    data-testid="input-password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sporting_director">Sporting Director</SelectItem>
                      <SelectItem value="legal">Legal Team</SelectItem>
                      <SelectItem value="scout">Scout</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md mb-4">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Set up your team to start managing players</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name *</Label>
                  <Input
                    id="teamName"
                    value={formData.teamName}
                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                    placeholder="e.g., Recruitment Team"
                    required
                    data-testid="input-team-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clubName">Club Name *</Label>
                  <Input
                    id="clubName"
                    value={formData.clubName}
                    onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                    placeholder="e.g., FC Example"
                    required
                    data-testid="input-club-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., United Kingdom"
                    data-testid="input-country"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="leagueBand">League Band</Label>
                  <Select
                    value={formData.leagueBand.toString()}
                    onValueChange={(value) => setFormData({ ...formData, leagueBand: parseInt(value) as LeagueBand })}
                  >
                    <SelectTrigger data-testid="select-league-band">
                      <SelectValue placeholder="Select league band" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAGUE_BANDS.map((band) => (
                        <SelectItem key={band.band} value={band.band.toString()}>
                          Band {band.band}: {band.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {LEAGUE_BANDS.find(b => b.band === formData.leagueBand)?.examples}
                  </p>
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <div className="flex gap-2 w-full">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  data-testid="button-back"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                disabled={signupMutation.isPending}
                data-testid="button-continue"
              >
                {step === 1 ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : signupMutation.isPending ? (
                  "Creating..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </a>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
