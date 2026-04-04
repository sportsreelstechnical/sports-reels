import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users, Mail, DollarSign, Activity, Shield, FileText,
  Building, Globe, UserPlus, Eye, Clock, AlertCircle,
  ArrowRight, TrendingUp, ChevronRight, BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#14b8a6", "#ec4899"];

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

  const { data: messages } = useQuery<Array<{
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

  const { data: auditLogs } = useQuery<Array<{
    id: string;
    actorId: string;
    action: string;
    category: string;
    timestamp: string;
  }>>({
    queryKey: ["/api/admin/audit-logs"],
  });

  const { data: gdprRequests } = useQuery<Array<{
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
  const totalUsers = stats?.totalUsers || 0;

  // User role distribution for donut chart
  const roleDistribution = [
    { name: "Teams", value: stats?.totalTeams || 0, color: CHART_COLORS[0], icon: Building },
    { name: "Scouts", value: stats?.totalScouts || 0, color: CHART_COLORS[1], icon: Eye },
    { name: "Players", value: stats?.totalPlayers || 0, color: CHART_COLORS[2], icon: Activity },
    { name: "Embassy", value: stats?.totalEmbassyUsers || 0, color: CHART_COLORS[3], icon: Globe },
    { name: "Federation", value: stats?.totalFederationUsers || 0, color: CHART_COLORS[4], icon: Shield },
  ].filter(d => d.value > 0);

  // Activity category counts
  const activityCounts = (auditLogs || []).reduce((acc, log) => {
    acc[log.category] = (acc[log.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activityData = Object.entries(activityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const gdprStatusCounts = {
    pending: gdprRequests?.filter(r => r.status === "pending").length || 0,
    inProgress: gdprRequests?.filter(r => r.status === "in_progress").length || 0,
    completed: gdprRequests?.filter(r => r.status === "completed").length || 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-1">Administration</p>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          {pendingGdprCount > 0 && (
            <Link to="/admin/gdpr">
              <Badge variant="destructive" className="gap-1 cursor-pointer" data-testid="badge-pending-gdpr">
                <AlertCircle className="h-3 w-3" />
                {pendingGdprCount} GDPR pending
              </Badge>
            </Link>
          )}
          {pendingMessagesCount > 0 && (
            <Link to="/admin/messages">
              <Badge variant="secondary" className="gap-1 cursor-pointer" data-testid="badge-pending-messages">
                <Mail className="h-3 w-3" />
                {pendingMessagesCount} messages
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Headline Stat */}
      <Card className="border-border/30 bg-gradient-to-r from-card to-card/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full bg-primary/[0.03]" style={{ clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0% 100%)" }} />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Platform Users</p>
              <p className="text-5xl font-bold tabular-nums">{totalUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">Across all roles and teams</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: "Teams", value: stats?.totalTeams || 0, icon: Building, color: "text-blue-500" },
                { label: "Players", value: stats?.totalPlayers || 0, icon: Activity, color: "text-purple-500" },
                { label: "Scouts", value: stats?.totalScouts || 0, icon: Eye, color: "text-green-500" },
                { label: "Embassy", value: stats?.totalEmbassyUsers || 0, icon: Globe, color: "text-orange-500" },
                { label: "Federation", value: stats?.totalFederationUsers || 0, icon: Shield, color: "text-pink-500" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
                  <p className="text-lg font-bold tabular-nums">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="xl:col-span-2 space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Distribution Donut */}
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {roleDistribution.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roleDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {roleDistribution.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 flex-1">
                      {roleDistribution.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No user data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity by Category */}
            <Card className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Activity by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {activityData.length > 0 ? (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(0, 0%, 65%)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0, 0%, 10%)",
                            border: "1px solid hsl(0, 0%, 20%)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(340, 30%, 65%)" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Feed */}
          <Card className="border-border/30" data-testid="card-recent-activity">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <CardDescription className="text-xs">Latest platform audit logs</CardDescription>
              </div>
              <Link to="/admin/audit-logs">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-1">
                  {auditLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`row-audit-log-${log.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <Badge variant="outline" className="text-[10px] shrink-0">{log.category}</Badge>
                        <span className="text-xs truncate">{log.action}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/30" data-testid="card-quick-actions">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {[
                { label: "Manage Users", icon: Users, to: "/admin/users", desc: "View & edit accounts" },
                { label: "Create Account", icon: UserPlus, to: "/admin/users/new", desc: "Add new user" },
                { label: "Message Inbox", icon: Mail, to: "/admin/messages", desc: `${pendingMessagesCount} pending`, badge: pendingMessagesCount },
                { label: "Payments", icon: DollarSign, to: "/admin/payments", desc: "Financial overview" },
                { label: "Audit Logs", icon: FileText, to: "/admin/audit-logs", desc: `${auditLogs?.length || 0} entries` },
                { label: "GDPR Requests", icon: Shield, to: "/admin/gdpr", desc: `${pendingGdprCount} pending`, badge: pendingGdprCount },
              ].map((action) => (
                <Link key={action.label} to={action.to}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="p-2 rounded-md bg-muted">
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                    </div>
                    {action.badge ? (
                      <Badge variant="destructive" className="text-[10px]">{action.badge}</Badge>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* GDPR Status */}
          <Card className="border-border/30" data-testid="card-gdpr-requests">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">GDPR Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {gdprRequests && gdprRequests.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { label: "Pending", count: gdprStatusCounts.pending, color: "bg-red-500", textColor: "text-red-400" },
                      { label: "In Progress", count: gdprStatusCounts.inProgress, color: "bg-yellow-500", textColor: "text-yellow-400" },
                      { label: "Completed", count: gdprStatusCounts.completed, color: "bg-green-500", textColor: "text-green-400" },
                    ].map((status) => (
                      <div key={status.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${status.color}`} />
                          <span className="text-xs text-muted-foreground">{status.label}</span>
                        </div>
                        <span className={`text-sm font-semibold tabular-nums ${status.textColor}`}>{status.count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border/30 pt-3 space-y-2">
                    {gdprRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between text-xs" data-testid={`row-gdpr-${request.id}`}>
                        <span className="capitalize text-muted-foreground">{request.requestType.replace(/_/g, " ")}</span>
                        <Badge
                          variant={request.status === "pending" ? "destructive" : request.status === "completed" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Link to="/admin/gdpr">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1" data-testid="button-view-all-gdpr">
                      Manage All <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No GDPR requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
