import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import type { PlayerDocument } from "@shared/schema";

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
    </div>
  );
}
