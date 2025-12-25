import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Clock, 
  User,
  Download,
  Check,
  X,
  Eye
} from "lucide-react";

type GdprRequest = {
  id: string;
  userId: string;
  requestType: string;
  status: string;
  requestDetails: string | null;
  dataCategories: string[] | null;
  processedBy: string | null;
  processedAt: string | null;
  completionNotes: string | null;
  rejectionReason: string | null;
  dueDate: string | null;
  createdAt: string;
};

export default function AdminGdpr() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<GdprRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading } = useQuery<GdprRequest[]>({
    queryKey: ["/api/admin/gdpr-requests", statusFilter !== "all" ? statusFilter : undefined],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      return apiRequest(`/api/admin/gdpr-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gdpr-requests"] });
      setDialogOpen(false);
      setSelectedRequest(null);
      toast({ title: "Request updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update request", description: error.message, variant: "destructive" });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/gdpr-requests/${id}/export`, {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gdpr-requests"] });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-data-export-${Date.now()}.json`;
      a.click();
      toast({ title: "Data exported successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to export data", description: error.message, variant: "destructive" });
    },
  });

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "pending": return "destructive";
      case "in_progress": return "secondary";
      case "completed": return "default";
      case "rejected": return "outline";
      default: return "outline";
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "data_export": return "Data Export";
      case "data_deletion": return "Data Deletion";
      case "consent_update": return "Consent Update";
      case "access_request": return "Access Request";
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-gdpr-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-gdpr-title">
            <Shield className="h-6 w-6" />
            GDPR Compliance
          </h1>
          <p className="text-muted-foreground">Manage data protection and privacy requests</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {requests?.filter(r => r.status === "pending").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {requests?.filter(r => r.status === "in_progress").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {requests?.filter(r => r.status === "completed").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {requests?.filter(r => r.status === "rejected").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>GDPR Requests</CardTitle>
          <CardDescription>All data protection requests from users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
          ) : requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-gdpr-${request.id}`}>
                    <TableCell>
                      <div className="font-medium">{getRequestTypeLabel(request.requestType)}</div>
                      {request.dataCategories && request.dataCategories.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {request.dataCategories.slice(0, 3).map((cat) => (
                            <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {request.userId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(request.status)}>
                        {request.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.dueDate ? (
                        <span className="text-sm">{new Date(request.dueDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedRequest(request);
                            setDialogOpen(true);
                          }}
                          data-testid={`button-view-${request.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.requestType === "data_export" && request.status === "pending" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => exportDataMutation.mutate(request.id)}
                            disabled={exportDataMutation.isPending}
                            data-testid={`button-export-${request.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {request.status === "pending" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => updateRequestMutation.mutate({ id: request.id, status: "completed" })}
                              disabled={updateRequestMutation.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedRequest(request);
                                setDialogOpen(true);
                              }}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No GDPR requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GDPR Request Details</DialogTitle>
            <DialogDescription>
              Review and process this data protection request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Request Type</p>
                  <p className="font-medium">{getRequestTypeLabel(selectedRequest.requestType)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusVariant(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{selectedRequest.userId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedRequest.requestDetails && (
                <div>
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="text-sm">{selectedRequest.requestDetails}</p>
                </div>
              )}
              {selectedRequest.status === "pending" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rejection Reason (if rejecting)</p>
                  <Textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    data-testid="textarea-rejection-reason"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            {selectedRequest?.status === "pending" && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => updateRequestMutation.mutate({ 
                    id: selectedRequest.id, 
                    status: "rejected",
                    rejectionReason 
                  })}
                  disabled={updateRequestMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  Reject
                </Button>
                <Button 
                  onClick={() => updateRequestMutation.mutate({ id: selectedRequest.id, status: "completed" })}
                  disabled={updateRequestMutation.isPending}
                  data-testid="button-confirm-approve"
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
