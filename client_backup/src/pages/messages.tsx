import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { MessageSquare, Send, Plus, Users, Building2, UserCheck, Globe } from "lucide-react";
import { z } from "zod";
import type { Conversation, Message, Player } from "@shared/schema";

interface ConversationWithMessages {
  conversation: Conversation;
  participants: { userId: string; role: string }[];
  messages: Message[];
}

const newConversationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  playerId: z.string().optional(),
  type: z.enum(["transfer_inquiry", "scout_contact", "embassy_verification", "general"]),
});

type NewConversationFormData = z.infer<typeof newConversationSchema>;

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<NewConversationFormData>({
    resolver: zodResolver(newConversationSchema),
    defaultValues: {
      title: "",
      playerId: "",
      type: "general",
    },
  });

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: conversationDetails, isLoading: detailsLoading } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: NewConversationFormData) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return await response.json();
    },
    onSuccess: (newConv: any) => {
      toast({
        title: "Conversation Created",
        description: "You can now start messaging in this conversation.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(newConv.id);
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
      setNewMessage("");
    },
  });

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const onSubmitNewConversation = (data: NewConversationFormData) => {
    createConversationMutation.mutate(data);
  };

  const getConversationTypeIcon = (type: string) => {
    switch (type) {
      case "transfer_inquiry":
        return <Globe className="h-5 w-5 text-blue-500" />;
      case "scout_contact":
        return <UserCheck className="h-5 w-5 text-green-500" />;
      case "embassy_verification":
        return <Building2 className="h-5 w-5 text-purple-500" />;
      default:
        return <Users className="h-5 w-5 text-primary" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "team":
      case "sporting_director":
      case "admin":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "scout":
      case "agent":
        return "bg-green-500/10 text-green-600 border-green-200";
      case "embassy":
        return "bg-purple-500/10 text-purple-600 border-purple-200";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Messages</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-new-conversation">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Conversation</DialogTitle>
                  <DialogDescription>
                    Start a three-way conversation with teams, scouts/agents, or embassy officials
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitNewConversation)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conversation Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Transfer Discussion - Player Name" {...field} data-testid="input-conv-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conversation Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-conv-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="transfer_inquiry">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4" />
                                  Transfer Inquiry
                                </div>
                              </SelectItem>
                              <SelectItem value="scout_contact">
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-4 w-4" />
                                  Scout/Agent Contact
                                </div>
                              </SelectItem>
                              <SelectItem value="embassy_verification">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  Embassy Verification
                                </div>
                              </SelectItem>
                              <SelectItem value="general">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  General Discussion
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="playerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Player (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-conv-player">
                                <SelectValue placeholder="Select a player" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {players.map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  {player.firstName} {player.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createConversationMutation.isPending} data-testid="button-create-conversation">
                        {createConversationMutation.isPending ? <LoadingSpinner size="sm" /> : "Create Conversation"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Three-way messaging: Team, Scout/Agent, Embassy
          </p>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Click + to start one</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-3 rounded-md text-left hover-elevate ${
                    selectedConversation === conv.id ? "bg-accent" : ""
                  }`}
                  data-testid={`button-conversation-${conv.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getConversationTypeIcon(conv.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{conv.title || "Untitled Conversation"}</p>
                      <p className="text-xs text-muted-foreground truncate capitalize">
                        {conv.type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversation && conversationDetails ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {getConversationTypeIcon(conversationDetails.conversation.type)}
                  <div>
                    <h2 className="font-semibold">{conversationDetails.conversation.title || "Conversation"}</h2>
                    <p className="text-xs text-muted-foreground capitalize">
                      {conversationDetails.conversation.type.replace(/_/g, " ")} - {conversationDetails.participants.length} participants
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {conversationDetails.participants.map((p, i) => (
                    <Badge key={i} variant="outline" className={getRoleBadgeColor(p.role)}>
                      {p.role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {detailsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : conversationDetails.messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation below</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversationDetails.messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`text-xs ${getRoleBadgeColor(msg.senderRole || "")}`}>
                          {msg.senderRole?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={getRoleBadgeColor(msg.senderRole || "")}>
                            {msg.senderRole}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-sm bg-muted/50 rounded-md p-2">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  data-testid="input-message"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Or create a new one to start messaging</p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-md bg-blue-500/10 text-blue-600">
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  Team
                </div>
                <div className="p-3 rounded-md bg-green-500/10 text-green-600">
                  <UserCheck className="h-6 w-6 mx-auto mb-2" />
                  Scout/Agent
                </div>
                <div className="p-3 rounded-md bg-purple-500/10 text-purple-600">
                  <Building2 className="h-6 w-6 mx-auto mb-2" />
                  Embassy
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
