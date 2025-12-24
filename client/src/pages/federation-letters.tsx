import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTokenBalance, useCheckTokens } from "@/hooks/use-tokens";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { 
  FileText, Upload, Plus, Calendar, Globe, Building2, User, CheckCircle, Clock, 
  AlertCircle, Download, Eye, Trash2, CreditCard, Send, FileCheck, X,
  RefreshCw, Filter, Search, DollarSign, Receipt, MessageCircle, History, ArrowRight, Loader2, Coins
} from "lucide-react";
import { z } from "zod";
import type { Player, PlayerMetrics, FederationLetterRequest, PlayerDocument, FederationRequestActivity, FederationRequestMessage, FederationIssuedDocument } from "@shared/schema";

const federationLetterRequestSchema = z.object({
  playerId: z.string().min(1, "Please select a player"),
  federationName: z.string().optional(),
  federationCountry: z.string().optional(),
  athleteFullName: z.string().min(2, "Athlete name is required"),
  athleteNationality: z.string().min(2, "Nationality is required"),
  athleteDateOfBirth: z.string().optional(),
  athletePosition: z.string().optional(),
  targetClubName: z.string().min(2, "Target club name is required"),
  targetClubCountry: z.string().min(2, "Target country is required"),
  transferType: z.string().min(1, "Transfer type is required"),
  passportDocumentId: z.string().optional(),
  requestPurpose: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type FederationLetterFormData = z.infer<typeof federationLetterRequestSchema>;

interface FederationRequestWithPlayer extends FederationLetterRequest {
  player?: Player;
  passportDocument?: PlayerDocument;
}

const TRANSFER_TYPES = [
  { value: "permanent", label: "Permanent Transfer" },
  { value: "loan", label: "Loan" },
  { value: "trial", label: "Trial Period" },
  { value: "youth_transfer", label: "Youth Transfer" },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", 
  "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Benin", "Bolivia", 
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", 
  "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominican Republic", "DR Congo", "Ecuador", "Egypt", "El Salvador", 
  "England", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", 
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Guinea", 
  "Guinea-Bissau", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", 
  "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", 
  "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", 
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", 
  "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", 
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", 
  "Niger", "Nigeria", "North Korea", "North Macedonia", "Northern Ireland", "Norway", "Oman", 
  "Pakistan", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", 
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "San Marino", "Saudi Arabia", "Scotland", 
  "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa", 
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", 
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", 
  "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates", "United States", "Uruguay", "Uzbekistan", 
  "Vatican City", "Venezuela", "Vietnam", "Wales", "Yemen", "Zambia", "Zimbabwe"
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Send },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: RefreshCw },
  issued: { label: "Issued", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertCircle },
};

export default function FederationLettersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FederationRequestWithPlayer | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [uploadedInvitationLetter, setUploadedInvitationLetter] = useState<File | null>(null);
  const [uploadedPassport, setUploadedPassport] = useState<File | null>(null);
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<string>("details");
  const [newMessage, setNewMessage] = useState("");
  const [isUploadingInvitation, setIsUploadingInvitation] = useState(false);
  const { toast } = useToast();
  
  const { data: tokenBalance } = useTokenBalance();
  const { canAfford, getCost } = useCheckTokens("team");
  const federationLetterCost = getCost("federation_letter_request");

  const onDropInvitation = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedInvitationLetter(acceptedFiles[0]);
    }
  }, []);

  const onDropPassport = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedPassport(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps: getInvitationRootProps, getInputProps: getInvitationInputProps, isDragActive: isInvitationDragActive } = useDropzone({
    onDrop: onDropInvitation,
    accept: { 
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"]
    },
    maxFiles: 1,
  });

  const { getRootProps: getPassportRootProps, getInputProps: getPassportInputProps, isDragActive: isPassportDragActive } = useDropzone({
    onDrop: onDropPassport,
    accept: { 
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"]
    },
    maxFiles: 1,
  });

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<FederationRequestWithPlayer[]>({
    queryKey: ["/api/federation-letter-requests"],
    refetchInterval: 5000,
  });

  const { data: summary } = useQuery<{
    total: number;
    pending: number;
    submitted: number;
    processing: number;
    issued: number;
    rejected: number;
  }>({
    queryKey: ["/api/federation-letter-requests/summary"],
    refetchInterval: 5000,
  });

  const form = useForm<FederationLetterFormData>({
    resolver: zodResolver(federationLetterRequestSchema),
    defaultValues: {
      playerId: "",
      federationName: "",
      federationCountry: "",
      athleteFullName: "",
      athleteNationality: "",
      athleteDateOfBirth: "",
      athletePosition: "",
      targetClubName: "",
      targetClubCountry: "",
      transferType: "permanent",
      passportDocumentId: "",
      requestPurpose: "",
      additionalNotes: "",
    },
  });

  const selectedPlayerId = form.watch("playerId");

  const { data: playerDocuments = [] } = useQuery<PlayerDocument[]>({
    queryKey: ["/api/players", selectedPlayerId, "documents"],
    enabled: !!selectedPlayerId,
  });

  const { data: playerMetrics } = useQuery<PlayerMetrics[]>({
    queryKey: ["/api/players", selectedPlayerId, "metrics"],
    enabled: !!selectedPlayerId,
  });

  const passportDocuments = playerDocuments.filter(
    (doc) => doc.documentType === "passport"
  );

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const { data: requestActivities = [] } = useQuery<FederationRequestActivity[]>({
    queryKey: ["/api/federation-requests", selectedRequest?.id, "activities"],
    enabled: !!selectedRequest?.id && isViewDialogOpen,
  });

  const { data: requestMessages = [] } = useQuery<FederationRequestMessage[]>({
    queryKey: ["/api/federation-requests", selectedRequest?.id, "messages"],
    enabled: !!selectedRequest?.id && isViewDialogOpen,
  });

  const { data: issuedDocuments = [] } = useQuery<FederationIssuedDocument[]>({
    queryKey: ["/api/federation-requests", selectedRequest?.id, "issued-documents"],
    enabled: !!selectedRequest?.id && isViewDialogOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/federation-requests/${selectedRequest?.id}/messages`, {
        content,
        senderName: "Team User",
        recipientPortal: "federation",
      });
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the federation.",
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/federation-requests", selectedRequest?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-requests", selectedRequest?.id, "activities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FederationLetterFormData) => {
      let passportDocId = data.passportDocumentId;
      let invitationStorageKey: string | undefined;
      let invitationObjectPath: string | undefined;
      let invitationOriginalName: string | undefined;
      
      // Upload passport if provided
      if (uploadedPassport && selectedPlayerId) {
        setIsUploadingPassport(true);
        try {
          const uploadUrlRes = await apiRequest("GET", "/api/object-storage/upload-url?folder=.private&contentType=" + encodeURIComponent(uploadedPassport.type));
          const { signedUrl, key, objectPath } = await uploadUrlRes.json();
          
          await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": uploadedPassport.type },
            body: uploadedPassport,
          });
          
          const docRes = await apiRequest("POST", `/api/players/${selectedPlayerId}/documents`, {
            documentType: "passport",
            originalName: uploadedPassport.name,
            mimeType: uploadedPassport.type,
            fileSize: uploadedPassport.size,
            storageKey: key,
            objectPath,
          });
          const newDoc = await docRes.json();
          passportDocId = newDoc.id;
        } finally {
          setIsUploadingPassport(false);
        }
      }
      
      // Upload invitation letter (required)
      if (uploadedInvitationLetter) {
        setIsUploadingInvitation(true);
        try {
          const uploadUrlRes = await apiRequest("GET", "/api/object-storage/upload-url?folder=.private&contentType=" + encodeURIComponent(uploadedInvitationLetter.type));
          const { signedUrl, key, objectPath } = await uploadUrlRes.json();
          
          await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": uploadedInvitationLetter.type },
            body: uploadedInvitationLetter,
          });
          
          invitationStorageKey = key;
          invitationObjectPath = objectPath;
          invitationOriginalName = uploadedInvitationLetter.name;
        } finally {
          setIsUploadingInvitation(false);
        }
      }
      
      // Spend tokens for creating federation letter request
      const tokenResponse = await apiRequest("POST", "/api/tokens/spend", {
        action: "federation_letter_request",
        playerId: selectedPlayerId,
      });
      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error || "Failed to spend tokens");
      }
      
      const response = await apiRequest("POST", "/api/federation-letter-requests", {
        ...data,
        passportDocumentId: passportDocId,
        invitationLetterStorageKey: invitationStorageKey,
        invitationLetterObjectPath: invitationObjectPath,
        invitationLetterOriginalName: invitationOriginalName,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Created",
        description: `Your federation letter request has been created. ${federationLetterCost} tokens have been deducted.`,
      });
      form.reset();
      setUploadedInvitationLetter(null);
      setUploadedPassport(null);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/federation-letter-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players", selectedPlayerId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;
      const response = await apiRequest("POST", `/api/federation-letter-requests/${requestId}/confirm-payment`, {
        paymentId,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Confirmed",
        description: "Your payment has been processed. The request will now be submitted for processing.",
      });
      setIsPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/federation-letter-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("POST", `/api/federation-letter-requests/${requestId}/submit`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your federation letter request has been submitted for processing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-letter-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("DELETE", `/api/federation-letter-requests/${requestId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Deleted",
        description: "The federation letter request has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/federation-letter-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FederationLetterFormData) => {
    // Validate passport is provided (either uploaded or selected existing)
    const hasPassport = uploadedPassport || data.passportDocumentId;
    if (!hasPassport) {
      toast({
        title: "Passport Required",
        description: "Please upload a passport or select an existing one.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate invitation letter is uploaded
    if (!uploadedInvitationLetter) {
      toast({
        title: "Invitation Letter Required",
        description: "Please upload an invitation letter from the target club.",
        variant: "destructive",
      });
      return;
    }
    
    // Check token balance
    if (!canAfford("federation_letter_request")) {
      toast({
        title: "Insufficient Tokens",
        description: `You need ${federationLetterCost} tokens to create a federation letter request. Your balance: ${tokenBalance?.balance || 0} tokens.`,
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(data);
  };

  const handlePlayerSelect = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (player) {
      form.setValue("playerId", playerId);
      form.setValue("athleteFullName", `${player.firstName} ${player.lastName}`);
      form.setValue("athleteNationality", player.nationality || "");
      form.setValue("athleteDateOfBirth", player.dateOfBirth || "");
      form.setValue("athletePosition", player.position || "");
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      req.athleteFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.targetClubName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const latestMetrics = playerMetrics?.[0];

  if (playersLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Federation Letter Requests
            </h1>
            <p className="text-muted-foreground">
              Request official letters from football federations for player transfers and clearances
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">{summary?.total || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="stat-pending">{(summary?.pending || 0) + (summary?.submitted || 0)}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="stat-processing">{summary?.processing || 0}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Issued Letters</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-issued">{summary?.issued || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    className="pl-8 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {filteredRequests.length} requests
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Requests Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first federation letter request to get started"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Request
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-2 flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-medium" data-testid={`text-request-number-${request.id}`}>
                                {request.requestNumber}
                              </span>
                              {getStatusBadge(request.status)}
                              {request.paymentStatus === "unpaid" && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Payment Required
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold">{request.athleteFullName}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                {request.athleteNationality}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {request.targetClubName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(request.createdAt!).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {request.status === "pending" && request.paymentStatus === "unpaid" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsPaymentDialogOpen(true);
                                }}
                                data-testid={`button-pay-${request.id}`}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay ${request.totalAmount}
                              </Button>
                            )}
                            {request.status === "pending" && request.paymentStatus === "paid" && (
                              <Button
                                size="sm"
                                onClick={() => submitMutation.mutate(request.id)}
                                disabled={submitMutation.isPending}
                                data-testid={`button-submit-${request.id}`}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Submit
                              </Button>
                            )}
                            {request.status === "issued" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsViewDialogOpen(true);
                                }}
                                data-testid={`button-download-${request.id}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                View Documents
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsViewDialogOpen(true);
                              }}
                              data-testid={`button-view-${request.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "pending" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(request.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${request.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                New Federation Letter Request
              </DialogTitle>
              <DialogDescription>
                Submit a request for an official federation clearance letter for player transfer or registration
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="player" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="player">Player</TabsTrigger>
                    <TabsTrigger value="transfer">Transfer Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="player" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="playerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Player</FormLabel>
                          <Select onValueChange={handlePlayerSelect} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-player">
                                <SelectValue placeholder="Choose a player" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {players.map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  {player.firstName} {player.lastName} - {player.position}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedPlayer && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Player Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <p className="font-medium">{selectedPlayer.firstName} {selectedPlayer.lastName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Position:</span>
                            <p className="font-medium">{selectedPlayer.position}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Nationality:</span>
                            <p className="font-medium">{selectedPlayer.nationality}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date of Birth:</span>
                            <p className="font-medium">{selectedPlayer.dateOfBirth || "Not specified"}</p>
                          </div>
                          {latestMetrics && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Games Played:</span>
                                <p className="font-medium">{latestMetrics.gamesPlayed || 0}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Goals:</span>
                                <p className="font-medium">{latestMetrics.goals || 0}</p>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="athleteFullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name (as on passport)</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-athlete-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="athleteNationality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationality</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-nationality" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="transfer" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="targetClubName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Club Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Manchester City" data-testid="input-target-club" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="targetClubCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Country</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-target-country">
                                  <SelectValue placeholder="Select target country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="transferType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transfer Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-transfer-type">
                                <SelectValue placeholder="Select transfer type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TRANSFER_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="federationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Federation Name (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Nigerian Football Federation" data-testid="input-federation-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="federationCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Federation Country</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-federation-country">
                                  <SelectValue placeholder="Select federation country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="requestPurpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose of Request</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Describe the reason for this federation letter request..."
                              className="min-h-[80px]"
                              data-testid="textarea-purpose"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-4">
                    <FormField
                      control={form.control}
                      name="passportDocumentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Existing Passport (or upload below) <span className="text-destructive">*</span></FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value && value !== "none") {
                                setUploadedPassport(null);
                              }
                            }} 
                            value={uploadedPassport ? "" : field.value}
                            disabled={!!uploadedPassport}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-passport">
                                <SelectValue placeholder={uploadedPassport ? "Using uploaded passport" : "Select from player's documents"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {passportDocuments.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No passports on file - upload one below
                                </SelectItem>
                              ) : (
                                passportDocuments.map((doc) => (
                                  <SelectItem key={doc.id} value={doc.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{doc.originalName}</span>
                                      {doc.issuingCountry && <span className="text-muted-foreground">({doc.issuingCountry})</span>}
                                      {doc.verificationStatus === "verified" ? (
                                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>
                                      ) : doc.verificationStatus === "pending" ? (
                                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Unverified</Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Choose an existing passport from the player's profile or upload a new one below</p>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Upload New Passport</FormLabel>
                      <div
                        {...getPassportRootProps()}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                          isPassportDragActive
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                      >
                        <input {...getPassportInputProps()} data-testid="input-passport-upload" />
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        {uploadedPassport ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileCheck className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-medium">{uploadedPassport.name}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedPassport(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Or drag and drop a new passport to upload
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel>Invitation Letter <span className="text-destructive">*</span></FormLabel>
                      <div
                        {...getInvitationRootProps()}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                          isInvitationDragActive
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                      >
                        <input {...getInvitationInputProps()} data-testid="input-invitation-letter" />
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        {uploadedInvitationLetter ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileCheck className="h-4 w-4 text-green-600" />
                            <p className="text-sm font-medium">{uploadedInvitationLetter.name}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedInvitationLetter(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Drag and drop an invitation letter, or click to browse
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, or PNG</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Any additional information for the federation..."
                              className="min-h-[80px]"
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <h4 className="font-semibold">Cost Summary</h4>
                            <p className="text-sm text-muted-foreground">Token cost for creating request</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2 text-sm">
                              <span className="text-muted-foreground">Request Creation:</span>
                              <span className="flex items-center gap-1">
                                <Coins className="h-4 w-4 text-yellow-600" />
                                {federationLetterCost} tokens
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex items-center justify-end gap-2 text-sm">
                              <span className="text-muted-foreground">Your Balance:</span>
                              <span className={`flex items-center gap-1 font-medium ${(tokenBalance?.balance || 0) < federationLetterCost ? 'text-destructive' : 'text-green-600'}`}>
                                <Coins className="h-4 w-4" />
                                {tokenBalance?.balance || 0} tokens
                              </span>
                            </div>
                            {(tokenBalance?.balance || 0) < federationLetterCost && (
                              <p className="text-xs text-destructive mt-1">Insufficient tokens</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || isUploadingPassport || isUploadingInvitation} data-testid="button-create-request">
                    {createMutation.isPending || isUploadingPassport || isUploadingInvitation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isUploadingPassport ? "Uploading Passport..." : isUploadingInvitation ? "Uploading Invitation..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Coins className="h-4 w-4 mr-2" />
                        Create Request ({federationLetterCost} tokens)
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) setViewTab("details"); }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                    {requestMessages.filter(m => !m.isRead && m.senderPortal === 'federation').length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1">
                        {requestMessages.filter(m => !m.isRead && m.senderPortal === 'federation').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(selectedRequest.status)}
                    {selectedRequest.paymentStatus === "paid" && (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Payment Confirmed
                      </Badge>
                    )}
                  </div>
                  <Separator />
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
                      <span className="text-muted-foreground">Total Amount:</span>
                      <p className="font-medium">${selectedRequest.totalAmount}</p>
                    </div>
                    {selectedRequest.federationName && (
                      <div>
                        <span className="text-muted-foreground">Federation:</span>
                        <p className="font-medium">{selectedRequest.federationName}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p className="font-medium">{new Date(selectedRequest.createdAt!).toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedRequest.requestPurpose && (
                    <div>
                      <span className="text-muted-foreground text-sm">Purpose:</span>
                      <p className="text-sm mt-1">{selectedRequest.requestPurpose}</p>
                    </div>
                  )}
                  {selectedRequest.rejectionReason && (
                    <Card className="border-destructive">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-semibold">Rejection Reason</span>
                        </div>
                        <p className="text-sm">{selectedRequest.rejectionReason}</p>
                      </CardContent>
                    </Card>
                  )}
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
                                {activity.activityType === 'document_downloaded' && <Download className="h-4 w-4" />}
                                {!['status_change', 'message_sent', 'document_issued', 'document_downloaded'].includes(activity.activityType) && <History className="h-4 w-4" />}
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
                        <p className="text-xs mt-1">Send a message to communicate with the federation</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requestMessages.slice().reverse().map((message) => (
                          <div 
                            key={message.id} 
                            className={`p-3 rounded-lg ${
                              message.senderPortal === 'team' 
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
                      placeholder="Type your message to the federation..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 min-h-[80px]"
                      data-testid="input-message"
                    />
                  </div>
                  <Button 
                    onClick={() => sendMessageMutation.mutate(newMessage)}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="w-full"
                    data-testid="button-send-message"
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

                <TabsContent value="documents" className="space-y-4 mt-4">
                  {issuedDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No documents issued yet</p>
                      <p className="text-xs mt-1">Documents will appear here once the federation issues them</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {issuedDocuments.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                  <FileCheck className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{doc.originalName}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{doc.documentType}</span>
                                    {doc.documentNumber && <span>#{doc.documentNumber}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Issued: {doc.createdAt && new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                                {doc.downloadCount !== null && doc.downloadCount > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Downloaded {doc.downloadCount} times
                                  </p>
                                )}
                                <div className="flex flex-col gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="default" 
                                    data-testid={`button-download-certificate-${doc.id}`}
                                    onClick={() => {
                                      window.open(`/api/federation-requests/${selectedRequest?.id}/issued-documents/${doc.id}/download-file`, '_blank');
                                      toast({
                                        title: "Certificate Downloaded",
                                        description: "Platform certificate with timestamp downloaded",
                                      });
                                    }}
                                  >
                                    <FileCheck className="h-4 w-4 mr-1" />
                                    Certificate
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    data-testid={`button-download-original-${doc.id}`}
                                    onClick={() => {
                                      window.open(`/api/federation-requests/${selectedRequest?.id}/issued-documents/${doc.id}/download-original`, '_blank');
                                      toast({
                                        title: "Download Started",
                                        description: `Downloading original: ${doc.originalName}`,
                                      });
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Original
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Payment
              </DialogTitle>
              <DialogDescription>
                Pay the processing fee to submit your federation letter request
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Federation Fee</span>
                      <span>${selectedRequest.feeAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Charge</span>
                      <span>${selectedRequest.serviceCharge}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${selectedRequest.totalAmount}</span>
                    </div>
                  </CardContent>
                </Card>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => paymentMutation.mutate(selectedRequest.id)}
                    disabled={paymentMutation.isPending}
                    data-testid="button-confirm-payment"
                  >
                    {paymentMutation.isPending ? (
                      <>
                        <LoadingSpinner />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ${selectedRequest.totalAmount}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
