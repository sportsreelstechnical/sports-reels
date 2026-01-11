
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, FileText, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentPreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  isOpen,
  onClose,
  onDownload
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      // Clean the URL by removing any extra parameters
      const cleanUrl = fileUrl.split('#')[0].split('?')[0];
      
      const response = await fetch(cleanUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      if (onDownload) onDownload();
      
      toast({
        title: "Download Complete",
        description: "Document has been downloaded successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const cleanFileUrl = fileUrl.split('#')[0].split('?')[0];
  const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf') || fileType === 'pdf';
  const isHTML = fileType === 'text/html' || fileName.toLowerCase().endsWith('.html');
  const isImage = fileType.startsWith('image/') || fileType === 'image';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-700">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              disabled={downloadLoading}
              variant="outline"
              size="sm"
              className="border-rosegold text-rosegold hover:bg-rosegold hover:text-white disabled:opacity-50"
            >
              {downloadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-white rounded-lg">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-spin" />
                <p className="text-gray-500">Loading document...</p>
              </div>
            </div>
          )}

          {isPDF ? (
            <iframe
              src={cleanFileUrl}
              className="w-full h-96 border-0"
              title={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                toast({
                  title: "Preview Error",
                  description: "Unable to preview this PDF. You can still download it.",
                  variant: "destructive",
                  duration: 4000,
                });
              }}
            />
          ) : isHTML ? (
            <iframe
              src={cleanFileUrl}
              className="w-full h-96 border-0"
              title={fileName}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                toast({
                  title: "Preview Error",
                  description: "Unable to preview this document. You can still download it.",
                  variant: "destructive",
                  duration: 4000,
                });
              }}
            />
          ) : isImage ? (
            <div className="p-4 flex justify-center">
              <img
                src={cleanFileUrl}
                alt={fileName}
                className="max-w-full max-h-96 object-contain"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  toast({
                    title: "Preview Error",
                    description: "Unable to load this image. You can still download it.",
                    variant: "destructive",
                    duration: 4000,
                  });
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                <Button 
                  onClick={handleDownload} 
                  disabled={downloadLoading}
                  className="bg-rosegold hover:bg-rosegold/90 disabled:opacity-50"
                >
                  {downloadLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download to View
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
