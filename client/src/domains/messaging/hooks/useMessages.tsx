

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  pitch_id?: string;
  contract_file_url?: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  message_type?: 'inquiry' | 'response' | 'contract' | 'general' | 'negotiation';
  sender_profile?: {
    full_name: string;
    user_type: string;
  };
  receiver_profile?: {
    full_name: string;
    user_type: string;
  };
}

interface UseMessagesProps {
  pitchId?: string;
  teamId?: string;
  agentId?: string;
  currentUserId: string;
}

export function useMessages({ pitchId, teamId, agentId, currentUserId }: UseMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Enhanced regex patterns for better detection
  const phoneRegex = /(\+?[0-9]{1,4}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|[0-9]{10,15}/g;
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  // Helper function to transform database messages to our Message interface
  const transformMessage = (dbMessage: any): Message => {
    return {
      id: dbMessage.id,
      content: dbMessage.content,
      sender_id: dbMessage.sender_id,
      receiver_id: dbMessage.receiver_id,
      pitch_id: dbMessage.pitch_id,
      contract_file_url: dbMessage.contract_file_url,
      created_at: dbMessage.created_at,
      status: dbMessage.status as 'sent' | 'delivered' | 'read',
      message_type: dbMessage.message_type as 'inquiry' | 'response' | 'contract' | 'general' | 'negotiation',
      sender_profile: dbMessage.sender_profile,
      receiver_profile: dbMessage.receiver_profile,
    };
  };

  // Real-time subscription for instant message delivery
  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('Real-time message received:', payload.new);
          console.log('Message sender profile:', payload.new.sender_profile);
          
          // Add new message to state with a smooth animation
          setMessages(prev => {
            const newMessage = transformMessage(payload.new);
            
            // Check if message already exists to avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            
            // Add message with a highlight effect
            const updatedMessages = [...prev, { ...newMessage, isNew: true }];
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              setMessages(current => 
                current.map(msg => 
                  msg.id === newMessage.id ? { ...msg, isNew: false } : msg
                )
              );
            }, 3000);
            
            return updatedMessages;
          });

          // Show notification toast
          toast({
            title: "New Message",
            description: `You have a new message from ${payload.new.sender_profile?.full_name || 'Unknown'}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          // Update message status (read/delivered)
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...transformMessage(payload.new) } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [currentUserId, toast]);

  // Fetch existing messages
  useEffect(() => {
    if (!currentUserId) return;
    fetchMessages();
  }, [currentUserId, pitchId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(
            full_name,
            user_type
          ),
          receiver_profile:profiles!messages_receiver_id_fkey(
            full_name,
            user_type
          )
        `)
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: true });

      if (pitchId) {
        query = query.eq('pitch_id', pitchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive"
        });
        return;
      }

      // Transform the data to match our Message interface
      const transformedMessages = (data || []).map(transformMessage);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced send message with better validation and blocking
  const sendMessage = useCallback(async (
    content: string, 
    receiverId: string, 
    pitchId?: string,
    contractFileUrl?: string,
    messageType: 'inquiry' | 'response' | 'contract' | 'general' | 'negotiation' = 'general'
  ) => {
    try {
      setSending(true);

      // Enhanced content validation
      const validationResult = validateMessageContent(content);
      if (!validationResult.isValid) {
        toast({
          title: "Message Blocked",
          description: validationResult.error,
          variant: "destructive"
        });

        // Block the sender's profile if contact info is detected
        if (validationResult.shouldBlock) {
          await blockUserProfile(currentUserId);
        }

        throw new Error(validationResult.error);
      }

      // Check if receiver is blocked (only if is_blocked field exists)
      try {
        const { data: receiverProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', receiverId)
          .single();

        // Check if the profile has an is_blocked field and if it's true
        if (!profileError && receiverProfile && 'is_blocked' in receiverProfile && (receiverProfile as any).is_blocked) {
          toast({
            title: "Cannot Send Message",
            description: "This user's account has been blocked due to policy violations.",
            variant: "destructive"
          });
          throw new Error('Receiver account is blocked');
        }
      } catch (error) {
        // If is_blocked field doesn't exist, continue without blocking check
        console.log('is_blocked field not available, skipping blocking check');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: currentUserId,
          receiver_id: receiverId,
          pitch_id: pitchId,
          message_type: messageType,
          contract_file_url: contractFileUrl,
        })
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(
            full_name,
            user_type
          ),
          receiver_profile:profiles!messages_receiver_id_fkey(
            full_name,
            user_type
          )
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive"
        });
        throw error;
      }

      // Transform and optimistically add the new message to the local state for instant feedback
      const transformedMessage = transformMessage(data);
      setMessages((prevMessages) => [...prevMessages, { ...transformedMessage, isOptimistic: true }]);

      // Show success toast with animation
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
        duration: 2000,
      });

      return transformedMessage;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [currentUserId, phoneRegex, emailRegex, toast]);

  // Mark messages as read with real-time updates
  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .in('id', messageIds);

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        // Update local state immediately for smooth UX
        setMessages(prev => 
          prev.map(msg => 
            messageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }, []);

  // Enhanced content validation function
  const validateMessageContent = (content: string): { 
    isValid: boolean; 
    error: string; 
    shouldBlock: boolean 
  } => {
    // Check for phone numbers
    if (phoneRegex.test(content)) {
      return {
        isValid: false,
        error: 'Phone numbers are not allowed in messages. Your profile has been flagged.',
        shouldBlock: true
      };
    }

    // Check for email addresses
    if (emailRegex.test(content)) {
      return {
        isValid: false,
        error: 'Email addresses are not allowed in messages. Your profile has been flagged.',
        shouldBlock: true
      };
    }

    // Check for suspicious patterns (multiple numbers, URLs, etc.)
    const suspiciousPatterns = [
      /\b\d{3,}\b/g, // Multiple consecutive digits
      /https?:\/\/[^\s]+/g, // URLs
      /www\.[^\s]+/g, // URLs without protocol
      /\b[A-Z]{3,}\b/g, // All caps words (potential spam)
    ];

    const suspiciousMatches = suspiciousPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);

    if (suspiciousMatches > 3) {
      return {
        isValid: false,
        error: 'Message contains suspicious content patterns. Please review your message.',
        shouldBlock: false
      };
    }

    return {
      isValid: true,
      error: '',
      shouldBlock: false
    };
  };

  // Block user profile function (with error handling for missing field)
  const blockUserProfile = async (userId: string) => {
    try {
      // Try to update the is_blocked field, but handle the case where it doesn't exist
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: true } as any)
        .eq('id', userId);

      if (error) {
        console.error('Error blocking user profile:', error);
        // If the field doesn't exist, just log the violation
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('is_blocked field not available, logging violation instead');
          // You could implement alternative blocking mechanisms here
          // For example, storing blocked users in a separate table or using metadata
        }
      } else {
        console.log('User profile blocked due to policy violation');
      }
    } catch (error) {
      console.error('Error in blockUserProfile:', error);
    }
  };

  // Get message statistics
  const getMessageStats = useCallback(() => {
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(msg => 
      msg.receiver_id === currentUserId && msg.status !== 'read'
    ).length;
    const sentMessages = messages.filter(msg => 
      msg.sender_id === currentUserId
    ).length;
    const receivedMessages = messages.filter(msg => 
      msg.receiver_id === currentUserId
    ).length;

    return {
      total: totalMessages,
      unread: unreadMessages,
      sent: sentMessages,
      received: receivedMessages
    };
  }, [messages, currentUserId]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    getMessageStats,
  };
}

