import { useState } from "react";
import { useLocation } from "wouter";
import ScoutingInquiryCard from "@/components/ScoutingInquiryCard";
import PlayerCard from "@/components/PlayerCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Plus, MessageSquare, Send, Users } from "lucide-react";
import { mockScoutingInquiries, mockPlayers } from "@/lib/mock-data";

export default function Scouting() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // todo: remove mock functionality
  const inquiries = mockScoutingInquiries;
  const players = mockPlayers;

  const filteredInquiries = inquiries.filter((i) => {
    const player = players.find((p) => p.id === i.playerId);
    return (
      player?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.buyingClub.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sellingClub.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleMessage = (id: string) => {
    setSelectedInquiry(id);
    setMessageDialogOpen(true);
  };

  const handleSendMessage = () => {
    console.log("Send message to inquiry", selectedInquiry, message);
    setMessage("");
    setMessageDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-scouting">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Scouting Dashboard</h1>
          <p className="text-muted-foreground">Connect with buying clubs and manage transfer inquiries</p>
        </div>
        <Button data-testid="button-new-inquiry">
          <Plus className="h-4 w-4 mr-2" />
          New Inquiry
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search inquiries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-scouting"
        />
      </div>

      <Tabs defaultValue="inquiries" className="w-full">
        <TabsList>
          <TabsTrigger value="inquiries" data-testid="tab-inquiries">
            <MessageSquare className="h-4 w-4 mr-2" />
            Inquiries ({inquiries.length})
          </TabsTrigger>
          <TabsTrigger value="players" data-testid="tab-available-players">
            <Users className="h-4 w-4 mr-2" />
            Available Players
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inquiries" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInquiries.map((inquiry) => {
              const player = players.find((p) => p.id === inquiry.playerId);
              return (
                <ScoutingInquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  playerName={player ? `${player.firstName} ${player.lastName}` : "Unknown"}
                  onViewDetails={(id) => console.log("View details", id)}
                  onMessage={handleMessage}
                />
              );
            })}
            {filteredInquiries.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No inquiries found matching your search
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Players Available for Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onViewProfile={(id) => setLocation(`/players/${id}`)}
                    onGenerateReport={(id) => console.log("Generate report", id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent data-testid="dialog-message">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to the buying club..."
                rows={4}
                data-testid="textarea-message"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} data-testid="button-send-message">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
