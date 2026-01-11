
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Send, FileText, Upload, Loader2 } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { MessageBubble } from './MessageBubble';
import { ContractGenerationModal } from './ContractGenerationModal';
import { useEnhancedMessaging } from '@/domains/messaging/hooks/useEnhancedMessaging';
import { useContractNotifications } from '@/domains/contracts/hooks/useContractNotifications';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchId?: string;
  playerId?: string;
  teamId?: string;
  receiverId?: string;
  currentUserId: string;
  playerName: string;
  teamName?: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  pitchId,
  playerId,
  teamId,
  receiverId,
  currentUserId,
  playerName,
  teamName
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [showContractGen, setShowContractGen] = useState(false);
  const [contractGenerating, setContractGenerating] = useState(false);
  
  const { messages, loading, sending, sendMessage } = useEnhancedMessaging(pitchId);
  
  // Enable contract notifications
  useContractNotifications();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !receiverId) return;

    try {
      await sendMessage(newMessage, receiverId, {
        pitchId,
        playerId,
        messageType: 'inquiry'
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUploadComplete = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    if (!receiverId) return;
    
    try {
      await sendMessage(
        `📄 Contract document uploaded: ${fileName}`,
        receiverId,
        {
          pitchId,
          playerId,
          contractFileUrl: fileUrl,
          messageType: 'contract'
        }
      );
      
      toast({
        title: "File Uploaded",
        description: "Contract document has been uploaded and sent",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    }
  };

  const handleContractGenerated = async (contractHtml: string) => {
    if (!receiverId) return;
    
    setContractGenerating(true);
    
    try {
      await sendMessage(
        `📄 Contract generated for ${playerName}`,
        receiverId,
        {
          pitchId,
          playerId,
          contractFileUrl: 'generated-contract',
          messageType: 'contract'
        }
      );
      
      setShowContractGen(false);
      toast({
        title: "Contract Sent",
        description: "Contract has been generated and sent successfully",
      });
    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: "Error",
        description: "Failed to send contract",
        variant: "destructive"
      });
    } finally {
      setContractGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-900 border-gray-700 text-white flex flex-col">
          <DialogHeader className="border-b border-gray-700 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <span>Message about {playerName}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Contract
                </Button>
                
                <FileUpload
                  onFileUploaded={handleFileUploadComplete}
                  disabled={false}
                />
                
                <Button
                  onClick={() => setShowContractGen(true)}
                  disabled={contractGenerating}
                  size="sm"
                  className="bg-rosegold hover:bg-rosegold/90 disabled:opacity-50"
                >
                  {contractGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Contract
                    </>
                  )}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-gray-400 py-8">
                  <p>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isFromMe={message.sender_id === profile?.user_id}
                    senderName={message.sender_profile?.full_name}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder="Type your message... (Note: Phone numbers and email addresses are not allowed)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="resize-none bg-gray-800 border-gray-600"
                  rows={2}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                size="sm"
                className="bg-rosegold hover:bg-rosegold/90"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Generation Modal */}
      <ContractGenerationModal
        isOpen={showContractGen}
        onClose={() => setShowContractGen(false)}
        pitchId={pitchId}
        playerName={playerName}
        teamName={teamName || 'Team'}
        onContractGenerated={handleContractGenerated}
      />
    </>
  );
};

export default MessageModal;
