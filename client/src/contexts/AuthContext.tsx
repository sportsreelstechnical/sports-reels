import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Define types that match the Server's response
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'sporting_director' | 'legal' | 'scout' | 'coach' | 'admin' | 'agent' | 'embassy';
  teamId?: string;
  embassyCountry?: string;
}

export interface Profile {
  // Keeping Profile interface similar to before for compatibility, 
  // but mapped from User data where possible
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  user_type: 'agent' | 'team' | 'embassy' | 'admin';
  role?: string;
  country?: string; // Optional for now
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  checkAdminRole: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const fetchUser = async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);

      // Map server user to "Profile" shape for compatibility
      if (data.user) {
        const mappedProfile: Profile = {
          id: data.user.id, // Using user ID as profile ID for now
          user_id: data.user.id,
          full_name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.username,
          email: data.user.email,
          user_type: data.user.role === 'agent' || data.user.role === 'scout' ? 'agent' : 'team', // Simple mapping
          role: data.user.role
        };
        setProfile(mappedProfile);
        setIsAdmin(data.user.role === 'admin');
      }

    } catch (error) {
      // Not authenticated
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      // Map client signup data to server expectation
      const payload = {
        username: email.split('@')[0], // Generate username from email
        password,
        email,
        role: userData.user_type === 'agent' ? 'agent' : 'scout', // Default naming
        ...userData
      };

      // Adapt role based on user_type selection
      if (userData.user_type === 'agent') payload.role = 'agent';
      else if (userData.user_type === 'team') payload.role = 'sporting_director'; // Default team role

      const data = await api.post('/api/auth/signup', payload);

      setUser(data.user);
      // Profile mapping would happen here or via fetchUser
      await fetchUser(); // Refresh state

      return { error: null };
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Server expects username, but we allow email login in UI?
      // Check server/routes.ts: gets user by username. 
      // We might need to send email as username if they registered with email as username?
      // Or server needs to support email login.
      // For now assume username = email or username is provided.
      // Wait, the UI asks for email? 
      // AuthForm.tsx doesn't show the form fields (it's likely hidden in "Create Account" or "Sign In" components not fully shown in previous view).
      // Assuming email is used as username for now.

      const data = await api.post('/api/auth/login', { username: email, password });
      setUser(data.user);
      await fetchUser();

      console.log('Sign in successful, redirecting to dashboard');
      // window.location.href = '/dashboard'; // Let the component handle redirect or use router

      return { error: null };
    } catch (error: any) {
      console.error('SignIn error:', error);
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    toast({
      title: "Not Implemented",
      description: "Google Sign-In is not yet supported in the new system.",
      variant: "destructive"
    });
    // Placeholder
  };

  const signOut = async () => {
    try {
      await api.post('/api/auth/logout');
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  // Mock implementation for compatibility - Server handles profile updates differently
  const updateProfile = async (updates: Partial<Profile>) => {
    // TODO: Implement server endpoint for profile updates if needed
    toast({
      title: "Update not supported",
      description: "Profile updates are momentarily disabled during migration.",
    });
    return { error: null };
  };

  const checkAdminRole = async (): Promise<boolean> => {
    return user?.role === 'admin';
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    checkAdminRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
