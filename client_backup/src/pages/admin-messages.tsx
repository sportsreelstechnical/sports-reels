import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Mail, 
  Clock, 
  User,
  Eye,
  Check,
  Flag,
  RefreshCw
} from "lucide-react";

type AdminMessage = {
  id: string;
  originalMessageId: string;
  senderId: string;
  senderName: string | null;
  senderRole: string | null;
  recipientId: string;
  recipientName: string | null;
  subject: string | null;
  content: string;
  status: string;
  flagReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
};

export default function AdminMessages() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: messages, isLoading, refetch } = useQuery<AdminMessage[]>({
    queryKey: ["/api/admin/messages", statusFilter !== "all" ? statusFilter : undefined],
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) => {
      return apiRequest(`/api/admin/messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewNotes }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      setDialogOpen(false);
      setSelectedMessage(null);
      setReviewNotes("");
      toast({ title: "Message updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update message", description: error.message, variant: "destructive" });
    },
  });

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "pending": return "secondary";
      case "reviewed": return "default";
      case "flagged": return "destructive";
      case "cleared": return "outline";
      default: return "outline";
    }
  };

  const pendingCount = messages?.filter(m => m.status === "pending").length || 0;
  const flaggedCount = messages?.filter(m => m.status === "flagged").length || 0;

  return (
    <div className="p-6 space-y-6" data-testid="admin-messages-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-messages-title">
            <Mail className="h-6 w-6" />
            Message Center
          </h1>
          <p className="text-muted-foreground">Review scout-to-player communications</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
          {flaggedCount > 0 && (
            <Badge variant="destructive">{flaggedCount} flagged</Badge>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{messages?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{flaggedCount}</div>
            <p className="text-sm text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {messages?.filter(m => m.status === "reviewed" || m.status === "cleared").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Message Inbox</CardTitle>
              <CardDescription>All scout communications for review</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages && messages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id} data-testid={`row-message-${message.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{message.senderName || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{message.senderRole}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{message.recipientName || "Unknown"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {message.subject || message.content.substring(0, 50)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(message.status)}>
                        {message.status}
                      </Badge>
                      {message.flagReason && (
                        <div className="text-xs text-destructive mt-1">{message.flagReason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(message.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedMessage(message);
                            setDialogOpen(true);
                          }}
                          data-testid={`button-view-${message.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {message.status === "pending" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => updateMessageMutation.mutate({ id: message.id, status: "reviewed" })}
                              disabled={updateMessageMutation.isPending}
                              data-testid={`button-approve-${message.id}`}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => updateMessageMutation.mutate({ id: message.id, status: "flagged" })}
                              disabled={updateMessageMutation.isPending}
                              data-testid={`button-flag-${message.id}`}
                            >
                              <Flag className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No messages to review</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Review message content and update status
            </DialogDescription>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{selectedMessage.senderName}</p>
                  <p className="text-sm text-muted-foreground">{selectedMessage.senderRole}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-medium">{selectedMessage.recipientName}</p>
                </div>
              </div>
              {selectedMessage.subject && (
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedMessage.subject}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Content</p>
                <div className="p-3 rounded-md bg-muted mt-1">
                  {selectedMessage.content}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusVariant(selectedMessage.status)}>
                    {selectedMessage.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="text-sm">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Review Notes</p>
                <Textarea 
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this message..."
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            {selectedMessage?.status === "pending" && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => updateMessageMutation.mutate({ 
                    id: selectedMessage.id, 
                    status: "flagged",
                    reviewNotes 
                  })}
                  disabled={updateMessageMutation.isPending}
                  data-testid="button-confirm-flag"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Flag
                </Button>
                <Button 
                  onClick={() => updateMessageMutation.mutate({ 
                    id: selectedMessage.id, 
                    status: "reviewed",
                    reviewNotes 
                  })}
                  disabled={updateMessageMutation.isPending}
                  data-testid="button-confirm-review"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark Reviewed
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
