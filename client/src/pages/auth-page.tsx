
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { roles } from "@/lib/roles";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
    username: z.string().min(1, "Username is requirede"),
    password: z.string().min(1, "Password is required"),
});

// Roles that require team creation
const TEAM_ROLES = ['sporting_director', 'coach', 'legal'] as const;

const signupSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    email: z.string().email("Invalid email address"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.string(),
    // Team fields - required for team roles
    teamName: z.string().optional(),
    clubName: z.string().optional(),
    country: z.string().optional(),
}).refine((data) => {
    // If it's a team role, teamName and clubName are required
    if (TEAM_ROLES.includes(data.role as typeof TEAM_ROLES[number])) {
        return !!data.teamName && !!data.clubName;
    }
    return true;
}, {
    message: "Team name and club name are required for this role",
    path: ["teamName"],
});

export default function AuthPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

    // Default to scout, but check URL just in case we link there
    const searchParams = new URLSearchParams(window.location.search);
    const initialRole = searchParams.get("role") || "scout";
    const [selectedRole, setSelectedRole] = useState<string>(initialRole);

    const isPlatformAdmin = selectedRole === "admin";

    // Check if user is already logged in
    const { user, loading, signIn, signUp } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            navigate("/dashboard");
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (isPlatformAdmin) {
            setActiveTab("login");
        }
    }, [selectedRole, isPlatformAdmin]);

    const activeRoleData = roles.find(r => r.id === selectedRole);

    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const signupForm = useForm<z.infer<typeof signupSchema>>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            username: "",
            password: "",
            email: "",
            firstName: "",
            lastName: "",
            role: selectedRole,
            teamName: "",
            clubName: "",
            country: "",
        },
    });
    
    // Check if current role needs team fields
    const needsTeamFields = TEAM_ROLES.includes(selectedRole as typeof TEAM_ROLES[number]);
    
    // Debug: log when this changes
    console.log("[AuthPage] selectedRole:", selectedRole, "needsTeamFields:", needsTeamFields);

    // Update form role when state changes
    useEffect(() => {
        signupForm.setValue("role", selectedRole);
    }, [selectedRole, signupForm]);

    const loginMutation = useMutation({
        mutationFn: async (data: z.infer<typeof loginSchema>) => {
            const result = await signIn(data.username, data.password);
            if (result.error) {
                throw result.error;
            }
            return result;
        },
        onSuccess: () => {
            toast({
                title: "Welcome back!",
                description: "You have successfully logged in.",
            });
            navigate("/dashboard");
        },
        onError: (error: Error) => {
            toast({
                title: "Login failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const signupMutation = useMutation({
        mutationFn: async (data: z.infer<typeof signupSchema>) => {
            const { email, password, ...rest } = data;
            const result = await signUp(email, password, { ...rest });
            if (result.error) {
                throw result.error;
            }
            return result;
        },
        onSuccess: () => {
            toast({
                title: "Account created!",
                description: "You have successfully signed up.",
            });
            navigate("/dashboard");
        },
        onError: (error: Error) => {
            toast({
                title: "Signup failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleGoogleLogin = () => {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
        window.location.href = `${baseUrl}/api/auth/google?role=${selectedRole}`;
    };

    return (
        <div className="min-h-screen grid items-center justify-center lg:grid-cols-2 p-4">
            <div className="hidden lg:flex flex-col justify-center p-12 h-full bg-muted text-muted-foreground">
                <div className="mx-auto space-y-6 max-w-lg">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-foreground">Sports Reels</h2>
                        <p className="text-lg">
                            The complete platform for player compliance, visa eligibility, and transfer management.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Welcome to Sports Reels</CardTitle>
                        <CardDescription>
                            Sign in or create an account to get started
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6">
                            <label className="text-sm font-medium mb-2 block">I am a...</label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            <div className="flex items-center">
                                                <role.icon className="mr-2 h-4 w-4" />
                                                <span>{role.title}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {activeRoleData && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    {activeRoleData.description}
                                </p>
                            )}
                        </div>

                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="signup" disabled={isPlatformAdmin}>
                                    Sign Up
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <Form {...loginForm}>
                                    <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                                        <FormField
                                            control={loginForm.control}
                                            name="username"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Username</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your username" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={loginForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="Enter your password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                                            {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Sign In
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>

                            <TabsContent value="signup">
                                <Form {...signupForm}>
                                    <form onSubmit={signupForm.handleSubmit((data) => signupMutation.mutate(data))} className="space-y-4">
                                        <FormField
                                            control={signupForm.control}
                                            name="username"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Username</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Choose a username" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={signupForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter your email" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={signupForm.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>First Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="John" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={signupForm.control}
                                                name="lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Last Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Doe" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={signupForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="Create a password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {needsTeamFields && (
                                            <>
                                                <Separator className="my-4" />
                                                <p className="text-sm text-muted-foreground mb-2">Team Information</p>
                                                <FormField
                                                    control={signupForm.control}
                                                    name="teamName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Team Name *</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. FC Barcelona Youth" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={signupForm.control}
                                                    name="clubName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Club Name *</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. FC Barcelona" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={signupForm.control}
                                                    name="country"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Country</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. Spain" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        )}

                                        <Button type="submit" className="w-full" disabled={signupMutation.isPending}>
                                            {signupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Account
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>
                        </Tabs>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </Button>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-sm text-muted-foreground">
                            By using SportReels, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
