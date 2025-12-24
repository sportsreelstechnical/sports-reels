import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { FileText, User, Shield, Download, Clock, AlertTriangle, CheckCircle2, FileCheck, FileWarning, Eye } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import logoImage from "@assets/WhatsApp_Image_2025-12-17_at_12.49.33_1766008177672.jpeg";

interface DocumentVerification {
  verificationStatus: string;
  isSystemVerified: boolean;
  aiConfidence?: number;
  aiAnalysis?: string;
  systemVerificationNote?: string;
}

interface EmbassyDocument {
  id: string;
  type: "invitation_submission" | "compliance_document" | "transfer_report";
  player?: {
    id: string;
    firstName: string;
    lastName: string;
    nationality: string;
    position: string;
    dateOfBirth?: string;
    currentClubName?: string;
  };
  team?: {
    name: string;
    clubName: string;
    country: string;
  };
  invitationLetter?: {
    id: string;
    targetClubName: string;
    targetCountry: string;
    targetLeague: string;
    targetLeagueBand?: string;
    offerType: string;
    trialStartDate?: string;
    trialEndDate?: string;
    embassyNotifiedAt?: string;
    consularReportGenerated?: boolean;
    federationLetterRequestId?: string;
  };
  federationLetter?: {
    id: string;
    status: string;
    federationName?: string;
    letterUrl?: string;
    issuedAt?: string;
  };
  transferReport?: any;
  invitationVerification: DocumentVerification;
  federationLetterVerification?: DocumentVerification | null;
  notifiedAt?: string;
  status?: string;
  verification?: {
    status: string;
    verificationCode?: string;
  };
  documentType?: string;
  generatedAt?: string;
  dataRangeStart?: string;
  dataRangeEnd?: string;
  isExternalUpload?: boolean;
  requiresLocalVerification?: boolean;
  issuingClubCountry?: string | null;
}

function VerificationBadge({ verification, label }: { verification: DocumentVerification | null | undefined; label: string }) {
  if (!verification) return null;

  const isVerified = verification.isSystemVerified || verification.verificationStatus === "verified";
  const isPotentialFake = verification.verificationStatus === "potential_fake";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {isVerified ? (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </Badge>
      ) : isPotentialFake ? (
        <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Potential Fake
        </Badge>
      ) : (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )}
    </div>
  );
}

export default function EmbassyDashboard() {
  const { toast } = useToast();

  const { data: authData } = useQuery<{ user: any; embassyProfile: any }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: documents = [], isLoading } = useQuery<EmbassyDocument[]>({
    queryKey: ["/api/embassy/documents"],
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ documentType, documentId }: { documentType: string; documentId: string }) => {
      const response = await apiRequest("POST", "/api/embassy/documents/verify", { documentType, documentId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/embassy/documents"] });
      toast({
        title: "Verification Complete",
        description: "Document has been analyzed and verification status updated.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Could not verify document",
      });
    },
  });

  const downloadTransferReport = async (invitationId: string, playerName: string) => {
    try {
      const response = await fetch(`/api/embassy/transfer-report/${invitationId}/pdf`);
      if (!response.ok) throw new Error("Failed to fetch report data");
      
      const data = await response.json();
      
      const doc = new jsPDF();
      
      doc.setFillColor(180, 120, 160);
      doc.rect(0, 0, 210, 40, "F");
      
      try {
        doc.addImage(logoImage, "JPEG", 12, 5, 30, 30);
      } catch (e) {
        console.log("Logo could not be added to PDF");
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("SPORTS REELS", 48, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Official Transfer Compliance Report", 48, 28);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      const timestamp = new Date(data.timestamp || data.generatedAt);
      doc.text(`Report ID: ${data.reportId}`, 15, 48);
      doc.text(`Generated: ${timestamp.toLocaleDateString()} at ${timestamp.toLocaleTimeString()}`, 15, 53);
      doc.text(`Verification Code: ${data.verificationCode}`, 120, 48);
      
      let yPos = 63;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Player Profile Information", 15, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      const col1X = 15;
      const col2X = 110;
      
      doc.text(`Full Name: ${data.player.fullName}`, col1X, yPos);
      doc.text(`Nationality: ${data.player.nationality || "N/A"}`, col2X, yPos);
      yPos += 5;
      if (data.player.secondNationality) {
        doc.text(`Second Nationality: ${data.player.secondNationality}`, col1X, yPos);
        yPos += 5;
      }
      doc.text(`Date of Birth: ${data.player.dateOfBirth || "N/A"}`, col1X, yPos);
      doc.text(`Birth Place: ${data.player.birthPlace || "N/A"}`, col2X, yPos);
      yPos += 5;
      doc.text(`Position: ${data.player.position || "N/A"}`, col1X, yPos);
      if (data.player.secondaryPosition) {
        doc.text(`Secondary Position: ${data.player.secondaryPosition}`, col2X, yPos);
      }
      yPos += 5;
      doc.text(`Current Club: ${data.player.currentClub || "N/A"}`, col1X, yPos);
      if (data.player.jerseyNumber) {
        doc.text(`Jersey Number: ${data.player.jerseyNumber}`, col2X, yPos);
      }
      yPos += 5;
      const heightStr = data.player.height ? `${data.player.height} ${data.player.heightUnit || "cm"}` : "N/A";
      const weightStr = data.player.weight ? `${data.player.weight} ${data.player.weightUnit || "kg"}` : "N/A";
      doc.text(`Height: ${heightStr}`, col1X, yPos);
      doc.text(`Weight: ${weightStr}`, col2X, yPos);
      yPos += 5;
      doc.text(`Preferred Foot: ${data.player.preferredFoot || "N/A"}`, col1X, yPos);
      doc.text(`Market Value: ${data.player.marketValue ? `$${data.player.marketValue.toLocaleString()}` : "N/A"}`, col2X, yPos);
      yPos += 5;
      doc.text(`National Team Caps: ${data.player.nationalTeamCaps || 0}`, col1X, yPos);
      doc.text(`National Team Goals: ${data.player.nationalTeamGoals || 0}`, col2X, yPos);
      yPos += 5;
      doc.text(`International Caps: ${data.player.internationalCaps || 0}`, col1X, yPos);
      doc.text(`International Goals: ${data.player.internationalGoals || 0}`, col2X, yPos);
      yPos += 5;
      if (data.player.continentalGames) {
        doc.text(`Continental Games: ${data.player.continentalGames}`, col1X, yPos);
        yPos += 5;
      }
      if (data.player.contractEndDate) {
        doc.text(`Contract End Date: ${data.player.contractEndDate}`, col1X, yPos);
        yPos += 5;
      }
      if (data.player.agentName) {
        doc.text(`Agent: ${data.player.agentName}`, col1X, yPos);
        if (data.player.agentContact) {
          doc.text(`Agent Contact: ${data.player.agentContact}`, col2X, yPos);
        }
        yPos += 5;
      }
      
      if (data.performance) {
        yPos += 6;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Performance Statistics", 15, yPos);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Games Played: ${data.performance.gamesPlayed || 0}`, col1X, yPos);
        doc.text(`Goals: ${data.performance.goals || 0}`, col2X, yPos);
        yPos += 5;
        doc.text(`Assists: ${data.performance.assists || 0}`, col1X, yPos);
        doc.text(`Minutes Played: ${data.performance.minutes || 0}`, col2X, yPos);
        yPos += 5;
        if (data.performance.distanceCovered) {
          doc.text(`Distance Covered: ${data.performance.distanceCovered} km`, col1X, yPos);
        }
        if (data.performance.passAccuracy) {
          doc.text(`Pass Accuracy: ${data.performance.passAccuracy}%`, col2X, yPos);
        }
        if (data.performance.distanceCovered || data.performance.passAccuracy) {
          yPos += 5;
        }
        if (data.performance.aerialDuelsWon) {
          doc.text(`Aerial Duels Won: ${data.performance.aerialDuelsWon}`, col1X, yPos);
          yPos += 5;
        }
      }
      
      yPos += 6;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Transfer Details", 15, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Target Club: ${data.targetClub.name}`, col1X, yPos);
      doc.text(`Country: ${data.targetClub.country}`, col2X, yPos);
      yPos += 5;
      doc.text(`League: ${data.targetClub.league || "N/A"}`, col1X, yPos);
      doc.text(`League Band: ${data.targetClub.leagueBand || "N/A"}`, col2X, yPos);
      yPos += 5;
      doc.text(`Offer Type: ${data.offerDetails.type || "N/A"}`, col1X, yPos);
      yPos += 5;
      if (data.offerDetails.trialStartDate) {
        doc.text(`Trial Period: ${data.offerDetails.trialStartDate} - ${data.offerDetails.trialEndDate || "N/A"}`, col1X, yPos);
        yPos += 5;
      }
      if (data.offerDetails.scoutAgent) {
        doc.text(`Scout/Agent: ${data.offerDetails.scoutAgent}`, col1X, yPos);
        yPos += 5;
      }
      if (data.sourceTeam) {
        doc.text(`Source Team: ${data.sourceTeam.clubName || data.sourceTeam.name} (${data.sourceTeam.country})`, col1X, yPos);
        yPos += 5;
      }
      
      if (data.eligibility && data.eligibility.length > 0) {
        yPos += 6;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Visa Eligibility Assessment", 15, yPos);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        data.eligibility.forEach((score: any) => {
          const statusText = score.status === "eligible" ? "ELIGIBLE" : score.status === "conditional" ? "CONDITIONAL" : "INELIGIBLE";
          doc.text(`${score.visaType}: ${score.score}% - ${statusText}`, col1X, yPos);
          yPos += 5;
        });
      }
      
      yPos += 6;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Compliance Verification", 15, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Verification Status: ${data.compliance?.verificationStatus || "Pending"}`, col1X, yPos);
      yPos += 5;
      if (data.compliance?.federationName) {
        doc.text(`Federation: ${data.compliance.federationName}`, col1X, yPos);
        yPos += 5;
      }
      doc.text(`Videos on File: ${data.videosCount}`, col1X, yPos);
      yPos += 5;
      
      yPos += 8;
      doc.setFillColor(240, 240, 240);
      doc.rect(12, yPos - 3, 186, 25, "F");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const auditNote = data.compliance?.auditNote || 
        "This document has been generated by Sports Reels compliance system for official visa processing purposes.";
      const splitAudit = doc.splitTextToSize(auditNote, 180);
      doc.text(splitAudit, 15, yPos + 2);
      
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("SPORTS REELS - Official Transfer Compliance Report | Verify at sportsreels.com/verify", 105, 290, { align: "center" });
      doc.text(`Document generated: ${timestamp.toISOString()}`, 105, 294, { align: "center" });
      
      doc.save(`Transfer_Report_${playerName.replace(/\s/g, "_")}.pdf`);
      
      toast({
        title: "Report Downloaded",
        description: "Transfer report PDF has been generated and downloaded.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Could not generate PDF report",
      });
    }
  };

  const invitationDocs = documents.filter(d => d.type === "invitation_submission" || d.type === "transfer_report");
  const complianceDocs = documents.filter(d => d.type === "compliance_document");
  
  const verifiedDocs = invitationDocs.filter(d => 
    d.invitationVerification?.isSystemVerified || 
    d.federationLetterVerification?.isSystemVerified
  );
  const pendingDocs = invitationDocs.filter(d => 
    !d.invitationVerification?.isSystemVerified && 
    (!d.federationLetterVerification || !d.federationLetterVerification.isSystemVerified)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <img 
          src={logoImage} 
          alt="Sports Reels" 
          className="h-12 w-12 object-contain rounded-md"
        />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Embassy Document Portal</h1>
          <p className="text-muted-foreground">
            View-only access to player compliance documents for {authData?.embassyProfile?.country || "your jurisdiction"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{invitationDocs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingDocs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{verifiedDocs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Legacy Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{complianceDocs.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Player Transfer Submissions
        </h2>
        
        {invitationDocs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transfer submissions available for your jurisdiction.</p>
              <p className="text-sm text-muted-foreground mt-2">Teams will notify you when players require visa processing.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {invitationDocs.map((doc) => (
              <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {doc.player?.firstName} {doc.player?.lastName}
                        </CardTitle>
                        <CardDescription>
                          {doc.player?.nationality} - {doc.player?.position} 
                          {doc.player?.currentClubName && ` | ${doc.player.currentClubName}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.isExternalUpload ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
                          <FileWarning className="h-3 w-3" />
                          External Upload
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1">
                          <FileCheck className="h-3 w-3" />
                          Federation Verified
                        </Badge>
                      )}
                      <VerificationBadge verification={doc.invitationVerification} label="Invitation" />
                      {doc.federationLetter && (
                        <VerificationBadge verification={doc.federationLetterVerification} label="Federation" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Target Club</p>
                      <p className="font-medium">{doc.invitationLetter?.targetClubName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">League / Band</p>
                      <p className="font-medium">
                        {doc.invitationLetter?.targetLeague} {doc.invitationLetter?.targetLeagueBand && `(${doc.invitationLetter.targetLeagueBand})`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Offer Type</p>
                      <p className="font-medium capitalize">{doc.invitationLetter?.offerType?.replace(/_/g, " ") || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Notified On</p>
                      <p className="font-medium">
                        {doc.notifiedAt ? new Date(doc.notifiedAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>

                  {doc.federationLetter && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Federation Letter</span>
                        {doc.federationLetter.status === "issued" && (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                            Issued
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.federationLetter.federationName && `From: ${doc.federationLetter.federationName}`}
                        {doc.federationLetter.issuedAt && ` | Issued: ${new Date(doc.federationLetter.issuedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  )}

                  {doc.isExternalUpload && (
                    <div className="bg-blue-500/10 border border-blue-200 rounded-md p-3">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium text-sm">External Upload - Needs Issuing Club Verification</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        This document was uploaded externally (not through federation workflow). 
                        Please contact <strong>{doc.team?.clubName || doc.team?.name || "the issuing club"}</strong>{doc.issuingClubCountry && ` in ${doc.issuingClubCountry}`} to verify authenticity before processing.
                      </p>
                    </div>
                  )}

                  {(doc.invitationVerification?.verificationStatus === "potential_fake" || 
                    doc.federationLetterVerification?.verificationStatus === "potential_fake") && (
                    <div className="bg-amber-500/10 border border-amber-200 rounded-md p-3">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium text-sm">AI Flagged - Manual Verification Required</span>
                      </div>
                      <p className="text-sm text-amber-600 mt-1">
                        Our AI system has flagged this document as potentially requiring additional verification. 
                        Please manually verify authenticity before processing.
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>All access is logged and timestamped</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => verifyMutation.mutate({ 
                          documentType: "invitation_letter", 
                          documentId: doc.invitationLetter?.id || doc.id 
                        })}
                        disabled={verifyMutation.isPending}
                        data-testid={`button-verify-${doc.id}`}
                      >
                        <FileWarning className="mr-2 h-4 w-4" />
                        Run AI Verification
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => downloadTransferReport(doc.invitationLetter?.id || doc.id, `${doc.player?.firstName} ${doc.player?.lastName}`)}
                        data-testid={`button-download-${doc.id}`}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {complianceDocs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Legacy Compliance Documents
          </h2>
          
          <div className="grid gap-4">
            {complianceDocs.map((doc) => (
              <Card key={doc.id} data-testid={`card-legacy-${doc.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {doc.player?.firstName} {doc.player?.lastName}
                        </CardTitle>
                        <CardDescription>{doc.player?.nationality} - {doc.player?.position}</CardDescription>
                      </div>
                    </div>
                    <Badge 
                      variant={doc.verification?.status === "verified" ? "default" : "secondary"}
                      className={doc.verification?.status === "verified" 
                        ? "bg-green-500/10 text-green-600 border-green-200" 
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                      }
                    >
                      {doc.verification?.status === "verified" ? "Verified" : "Pending Review"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Document Type</p>
                      <p className="font-medium">{doc.documentType?.replace(/_/g, " ").toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Generated</p>
                      <p className="font-medium">
                        {doc.generatedAt ? new Date(doc.generatedAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data Range</p>
                      <p className="font-medium">
                        {doc.dataRangeStart && doc.dataRangeEnd 
                          ? `${new Date(doc.dataRangeStart).toLocaleDateString()} - ${new Date(doc.dataRangeEnd).toLocaleDateString()}`
                          : "N/A"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Verification Code</p>
                      <p className="font-medium font-mono">{doc.verification?.verificationCode || "Pending"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>All access is logged and timestamped</span>
                    </div>
                    <Link href={`/embassy/document/${doc.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-legacy-${doc.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Document
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
