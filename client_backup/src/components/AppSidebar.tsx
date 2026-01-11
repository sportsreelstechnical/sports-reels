import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Video,
  Film,
  FileText,
  Building2,
  Search,
  Settings,
  LogOut,
  Bell,
  Shield,
  MessageSquare,
  Mail,
  ClipboardList,
  FileCheck,
  Coins,
  DollarSign,
  Activity,
} from "lucide-react";
import logoImage from "@assets/WhatsApp_Image_2025-12-17_at_12.49.33_1766008177672.jpeg";

interface AppSidebarProps {
  userName?: string;
  userRole?: string;
  userRoleRaw?: string;
  pendingVerifications?: number;
}

export default function AppSidebar({ 
  userName = "John Smith", 
  userRole = "Sporting Director",
  userRoleRaw = "sporting_director",
  pendingVerifications = 3 
}: AppSidebarProps) {
  const [location] = useLocation();

  const teamNavItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Players", url: "/players", icon: Users },
    { title: "Videos", url: "/videos", icon: Video },
    { title: "Video Reels", url: "/video-reels", icon: Film },
    { title: "Team Sheets", url: "/team-sheets", icon: ClipboardList },
    { title: "Reports", url: "/reports", icon: FileText },
    { title: "Scouting", url: "/scouting", icon: Search },
    { title: "Invitation Letters", url: "/invitation-letters", icon: Mail },
    { title: "Federation Letters", url: "/federation-letters", icon: FileCheck },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Token Bank", url: "/token-bank", icon: Coins },
  ];

  const scoutNavItems = [
    { title: "Player Search", url: "/", icon: Search },
    { title: "Video Reels", url: "/video-reels", icon: Film },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Token Bank", url: "/token-bank", icon: Coins },
  ];

  const embassyNavItems = [
    { title: "Documents", url: "/", icon: FileText },
  ];

  const adminNavItems = [
    { title: "Embassy Verification", url: "/embassy", icon: Building2, badge: pendingVerifications },
    { title: "Access Control", url: "/access", icon: Shield },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const federationAdminNavItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Request Queue", url: "/federation-admin", icon: FileCheck },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const platformAdminNavItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "User Management", url: "/admin/users", icon: Users },
    { title: "Message Inbox", url: "/admin/messages", icon: MessageSquare },
    { title: "Financial Analytics", url: "/admin/payments", icon: DollarSign },
    { title: "Audit Logs", url: "/admin/audit-logs", icon: Activity },
    { title: "GDPR Requests", url: "/admin/gdpr", icon: Shield },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const isEmbassy = userRoleRaw === "embassy";
  const isScout = userRoleRaw === "scout" || userRoleRaw === "agent";
  const isFederationAdmin = userRoleRaw === "federation_admin";
  const isPlatformAdmin = userRoleRaw === "admin";
  const mainNavItems = isPlatformAdmin ? platformAdminNavItems : isFederationAdmin ? federationAdminNavItems : isEmbassy ? embassyNavItems : isScout ? scoutNavItems : teamNavItems;

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src={logoImage} 
            alt="Sports Reels" 
            className="h-10 w-10 object-contain rounded-md"
          />
          <div>
            <h1 className="font-semibold text-lg text-sidebar-foreground">Sports Reels</h1>
            <p className="text-xs text-sidebar-foreground/60">Compliance Platform</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isEmbassy && !isScout && !isFederationAdmin && !isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="ml-auto bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {userName.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userRole}</p>
          </div>
          <SidebarMenuButton 
            asChild 
            className="w-auto p-2"
            data-testid="button-logout"
          >
            <a href="/api/logout">
              <LogOut className="h-4 w-4" />
            </a>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
