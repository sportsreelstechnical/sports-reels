import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { FileText, Upload, Plus, Calendar, Globe, Building2, User, CheckCircle, Clock, AlertCircle, MapPin, FileCheck, QrCode, Eye, Trash2, Sparkles, X, File, Award, Send, Coins } from "lucide-react";
import { z } from "zod";
import type { Player, InvitationLetter, ConsularReport, FederationLetterRequest } from "@shared/schema";

const invitationLetterSchema = z.object({
  playerId: z.string().min(1, "Please select a player"),
  targetClubName: z.string().min(2, "Club name is required"),
  targetClubAddress: z.string().optional(),
  targetLeague: z.string().min(2, "League is required"),
  targetLeagueBand: z.coerce.number().min(1).max(5),
  targetCountry: z.string().min(2, "Country is required"),
  trialStartDate: z.string().optional(),
  trialEndDate: z.string().optional(),
  offerType: z.string().default("trial"),
  scoutAgentName: z.string().optional(),
  scoutAgentId: z.string().optional(),
  fileUrl: z.string().optional(),
  federationLetterRequestId: z.string().optional(),
});

type InvitationLetterFormData = z.infer<typeof invitationLetterSchema>;

interface InvitationLetterWithPlayer extends InvitationLetter {
  player?: Player;
}

export default function InvitationLettersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<InvitationLetterWithPlayer | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".jpg", ".jpeg", ".png"]
    },
    maxFiles: 1,
  });

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: allLetters = [], isLoading: lettersLoading } = useQuery<InvitationLetterWithPlayer[]>({
    queryKey: ["/api/invitation-letters"],
  });

  const { data: issuedFederationLetters = [] } = useQuery<FederationLetterRequest[]>({
    queryKey: [`/api/players/${selectedPlayerId}/issued-federation-letters`],
    enabled: !!selectedPlayerId,
  });

  const form = useForm<InvitationLetterFormData>({
    resolver: zodResolver(invitationLetterSchema),
    defaultValues: {
      playerId: "",
      targetClubName: "",
      targetClubAddress: "",
      targetLeague: "",
      targetLeagueBand: 3,
      targetCountry: "",
      trialStartDate: "",
      trialEndDate: "",
      offerType: "trial",
      scoutAgentName: "",
      scoutAgentId: "",
      fileUrl: "",
      federationLetterRequestId: "",
    },
  });

  const watchedPlayerId = form.watch("playerId");
  useEffect(() => {
    if (watchedPlayerId !== selectedPlayerId) {
      setSelectedPlayerId(watchedPlayerId);
      form.setValue("federationLetterRequestId", "");
    }
  }, [watchedPlayerId, selectedPlayerId, form]);

  const uploadMutation = useMutation({
    mutationFn: async (data: InvitationLetterFormData) => {
      const response = await apiRequest("POST", "/api/invitation-letters", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Letter Uploaded",
        description: "The letter has been submitted for processing. League band will be applied to eligibility calculation.",
      });
      form.reset();
      setUploadedFile(null);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-letters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload invitation letter",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (letterId: string) => {
      const response = await apiRequest("POST", `/api/invitation-letters/${letterId}/generate-consular-report`, {});
      return await response.json();
    },
    onSuccess: (report: ConsularReport) => {
      toast({
        title: "Consular Report Generated",
        description: `Verification code: ${report.verificationCode}. Report is now accessible to embassy officials.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-letters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate Report",
        description: error.message || "Could not generate consular report",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (letterId: string) => {
      const response = await apiRequest("DELETE", `/api/invitation-letters/${letterId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Letter Deleted",
        description: "The invitation letter has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-letters"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete invitation letter",
        variant: "destructive",
      });
    },
  });

  const { data: tokenBalance } = useQuery<{ balance: number; lifetimeEarned: number; lifetimeSpent: number }>({
    queryKey: ["/api/tokens/balance"],
  });

  const notifyEmbassyMutation = useMutation({
    mutationFn: async (letterId: string) => {
      const response = await apiRequest("POST", `/api/invitation-letters/${letterId}/notify-embassy`, {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Embassy Notified",
        description: `The embassy has been notified. 4 tokens deducted. New balance: ${data.newBalance} tokens.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitation-letters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Notification Failed",
        description: error.message || "Failed to notify embassy",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvitationLetterFormData) => {
    const fileUrl = uploadedFile ? URL.createObjectURL(uploadedFile) : undefined;
    const submitData = {
      ...data,
      fileUrl,
      federationLetterRequestId: data.federationLetterRequestId === "none" ? "" : data.federationLetterRequestId,
    };
    uploadMutation.mutate(submitData);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status || "Pending"}</Badge>;
    }
  };

  const leagueBands = [
    { value: 1, label: "Band 1 - Top Tier (Premier League, La Liga, etc.)" },
    { value: 2, label: "Band 2 - High Level (Championship, Serie B, etc.)" },
    { value: 3, label: "Band 3 - Mid Level (League One, etc.)" },
    { value: 4, label: "Band 4 - Lower Level" },
    { value: 5, label: "Band 5 - Regional/Amateur" },
  ];

  const countriesWithLeagues: Record<string, { name: string; leagues: { name: string; type: string; band: number }[] }> = {
    "england": {
      name: "England",
      leagues: [
        { name: "Premier League", type: "professional", band: 1 },
        { name: "Championship", type: "professional", band: 2 },
        { name: "League One", type: "professional", band: 3 },
        { name: "League Two", type: "professional", band: 4 },
        { name: "National League", type: "local", band: 5 },
        { name: "Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "spain": {
      name: "Spain",
      leagues: [
        { name: "La Liga", type: "professional", band: 1 },
        { name: "La Liga 2", type: "professional", band: 2 },
        { name: "Primera Federacion", type: "professional", band: 3 },
        { name: "Segunda Federacion", type: "local", band: 4 },
        { name: "Tercera Division", type: "amateur", band: 5 },
      ]
    },
    "germany": {
      name: "Germany",
      leagues: [
        { name: "Bundesliga", type: "professional", band: 1 },
        { name: "2. Bundesliga", type: "professional", band: 2 },
        { name: "3. Liga", type: "professional", band: 3 },
        { name: "Regionalliga", type: "local", band: 4 },
        { name: "Oberliga", type: "amateur", band: 5 },
      ]
    },
    "italy": {
      name: "Italy",
      leagues: [
        { name: "Serie A", type: "professional", band: 1 },
        { name: "Serie B", type: "professional", band: 2 },
        { name: "Serie C", type: "professional", band: 3 },
        { name: "Serie D", type: "local", band: 4 },
        { name: "Eccellenza", type: "amateur", band: 5 },
      ]
    },
    "france": {
      name: "France",
      leagues: [
        { name: "Ligue 1", type: "professional", band: 1 },
        { name: "Ligue 2", type: "professional", band: 2 },
        { name: "Championnat National", type: "professional", band: 3 },
        { name: "National 2", type: "local", band: 4 },
        { name: "National 3", type: "amateur", band: 5 },
      ]
    },
    "portugal": {
      name: "Portugal",
      leagues: [
        { name: "Primeira Liga", type: "professional", band: 1 },
        { name: "Liga Portugal 2", type: "professional", band: 2 },
        { name: "Liga 3", type: "professional", band: 3 },
        { name: "Campeonato de Portugal", type: "local", band: 4 },
        { name: "Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "netherlands": {
      name: "Netherlands",
      leagues: [
        { name: "Eredivisie", type: "professional", band: 1 },
        { name: "Eerste Divisie", type: "professional", band: 2 },
        { name: "Tweede Divisie", type: "professional", band: 3 },
        { name: "Derde Divisie", type: "local", band: 4 },
        { name: "Hoofdklasse", type: "amateur", band: 5 },
      ]
    },
    "belgium": {
      name: "Belgium",
      leagues: [
        { name: "Pro League", type: "professional", band: 1 },
        { name: "Challenger Pro League", type: "professional", band: 2 },
        { name: "First Amateur Division", type: "local", band: 3 },
        { name: "Second Amateur Division", type: "local", band: 4 },
        { name: "Provincial Leagues", type: "amateur", band: 5 },
      ]
    },
    "usa": {
      name: "United States",
      leagues: [
        { name: "Major League Soccer (MLS)", type: "professional", band: 1 },
        { name: "USL Championship", type: "professional", band: 2 },
        { name: "USL League One", type: "professional", band: 3 },
        { name: "USL League Two", type: "local", band: 4 },
        { name: "NPSL", type: "amateur", band: 5 },
      ]
    },
    "saudi_arabia": {
      name: "Saudi Arabia",
      leagues: [
        { name: "Saudi Pro League", type: "professional", band: 1 },
        { name: "First Division", type: "professional", band: 2 },
        { name: "Second Division", type: "local", band: 3 },
        { name: "Third Division", type: "local", band: 4 },
        { name: "Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "uae": {
      name: "United Arab Emirates",
      leagues: [
        { name: "UAE Pro League", type: "professional", band: 1 },
        { name: "First Division", type: "professional", band: 2 },
        { name: "Second Division", type: "local", band: 3 },
        { name: "Third Division", type: "local", band: 4 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "qatar": {
      name: "Qatar",
      leagues: [
        { name: "Qatar Stars League", type: "professional", band: 1 },
        { name: "Second Division", type: "professional", band: 2 },
        { name: "Third Division", type: "local", band: 3 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "turkey": {
      name: "Turkey",
      leagues: [
        { name: "Super Lig", type: "professional", band: 1 },
        { name: "1. Lig", type: "professional", band: 2 },
        { name: "2. Lig", type: "professional", band: 3 },
        { name: "3. Lig", type: "local", band: 4 },
        { name: "Regional Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "japan": {
      name: "Japan",
      leagues: [
        { name: "J1 League", type: "professional", band: 1 },
        { name: "J2 League", type: "professional", band: 2 },
        { name: "J3 League", type: "professional", band: 3 },
        { name: "JFL", type: "local", band: 4 },
        { name: "Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "china": {
      name: "China",
      leagues: [
        { name: "Chinese Super League", type: "professional", band: 1 },
        { name: "China League One", type: "professional", band: 2 },
        { name: "China League Two", type: "local", band: 3 },
        { name: "Provincial Leagues", type: "amateur", band: 5 },
      ]
    },
    "australia": {
      name: "Australia",
      leagues: [
        { name: "A-League Men", type: "professional", band: 1 },
        { name: "NPL National", type: "professional", band: 2 },
        { name: "State NPL", type: "local", band: 3 },
        { name: "State League 1", type: "local", band: 4 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "brazil": {
      name: "Brazil",
      leagues: [
        { name: "Brasileirao Serie A", type: "professional", band: 1 },
        { name: "Brasileirao Serie B", type: "professional", band: 2 },
        { name: "Brasileirao Serie C", type: "professional", band: 3 },
        { name: "Brasileirao Serie D", type: "local", band: 4 },
        { name: "State Championships", type: "amateur", band: 5 },
      ]
    },
    "argentina": {
      name: "Argentina",
      leagues: [
        { name: "Liga Profesional", type: "professional", band: 1 },
        { name: "Primera Nacional", type: "professional", band: 2 },
        { name: "Primera B", type: "professional", band: 3 },
        { name: "Primera C", type: "local", band: 4 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "mexico": {
      name: "Mexico",
      leagues: [
        { name: "Liga MX", type: "professional", band: 1 },
        { name: "Liga de Expansion MX", type: "professional", band: 2 },
        { name: "Liga Premier", type: "local", band: 3 },
        { name: "Liga TDP", type: "local", band: 4 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "south_africa": {
      name: "South Africa",
      leagues: [
        { name: "DStv Premiership", type: "professional", band: 1 },
        { name: "National First Division", type: "professional", band: 2 },
        { name: "ABC Motsepe League", type: "local", band: 3 },
        { name: "SAFA Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "nigeria": {
      name: "Nigeria",
      leagues: [
        { name: "NPFL", type: "professional", band: 2 },
        { name: "NNL", type: "professional", band: 3 },
        { name: "State FA Leagues", type: "local", band: 4 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "egypt": {
      name: "Egypt",
      leagues: [
        { name: "Egyptian Premier League", type: "professional", band: 2 },
        { name: "Egyptian Second Division", type: "professional", band: 3 },
        { name: "Egyptian Third Division", type: "local", band: 4 },
        { name: "Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "morocco": {
      name: "Morocco",
      leagues: [
        { name: "Botola Pro", type: "professional", band: 2 },
        { name: "Botola 2", type: "professional", band: 3 },
        { name: "Amateur Division 1", type: "local", band: 4 },
        { name: "Regional Leagues", type: "amateur", band: 5 },
      ]
    },
    "denmark": {
      name: "Denmark",
      leagues: [
        { name: "Danish Superliga", type: "professional", band: 2 },
        { name: "1. Division", type: "professional", band: 3 },
        { name: "2. Division", type: "local", band: 4 },
        { name: "Denmark Series", type: "amateur", band: 5 },
      ]
    },
    "norway": {
      name: "Norway",
      leagues: [
        { name: "Eliteserien", type: "professional", band: 2 },
        { name: "OBOS-ligaen", type: "professional", band: 3 },
        { name: "Second Division", type: "local", band: 4 },
        { name: "Third Division", type: "amateur", band: 5 },
      ]
    },
    "sweden": {
      name: "Sweden",
      leagues: [
        { name: "Allsvenskan", type: "professional", band: 2 },
        { name: "Superettan", type: "professional", band: 3 },
        { name: "Ettan", type: "local", band: 4 },
        { name: "Division 2", type: "amateur", band: 5 },
      ]
    },
    "russia": {
      name: "Russia",
      leagues: [
        { name: "Russian Premier League", type: "professional", band: 2 },
        { name: "First League", type: "professional", band: 3 },
        { name: "Second League", type: "local", band: 4 },
        { name: "Amateur Football League", type: "amateur", band: 5 },
      ]
    },
    "scotland": {
      name: "Scotland",
      leagues: [
        { name: "Scottish Premiership", type: "professional", band: 2 },
        { name: "Scottish Championship", type: "professional", band: 3 },
        { name: "Scottish League One", type: "local", band: 4 },
        { name: "Scottish League Two", type: "local", band: 4 },
        { name: "Highland/Lowland League", type: "amateur", band: 5 },
      ]
    },
    "greece": {
      name: "Greece",
      leagues: [
        { name: "Super League 1", type: "professional", band: 2 },
        { name: "Super League 2", type: "professional", band: 3 },
        { name: "Football League", type: "local", band: 4 },
        { name: "Amateur Divisions", type: "amateur", band: 5 },
      ]
    },
    "india": {
      name: "India",
      leagues: [
        { name: "Indian Super League", type: "professional", band: 2 },
        { name: "I-League", type: "professional", band: 3 },
        { name: "I-League 2", type: "local", band: 4 },
        { name: "State Leagues", type: "amateur", band: 5 },
      ]
    },
    "south_korea": {
      name: "South Korea",
      leagues: [
        { name: "K League 1", type: "professional", band: 1 },
        { name: "K League 2", type: "professional", band: 2 },
        { name: "K3 League", type: "local", band: 3 },
        { name: "K4 League", type: "local", band: 4 },
        { name: "Amateur Leagues", type: "amateur", band: 5 },
      ]
    },
    "other": {
      name: "Other",
      leagues: [
        { name: "Top Division (National)", type: "national", band: 2 },
        { name: "Second Division", type: "professional", band: 3 },
        { name: "Local League", type: "local", band: 4 },
        { name: "Amateur League", type: "amateur", band: 5 },
      ]
    },
  };

  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const watchedCountry = form.watch("targetCountry");
  
  useEffect(() => {
    if (watchedCountry !== selectedCountry) {
      setSelectedCountry(watchedCountry);
      form.setValue("targetLeague", "");
    }
  }, [watchedCountry, selectedCountry, form]);

  const availableLeagues = selectedCountry && countriesWithLeagues[selectedCountry] 
    ? countriesWithLeagues[selectedCountry].leagues 
    : [];

  const offerTypes = [
    { value: "trial", label: "Trial Offer" },
    { value: "permanent", label: "Permanent Transfer" },
    { value: "loan", label: "Loan" },
    { value: "contract", label: "Contract Offer" },
  ];

  if (playersLoading || lettersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Invitation Letters</h1>
          <p className="text-muted-foreground">Upload club invitation letters for automatic eligibility scoring and embassy verification</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-letter">
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Upload Invitation Document</DialogTitle>
              <DialogDescription>
                Submit an official invitation letter from the target club. The system will automatically assign league band and recalculate eligibility.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-180px)]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-4">
                  <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Player</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-player">
                              <SelectValue placeholder="Select a player" />
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

                  <Separator />

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Target Club Details</Label>
                    <p className="text-xs text-muted-foreground">Information extracted from invitation letter</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetClubName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Manchester United" {...field} data-testid="input-target-club" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-target-country">
                                <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(countriesWithLeagues).map(([key, country]) => (
                                <SelectItem key={key} value={key}>
                                  {country.name}
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
                    name="targetClubAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Full club address as shown on letter"
                            className="resize-none"
                            rows={2}
                            {...field} 
                            data-testid="input-club-address" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetLeague"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target League</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const league = availableLeagues.find(l => l.name === value);
                            if (league) {
                              form.setValue("targetLeagueBand", league.band);
                            }
                          }} 
                          value={field.value}
                          disabled={!selectedCountry}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-league">
                              <SelectValue placeholder={selectedCountry ? "Select a league" : "Select country first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableLeagues.map((league) => (
                              <SelectItem key={league.name} value={league.name}>
                                {league.name} ({league.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetLeagueBand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>League Band (auto-assigned)</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-league-band">
                              <SelectValue placeholder="Select league band" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leagueBands.map((band) => (
                              <SelectItem key={band.value} value={band.value.toString()}>
                                {band.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Offer Details</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="offerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offer Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-offer-type">
                                <SelectValue placeholder="Select offer type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {offerTypes.map((type) => (
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="trialStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trial/Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-trial-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="trialEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trial/End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-trial-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scoutAgentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scout/Agent Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Agent name" {...field} data-testid="input-scout-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scoutAgentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent License ID</FormLabel>
                          <FormControl>
                            <Input placeholder="License ID" {...field} data-testid="input-scout-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {issuedFederationLetters.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          Attach Federation Letter (Optional)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Include an issued federation letter as supporting documentation for embassy verification
                        </p>
                        <FormField
                          control={form.control}
                          name="federationLetterRequestId"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-federation-letter">
                                    <SelectValue placeholder="Select a federation letter (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No federation letter</SelectItem>
                                  {issuedFederationLetters.map((letter) => (
                                    <SelectItem key={letter.id} value={letter.id}>
                                      {letter.requestNumber} - {letter.federationName || letter.federationCountry} 
                                      {letter.issuedAt && ` (Issued: ${new Date(letter.issuedAt).toLocaleDateString()})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Document Upload</Label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                      data-testid="dropzone-document"
                    >
                      <input {...getInputProps()} data-testid="input-document-file" />
                      {uploadedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <File className="h-6 w-6 text-primary" />
                          <span className="font-medium text-sm truncate max-w-[200px]">{uploadedFile.name}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                            data-testid="button-remove-document"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {isDragActive ? "Drop document here" : "Drop PDF/DOC or click to browse"}
                          </p>
                          <p className="text-xs text-muted-foreground">Supports PDF, DOC, DOCX, JPG, PNG</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Upload the official invitation letter from the target club</p>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-submit-letter">
                      {uploadMutation.isPending ? <LoadingSpinner size="sm" /> : "Submit Letter"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              How Invitation Letters Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Upload className="h-4 w-4" />
                  <span>1. Upload Document</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload official invitation letters with player information, club address, country, and trial offer details. League band is automatically assigned.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Sparkles className="h-4 w-4" />
                  <span>2. Automatic Scoring</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  The system recalculates eligibility scores based on the target club's league band and country requirements.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <QrCode className="h-4 w-4" />
                  <span>3. Embassy Verification</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consular data reports with QR codes for player videos are generated and made accessible to embassy officials.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {players.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Add players to your roster before uploading invitation letters.</p>
            </CardContent>
          </Card>
        ) : allLetters.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uploaded Documents</CardTitle>
              <CardDescription>Invitation letters for eligibility processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No invitation letters uploaded yet</p>
                <p className="text-sm">Click "Upload Document" to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uploaded Documents</CardTitle>
              <CardDescription>{allLetters.length} invitation letter(s) on file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allLetters.map((letter) => (
                  <div 
                    key={letter.id} 
                    className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-md hover-elevate"
                    data-testid={`card-letter-${letter.id}`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {letter.player?.firstName} {letter.player?.lastName}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {letter.targetClubName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {letter.targetCountry}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Band {letter.targetLeagueBand}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(letter.status)}
                      {letter.consularReportGenerated && (
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                          <FileCheck className="h-3 w-3 mr-1" />
                          Report Ready
                        </Badge>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedLetter(letter);
                          setIsViewDialogOpen(true);
                        }}
                        data-testid={`button-view-letter-${letter.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {!letter.consularReportGenerated && (
                        <Button 
                          size="sm"
                          onClick={() => generateReportMutation.mutate(letter.id)}
                          disabled={generateReportMutation.isPending}
                          data-testid={`button-generate-report-${letter.id}`}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Generate Report
                        </Button>
                      )}
                      {letter.embassyNotificationStatus !== "notified" ? (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => notifyEmbassyMutation.mutate(letter.id)}
                          disabled={notifyEmbassyMutation.isPending || (tokenBalance?.balance || 0) < 4}
                          data-testid={`button-notify-embassy-${letter.id}`}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Notify Embassy
                          <Badge variant="secondary" className="ml-1 text-xs">
                            <Coins className="h-3 w-3 mr-1" />4
                          </Badge>
                        </Button>
                      ) : (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Embassy Notified
                        </Badge>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(letter.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-letter-${letter.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invitation Letter Details</DialogTitle>
            <DialogDescription>
              {selectedLetter?.player?.firstName} {selectedLetter?.player?.lastName} - {selectedLetter?.targetClubName}
            </DialogDescription>
          </DialogHeader>
          {selectedLetter && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Player</Label>
                  <p className="font-medium">{selectedLetter.player?.firstName} {selectedLetter.player?.lastName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(selectedLetter.status)}</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Target Club</Label>
                  <p className="font-medium">{selectedLetter.targetClubName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <p className="font-medium">{selectedLetter.targetCountry}</p>
                </div>
              </div>
              {selectedLetter.targetClubAddress && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Club Address</Label>
                  <p className="text-sm">{selectedLetter.targetClubAddress}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">League</Label>
                  <p className="font-medium">{selectedLetter.targetLeague}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">League Band</Label>
                  <Badge variant="secondary">Band {selectedLetter.targetLeagueBand}</Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Offer Type</Label>
                  <p className="font-medium capitalize">{selectedLetter.offerType || "Trial"}</p>
                </div>
              </div>
              {(selectedLetter.trialStartDate || selectedLetter.trialEndDate) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="font-medium">{selectedLetter.trialStartDate || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="font-medium">{selectedLetter.trialEndDate || "Not specified"}</p>
                  </div>
                </div>
              )}
              {selectedLetter.qrCodeData && (
                <>
                  <Separator />
                  <div className="p-4 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="h-4 w-4 text-primary" />
                      <Label className="font-medium">Verification Code</Label>
                    </div>
                    <p className="font-mono text-sm">{selectedLetter.qrCodeData}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Embassy officials can use this code to verify the consular report
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedLetter && !selectedLetter.consularReportGenerated && (
              <Button 
                onClick={() => {
                  generateReportMutation.mutate(selectedLetter.id);
                  setIsViewDialogOpen(false);
                }}
                disabled={generateReportMutation.isPending}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Generate Consular Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
