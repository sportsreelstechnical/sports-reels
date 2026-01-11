
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FlaggedContent {
  type: 'phone' | 'email';
  content: string;
  position: number;
}

export const useEnhancedMessageFlagging = () => {
  const { toast } = useToast();
  const [flaggedMessages, setFlaggedMessages] = useState<string[]>([]);

  // Enhanced patterns for better detection
  const patterns = {
    phone: [
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US format
      /(\+?\d{1,4}[-.\s]?)?\d{10,15}/g, // International format
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g, // Simple format
      /(\+\d{1,3}\s?\d{1,14})/g, // Plus format
      /(\d{4}[-.\s]?\d{3}[-.\s]?\d{3})/g, // Alternative format
    ],
    email: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g, // With spaces
      /[a-zA-Z0-9._%+-]+\[at\][a-zA-Z0-9.-]+\[dot\][a-zA-Z]{2,}/g, // Obfuscated
      /[a-zA-Z0-9._%+-]+\s*\(\s*@\s*\)\s*[a-zA-Z0-9.-]+\s*\(\s*\.\s*\)\s*[a-zA-Z]{2,}/g, // Parentheses
    ]
  };

  const detectContactInfo = (content: string): FlaggedContent[] => {
    const flagged: FlaggedContent[] = [];

    // Check for phone numbers
    patterns.phone.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          flagged.push({
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
          flagged.push({
            type: 'email',
            content: match[0],
            position: match.index
          });
        }
      }
    });

    return flagged;
  };

  const flagMessage = async (messageId: string, userId: string, flaggedContent: FlaggedContent[]) => {
    try {
      // Flag the message
      const { error: flagError } = await supabase
        .from('messages')
        .update({ is_flagged: true })
        .eq('id', messageId);

      if (flagError) throw flagError;

      // Record the violation - Note: message_violations table may not exist yet
      try {
        const { error: violationError } = await supabase
          .from('message_violations')
          .insert({
            message_id: messageId,
            user_id: userId,
            violation_type: flaggedContent.map(f => f.type).join(', '),
            violation_content: JSON.stringify(flaggedContent),
            detected_at: new Date().toISOString()
          });

        if (violationError) {
          console.error('Error recording violation (table may not exist):', violationError);
        }
      } catch (violationError) {
        console.error('Message violations table not available:', violationError);
      }

      // Increment user warning count - using direct update
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('contact_warnings')
        .eq('user_id', userId)
        .single();

      const newWarningCount = (currentProfile?.contact_warnings || 0) + 1;

      const { error: warningError } = await supabase
        .from('profiles')
        .update({
          contact_warnings: newWarningCount,
          last_contact_check: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (warningError) {
        console.error('Error updating warnings:', warningError);
      }

      // Check if user should be blocked (3 strikes rule)
      if (newWarningCount >= 3) {
        await blockUser(userId);
      }

      setFlaggedMessages(prev => [...prev, messageId]);

      toast({
        title: "Message Flagged",
        description: `Contact information detected: ${flaggedContent.map(f => f.type).join(', ')}`,
        variant: "destructive"
      });

      return true;
    } catch (error) {
      console.error('Error flagging message:', error);
      return false;
    }
  };

  const blockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: false,
          contact_verified: false
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User Blocked",
        description: "User has been blocked due to repeated contact info violations",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const validateMessage = async (content: string, userId: string, messageId?: string): Promise<boolean> => {
    const flaggedContent = detectContactInfo(content);
    
    if (flaggedContent.length > 0) {
      if (messageId) {
        await flagMessage(messageId, userId, flaggedContent);
      }
      return false; // Message contains contact info
    }
    
    return true; // Message is clean
  };

  return {
    validateMessage,
    detectContactInfo,
    flaggedMessages
  };
};
