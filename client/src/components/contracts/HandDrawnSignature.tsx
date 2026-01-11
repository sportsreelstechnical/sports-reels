import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileSignature, RotateCcw, Check, AlertTriangle, Lock, Shield } from 'lucide-react';

interface HandDrawnSignatureProps {
  onSignatureComplete: (signatureData: string) => void;
  onCancel: () => void;
  userRole: 'team' | 'agent';
  contractTitle?: string;
}

const HandDrawnSignature: React.FC<HandDrawnSignatureProps> = ({
  onSignatureComplete,
  onCancel,
  userRole,
  contractTitle = "Contract Agreement"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureSectionRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size and drawing properties
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      
      // Set canvas size to match the display size
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Set drawing properties for smooth lines
      ctx.strokeStyle = '#000000'; // Pure black color for clear signatures
      ctx.lineWidth = 3; // Slightly thicker for better visibility
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Calculate coordinates relative to the canvas display size (not internal canvas size)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // Add touch support for mobile devices
  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Note: preventDefault might not work on passive touch events
    try {
      e.preventDefault();
    } catch (error) {
      // Ignore passive event listener warnings
    }
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    startDrawing(mouseEvent as any);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Note: preventDefault might not work on passive touch events
    try {
      e.preventDefault();
    } catch (error) {
      // Ignore passive event listener warnings
    }
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    draw(mouseEvent as any);
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Note: preventDefault might not work on passive touch events
    try {
      e.preventDefault();
    } catch (error) {
      // Ignore passive event listener warnings
    }
    stopDrawing();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Check if there's any signature content
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get image data to check if anything was drawn
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if any pixel is not transparent
    let hasContent = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        hasContent = true;
        break;
      }
    }

    if (hasContent) {
      setHasSignature(true);
      // Convert canvas to base64 for storage
      const signatureBase64 = canvas.toDataURL('image/png');
      setSignatureData(signatureBase64);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and fill with white background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
    setSignatureData('');
  };

  const handleSubmit = () => {
    if (!hasSignature) return;
    
    // Create signature metadata
    const signatureMetadata = {
      signatureData,
      timestamp: new Date().toISOString(),
      userRole,
      contractTitle,
      ipAddress: 'N/A', // Could be enhanced with actual IP detection
      userAgent: navigator.userAgent,
      deviceInfo: {
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    onSignatureComplete(JSON.stringify(signatureMetadata));
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900">Hand-Drawn Digital Signature</CardTitle>
              <p className="text-sm text-gray-600">Legally binding electronic signature</p>
            </div>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
            ESIGN Act Compliant
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Legal Compliance Notice */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 mb-1">Legally Binding E-Signature</p>
              <p className="text-green-700">
                This electronic signature complies with global standards including the ESIGN Act (U.S.) 
                and eIDAS (EU), making it legally valid for most contracts. By signing below, you agree 
                to be legally bound by the terms of this contract.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Canvas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Your Signature</h4>
            {hasSignature && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          
          <div ref={signatureSectionRef} className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-32 cursor-crosshair border border-gray-200 rounded touch-none bg-white"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawingTouch}
              onTouchMove={drawTouch}
              onTouchEnd={stopDrawingTouch}
              style={{ touchAction: 'none', backgroundColor: 'white' }}
            />
            {!hasSignature && (
              <p className="text-center text-gray-500 text-sm mt-2">
                Draw your signature above using your mouse or touchpad
              </p>
            )}
          </div>
        </div>

        {/* Contract Information */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Contract Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Contract Title:</p>
              <p className="font-medium">{contractTitle}</p>
            </div>
            <div>
              <p className="text-gray-600">Signer Role:</p>
              <p className="font-medium capitalize">{userRole}</p>
            </div>
            <div>
              <p className="text-gray-600">Signature Date:</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Signature Time:</p>
              <p className="font-medium">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {/* Legal Warning */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900 mb-1">Legal Notice</p>
              <p className="text-yellow-700">
                By signing this document, you acknowledge that you have read, understood, and agree to 
                be legally bound by all terms and conditions. This electronic signature has the same 
                legal effect as a handwritten signature.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          
          <div className="flex items-center gap-3">
            {hasSignature && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>Signature Complete</span>
              </div>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={!hasSignature}
              className={`px-6 ${
                hasSignature 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Lock className="w-4 h-4 mr-2" />
              Sign Contract
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HandDrawnSignature;
