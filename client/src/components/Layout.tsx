import React, { useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import GoogleLanguageSelector from '@/components/GoogleLanguageSelector';
import TranslatedText from '@/components/TranslatedText';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { unreadCount } = useEnhancedNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for language change events to force refresh
  useEffect(() => {
    const handleLanguageChange = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  useEffect(() => {
    if (profile?.user_id) {
      fetchProfileImage();
    }
  }, [profile]);


  const fetchProfileImage = async () => {
    if (!profile?.id) return;

    try {
      if (profile.user_type === 'team') {
        const { data, error } = await supabase
          .from('teams')
          .select('logo_url')
          .eq('profile_id', profile.id)
          .single();

        if (!error && data?.logo_url) {
          setProfileImage(data.logo_url);
        }
      } else if (profile.user_type === 'agent') {
        // Since agents table doesn't have avatar_url, we'll use a placeholder or profile image logic
        // For now, we'll keep it null and show initials
        setProfileImage(null);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
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
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 sm:gap-4 border-0 bg-[#141414] px-2 sm:px-4">
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <SidebarTrigger className="-ml-1" />
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md min-w-0 hidden sm:block">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search players, teams, contracts..."
                  className="pl-10 pr-4 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              {/* Language Selector */}
              <div className="block md:hidden">
                <GoogleLanguageSelector
                  variant="popover"
                  showFlag={false}
                  showNativeName={true}
                  showModeToggle={false}
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                />
              </div>
              <div className="hidden md:block">
                <GoogleLanguageSelector 
                  variant="popover" 
                  showFlag={true} 
                  showNativeName={false}
                  showModeToggle={true}
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                />
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                className="relative p-2"
                onClick={handleNotificationClick}
              >
                <Bell className="h-4 h-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-[10px] sm:text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Profile Avatar */}
              {/* <Avatar className="h-8 w-8">
                <AvatarImage src={profileImage || undefined} alt={profile?.full_name || ''} />
                <AvatarFallback className="text-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar> */}

              {/* Sign Out */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                <LogOut className="h-4 h-4 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  <TranslatedText>Sign Out</TranslatedText>
                </span>
              </Button>
            </div>
          </header>

          <main className="flex-1 p-2 sm:p-4 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
