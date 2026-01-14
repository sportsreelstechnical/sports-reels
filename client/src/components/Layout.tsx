import React, { useState, useEffect } from 'react';
import AppSidebar from './AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { useNavigate } from 'react-router-dom';
import GoogleLanguageSelector from '@/components/GoogleLanguageSelector';
import TranslatedText from '@/components/TranslatedText';
import ThemeToggle from '@/components/ThemeToggle';
import TokenBalanceIndicator from '@/components/TokenBalanceIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { unreadCount } = useEnhancedNotifications();
  const [searchQuery, setSearchQuery] = useState('');

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
    } catch (error) {
      toast({
        title: "Error signing out",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const roleDisplayName = user?.role === "sporting_director" ? "Sporting Director"
    : user?.role === "legal" ? "Legal Team"
      : user?.role === "scout" ? "Scout"
        : user?.role === "agent" ? "Agent"
          : user?.role === "coach" ? "Coach"
            : user?.role === "admin" ? "Administrator"
              : user?.role === "embassy" ? "Embassy Official"
                : "User";

  // Explicitly check for roles to avoid TS overlap errors if types are strict
  const userRole = user?.role as string | undefined;

  const teamName = userRole === "admin" ? "Platform Admin Portal"
    : userRole === "embassy" ? "Embassy Portal"
      : (userRole === "scout" || userRole === "agent") ? "Scout Network"
        : userRole === "federation_admin" ? "Federation Admin Portal"
          : user?.firstName ? `${user.firstName}'s Team`
            : "Team Portal";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar
          userName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'}
          userRole={roleDisplayName}
          userRoleRaw={user?.role}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 sm:gap-4 border-b bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <span className="text-sm text-muted-foreground hidden md:inline ml-2">
                {teamName}
              </span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Search Bar - Hidden on small screens for now to save space */}
              <div className="hidden md:block max-w-sm w-full lg:min-w-[300px]">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-10 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>

              {/* Token Indicator for relevant roles */}
              {(user?.role === "scout" || user?.role === "agent" || user?.role === "sporting_director" || user?.role === "coach") && (
                <TokenBalanceIndicator />
              )}

              {/* Language Selector */}
              <div className="hidden sm:block">
                <GoogleLanguageSelector
                  variant="popover"
                  showFlag={true}
                  showNativeName={false}
                  showModeToggle={false} // Mode toggle handled separately
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                />
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={handleNotificationClick}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center rounded-full"
                  >
                  </Badge>
                )}
              </Button>

              <ThemeToggle />

              {/* Sign Out (Mobile mostly, as sidebar has it too) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="md:hidden text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
