import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Globe, Trophy, Calendar, Edit2, Trash2, Flag, Clock, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PlayerInternationalRecord } from "@shared/schema";

const internationalRecordSchema = z.object({
  nationalTeam: z.string().min(1, "National team is required"),
  teamLevel: z.string().default("senior"),
  caps: z.coerce.number().min(0).default(0),
  goals: z.coerce.number().min(0).default(0),
  assists: z.coerce.number().min(0).default(0),
  debutDate: z.string().optional(),
  lastAppearance: z.string().optional(),
  competitionLevel: z.string().optional(),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
});

type InternationalRecordFormData = z.infer<typeof internationalRecordSchema>;

interface PlayerInternationalRecordsProps {
  playerId: string;
  playerName: string;
}

export default function PlayerInternationalRecords({ playerId, playerName }: PlayerInternationalRecordsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PlayerInternationalRecord | null>(null);
  const { toast } = useToast();

  const { data: records = [], isLoading } = useQuery<PlayerInternationalRecord[]>({
    queryKey: ["/api/players", playerId, "international-records"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${playerId}/international-records`);
      if (!res.ok) throw new Error("Failed to fetch international records");
      return res.json();
    },
  });

  const form = useForm<InternationalRecordFormData>({
    resolver: zodResolver(internationalRecordSchema),
    defaultValues: {
      nationalTeam: "",
      teamLevel: "senior",
      caps: 0,
      goals: 0,
      assists: 0,
      debutDate: "",
      lastAppearance: "",
      competitionLevel: "",
      notes: "",
      documentUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InternationalRecordFormData) => {
      return apiRequest("POST", `/api/players/${playerId}/international-records`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId, "international-records"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Record added",
        description: "International record has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add record",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InternationalRecordFormData }) => {
      return apiRequest("PUT", `/api/players/${playerId}/international-records/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId, "international-records"] });
      setEditingRecord(null);
      form.reset();
      toast({
        title: "Record updated",
        description: "International record has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update record",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/players/${playerId}/international-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId, "international-records"] });
      toast({
        title: "Record deleted",
        description: "International record has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InternationalRecordFormData) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (record: PlayerInternationalRecord) => {
    setEditingRecord(record);
    form.reset({
      nationalTeam: record.nationalTeam,
      teamLevel: record.teamLevel || "senior",
      caps: record.caps || 0,
      goals: record.goals || 0,
      assists: record.assists || 0,
      debutDate: record.debutDate || "",
      lastAppearance: record.lastAppearance || "",
      competitionLevel: record.competitionLevel || "",
      notes: record.notes || "",
      documentUrl: record.documentUrl || "",
    });
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingRecord(null);
    form.reset();
  };

  const totalCaps = records.reduce((sum, r) => sum + (r.caps || 0), 0);
  const totalGoals = records.reduce((sum, r) => sum + (r.goals || 0), 0);
  const totalAssists = records.reduce((sum, r) => sum + (r.assists || 0), 0);

  const RecordForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nationalTeam"
            render={({ field }) => (
              <FormItem>
                <FormLabel>National Team</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Nigeria, Brazil" data-testid="input-national-team" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="teamLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-team-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="u23">U-23</SelectItem>
                    <SelectItem value="u21">U-21</SelectItem>
                    <SelectItem value="u20">U-20</SelectItem>
                    <SelectItem value="u19">U-19</SelectItem>
                    <SelectItem value="u17">U-17</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="caps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Caps</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min={0} data-testid="input-caps" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="goals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Goals</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min={0} data-testid="input-goals" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assists"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assists</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min={0} data-testid="input-assists" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="debutDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Debut Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-debut-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastAppearance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Appearance</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-last-appearance" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="competitionLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competition Level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl>
                  <SelectTrigger data-testid="select-competition-level">
                    <SelectValue placeholder="Select competition level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="world_cup">FIFA World Cup</SelectItem>
                  <SelectItem value="continental">Continental Championship</SelectItem>
                  <SelectItem value="world_cup_qualifier">World Cup Qualifier</SelectItem>
                  <SelectItem value="continental_qualifier">Continental Qualifier</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="youth_tournament">Youth Tournament</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supporting Document URL (optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." data-testid="input-document-url" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Additional notes about international career..." data-testid="textarea-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={closeDialog}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending} 
            data-testid="button-submit-record"
          >
            {createMutation.isPending || updateMutation.isPending 
              ? "Saving..." 
              : editingRecord ? "Update Record" : "Add Record"}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Card data-testid="card-international-records">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">International Career</CardTitle>
        </div>
        <Dialog open={isAddDialogOpen || !!editingRecord} onOpenChange={(open) => !open && closeDialog()}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-international-record">
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                {editingRecord ? "Edit International Record" : "Add International Record"}
              </DialogTitle>
              <DialogDescription>
                {editingRecord 
                  ? `Update ${playerName}'s international record for ${editingRecord.nationalTeam}`
                  : `Add a new international record for ${playerName}`}
              </DialogDescription>
            </DialogHeader>
            <RecordForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No international records yet</p>
            <p className="text-sm">Add records to track international career</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-md">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalCaps}</p>
                <p className="text-xs text-muted-foreground">Total Caps</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalGoals}</p>
                <p className="text-xs text-muted-foreground">Goals</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{totalAssists}</p>
                <p className="text-xs text-muted-foreground">Assists</p>
              </div>
            </div>

            <div className="space-y-3">
              {records.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-start justify-between gap-4 p-4 border rounded-md"
                  data-testid={`international-record-${record.id}`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{record.nationalTeam}</span>
                      <Badge variant="secondary" className="text-xs">
                        {record.teamLevel || "senior"}
                      </Badge>
                      {record.verificationStatus === "verified" && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {record.caps || 0} caps
                      </span>
                      <span>{record.goals || 0} goals</span>
                      <span>{record.assists || 0} assists</span>
                    </div>
                    {record.debutDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Debut: {record.debutDate}
                        {record.lastAppearance && ` - Last: ${record.lastAppearance}`}
                      </div>
                    )}
                    {record.competitionLevel && (
                      <Badge variant="outline" className="text-xs">
                        {record.competitionLevel.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {record.documentUrl && (
                      <a 
                        href={record.documentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        View Document
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleEdit(record)}
                      data-testid={`button-edit-record-${record.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteMutation.mutate(record.id)}
                      data-testid={`button-delete-record-${record.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
