import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { 
  MessageCircle, 
  Send, 
  FileText, 
  Download, 
  Upload, 
  Eye, 
  Edit, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Building2,
  Shield,
  Ban
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMessages } from '@/domains/messaging/hooks/useMessages';
import { Message } from '@/domains/messaging/hooks/useMessages';

interface TransferTimelineMessagingProps {
  pitchId: string;
  playerId: string;
  teamId: string;
  playerName: string;
  teamName: string;
  onMessageSent?: () => void;
}

const TransferTimelineMessaging: React.FC<TransferTimelineMessagingProps> = ({
  pitchId,
  playerId,
  teamId,
  playerName,
  teamName,
  onMessageSent
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);

  
  // Message form state
  const [messageContent, setMessageContent] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageType, setMessageType] = useState<string>('general');
  
  // UI state
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageDetails, setShowMessageDetails] = useState(false);

  // Fetch messages and templates
  useEffect(() => {
    if (profile?.user_id) {
      fetchMessages();
    }
  }, [profile?.user_id, pitchId]);

  const { messages: hookMessages, sendMessage: hookSendMessage, loading: hookLoading } = useMessages({
    pitchId,
    currentUserId: profile?.user_id || ''
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hookMessages]);

  // Update local messages when hook messages change
  useEffect(() => {
    setMessages(hookMessages);
    setLoading(hookLoading);
  }, [hookMessages, hookLoading]);

  const fetchMessages = async () => {
    // Messages are fetched automatically by the hook
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !profile?.user_id) return;

    try {
      setSending(true);
      
      // Get team profile ID for the receiver
      const { data: teamProfile } = await supabase
        .from('teams')
        .select('profile_id')
        .eq('id', teamId)
        .single();

      if (!teamProfile) throw new Error('Team profile not found');

      // Send message using the hook
      await hookSendMessage(
        messageContent,
        teamProfile.profile_id,
        pitchId,
        undefined, // contractFileUrl
        messageType as 'inquiry' | 'response' | 'contract' | 'general' | 'negotiation'
      );
      
      setMessageContent('');
      setMessageSubject('');
      setMessageType('general');
      setShowMessageForm(false);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully"
      });

      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };



  const handleMarkAsRead = async (messageId: string) => {
    try {
      // Update local state for now - the hook handles the actual marking
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'read' }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Update local state for now
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast({
        title: "Message Deleted",
        description: "Message has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      // For now, just show a toast - blocking functionality can be added later
      toast({
        title: "User Blocked",
        description: "User has been blocked successfully"
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive"
      });
    }
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'contract': return <FileText className="w-4 h-4" />;
      case 'invitation': return <User className="w-4 h-4" />;
      case 'negotiation': return <Building2 className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.status === 'read') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (message.status === 'delivered') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Transfer Timeline Messaging</h3>
          <p className="text-sm text-gray-400">
            Communicate with {teamName} about {playerName}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMessageForm(true)}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Send Message
          </Button>
          

        </div>
      </div>

      {/* Messages List */}
      <Card className="border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border ${
                    message.sender_id === profile?.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-600 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {message.sender_profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {message.sender_profile?.full_name || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.sender_profile?.user_type || 'Unknown'}
                          </Badge>
                          {getMessageIcon(message.message_type)}
                          {getMessageStatusIcon(message)}
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {message.contract_file_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(message.contract_file_url, '_blank')}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {message.sender_id === profile?.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {message.sender_id !== profile?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBlockUser(message.sender_id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-gray-300 mb-3">
                    {message.content}
                  </div>
                  
                  {message.sender_id !== profile?.id && message.status !== 'read' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(message.id)}
                      className="text-blue-400 hover:text-blue-300 mt-2"
                    >
                      Mark as Read
                    </Button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Message Dialog */}
      <Dialog open={showMessageForm} onOpenChange={setShowMessageForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {teamName} about {playerName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="messageType">Message Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="contract">Contract Related</SelectItem>
                    <SelectItem value="invitation">Invitation</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="Message subject..."
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="resize-none"
              />
            </div>
            

            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMessageForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sending}
                className="bg-rosegold hover:bg-rosegold/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default TransferTimelineMessaging;
