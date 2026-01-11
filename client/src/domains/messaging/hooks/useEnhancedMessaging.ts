import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  pitch_id?: string;
  player_id?: string;
  contract_file_url?: string;
  message_type: string;
  created_at: string;
  is_flagged: boolean;
  sender_profile?: {
    full_name: string;
    user_type: string;
  };
}

interface MessageViolation {
  type: 'phone' | 'email';
  content: string;
  position: number;
}

export const useEnhancedMessaging = (pitchId?: string) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Enhanced content validation patterns
  const patterns = {
    phone: [
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /(\+?\d{1,4}[-.\s]?)?\d{10,15}/g,
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g,
      /(\+\d{1,3}\s?\d{1,14})/g,
    ],
    email: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g,
      /[a-zA-Z0-9._%+-]+\[at\][a-zA-Z0-9.-]+\[dot\][a-zA-Z]{2,}/g,
    ]
  };

  const detectViolations = (content: string): MessageViolation[] => {
    const violations: MessageViolation[] = [];

    // Check for phone numbers
    patterns.phone.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: 'phone',
            content: match[0],
            position: match.index
          });
        }
      }
    });

    // Check for email addresses
    patterns.email.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: 'email',
            content: match[0],
            position: match.index
          });
        }
      }
    });

    return violations;
  };

  const handleViolation = async (messageId: string, violations: MessageViolation[]) => {
    if (!profile?.user_id) return;

    try {
      // Flag the message
      await supabase
        .from('messages')
        .update({ is_flagged: true })
        .eq('id', messageId);

      // Record violation with correct structure
      const violationData = {
        message_id: messageId,
        user_id: profile.user_id,
        violation_type: violations.map(v => v.type).join(', '),
        violation_content: JSON.stringify(violations)
      };

      const { error: violationError } = await supabase
        .from('message_violations')
        .insert(violationData);

      if (violationError) {
        console.error('Error recording violation:', violationError);
      }

      // Update user warning count
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('contact_warnings')
        .eq('user_id', profile.user_id)
        .single();

      const newWarningCount = (currentProfile?.contact_warnings || 0) + 1;

      await supabase
        .from('profiles')
        .update({
          contact_warnings: newWarningCount,
          last_contact_check: new Date().toISOString(),
          is_blocked: newWarningCount >= 3
        })
        .eq('user_id', profile.user_id);

      if (newWarningCount >= 3) {
        toast({
          title: "Account Blocked",
          description: "Your account has been blocked due to repeated policy violations.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Content Violation",
          description: `Contact information detected. Warning ${newWarningCount}/3.`,
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Error handling violation:', error);
    }
  };

  const fetchMessages = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(
            full_name,
            user_type
          )
        `)
        .or(`sender_id.eq.${profile.user_id},receiver_id.eq.${profile.user_id}`)
        .order('created_at', { ascending: true });

      if (pitchId) {
        query = query.eq('pitch_id', pitchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async (
    content: string,
    receiverId: string,
    options: {
      pitchId?: string;
      playerId?: string;
      contractFileUrl?: string;
      messageType?: string;
    } = {}
  ) => {
    if (!profile?.user_id) return;

    setSending(true);

    try {
      // Validate content for violations
      const violations = detectViolations(content);
      
      if (violations.length > 0) {
        toast({
          title: "Message Blocked",
          description: "Contact information is not allowed in messages.",
          variant: "destructive"
        });
        return;
      }

      const messageData = {
        content,
        sender_id: profile.user_id,
        receiver_id: receiverId,
        pitch_id: options.pitchId,
        player_id: options.playerId,
        contract_file_url: options.contractFileUrl,
        message_type: options.messageType || 'general',
        is_flagged: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(
            full_name,
            user_type
          )
        `)
        .single();

      if (error) throw error;

      // Create notification for receiver
      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          title: 'New Message',
          message: `You have a new message from ${profile.full_name || 'Unknown'}`,
          type: 'message',
          metadata: {
            sender_id: profile.user_id,
            message_id: data.id,
            pitch_id: options.pitchId
          }
        });

      setMessages(prev => [...prev, data]);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
        duration: 2000,
      });

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      throw error;
    } finally {
      setSending(false);
    }
  }, [profile, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!profile?.user_id) return;

    fetchMessages();

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${profile.user_id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          toast({
            title: "New Message",
            description: `New message received`,
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id, pitchId, toast]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    fetchMessages
  };
};
