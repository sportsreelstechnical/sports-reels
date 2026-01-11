
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Check, CheckCheck } from 'lucide-react';
import { DocumentPreview } from './DocumentPreview';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    status?: 'sent' | 'delivered' | 'read';
    attachment_urls?: string[];
    file_name?: string;
    file_type?: string;
    file_size?: number;
    contract_file_url?: string;
    contract_file_name?: string;
    is_contract_message?: boolean;
  };
  isFromMe: boolean;
  senderName?: string;
  showTime?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isFromMe,
  senderName,
  showTime = true
}) => {
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilePreview = (url: string, name: string, type: string) => {
    setPreviewFile({ url, name, type });
    setShowDocPreview(true);
  };

  const getStatusIcon = () => {
    if (!isFromMe) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      default:
        return <Check className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <>
      <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[70%] ${isFromMe ? 'order-2' : 'order-1'}`}>
          {/* Sender name for group-like display */}
          {!isFromMe && senderName && (
            <p className="text-xs text-gray-500 mb-1 px-2">{senderName}</p>
          )}
          
          {/* Message bubble */}
          <div
            className={`relative px-4 py-2 rounded-2xl ${
              isFromMe
                ? 'bg-rosegold text-white rounded-br-md'
                : 'bg-gray-800 text-white rounded-bl-md'
            } shadow-sm`}
          >
            {/* Contract message indicator */}
            {message.is_contract_message && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded-lg">
                <FileText className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-yellow-200">Contract Message</span>
              </div>
            )}

            {/* Message content */}
            {message.content && (
              <p className="text-sm leading-relaxed mb-1">{message.content}</p>
            )}

            {/* File attachments */}
            {message.attachment_urls && message.attachment_urls.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachment_urls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">
                        {message.file_name || `attachment-${index + 1}`}
                      </p>
                      {message.file_size && (
                        <p className="text-xs opacity-70">
                          {formatFileSize(message.file_size)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-white/20"
                        onClick={() => handleFilePreview(
                          url, 
                          message.file_name || `attachment-${index + 1}`, 
                          message.file_type || 'application/octet-stream'
                        )}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contract file */}
            {message.contract_file_url && (
              <div className="mt-2">
                <div className="flex items-center gap-2 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                  <FileText className="w-4 h-4 text-yellow-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium text-yellow-200">
                      {message.contract_file_name || 'Contract Document'}
                    </p>
                    <p className="text-xs text-yellow-300 opacity-70">Contract</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-white/20"
                      onClick={() => handleFilePreview(
                        message.contract_file_url!, 
                        message.contract_file_name || 'Contract', 
                        'application/pdf'
                      )}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Time and status */}
            <div className="flex items-center justify-end gap-1 mt-2">
              {showTime && (
                <span className="text-xs opacity-70">
                  {formatTime(message.created_at)}
                </span>
              )}
              {getStatusIcon()}
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showDocPreview && previewFile && (
        <DocumentPreview
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          isOpen={showDocPreview}
          onClose={() => {
            setShowDocPreview(false);
            setPreviewFile(null);
          }}
        />
      )}
    </>
  );
};
