import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  X, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Video, 
  UserPlus, 
  ArrowLeft,
  FileText,
  Play,
  Trash2
} from "lucide-react";
import type { Player, TeamSheet, TeamSheetPlayer } from "@shared/schema";

const COUNTRIES = [
  "England", "Spain", "Germany", "Italy", "France", 
  "Netherlands", "Portugal", "Norway", "Nigeria", "USA"
];

const POSITIONS = [
  "GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", 
  "LM", "RM", "LW", "RW", "CF", "ST"
];

export default function TeamSheets() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [addingRole, setAddingRole] = useState<"starting" | "substitute">("starting");
  const [selectedCountry, setSelectedCountry] = useState("England");
  
  const [formCompetition, setFormCompetition] = useState("");
  const [formHomeAway, setFormHomeAway] = useState("home");
  const [formFormation, setFormFormation] = useState("4-3-3");
  
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setFormCompetition("");
  };

  const { data: teamSheets, isLoading: sheetsLoading } = useQuery<TeamSheet[]>({
    queryKey: ["/api/team-sheets"],
  });

  const { data: players } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: selectedSheetData, isLoading: sheetDataLoading } = useQuery<TeamSheet & { players: TeamSheetPlayer[] }>({
    queryKey: ["/api/team-sheets", selectedSheet],
    enabled: !!selectedSheet,
  });

  const { data: competitions } = useQuery<{ name: string; type: string }[]>({
    queryKey: ["/api/competitions", selectedCountry],
    queryFn: () => fetch(`/api/competitions?country=${selectedCountry}`).then(r => r.json()),
  });

  const createSheetMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/team-sheets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-sheets"] });
      setShowCreateDialog(false);
      setFormCompetition("");
      setFormHomeAway("home");
      setFormFormation("4-3-3");
      toast({ title: "Team sheet created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addPlayerMutation = useMutation({
    mutationFn: async ({ sheetId, data }: { sheetId: string; data: any }) => 
      apiRequest("POST", `/api/team-sheets/${sheetId}/players`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-sheets", selectedSheet] });
      setShowPlayerSelect(false);
      toast({ title: "Player added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => 
      apiRequest("DELETE", `/api/team-sheet-players/${playerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-sheets", selectedSheet] });
      toast({ title: "Player removed" });
    },
  });

  const deleteSheetMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/team-sheets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-sheets"] });
      setSelectedSheet(null);
      toast({ title: "Team sheet deleted" });
    },
  });

  const handleCreateSheet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const matchDate = formData.get("matchDate") as string;
    
    if (!title || !matchDate || !formCompetition) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const competitionItem = competitions?.find(c => c.name === formCompetition);
    
    createSheetMutation.mutate({
      title,
      matchDate,
      kickoffTime: (formData.get("kickoffTime") as string) || undefined,
      stadium: (formData.get("stadium") as string) || undefined,
      competition: formCompetition,
      competitionType: competitionItem?.type || "league",
      isHome: formHomeAway === "home",
      awayTeam: (formData.get("opponentName") as string) || undefined,
      formation: formFormation,
      referee: (formData.get("referee") as string) || undefined,
    });
  };
  
  const resetFormState = () => {
    setFormCompetition("");
    setFormHomeAway("home");
    setFormFormation("4-3-3");
    setSelectedCountry("England");
  };

  const handleAddPlayer = (player: Player) => {
    if (!selectedSheet) return;
    const existingPlayers = selectedSheetData?.players || [];
    const starters = existingPlayers.filter(p => p.role === "starting");
    
    if (addingRole === "starting" && starters.length >= 11) {
      toast({ title: "Limit reached", description: "Maximum 11 starting players allowed", variant: "destructive" });
      return;
    }
    
    const alreadyAdded = existingPlayers.find(p => p.playerId === player.id);
    if (alreadyAdded) {
      toast({ title: "Already added", description: "This player is already in the team sheet", variant: "destructive" });
      return;
    }
    
    const positionOrder = existingPlayers.filter(p => p.role === addingRole).length + 1;
    
    addPlayerMutation.mutate({
      sheetId: selectedSheet,
      data: {
        playerId: player.id,
        role: addingRole,
        shirtNumber: player.jerseyNumber || positionOrder,
        position: player.position || "CM",
        positionOrder,
      },
    });
  };

  const startingPlayers = selectedSheetData?.players?.filter(p => p.role === "starting") || [];
  const substitutes = selectedSheetData?.players?.filter(p => p.role === "substitute") || [];
  const addedPlayerIds = selectedSheetData?.players?.map(p => p.playerId) || [];

  if (sheetsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading team sheets...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Team Sheets
          </h2>
          <Button size="icon" variant="ghost" onClick={() => setShowCreateDialog(true)} data-testid="button-create-sheet">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {teamSheets?.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No team sheets yet. Create one to get started.
              </div>
            )}
            {teamSheets?.map(sheet => (
              <Card 
                key={sheet.id} 
                className={`cursor-pointer hover-elevate ${selectedSheet === sheet.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedSheet(sheet.id)}
                data-testid={`card-team-sheet-${sheet.id}`}
              >
                <CardContent className="p-3">
                  <div className="font-medium text-sm truncate">{sheet.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {sheet.matchDate ? new Date(sheet.matchDate).toLocaleDateString() : "No date"}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={sheet.status === "finalized" ? "default" : "secondary"}>
                      {sheet.status}
                    </Badge>
                    {sheet.competition && (
                      <Badge variant="outline" className="truncate max-w-[120px]">
                        {sheet.competition}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSheet ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Select a team sheet or create a new one</p>
            </div>
          </div>
        ) : sheetDataLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : selectedSheetData ? (
          <>
            <div className="p-4 border-b flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setSelectedSheet(null)} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">{selectedSheetData.title}</h1>
                  <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
                    {selectedSheetData.competition && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {selectedSheetData.competition}
                      </span>
                    )}
                    {selectedSheetData.stadium && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedSheetData.stadium}
                      </span>
                    )}
                    {selectedSheetData.kickoffTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {selectedSheetData.kickoffTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedSheetData.videoId && (
                  <Button variant="outline" size="sm" data-testid="button-view-video">
                    <Play className="h-4 w-4 mr-1" />
                    View Video
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deleteSheetMutation.mutate(selectedSheet)}
                  data-testid="button-delete-sheet"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedSheet(null)} data-testid="button-close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 max-w-4xl">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Starting XI ({startingPlayers.length}/11)
                      </CardTitle>
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={startingPlayers.length >= 11}
                        onClick={() => { setAddingRole("starting"); setShowPlayerSelect(true); }}
                        data-testid="button-add-starter"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {startingPlayers.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No starting players added
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {startingPlayers.map((sp, idx) => {
                            const player = players?.find(p => p.id === sp.playerId);
                            return (
                              <div 
                                key={sp.id} 
                                className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                                data-testid={`row-starter-${sp.id}`}
                              >
                                <Badge variant="outline" className="min-w-[28px] justify-center">
                                  {sp.shirtNumber || idx + 1}
                                </Badge>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{player ? `${player.firstName} ${player.lastName}` : "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{sp.position}</div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => removePlayerMutation.mutate(sp.id)}
                                  data-testid={`button-remove-starter-${sp.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Substitutes ({substitutes.length})
                      </CardTitle>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => { setAddingRole("substitute"); setShowPlayerSelect(true); }}
                        data-testid="button-add-substitute"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {substitutes.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No substitutes added
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {substitutes.map((sp, idx) => {
                            const player = players?.find(p => p.id === sp.playerId);
                            return (
                              <div 
                                key={sp.id} 
                                className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                                data-testid={`row-substitute-${sp.id}`}
                              >
                                <Badge variant="outline" className="min-w-[28px] justify-center">
                                  {sp.shirtNumber || 12 + idx}
                                </Badge>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{player ? `${player.firstName} ${player.lastName}` : "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{sp.position}</div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => removePlayerMutation.mutate(sp.id)}
                                  data-testid={`button-remove-substitute-${sp.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Match Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Opponent</div>
                        <div className="font-medium">{selectedSheetData.awayTeam || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Home/Away</div>
                        <div className="font-medium capitalize">{selectedSheetData.isHome ? "Home" : "Away"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Formation</div>
                        <div className="font-medium">{selectedSheetData.formation || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Referee</div>
                        <div className="font-medium">{selectedSheetData.referee || "—"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedSheetData.videoId && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Linked Video
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                        <Button variant="ghost" size="lg">
                          <Play className="h-8 w-8" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Team Sheet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSheet} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g., vs Manchester United" required data-testid="input-title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matchDate">Match Date</Label>
                <Input id="matchDate" name="matchDate" type="date" required data-testid="input-match-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kickoffTime">Kickoff Time</Label>
                <Input id="kickoffTime" name="kickoffTime" type="time" placeholder="15:00" data-testid="input-kickoff-time" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger data-testid="select-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="competition">Competition</Label>
                <Select value={formCompetition} onValueChange={setFormCompetition}>
                  <SelectTrigger data-testid="select-competition">
                    <SelectValue placeholder="Select competition" />
                  </SelectTrigger>
                  <SelectContent>
                    {competitions?.map(comp => (
                      <SelectItem key={comp.name} value={comp.name}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opponentName">Opponent</Label>
                <Input id="opponentName" name="opponentName" placeholder="Opponent team name" data-testid="input-opponent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeAway">Home/Away</Label>
                <Select value={formHomeAway} onValueChange={setFormHomeAway}>
                  <SelectTrigger data-testid="select-home-away">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stadium">Stadium</Label>
                <Input id="stadium" name="stadium" placeholder="Stadium name" data-testid="input-stadium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formation">Formation</Label>
                <Select value={formFormation} onValueChange={setFormFormation}>
                  <SelectTrigger data-testid="select-formation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-3-3">4-3-3</SelectItem>
                    <SelectItem value="4-4-2">4-4-2</SelectItem>
                    <SelectItem value="3-5-2">3-5-2</SelectItem>
                    <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                    <SelectItem value="5-3-2">5-3-2</SelectItem>
                    <SelectItem value="3-4-3">3-4-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referee">Referee (Optional)</Label>
              <Input id="referee" name="referee" placeholder="Referee name" data-testid="input-referee" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button type="submit" disabled={createSheetMutation.isPending} data-testid="button-submit-create">
                {createSheetMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPlayerSelect} onOpenChange={setShowPlayerSelect}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {addingRole === "starting" ? "Starting" : "Substitute"} Player</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {players?.filter(p => !addedPlayerIds.includes(p.id)).map(player => (
                <div 
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer bg-muted/30"
                  onClick={() => handleAddPlayer(player)}
                  data-testid={`row-select-player-${player.id}`}
                >
                  <Badge variant="outline">{player.jerseyNumber || "—"}</Badge>
                  <div className="flex-1">
                    <div className="font-medium">{player.firstName} {player.lastName}</div>
                    <div className="text-xs text-muted-foreground">{player.position} • {player.nationality}</div>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {players?.filter(p => !addedPlayerIds.includes(p.id)).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  All players have been added
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
