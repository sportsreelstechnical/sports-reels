import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Mail, 
  DollarSign, 
  Activity, 
  Shield, 
  FileText,
  Building,
  Globe,
  UserPlus,
  Eye,
  Clock,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    totalTeams: number;
    totalPlayers: number;
    totalScouts: number;
    totalEmbassyUsers: number;
    totalFederationUsers: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Array<{
    id: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    recipientName: string;
    subject: string;
    status: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/admin/messages"],
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery<Array<{
    id: string;
    actorId: string;
    action: string;
    category: string;
    timestamp: string;
  }>>({
    queryKey: ["/api/admin/audit-logs"],
  });

  const { data: gdprRequests, isLoading: gdprLoading } = useQuery<Array<{
    id: string;
    userId: string;
    requestType: string;
    status: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/admin/gdpr-requests"],
  });

  const pendingGdprCount = gdprRequests?.filter(r => r.status === "pending").length || 0;
  const pendingMessagesCount = messages?.filter(m => m.status === "pending").length || 0;

  const statCards = [
    { 
      title: "Total Users", 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: "text-blue-500",
      link: "/admin/users"
    },
    { 
      title: "Total Teams", 
      value: stats?.totalTeams || 0, 
      icon: Building, 
      color: "text-green-500",
      link: "/admin/users"
    },
    { 
      title: "Total Players", 
      value: stats?.totalPlayers || 0, 
      icon: Activity, 
      color: "text-purple-500",
      link: "/admin/users"
    },
    { 
      title: "Scouts", 
      value: stats?.totalScouts || 0, 
      icon: Eye, 
      color: "text-orange-500",
      link: "/admin/users?role=scout"
    },
    { 
      title: "Embassy Users", 
      value: stats?.totalEmbassyUsers || 0, 
      icon: Globe, 
      color: "text-teal-500",
      link: "/admin/users?role=embassy"
    },
    { 
      title: "Federation Users", 
      value: stats?.totalFederationUsers || 0, 
      icon: Shield, 
      color: "text-pink-500",
      link: "/admin/users?role=federation"
    },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-title">Platform Administration</h1>
          <p className="text-muted-foreground">Manage users, monitor activity, and ensure compliance</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingGdprCount > 0 && (
            <Badge variant="destructive" className="gap-1" data-testid="badge-pending-gdpr">
              <AlertCircle className="h-3 w-3" />
              {pendingGdprCount} GDPR pending
            </Badge>
          )}
          {pendingMessagesCount > 0 && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-pending-messages">
              <Mail className="h-3 w-3" />
              {pendingMessagesCount} messages to review
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.link}>
            <Card className="hover-elevate cursor-pointer" data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-quick-actions">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-manage-users">
                <Users className="h-4 w-4" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/users/new">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-create-account">
                <UserPlus className="h-4 w-4" />
                Create Account
              </Button>
            </Link>
            <Link href="/admin/messages">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-message-inbox">
                <Mail className="h-4 w-4" />
                Message Inbox
              </Button>
            </Link>
            <Link href="/admin/payments">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-payments">
                <DollarSign className="h-4 w-4" />
                View Payments
              </Button>
            </Link>
            <Link href="/admin/audit-logs">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-audit-logs">
                <FileText className="h-4 w-4" />
                Audit Logs
              </Button>
            </Link>
            <Link href="/admin/gdpr">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-gdpr">
                <Shield className="h-4 w-4" />
                GDPR Requests
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest platform audit logs</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0" data-testid={`row-audit-log-${log.id}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.category}</Badge>
                      <span>{log.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No activity recorded yet</div>
            )}
            {auditLogs && auditLogs.length > 5 && (
              <Link href="/admin/audit-logs">
                <Button variant="ghost" size="sm" className="mt-3 w-full" data-testid="button-view-all-logs">
                  View all logs
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {gdprRequests && gdprRequests.length > 0 && (
        <Card data-testid="card-gdpr-requests">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              GDPR Requests
            </CardTitle>
            <CardDescription>Data protection and privacy requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gdprRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0" data-testid={`row-gdpr-${request.id}`}>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={request.status === "pending" ? "destructive" : request.status === "completed" ? "default" : "secondary"}
                    >
                      {request.status}
                    </Badge>
                    <span className="capitalize">{request.requestType.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/gdpr">
              <Button variant="ghost" size="sm" className="mt-3 w-full" data-testid="button-view-all-gdpr">
                Manage all GDPR requests
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
