import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Clock, 
  User,
  Shield,
  RefreshCw
} from "lucide-react";

type AuditLog = {
  id: string;
  actorId: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  category: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
  timestamp: string;
  severity: string;
};

export default function AdminAuditLogs() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs, isLoading, refetch } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs", categoryFilter !== "all" ? categoryFilter : undefined, pageSize, page * pageSize],
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "user_management": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "authentication": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "security": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "gdpr": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "content_moderation": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "payment": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getSeverityVariant = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case "critical":
      case "error": return "destructive";
      case "warning": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-audit-logs-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-audit-title">Audit Logs</h1>
          <p className="text-muted-foreground">Track all platform activity and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="user_management">User Management</SelectItem>
              <SelectItem value="authentication">Authentication</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="gdpr">GDPR</SelectItem>
              <SelectItem value="content_moderation">Content Moderation</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-logs">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>Complete history of platform actions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
          ) : logs && logs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(log.category)}`}>
                          {log.category.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                        {log.description && (
                          <p className="text-xs text-muted-foreground">{log.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{log.actorName || log.actorId || "System"}</span>
                        </div>
                        {log.actorRole && (
                          <span className="text-xs text-muted-foreground">{log.actorRole}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.entityType && (
                          <div className="text-sm">
                            <span className="font-medium">{log.entityType}</span>
                            {log.entityId && (
                              <span className="text-muted-foreground"> #{log.entityId.substring(0, 8)}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(log.severity || "info")}>
                          {log.severity || "info"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={logs.length < pageSize}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
