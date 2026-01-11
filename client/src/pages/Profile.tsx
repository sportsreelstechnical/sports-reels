
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import AgentProfileForm from '@/components/AgentProfileForm';
import TeamProfileSetup from '@/components/TeamProfileSetup';
import ProfileCompletionStatus from '@/components/ProfileCompletionStatus';
import { ShortlistManager } from '@/components/ShortlistManager';
import { User, Heart, Bell, Settings, Users, Building } from 'lucide-react';

const Profile = () => {
  const { profile } = useAuth();

  return (
    <Layout>
      <div className="min-h-screen bg-background px-3 py-6 sm:px-5 sm:py-8 lg:px-8 space-y-6">
        <div className="text-start space-y-2">
          <h1 className="text-xl sm:text-2xl font-polysans font-bold text-white">
            Profile Settings
          </h1>
          <p className="text-sm sm:text-base text-gray-400 font-poppins">
            Manage your account and profile information
          </p>
        </div>

        {profile?.user_type === 'team' && (
          <ProfileCompletionStatus />
        )}

        {profile?.user_type === 'agent' ? (
          <Tabs defaultValue="profile" className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 gap-2 bg-[#111111] border border-gray-800 rounded-lg p-1">
              <TabsTrigger value="profile" className="flex items-center justify-center gap-2 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                <User className="w-4 h-4" />
                <span className="whitespace-nowrap">Agent Profile</span>
              </TabsTrigger>
              <TabsTrigger value="shortlist" className="flex items-center justify-center gap-2 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                <Heart className="w-4 h-4" />
                <span className="whitespace-nowrap">My Shortlist</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center justify-center gap-2 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                <Bell className="w-4 h-4" />
                <span className="whitespace-nowrap">Notifications</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 sm:mt-6">
              <AgentProfileForm />
            </TabsContent>

            <TabsContent value="shortlist" className="mt-4 sm:mt-6">
              <Card className="border border-gray-800 bg-[#0f0f0f]">
                <CardContent className="p-4 sm:p-6">
                  <ShortlistManager showFullList={true} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4 sm:mt-6">
              <Card className="border border-gray-800 bg-[#0f0f0f]">
                <CardHeader className="p-4 sm:p-5">
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Bell className="w-5 h-5 text-blue-400" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 text-sm sm:text-base text-gray-400">
                  Notification preferences coming soon...
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : profile?.user_type === 'team' ? (
          <Tabs defaultValue="profile" className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2 gap-2 bg-[#111111] border border-gray-800 rounded-lg p-1">
              <TabsTrigger value="profile" className="flex items-center justify-center gap-2 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                <Building className="w-4 h-4" />
                <span className="whitespace-nowrap">Team Profile</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center justify-center gap-2 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                <Bell className="w-4 h-4" />
                <span className="whitespace-nowrap">Notifications</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 sm:mt-6">
              <TeamProfileSetup />
            </TabsContent>

            <TabsContent value="notifications" className="mt-4 sm:mt-6">
              <Card className="border border-gray-800 bg-[#0f0f0f]">
                <CardHeader className="p-4 sm:p-5">
                  <CardTitle className="flex items-center gap-2 text-white text-base sm:text-lg">
                    <Bell className="w-5 h-5 text-blue-400" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 text-sm sm:text-base text-gray-400">
                  Notification preferences coming soon...
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border border-gray-800 bg-[#0f0f0f]">
            <CardContent className="p-8 sm:p-10 text-center space-y-3">
              <User className="h-10 w-10 text-blue-400 mx-auto" />
              <h3 className="text-lg sm:text-xl font-polysans text-white">Profile Management</h3>
              <p className="text-sm sm:text-base text-gray-400 font-poppins">
                Please complete your account setup to access profile management features.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
