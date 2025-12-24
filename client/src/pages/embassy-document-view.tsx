import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { FileText, User, Calendar, Shield, Clock, Eye, Download, Globe, Award, Activity } from "lucide-react";
import logoImage from "@assets/WhatsApp_Image_2025-12-17_at_12.49.33_1766008177672.jpeg";
import type { ComplianceDocument, Player, EmbassyDocumentAccess } from "@shared/schema";

interface DocumentDetails {
  document: ComplianceDocument;
  player: Player;
  accessLogs: EmbassyDocumentAccess[];
}

export default function EmbassyDocumentView() {
  const [, params] = useRoute("/embassy/document/:id");
  const documentId = params?.id;

  const { data, isLoading, error } = useQuery<DocumentDetails>({
    queryKey: [`/api/embassy/documents/${documentId}`],
    enabled: !!documentId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Document not found or access denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { document: doc, player, accessLogs } = data;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <img 
          src={logoImage} 
          alt="Sports Reels" 
          className="h-16 w-16 object-contain rounded-md"
        />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-document-title">
            Compliance Document - {doc.documentType?.replace(/_/g, " ").toUpperCase()}
          </h1>
          <p className="text-muted-foreground">
            Official document for visa and eligibility verification
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{player.firstName} {player.lastName}</CardTitle>
                  <CardDescription>{player.position} - {player.nationality}</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">
                Verified Document
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-md bg-muted/50">
                <Globe className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nationality</p>
                <p className="font-medium">{player.nationality}</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <Award className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Int'l Caps</p>
                <p className="font-medium">{player.nationalTeamCaps || 0}</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <Activity className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Continental</p>
                <p className="font-medium">{player.continentalGames || 0}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Document Type</p>
                  <p className="font-medium">{doc.documentType?.replace(/_/g, " ").toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Verification Code</p>
                  <p className="font-medium font-mono">{(doc as any).verificationCode || doc.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Generated Date</p>
                  <p className="font-medium">
                    {doc.generatedAt ? new Date(doc.generatedAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data Range</p>
                  <p className="font-medium">
                    {doc.dataRangeStart && doc.dataRangeEnd
                      ? `${new Date(doc.dataRangeStart).toLocaleDateString()} - ${new Date(doc.dataRangeEnd).toLocaleDateString()}`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/30 rounded-md p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Shield className="h-4 w-4" />
                <span>Embassy Verification Notice</span>
              </div>
              <p className="text-sm">
                This document has been generated by Sports Reels and is intended for official visa and work permit verification purposes only. 
                All data has been verified against official football federation records and performance databases.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Access Log
            </CardTitle>
            <CardDescription>
              All document access is logged and timestamped
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {accessLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No previous access recorded
                </p>
              ) : (
                <div className="space-y-3">
                  {accessLogs.map((log, i) => (
                    <div key={i} className="p-3 rounded-md bg-muted/50 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {log.accessedAt ? new Date(log.accessedAt).toLocaleString() : "N/A"}
                        </span>
                      </div>
                      <p className="font-medium capitalize">{log.accessType} Access</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <img 
                src={logoImage} 
                alt="Sports Reels" 
                className="h-8 w-8 object-contain rounded"
              />
              <div className="text-sm">
                <p className="font-medium">Sports Reels Compliance Platform</p>
                <p className="text-muted-foreground">Official document verification system</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <p>Document ID: {doc.id}</p>
              <p>This viewing session has been logged</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
