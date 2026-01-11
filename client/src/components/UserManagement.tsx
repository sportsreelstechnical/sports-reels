
import React, { useState, useEffect } from 'react';
import { supabase, createAdminClient } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertTriangle, CheckCircle, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { AdminGuard } from '@/components/AdminGuard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  user_type: 'team' | 'agent';
  created_at: string;
  profile_completed: boolean;
  is_verified: boolean;
  role: 'admin' | 'user';
}

const UserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set());
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load user profiles');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    setUpdatingRoles(prev => new Set(prev).add(userId));
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProfiles(prev => 
        prev.map(profile => 
          profile.user_id === userId 
            ? { ...profile, role: newRole }
            : profile
        )
      );

      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const deleteUserCompletely = async (userId: string, userName: string) => {
    setDeletingUsers(prev => new Set(prev).add(userId));
    
    try {
      console.log('Starting user deletion for:', userId, userName);
      
      // Since RLS is disabled, we can use the regular client
      // First, delete the profile from public.profiles
      console.log('Attempting to delete profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId)
        .select();

      if (profileError) {
        console.error('Profile deletion error:', profileError);
        throw new Error(`Profile deletion failed: ${profileError.message}`);
      }

      console.log('Profile deleted successfully:', profileData);

      // For auth user deletion, we'll use a direct API call
      // This bypasses the Supabase client restrictions
      console.log('Attempting to delete auth user via API...');
      
      const response = await fetch(`/api/delete-auth-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Auth user deletion failed: ${errorData.error || 'Unknown error'}`);
      }

      const authResult = await response.json();
      console.log('Auth user deleted successfully:', authResult);

      toast.success(`User "${userName}" has been completely deleted`);
      // Remove the user from the local state
      setProfiles(prev => prev.filter(profile => profile.user_id !== userId));
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user "${userName}": ${error.message}`);
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management</h1>
          <Button onClick={fetchProfiles} variant="outline">
            Refresh
          </Button>
        </div>

        <div className="grid gap-4">
          {profiles.map((profile) => (
            <Card key={profile.id} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {profile.role === 'admin' ? (
                      <Shield className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <User className="w-4 h-4 text-gray-600" />
                    )}
                    {profile.full_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={profile.user_type === 'team' ? 'default' : 'secondary'}>
                      {profile.user_type}
                    </Badge>
                    <Badge 
                      variant={profile.role === 'admin' ? 'destructive' : 'outline'}
                      className={profile.role === 'admin' ? 'text-yellow-600 border-yellow-600' : ''}
                    >
                      {profile.role}
                    </Badge>
                    {profile.is_verified && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Email: {profile.email}</p>
                  <p className="text-sm text-muted-foreground">
                    User ID: {profile.user_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Profile Status: {profile.profile_completed ? 'Complete' : 'Incomplete'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Role:</span>
                    <Select
                      value={profile.role}
                      onValueChange={(value: 'admin' | 'user') => updateUserRole(profile.user_id, value)}
                      disabled={updatingRoles.has(profile.user_id)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {updatingRoles.has(profile.user_id) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingUsers.has(profile.user_id)}
                      >
                        {deletingUsers.has(profile.user_id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          Delete User Completely
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            Are you sure you want to permanently delete <strong>{profile.full_name}</strong>?
                          </p>
                          <p className="text-sm text-muted-foreground">
                            This action will remove:
                          </p>
                          <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                            <li>• User authentication account</li>
                            <li>• Profile and all personal data</li>
                            <li>• All teams, players, and videos</li>
                            <li>• All messages and conversations</li>
                            <li>• All transfer pitches and contracts</li>
                            <li>• All related records and files</li>
                          </ul>
                          <p className="text-red-600 font-medium">
                            This action cannot be undone!
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUserCompletely(profile.user_id, profile.full_name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {profiles.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No user profiles found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminGuard>
  );
};

export default UserManagement;
