import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock, User, Ruler, Weight, Heart, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@shared/schema";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  nationality: z.string().min(1, "Nationality is required"),
  secondNationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  birthPlace: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  secondaryPosition: z.string().optional(),
  currentClubName: z.string().optional(),
  jerseyNumber: z.coerce.number().min(0).optional(),
  agentName: z.string().optional(),
  agentContact: z.string().optional(),
  contractEndDate: z.string().optional(),
  marketValue: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  heightUnit: z.string().default("cm"),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.string().default("kg"),
  wingspan: z.coerce.number().min(0).optional(),
  preferredFoot: z.string().optional(),
  bmi: z.coerce.number().min(0).optional(),
  nationalTeamCaps: z.coerce.number().min(0).default(0),
  nationalTeamGoals: z.coerce.number().min(0).default(0),
  internationalCaps: z.coerce.number().min(0).default(0),
  internationalGoals: z.coerce.number().min(0).default(0),
  continentalGames: z.coerce.number().min(0).default(0),
  clubMinutesCurrentSeason: z.coerce.number().min(0).default(0),
  clubMinutesLast12Months: z.coerce.number().min(0).default(0),
  internationalMinutesCurrentSeason: z.coerce.number().min(0).default(0),
  internationalMinutesLast12Months: z.coerce.number().min(0).default(0),
  totalCareerMinutes: z.coerce.number().min(0).default(0),
  profileDocumentUrl: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface PlayerProfileEditorProps {
  player: Player;
  onSaved?: () => void;
}

export default function PlayerProfileEditor({ player, onSaved }: PlayerProfileEditorProps) {
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: player.firstName || "",
      lastName: player.lastName || "",
      nationality: player.nationality || "",
      secondNationality: player.secondNationality || "",
      dateOfBirth: player.dateOfBirth || "",
      birthPlace: player.birthPlace || "",
      position: player.position || "",
      secondaryPosition: player.secondaryPosition || "",
      currentClubName: player.currentClubName || "",
      jerseyNumber: player.jerseyNumber ?? 0,
      agentName: player.agentName || "",
      agentContact: player.agentContact || "",
      contractEndDate: player.contractEndDate || "",
      marketValue: player.marketValue ?? 0,
      height: player.height ?? 0,
      heightUnit: player.heightUnit || "cm",
      weight: player.weight ?? 0,
      weightUnit: player.weightUnit || "kg",
      wingspan: player.wingspan ?? 0,
      preferredFoot: player.preferredFoot || "",
      bmi: player.bmi ?? 0,
      nationalTeamCaps: player.nationalTeamCaps || 0,
      nationalTeamGoals: player.nationalTeamGoals || 0,
      internationalCaps: player.internationalCaps || 0,
      internationalGoals: player.internationalGoals || 0,
      continentalGames: player.continentalGames || 0,
      clubMinutesCurrentSeason: player.clubMinutesCurrentSeason || 0,
      clubMinutesLast12Months: player.clubMinutesLast12Months || 0,
      internationalMinutesCurrentSeason: player.internationalMinutesCurrentSeason || 0,
      internationalMinutesLast12Months: player.internationalMinutesLast12Months || 0,
      totalCareerMinutes: player.totalCareerMinutes || 0,
      profileDocumentUrl: player.profileDocumentUrl || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PUT", `/api/players/${player.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players", player.id] });
      toast({
        title: "Profile updated",
        description: "Player profile has been saved successfully.",
      });
      onSaved?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    if (data.secondaryPosition === "none") {
      data.secondaryPosition = undefined;
    }
    if (data.height && data.weight) {
      const heightInMeters = data.heightUnit === "cm" ? data.height / 100 : data.height * 0.3048;
      const weightInKg = data.weightUnit === "kg" ? data.weight : data.weight * 0.453592;
      data.bmi = Math.round((weightInKg / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    updateMutation.mutate(data);
  };

  return (
    <Card data-testid="card-player-profile-editor">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Player Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" data-testid="tab-basic">Basic</TabsTrigger>
                <TabsTrigger value="biometrics" data-testid="tab-biometrics">Biometrics</TabsTrigger>
                <TabsTrigger value="international" data-testid="tab-international">International</TabsTrigger>
                <TabsTrigger value="minutes" data-testid="tab-minutes">Minutes</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nationality</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-nationality" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondNationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Second Nationality (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-second-nationality" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-position">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Defender">Defender</SelectItem>
                            <SelectItem value="Midfielder">Midfielder</SelectItem>
                            <SelectItem value="Winger">Winger</SelectItem>
                            <SelectItem value="Striker">Striker</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secondaryPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Position (optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-secondary-position">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Defender">Defender</SelectItem>
                            <SelectItem value="Midfielder">Midfielder</SelectItem>
                            <SelectItem value="Winger">Winger</SelectItem>
                            <SelectItem value="Striker">Striker</SelectItem>
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
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-edit-dob" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthPlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Place</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="City, Country" data-testid="input-edit-birthplace" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="currentClubName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Club</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Club name" data-testid="input-edit-club" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jerseyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} max={99} data-testid="input-edit-jersey" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contractEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-edit-contract" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marketValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Market Value (EUR)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-edit-market-value" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="agentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Agent name" data-testid="input-edit-agent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agentContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Contact</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Email or phone" data-testid="input-edit-agent-contact" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="biometrics" className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Physical measurements and biometric data</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          Height
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-edit-height" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-height-unit">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="ft">ft</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wingspan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wingspan (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-edit-wingspan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          Weight
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-edit-weight" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-weight-unit">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bmi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BMI (auto-calculated)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} readOnly className="bg-muted" data-testid="input-edit-bmi" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preferredFoot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Foot</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-preferred-foot">
                            <SelectValue placeholder="Select preferred foot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Right">Right</SelectItem>
                          <SelectItem value="Left">Left</SelectItem>
                          <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profileDocumentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Document URL (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." data-testid="input-profile-doc" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="international" className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">National team statistics</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nationalTeamCaps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National Team Caps</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-national-caps" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationalTeamGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National Team Goals</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-national-goals" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="internationalCaps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>International Caps (All)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-intl-caps" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internationalGoals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>International Goals (All)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-intl-goals" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="continentalGames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Continental Games</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} data-testid="input-continental-games" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="minutes" className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Playing time tracking</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clubMinutesCurrentSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club Minutes (Current Season)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-club-minutes-season" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clubMinutesLast12Months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club Minutes (Last 12 Months)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-club-minutes-12m" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="internationalMinutesCurrentSeason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>International Minutes (Current Season)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-intl-minutes-season" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internationalMinutesLast12Months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>International Minutes (Last 12 Months)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-intl-minutes-12m" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="totalCareerMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Career Minutes</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} data-testid="input-total-career-minutes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={updateMutation.isPending} 
                data-testid="button-save-profile"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
