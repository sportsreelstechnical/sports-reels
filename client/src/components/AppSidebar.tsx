
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleTranslation } from '@/contexts/GoogleTranslationContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Home,
  Users,
  Video,
  Calendar,
  Search,
  User,
  LogOut,
  Bell,
  FileText,
  Clock,
  Heart,
  Target,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { translateTextSync, currentLanguage } = useGoogleTranslation();
  const { toast } = useToast();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for language change events to force refresh
  useEffect(() => {
    const handleLanguageChange = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  // Force re-render when language changes
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [currentLanguage]);

  // Base menu items for both user types
  const baseMenuItems = [
    {
      id: 'dashboard',
      title: translateTextSync('Dashboard'),
      url: "/dashboard",
      icon: Home,
    },
    {
      id: 'explore',
      title: translateTextSync('Explore'),
      url: "/explore",
      icon: Search,
    },
    {
      id: 'contracts',
      title: translateTextSync('Contracts'),
      url: "/contracts",
      icon: FileText,
    },
    {
      id: 'wallet',
      title: translateTextSync('Wallet'),
      url: "/wallet",
      icon: Wallet,
    },
    {
      id: 'profile',
      title: translateTextSync('Profile'),
      url: "/profile",
      icon: User,
    },
    {
      id: 'notifications',
      title: translateTextSync('Notifications'),
      url: "/notifications",
      icon: Bell,
      showBadge: true,
    },
    {
      id: 'history',
      title: translateTextSync('History'),
      url: "/history",
      icon: Clock,
    },
  ];

  // Agent-specific menu items
  const agentMenuItems = [
    ...baseMenuItems.slice(0, 2), // Dashboard, Explore
    {
      id: 'shortlist',
      title: translateTextSync('Shortlist'),
      url: "/agent-shortlist",
      icon: Heart,
    },
    {
      id: 'ai-scout',
      title: translateTextSync('AI Scout'),
      url: "/ai-scout",
      icon: Target,
    },
    ...baseMenuItems.slice(2), // Contracts, Wallet, Profile, Notifications, History
  ];

  // Team-specific menu items
  const teamMenuItems = [
    ...baseMenuItems.slice(0, 1), // Dashboard
    {
      id: 'players',
      title: translateTextSync('Players'),
      url: "/players",
      icon: Users,
    },
    {
      id: 'videos',
      title: translateTextSync('Videos'),
      url: "/videos",
      icon: Video,
    },
    {
      id: 'timeline',
      title: translateTextSync('Timeline'),
      url: "/timeline",
      icon: Calendar,
    },
    ...baseMenuItems.slice(1), // Explore, Contracts, Wallet, Profile, Notifications, History
  ];

  // Get appropriate menu items based on user type
  const getMenuItems = () => {
    if (profile?.user_type === 'agent') {
      return agentMenuItems;
    }
    return teamMenuItems;
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    if (profile?.user_id) {
      fetchUnreadNotifications();
    }
  }, [profile]);

  const fetchUnreadNotifications = async () => {
    if (!profile?.user_id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadNotifications(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar className='border-r-0 border-0  overflow-hidden'>
      <SidebarHeader className="p-4 lg:p-6">
        <div className="flex items-center gap-3">
          <img
            src="/lovable-uploads/41a57d3e-b9e8-41da-b5d5-bd65db3af6ba.png"
            alt="Sports Reels"
            className="w-10 h-10 flex-shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-polysans text-lg lg:text-xl font-bold text-sidebar-foreground truncate">
              Sports Reels
            </h2>
            <p className="text-sm text-sidebar-foreground/70 truncate">
              {profile?.user_type === 'team' ? translateTextSync('Team') : translateTextSync('Agent')}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-medium text-sm">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="overflow-hidden">
            <SidebarMenu className="overflow-hidden">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id || item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium truncate">{item.title}</span>
                      {item.showBadge && unreadNotifications > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs px-1.5 flex-shrink-0">
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </Badge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 lg:p-6">
        <SidebarMenuButton
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{translateTextSync('Sign Out')}</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
