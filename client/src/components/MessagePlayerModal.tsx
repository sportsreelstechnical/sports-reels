
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, X, AlertTriangle, MessageSquare, User } from 'lucide-react';

interface MessagePlayerModalProps {
  player: {
    id: string;
    full_name: string;
    position: string;
    headshot_url?: string;
    photo_url?: string;
    pitchId?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

const MessagePlayerModal: React.FC<MessagePlayerModalProps> = ({
  player,
  isOpen,
  onClose,
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamOwner, setTeamOwner] = useState<{ id: string; full_name: string } | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    message_type: 'inquiry'
  });

  useEffect(() => {
    if (isOpen && player) {
      fetchTeamOwner();
      setFormData({
        subject: `Interest in ${player.full_name}`,
        content: '',
        message_type: 'inquiry'
      });
    }
  }, [isOpen, player]);

  const fetchTeamOwner = async () => {
    try {
      // Get the team ID from the player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('team_id')
        .eq('id', player.id)
        .single();

      if (playerError || !playerData) {
        console.error('Error fetching player team:', playerError);
        return;
      }

      // Get the team owner's profile
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          profile_id,
          profiles!inner(
            id,
            full_name
          )
        `)
        .eq('id', playerData.team_id)
        .single();

      if (teamError || !teamData) {
        console.error('Error fetching team owner:', teamError);
        return;
      }

      setTeamOwner({
        id: teamData.profiles.id,
        full_name: teamData.profiles.full_name
      });

    } catch (error) {
      console.error('Error fetching team owner:', error);
    }
  };

  const validateMessage = (content: string) => {
    // Check for phone numbers
    const phoneRegex = /(\+?[0-9]{10,15})|([0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/;
    if (phoneRegex.test(content)) {
      return 'Phone numbers are not allowed in messages';
    }

    // Check for email addresses
    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    if (emailRegex.test(content)) {
      return 'Email addresses are not allowed in messages';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id || !teamOwner) {
      toast({
        title: "Error",
        description: "Unable to send message. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Validate content for contact information
    const validationError = validateMessage(formData.content);
    if (validationError) {
      toast({
        title: "Message Blocked",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    const subjectValidationError = validateMessage(formData.subject);
    if (subjectValidationError) {
      toast({
        title: "Message Blocked",
        description: subjectValidationError,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const messageData = {
        sender_id: profile.id,
        receiver_id: teamOwner.id,
        player_id: player.id,
        pitch_id: player.pitchId || null,
        subject: formData.subject,
        content: formData.content,
        message_type: formData.message_type,
        is_read: false
      };

      const { error } = await supabase
        .from('messages')
        .insert({
          ...messageData,
          status: 'sent',
          contract_file_url: null
        });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: `Your message about ${player.full_name} has been sent successfully.`,
      });

      onClose();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#1a1a1a] border-gray-700">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white font-polysans">
            Express Interest
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700">
              {player.headshot_url || player.photo_url ? (
                <img
                  src={player.headshot_url || player.photo_url}
                  alt={player.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-polysans font-bold text-white text-lg">
                {player.full_name}
              </h3>
              <p className="text-gray-300">{player.position}</p>
              {teamOwner && (
                <p className="text-sm text-gray-400">
                  Message will be sent to: {teamOwner.full_name}
                </p>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-yellow-400 font-semibold text-sm">Important Notice</p>
                <p className="text-yellow-300 text-sm">
                  Do not include phone numbers or email addresses in your messages. 
                  Messages containing contact information will be automatically flagged and blocked.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Message Type */}
            <div className="space-y-2">
              <Label className="text-white">Message Type</Label>
              <Select value={formData.message_type} onValueChange={(value) => 
                setFormData({...formData, message_type: value})
              }>
                <SelectTrigger className="bg-[#111111] border-0 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-0">
                  <SelectItem value="inquiry" className="text-white">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      General Inquiry
                    </div>
                  </SelectItem>
                  <SelectItem value="transfer_interest" className="text-white">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Transfer Interest
                    </div>
                  </SelectItem>
                  <SelectItem value="negotiation" className="text-white">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Contract Negotiation
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-white">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="bg-[#111111] border-0 text-white"
                placeholder="Enter message subject"
                required
              />
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-white">Message</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="bg-[#111111] border-0 text-white resize-none"
                placeholder="Express your interest in this player. Avoid including phone numbers or email addresses..."
                rows={6}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading || !teamOwner}
                className="bg-bright-pink hover:bg-bright-pink/90 text-white font-polysans"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessagePlayerModal;
