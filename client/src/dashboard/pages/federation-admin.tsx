import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, CheckCircle, Clock, AlertCircle, Search, Filter, 
  RefreshCw, Eye, FileCheck, Download, X, DollarSign,
  Globe, Building2, Calendar, Send, TrendingUp, Users, BarChart3,
  Settings, Plus, Trash2, MessageCircle, History, ArrowRight, Upload
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { FederationLetterRequest, FederationFeeSchedule, FederationRequestActivity, FederationRequestMessage } from "@shared/schema";

const PLATFORM_SERVICE_CHARGE = 25;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  submitted: { label: "New Submissions", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Send },
  processing: { label: "In Progress", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: RefreshCw },
  issued: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertCircle },
};

export default function FederationAdminPage() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<FederationLetterRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("queue");
  const [newFee, setNewFee] = useState({ country: "", baseFee: 0, currency: "USD" });
  const [detailTab, setDetailTab] = useState("details");
  const [newMessage, setNewMessage] = useState("");
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);

  const { data: stats } = useQuery<{ totalRequests: number; processed: number; pending: number; totalRevenue: number }>({
    queryKey: ["/api/federation-admin/dashboard-stats"],
  });

  const { data: requests = [], isLoading } = useQuery<FederationLetterRequest[]>({
    queryKey: ["/api/federation-admin/requests", statusFilter],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== "all" 
        ? `/api/federation-admin/requests?status=${statusFilter}` 
        : "/api/federation-admin/requests";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  const { data: feeSchedules = [] } = useQuery<FederationFeeSchedule[]>({
    queryKey: ["/api/federation-admin/fee-schedules"],
    enabled: activeTab === "fees",
  });

  const { data: requestActivities = [] } = useQuery<FederationRequestActivity[]>({
    queryKey: ["/api/federation-requests", selectedRequest?.id, "activities"],
    enabled: !!selectedRequest?.id && isDetailDialogOpen,
  });

  const { data: requestMessages = [] } = useQuery<FederationRequestMessage[]>({
    queryKey: ["/api/federation-requests", selectedRequest?.id, "messages"],
    enabled: !!selectedRequest?.id && isDetailDialogOpen,
  });

  interface RequestDocument {
    type: string;
    name: string;
    objectPath?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    verificationStatus?: string | null;
  }

  const { data: requestDocuments = [], isLoading: isLoadingDocuments } = useQuery<RequestDocument[]>({
    queryKey: ["/api/federation-admin/requests", selectedRequest?.id, "documents"],
    enabled: !!selectedRequest?.id && isDetailDialogOpen && detailTab === "documents",
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/federation-requests/${selectedRequest?.id}/messages`, {
        content,
        senderName: "Federation Admin",
        recipientPortal: "team",
      });
    },
    onSuccess: () => {
      toast({ title: "Message Sent", description: "Your message has been sent to the team." });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/federation-requests", selectedRequest?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-requests", selectedRequest?.id, "activities"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Send", description: error.message, variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/federation-admin/requests/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/federation-admin/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-admin/dashboard-stats"] });
      toast({ title: "Request accepted", description: "Request is now being processed" });
      setIsDetailDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const issueMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      // Step 1: Get presigned upload URL
      const urlResponse = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          name: file.name,
          size: file.size,
          contentType: file.type 
        }),
      });
      if (!urlResponse.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlResponse.json();
      
      // Step 2: Upload file directly to storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Failed to upload file");
      
      // Step 3: Issue the letter with the uploaded file info
      return apiRequest("POST", `/api/federation-admin/requests/${id}/issue`, {
        issuedDocumentStorageKey: `issued-${id}-${Date.now()}`,
        issuedDocumentObjectPath: objectPath,
        issuedDocumentOriginalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/federation-admin/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-admin/dashboard-stats"] });
      toast({ title: "Letter issued", description: "Federation letter has been issued and sent to the team" });
      setIsDetailDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/federation-admin/requests/${id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/federation-admin/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-admin/dashboard-stats"] });
      toast({ title: "Request rejected", description: "Request has been rejected" });
      setIsRejectDialogOpen(false);
      setIsDetailDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      !searchQuery ||
      req.athleteFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.targetClubName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-federation-admin-title">
            Federation Administration
          </h1>
          <p className="text-muted-foreground">
            Manage letter requests, process documents, and track revenue
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card data-testid="card-stat-total">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{stats?.totalRequests || 0}</p>
                </div>
                <FileText className="h-6 w-6 text-muted-foreground/50 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-pending">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-processed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Processed</p>
                  <p className="text-2xl font-bold">{stats?.processed || 0}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-revenue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${stats?.totalRevenue || 0}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Request Queue
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fee Management
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>Request Queue</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search requests..."
                        className="pl-8 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-requests"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48" data-testid="select-status-filter">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="submitted">New Submissions</SelectItem>
                        <SelectItem value="processing">In Progress</SelectItem>
                        <SelectItem value="issued">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try adjusting your search" : "No requests in this category"}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {filteredRequests.map((request) => (
                        <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="space-y-2 flex-1 min-w-[250px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm font-medium">
                                    {request.requestNumber}
                                  </span>
                                  {getStatusBadge(request.status)}
                                </div>
                                <h4 className="font-semibold text-lg">{request.athleteFullName}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-4 w-4" />
                                    {request.athleteNationality}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {request.targetClubName}, {request.targetClubCountry}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(request.createdAt!).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm flex-wrap">
                                  <span>
                                    <span className="text-muted-foreground">Fee: </span>
                                    <span className="font-medium">${request.totalAmount}</span>
                                  </span>
                                  <span>
                                    <span className="text-muted-foreground">Type: </span>
                                    <span className="capitalize font-medium">{request.transferType}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {request.status === "submitted" && (
                                  <Button
                                    size="sm"
                                    onClick={() => acceptMutation.mutate(request.id)}
                                    disabled={acceptMutation.isPending}
                                    data-testid={`button-accept-${request.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                )}
                                {request.status === "processing" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsIssueDialogOpen(true);
                                    }}
                                    disabled={issueMutation.isPending}
                                    data-testid={`button-issue-${request.id}`}
                                  >
                                    <Upload className="h-4 w-4 mr-1" />
                                    Upload & Issue
                                  </Button>
                                )}
                                {(request.status === "submitted" || request.status === "processing") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsRejectDialogOpen(true);
                                    }}
                                    data-testid={`button-reject-${request.id}`}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsDetailDialogOpen(true);
                                  }}
                                  data-testid={`button-view-${request.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Fee Schedule</CardTitle>
                    <CardDescription>
                      Set base fees by destination country. Platform service charge of ${PLATFORM_SERVICE_CHARGE} is automatically added.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsFeeDialogOpen(true)} data-testid="button-add-fee">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Fee Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">Default Fee Structure</p>
                        <p className="text-sm text-muted-foreground">
                          Base fee per request + ${PLATFORM_SERVICE_CHARGE} platform service charge
                        </p>
                      </div>
                      <Badge>Active</Badge>
                    </div>
                  </div>
                  
                  {feeSchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No custom fee rules configured</p>
                      <p className="text-sm text-muted-foreground">
                        Add country-specific fees to override defaults
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {feeSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`fee-schedule-${schedule.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{schedule.country}</p>
                              <p className="text-sm text-muted-foreground">
                                Base: ${schedule.baseFee} + ${schedule.platformServiceCharge} platform = ${(schedule.baseFee || 0) + (schedule.platformServiceCharge || 0)} total
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={schedule.isActive ? "default" : "outline"}>
                              {schedule.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button size="icon" variant="ghost">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Revenue Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Total Revenue (All Time)</span>
                      <span className="text-xl font-bold">${stats?.totalRevenue || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Platform Fees Collected</span>
                      <span className="text-xl font-bold">${(stats?.processed || 0) * PLATFORM_SERVICE_CHARGE}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Federation Share</span>
                      <span className="text-xl font-bold">
                        ${(stats?.totalRevenue || 0) - (stats?.processed || 0) * PLATFORM_SERVICE_CHARGE}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Processing Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Total Requests</span>
                      <span className="text-xl font-bold">{stats?.totalRequests || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="text-xl font-bold text-green-600">{stats?.processed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Pending Review</span>
                      <span className="text-xl font-bold text-yellow-600">{stats?.pending || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailDialogOpen} onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setDetailTab("details"); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details - {selectedRequest?.requestNumber}
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-1">
                    <FileCheck className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                    {requestMessages.filter(m => !m.isRead && m.senderPortal === 'team').length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1">
                        {requestMessages.filter(m => !m.isRead && m.senderPortal === 'team').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(selectedRequest.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Athlete Name:</span>
                      <p className="font-medium">{selectedRequest.athleteFullName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nationality:</span>
                      <p className="font-medium">{selectedRequest.athleteNationality}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Position:</span>
                      <p className="font-medium">{selectedRequest.athletePosition || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <p className="font-medium">{selectedRequest.athleteDateOfBirth || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target Club:</span>
                      <p className="font-medium">{selectedRequest.targetClubName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target Country:</span>
                      <p className="font-medium">{selectedRequest.targetClubCountry}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transfer Type:</span>
                      <p className="font-medium capitalize">{selectedRequest.transferType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Fee:</span>
                      <p className="font-medium">${selectedRequest.totalAmount}</p>
                    </div>
                  </div>

                  {selectedRequest.requestPurpose && (
                    <div>
                      <span className="text-muted-foreground text-sm">Purpose:</span>
                      <p className="text-sm mt-1">{selectedRequest.requestPurpose}</p>
                    </div>
                  )}

                  {selectedRequest.additionalNotes && (
                    <div>
                      <span className="text-muted-foreground text-sm">Additional Notes:</span>
                      <p className="text-sm mt-1">{selectedRequest.additionalNotes}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-end gap-2">
                    {selectedRequest.status === "submitted" && (
                      <>
                        <Button
                          onClick={() => acceptMutation.mutate(selectedRequest.id)}
                          disabled={acceptMutation.isPending}
                          data-testid="button-dialog-accept"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept Request
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsRejectDialogOpen(true)}
                          data-testid="button-dialog-reject"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === "processing" && (
                      <>
                        <Button
                          onClick={() => setIsIssueDialogOpen(true)}
                          data-testid="button-dialog-issue"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload & Issue Letter
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsRejectDialogOpen(true)}
                          data-testid="button-dialog-reject-processing"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Attached Documents</h4>
                    {isLoadingDocuments ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                        <span className="ml-2 text-muted-foreground">Loading documents...</span>
                      </div>
                    ) : requestDocuments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No documents attached to this request</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requestDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                {doc.type === "passport" ? (
                                  <FileCheck className="h-5 w-5 text-primary" />
                                ) : (
                                  <FileText className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{doc.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="capitalize">{doc.type.replace("_", " ")}</span>
                                  {doc.verificationStatus && (
                                    <>
                                      <span className="text-muted-foreground/50">|</span>
                                      {doc.verificationStatus === "verified" ? (
                                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>
                                      ) : doc.verificationStatus === "pending" ? (
                                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Unverified</Badge>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.objectPath && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(doc.objectPath!, "_blank")}
                                    data-testid={`button-view-doc-${doc.type}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = doc.objectPath!;
                                      link.download = doc.name;
                                      link.click();
                                    }}
                                    data-testid={`button-download-doc-${doc.type}`}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 mt-4">
                  <ScrollArea className="h-[400px]">
                    {requestActivities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No activity history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {requestActivities.map((activity) => (
                          <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0">
                            <div className="flex-shrink-0 mt-1">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                {activity.activityType === 'status_change' && <RefreshCw className="h-4 w-4" />}
                                {activity.activityType === 'message_sent' && <MessageCircle className="h-4 w-4" />}
                                {activity.activityType === 'document_issued' && <FileCheck className="h-4 w-4" />}
                                {activity.activityType === 'accepted' && <CheckCircle className="h-4 w-4" />}
                                {activity.activityType === 'rejected' && <X className="h-4 w-4" />}
                                {!['status_change', 'message_sent', 'document_issued', 'accepted', 'rejected'].includes(activity.activityType) && <History className="h-4 w-4" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{activity.actorName || 'System'}</span>
                                {activity.actorRole && (
                                  <Badge variant="outline" className="text-xs">{activity.actorRole}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                              {activity.previousStatus && activity.newStatus && (
                                <div className="flex items-center gap-2 text-xs mt-1">
                                  <Badge variant="outline">{activity.previousStatus}</Badge>
                                  <ArrowRight className="h-3 w-3" />
                                  <Badge variant="outline">{activity.newStatus}</Badge>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {activity.timestamp && new Date(activity.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4 mt-4">
                  <ScrollArea className="h-[300px]">
                    {requestMessages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Send a message to communicate with the team</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requestMessages.slice().reverse().map((message) => (
                          <div 
                            key={message.id} 
                            className={`p-3 rounded-lg ${
                              message.senderPortal === 'federation' 
                                ? 'bg-primary/10 ml-8' 
                                : 'bg-muted mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-sm">{message.senderName}</span>
                              <span className="text-xs text-muted-foreground">
                                {message.createdAt && new Date(message.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {message.subject && (
                              <p className="text-sm font-medium">{message.subject}</p>
                            )}
                            <p className="text-sm">{message.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <Separator />
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message to the team..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 min-h-[80px]"
                      data-testid="input-admin-message"
                    />
                  </div>
                  <Button 
                    onClick={() => sendMessageMutation.mutate(newMessage)}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="w-full"
                    data-testid="button-send-admin-message"
                  >
                    {sendMessageMutation.isPending ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request. The team will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2"
                  data-testid="input-rejection-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedRequest && rejectionReason) {
                    rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason });
                  }
                }}
                disabled={!rejectionReason || rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fee Rule</DialogTitle>
              <DialogDescription>
                Set a custom fee for requests from a specific country.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="fee-country">Country</Label>
                <Input
                  id="fee-country"
                  placeholder="e.g. United Kingdom, Spain, Germany"
                  value={newFee.country}
                  onChange={(e) => setNewFee({ ...newFee, country: e.target.value })}
                  className="mt-2"
                  data-testid="input-fee-country"
                />
              </div>
              <div>
                <Label htmlFor="fee-amount">Base Fee (USD)</Label>
                <Input
                  id="fee-amount"
                  type="number"
                  placeholder="0"
                  value={newFee.baseFee}
                  onChange={(e) => setNewFee({ ...newFee, baseFee: Number(e.target.value) })}
                  className="mt-2"
                  data-testid="input-fee-amount"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Total fee will be ${newFee.baseFee + PLATFORM_SERVICE_CHARGE} (includes ${PLATFORM_SERVICE_CHARGE} platform charge)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFeeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast({ title: "Fee rule added", description: `New fee rule for ${newFee.country} created` });
                  setIsFeeDialogOpen(false);
                  setNewFee({ country: "", baseFee: 0, currency: "USD" });
                }}
                disabled={!newFee.country || newFee.baseFee < 0}
                data-testid="button-save-fee"
              >
                Save Fee Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Issue Letter Dialog */}
        <Dialog open={isIssueDialogOpen} onOpenChange={(open) => { setIsIssueDialogOpen(open); if (!open) setUploadedDocument(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Issue Federation Letter
              </DialogTitle>
              <DialogDescription>
                Upload the signed federation letter document for {selectedRequest?.athleteFullName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  uploadedDocument ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-muted-foreground/30 hover:border-primary"
                }`}
                onClick={() => document.getElementById("issue-file-input")?.click()}
              >
                <input
                  id="issue-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadedDocument(file);
                  }}
                  data-testid="input-issue-file"
                />
                {uploadedDocument ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileCheck className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{uploadedDocument.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedDocument.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload the signed federation letter
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, or DOCX (max 10MB)
                    </p>
                  </>
                )}
              </div>
              {uploadedDocument && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setUploadedDocument(null)}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove File
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsIssueDialogOpen(false); setUploadedDocument(null); }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedRequest && uploadedDocument) {
                    issueMutation.mutate({
                      id: selectedRequest.id,
                      file: uploadedDocument,
                    });
                    setIsIssueDialogOpen(false);
                    setUploadedDocument(null);
                  }
                }}
                disabled={!uploadedDocument || issueMutation.isPending}
                data-testid="button-confirm-issue"
              >
                {issueMutation.isPending ? <LoadingSpinner /> : (
                  <>
                    <FileCheck className="h-4 w-4 mr-1" />
                    Issue Letter
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
