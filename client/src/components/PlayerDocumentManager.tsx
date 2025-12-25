import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, Plus, History, Shield, RotateCcw, Eye, Download, Pencil, X } from "lucide-react";
import type { PlayerDocument, DocumentVersion, DocumentAuditLog } from "@shared/schema";
import { format } from "date-fns";

interface DocumentDetailsDialogProps {
  document: PlayerDocument;
  playerId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  getDocumentTypeLabel: (type: string) => string;
}

function DocumentDetailsDialog({ document, playerId, isOpen, onOpenChange, getDocumentTypeLabel }: DocumentDetailsDialogProps) {
  const { toast } = useToast();
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: versions = [], isLoading: versionsLoading } = useQuery<DocumentVersion[]>({
    queryKey: ['/api/players', playerId, 'documents', document.id, 'versions'],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/documents/${document.id}/versions`);
      if (!res.ok) throw new Error('Failed to fetch versions');
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<DocumentAuditLog[]>({
    queryKey: ['/api/players', playerId, 'documents', document.id, 'audit-logs'],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/documents/${document.id}/audit-logs`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    enabled: isOpen,
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ versionId }: { versionId: string }) => {
      await apiRequest("POST", `/api/players/${playerId}/documents/${document.id}/versions/${versionId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'documents', document.id, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'documents', document.id, 'audit-logs'] });
      toast({ title: "Version restored successfully" });
    },
    onError: () => {
      toast({ title: "Failed to restore version", variant: "destructive" });
    },
  });

  const handleNewVersionUpload = async () => {
    if (!newVersionFile || !changeReason) {
      toast({
        title: "Missing information",
        description: "Please select a file and provide a reason for the update",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch("/api/object-storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: newVersionFile.name,
          contentType: newVersionFile.type,
          folder: `.private/player-documents/${playerId}`,
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { url, objectPath, storageKey } = await presignRes.json();

      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": newVersionFile.type },
        body: newVersionFile,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      await apiRequest("POST", `/api/players/${playerId}/documents/${document.id}/versions`, {
        originalName: newVersionFile.name,
        mimeType: newVersionFile.type,
        fileSize: newVersionFile.size,
        storageKey,
        objectPath,
        changeReason,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/documents`] });
      queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'documents', document.id, 'versions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'documents', document.id, 'audit-logs'] });
      toast({ title: "New version uploaded successfully" });
      setNewVersionFile(null);
      setChangeReason("");
      setIsNewVersionOpen(false);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "viewed":
        return <Eye className="h-4 w-4 text-blue-600" />;
      case "downloaded":
        return <Download className="h-4 w-4 text-blue-600" />;
      case "updated":
      case "version_created":
        return <Pencil className="h-4 w-4 text-amber-600" />;
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-600" />;
      case "deleted":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "restored":
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatActionLabel = (action: string) => {
    return action.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {getDocumentTypeLabel(document.documentType)}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="versions" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="versions" className="flex items-center gap-2" data-testid="tab-versions">
              <History className="h-4 w-4" />
              Version History
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2" data-testid="tab-audit">
              <Shield className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="versions" className="mt-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="text-sm text-muted-foreground">
                {versionsLoading ? "Loading..." : `${versions.length} version${versions.length !== 1 ? "s" : ""} available`}
              </p>
              <Dialog open={isNewVersionOpen} onOpenChange={setIsNewVersionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-upload-new-version">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Version
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload New Version</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>New Document File</Label>
                      <div className="border-2 border-dashed rounded-md p-4 text-center">
                        <input
                          type="file"
                          id="newVersionFile"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setNewVersionFile(file);
                          }}
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          data-testid="input-new-version-file"
                        />
                        <label htmlFor="newVersionFile" className="cursor-pointer">
                          {newVersionFile ? (
                            <div className="flex items-center justify-center gap-2">
                              <FileText className="h-5 w-5" />
                              <span className="text-sm">{newVersionFile.name}</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Click to select file</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="changeReason">Reason for Update</Label>
                      <Textarea
                        id="changeReason"
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="Describe why this document is being updated..."
                        data-testid="textarea-change-reason"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsNewVersionOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleNewVersionUpload} 
                        disabled={uploading || !newVersionFile || !changeReason}
                        data-testid="button-submit-new-version"
                      >
                        {uploading ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {versions.map((version) => (
                  <Card key={version.id} className="p-3" data-testid={`card-version-${version.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={version.isCurrent ? "default" : "secondary"}>
                            v{version.versionNumber}
                          </Badge>
                          {version.isCurrent && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1">{version.originalName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {version.changeReason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {version.createdAt ? format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
                        </p>
                      </div>
                      {!version.isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreVersionMutation.mutate({ versionId: version.id })}
                          disabled={restoreVersionMutation.isPending}
                          data-testid={`button-restore-${version.id}`}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                {versions.length === 0 && !versionsLoading && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No version history available
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="audit" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {auditLoading ? "Loading..." : "Complete history of all actions taken on this document"}
            </p>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`audit-log-${log.id}`}
                  >
                    <div className="mt-0.5">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{formatActionLabel(log.action)}</span>
                        <span className="text-xs text-muted-foreground">
                          by {log.actorName || "Unknown User"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp ? format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm:ss a") : "Unknown date"}
                      </p>
                      {log.actorRole && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {log.actorRole}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && !auditLoading && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No audit trail available
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface PlayerDocumentManagerProps {
  playerId: string;
  playerName: string;
}

const DOCUMENT_TYPES = [
  { value: "passport", label: "International Passport" },
  { value: "national_id", label: "National ID Card" },
  { value: "birth_certificate", label: "Birth Certificate" },
];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function PlayerDocumentManager({ playerId, playerName }: PlayerDocumentManagerProps) {
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PlayerDocument | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: documents = [], isLoading } = useQuery<PlayerDocument[]>({
    queryKey: [`/api/players/${playerId}/documents`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("DELETE", `/api/players/${playerId}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/documents`] });
      toast({ title: "Document deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("POST", `/api/players/${playerId}/documents/${docId}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/documents`] });
      toast({ title: "Document verified successfully" });
    },
    onError: () => {
      toast({ title: "Failed to verify document", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, JPEG, PNG, or WebP file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      toast({
        title: "Missing information",
        description: "Please select a document type and file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const presignRes = await fetch("/api/object-storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type,
          folder: `.private/player-documents/${playerId}`,
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { url, objectPath, storageKey } = await presignRes.json();

      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      await apiRequest("POST", `/api/players/${playerId}/documents`, {
        documentType: selectedType,
        originalName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        storageKey,
        objectPath,
        documentNumber: documentNumber || undefined,
        issuingCountry: issuingCountry || undefined,
        expiryDate: expiryDate || undefined,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/documents`] });
      toast({ title: "Document uploaded successfully" });
      resetForm();
      setIsUploadOpen(false);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedType("");
    setSelectedFile(null);
    setDocumentNumber("");
    setIssuingCountry("");
    setExpiryDate("");
  };

  const openDocumentDetails = (doc: PlayerDocument) => {
    setSelectedDoc(doc);
    setIsDetailsOpen(true);
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Identity Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload and manage passport, national ID, and birth certificate for {playerName}
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-document">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Identity Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Document File</Label>
                <div className="border-2 border-dashed rounded-md p-4 text-center">
                  <input
                    type="file"
                    id="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    data-testid="input-file"
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5" />
                        <span className="text-sm">{selectedFile.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to select file (PDF, JPEG, PNG)
                        </p>
                        <p className="text-xs text-muted-foreground">Max 10MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Document Number</Label>
                  <Input
                    id="documentNumber"
                    value={documentNumber}
                    onChange={e => setDocumentNumber(e.target.value)}
                    placeholder="e.g., AB1234567"
                    data-testid="input-document-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuingCountry">Issuing Country</Label>
                  <Input
                    id="issuingCountry"
                    value={issuingCountry}
                    onChange={e => setIssuingCountry(e.target.value)}
                    placeholder="e.g., United Kingdom"
                    data-testid="input-issuing-country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date (if applicable)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  data-testid="input-expiry-date"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile || !selectedType} data-testid="button-submit-upload">
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No documents uploaded yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload passport, national ID, or birth certificate to complete the player profile
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <Card key={doc.id} className="p-4" data-testid={`card-document-${doc.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{getDocumentTypeLabel(doc.documentType)}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={doc.originalName}>
                      {doc.originalName}
                    </p>
                  </div>
                </div>
                {getStatusIcon(doc.verificationStatus || "pending")}
              </div>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {doc.documentNumber && (
                  <p>Number: {doc.documentNumber}</p>
                )}
                {doc.issuingCountry && (
                  <p>Country: {doc.issuingCountry}</p>
                )}
                {doc.expiryDate && (
                  <p>Expires: {doc.expiryDate}</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                {getStatusBadge(doc.verificationStatus || "pending")}
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openDocumentDetails(doc)}
                    title="View details"
                    data-testid={`button-details-${doc.id}`}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {doc.verificationStatus === "pending" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => verifyMutation.mutate(doc.id)}
                      disabled={verifyMutation.isPending}
                      title="Verify document"
                      data-testid={`button-verify-${doc.id}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete document"
                    data-testid={`button-delete-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocumentDetailsDialog
          document={selectedDoc}
          playerId={playerId}
          isOpen={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          getDocumentTypeLabel={getDocumentTypeLabel}
        />
      )}
    </div>
  );
}
