import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, FileText, Download, Eye, Clock, Calendar, Send, Plus, Loader2, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusBadge from "@/components/StatusBadge";
import jsPDF from "jspdf";
import type { TransferReport, Player } from "@shared/schema";
import sportsReelsLogo from "@assets/WhatsApp_Image_2025-12-17_at_12.49.33_1766595809165.jpeg";

interface EnrichedReport extends TransferReport {
  playerName: string;
  playerPosition?: string;
}

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadLogoAsBase64 = async () => {
      try {
        const response = await fetch(sportsReelsLogo);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Failed to load logo:", error);
      }
    };
    loadLogoAsBase64();
  }, []);

  const { data: reports = [], isLoading: reportsLoading } = useQuery<EnrichedReport[]>({
    queryKey: ["/api/reports"],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: viewedReport, isLoading: viewLoading } = useQuery<EnrichedReport>({
    queryKey: ["/api/reports", viewReportId],
    enabled: !!viewReportId,
  });

  const generateMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const res = await apiRequest("POST", "/api/reports/generate", { playerId, reportType: "comprehensive" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.needsTokens ? `Insufficient tokens. ${data.error}` : data.error);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      setShowGenerateDialog(false);
      setSelectedPlayer("");
      toast({ title: "Report Generated", description: "Transfer report has been created successfully. 5 tokens spent." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report Deleted", description: "The report has been removed." });
    },
  });

  const notifyEmbassyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/reports/${id}/notify-embassy`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Embassy Notified", description: "The embassy has been notified about this report." });
    },
  });

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.playerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", label: "Pending" },
      completed: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Completed" },
      expired: { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Expired" },
    };
    return config[status] || config.pending;
  };

  const getEligibilityBadge = (status: string | null) => {
    if (!status) return { className: "bg-gray-100 text-gray-800", label: "N/A" };
    const config: Record<string, { className: string; label: string }> = {
      green: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Eligible" },
      yellow: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Conditional" },
      red: { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Ineligible" },
    };
    return config[status] || config.red;
  };

  const downloadPDF = (report: EnrichedReport) => {
    const doc = new jsPDF();
    const profile = report.playerProfile as Record<string, any> || {};
    const eligibility = report.eligibilityScores as Record<string, any> || {};
    const videos = (report.videosIncluded as any[] || []);
    const documents = (report.documentsIncluded as any[] || []);
    const invitations = (report.invitationLetters as any[] || []);
    const verifications = (report.embassyVerifications as any[] || []);
    const recommendations = (report.recommendations as string[] || []);
    const performance = (report.performanceStats as any[] || []);
    const international = (report.internationalCareer as any[] || []);

    let y = 20;
    const lineHeight = 7;
    const margin = 20;
    const pageWidth = 210;

    const addText = (text: string, size = 10, bold = false) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, margin, y);
      y += lineHeight;
    };

    const addSection = (title: string) => {
      y += 5;
      addText(title, 14, true);
      y += 2;
    };

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "JPEG", pageWidth - 45, 5, 30, 30);
      } catch (e) {
        console.error("Failed to add logo to PDF:", e);
      }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Sports Reels", margin, 18);
    doc.setFontSize(14);
    doc.text("TRANSFER ELIGIBILITY REPORT", margin, 28);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Verification Code: ${report.verificationCode || "N/A"}`, margin, 35);
    y = 50;
    doc.setTextColor(0, 0, 0);

    addSection("Player Profile");
    addText(`Name: ${profile.name || report.playerName}`);
    addText(`Position: ${profile.position || "N/A"}`);
    addText(`Nationality: ${profile.nationality || "N/A"}${profile.secondNationality ? ` / ${profile.secondNationality}` : ""}`);
    addText(`Date of Birth: ${profile.dateOfBirth || "N/A"} (Age: ${profile.age || "N/A"})`);
    addText(`Height: ${profile.height || "N/A"} ${profile.heightUnit || ""}`);
    addText(`Weight: ${profile.weight || "N/A"} ${profile.weightUnit || ""}`);
    addText(`Preferred Foot: ${profile.preferredFoot || "N/A"}`);
    addText(`Current Club: ${profile.currentClub || "N/A"}`);
    addText(`Market Value: ${profile.marketValue || "N/A"}`);

    addSection("Transfer Eligibility Summary");
    const eligibilityStatus = report.overallEligibilityStatus || "N/A";
    addText(`Overall Status: ${eligibilityStatus.toUpperCase()}`);
    addText(`Total Minutes Verified: ${report.totalMinutesVerified || 0}`);
    if (eligibility?.visaScores) {
      const visas = eligibility.visaScores;
      addText(`Schengen: ${visas.schengen?.score || 0}% (${visas.schengen?.status || "N/A"})`);
      addText(`O-1 (USA): ${visas.o1?.score || 0}% (${visas.o1?.status || "N/A"})`);
      addText(`P-1 (USA): ${visas.p1?.score || 0}% (${visas.p1?.status || "N/A"})`);
      addText(`UK GBE: ${visas.ukGbe?.score || 0}% (${visas.ukGbe?.status || "N/A"})`);
      addText(`ESC: ${visas.esc?.score || 0}% (${visas.esc?.status || "N/A"})`);
    }

    if (recommendations.length > 0) {
      addSection("Recommendations");
      recommendations.forEach((rec, i) => addText(`${i + 1}. ${rec}`));
    }

    if (performance.length > 0) {
      addSection("Performance Statistics");
      performance.forEach(p => {
        addText(`Season ${p.season}: ${p.gamesPlayed || 0} games, ${p.goals || 0} goals, ${p.assists || 0} assists`);
      });
    }

    if (international.length > 0) {
      addSection("International Career");
      international.forEach(i => {
        addText(`${i.nationalTeam} (${i.teamLevel}): ${i.caps || 0} caps, ${i.goals || 0} goals`);
      });
    }

    if (videos.length > 0) {
      addSection("Video Evidence");
      addText(`Total Videos: ${videos.length}`);
      videos.slice(0, 5).forEach(v => {
        addText(`- ${v.title} (${v.source || "Unknown"}, ${v.minutesPlayed || 0} mins)`);
      });
      if (videos.length > 5) addText(`... and ${videos.length - 5} more videos`);
    }

    if (documents.length > 0) {
      addSection("Consular Documents");
      documents.forEach(d => {
        addText(`- Code: ${d.verificationCode}, Valid until: ${d.validUntil ? new Date(d.validUntil).toLocaleDateString() : "N/A"}`);
      });
    }

    if (invitations.length > 0) {
      addSection("Invitation Letters");
      invitations.forEach(i => {
        addText(`- ${i.targetClubName} (${i.targetCountry}): ${i.offerType} - ${i.status}`);
      });
    }

    if (verifications.length > 0) {
      addSection("Embassy Verifications");
      verifications.forEach(v => {
        addText(`- ${v.embassyCountry}: ${v.status} (${v.verificationCode || "N/A"})`);
      });
    }

    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`, margin, y);
    y += 5;
    doc.text(`Valid Until: ${report.validUntil ? new Date(report.validUntil).toLocaleDateString() : "N/A"}`, margin, y);
    y += 5;
    doc.text(`Report ID: ${report.id}`, margin, y);

    y += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.text("Sports Reels - Player Compliance & Visa Eligibility Platform", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    y += 5;
    doc.text("This document was generated by Sports Reels. Verify authenticity at sportsreels.com", margin, y);

    doc.save(`Transfer-Report-${report.playerName?.replace(/\s+/g, "-")}-${report.verificationCode || report.id}.pdf`);
    toast({ title: "PDF Downloaded", description: "The report has been downloaded successfully." });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-reports">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Transfer Reports</h1>
          <p className="text-muted-foreground">Generate and manage comprehensive player transfer reports</p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)} data-testid="button-new-report">
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg">Report History</CardTitle>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by player..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-56"
                  data-testid="input-search-reports"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-report-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports found</p>
              <p className="text-sm mt-2">Generate a report by selecting a player</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase">Player</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Generated</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Data Range</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Eligibility</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Embassy</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const statusConfig = getStatusBadge(report.status || "pending");
                    const eligConfig = getEligibilityBadge(report.overallEligibilityStatus);
                    return (
                      <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                        <TableCell className="font-medium">
                          <div>{report.playerName}</div>
                          <div className="text-xs text-muted-foreground">{report.playerPosition}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "N/A"}
                          </div>
                          <p className="text-xs text-muted-foreground">by {report.generatedByName || "System"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {report.dataRangeStart ? new Date(report.dataRangeStart).toLocaleDateString() : "N/A"} - {report.dataRangeEnd ? new Date(report.dataRangeEnd).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={eligConfig.className}>
                            {eligConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.embassyNotified ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Notified
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => notifyEmbassyMutation.mutate(report.id)}
                              disabled={notifyEmbassyMutation.isPending}
                              data-testid={`button-notify-embassy-${report.id}`}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Notify
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setViewReportId(report.id)}
                              data-testid={`button-view-report-${report.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => downloadPDF(report)}
                              data-testid={`button-download-report-${report.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(report.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-report-${report.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Transfer Report</DialogTitle>
            <DialogDescription>
              Select a player to generate a comprehensive transfer eligibility report including profile, stats, documents, and visa eligibility.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger data-testid="select-player-for-report">
                <SelectValue placeholder="Select a player" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.firstName} {player.lastName} - {player.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => generateMutation.mutate(selectedPlayer)}
              disabled={!selectedPlayer || generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewReportId} onOpenChange={(open) => !open && setViewReportId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Report Details</DialogTitle>
            <DialogDescription>
              Verification Code: {viewedReport?.verificationCode || "Loading..."}
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : viewedReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Player Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {viewedReport.playerName}</p>
                    <p><span className="text-muted-foreground">Position:</span> {(viewedReport.playerProfile as any)?.position || "N/A"}</p>
                    <p><span className="text-muted-foreground">Nationality:</span> {(viewedReport.playerProfile as any)?.nationality || "N/A"}</p>
                    <p><span className="text-muted-foreground">Club:</span> {(viewedReport.playerProfile as any)?.currentClub || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Eligibility Summary</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">Overall:</span>
                      <Badge className={getEligibilityBadge(viewedReport.overallEligibilityStatus).className}>
                        {viewedReport.overallEligibilityStatus?.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm"><span className="text-muted-foreground">Minutes Verified:</span> {viewedReport.totalMinutesVerified}</p>
                  </div>
                </div>
              </div>

              {(viewedReport.recommendations as string[])?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {(viewedReport.recommendations as string[]).map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <p>Generated: {viewedReport.generatedAt ? new Date(viewedReport.generatedAt).toLocaleString() : "N/A"}</p>
                  <p>Valid Until: {viewedReport.validUntil ? new Date(viewedReport.validUntil).toLocaleDateString() : "N/A"}</p>
                </div>
                <Button onClick={() => downloadPDF(viewedReport)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
