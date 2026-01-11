import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileSignature, Check, Clock, User, Calendar, ArrowLeft, Eye, Download } from 'lucide-react';
import HandDrawnSignature from './HandDrawnSignature';

interface DigitalSignatureProps {
  contract: any;
  userRole: 'team' | 'agent';
  onSign: (signatureData?: string) => void;
  onConfirm: () => void;
  onGoBack?: () => void;
  contractPreview?: string;
}

const DigitalSignature: React.FC<DigitalSignatureProps> = ({
  contract,
  userRole,
  onSign,
  onConfirm,
  onGoBack,
  contractPreview
}) => {
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const signatureRef = useRef<HTMLDivElement>(null);

  const handleSign = async () => {
    setIsSigningInProgress(true);
    try {
      await onSign();
    } finally {
      setIsSigningInProgress(false);
    }
  };

  const agentSigned = contract?.signatures?.agent_signed_at;
  const teamConfirmed = contract?.signatures?.team_confirmed_at;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900">Digital Contract Signing</CardTitle>
              <p className="text-sm text-gray-600">Secure electronic signature process</p>
            </div>
          </div>
          <Badge variant={agentSigned && teamConfirmed ? 'default' : 'secondary'} className="px-3 py-1">
            {agentSigned && teamConfirmed ? 'Fully Signed' : 'Signing in Progress'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Signing Progress */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 mb-3">Signing Progress</h4>
          
          {/* Agent Signature Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                agentSigned ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {agentSigned ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Agent Signature</p>
                <p className="text-sm text-gray-600">
                  {agentSigned 
                    ? `Signed on ${new Date(agentSigned).toLocaleDateString()}`
                    : 'Pending signature'
                  }
                </p>
              </div>
            </div>
            {userRole === 'agent' && !agentSigned && (
              <Button
                onClick={() => {
                  setShowSignatureCanvas(true);
                  // Smooth scroll to signature section after a short delay
                  setTimeout(() => {
                    signatureRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }, 100);
                }}
                disabled={isSigningInProgress}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSigningInProgress ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4 mr-2" />
                    Sign Contract
                  </>
                )}
              </Button>
            )}
            {agentSigned && (
              <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                Signed
              </Badge>
            )}
          </div>

          {/* Team Confirmation Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                teamConfirmed ? 'bg-green-100' : agentSigned ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                {teamConfirmed ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : agentSigned ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">Team Confirmation</p>
                <p className="text-sm text-gray-600">
                  {teamConfirmed 
                    ? `Confirmed on ${new Date(teamConfirmed).toLocaleDateString()}`
                    : agentSigned 
                      ? 'Awaiting team confirmation'
                      : 'Waiting for agent signature'
                  }
                </p>
              </div>
            </div>
            {userRole === 'team' && agentSigned && !teamConfirmed && (
              <Button
                onClick={onConfirm}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm Signature
              </Button>
            )}
            {teamConfirmed && (
              <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                Confirmed
              </Badge>
            )}
          </div>
        </div>

        {/* Go Back to Negotiating Button */}
        {onGoBack && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={onGoBack}
              className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:border-orange-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back to Negotiating
            </Button>
          </div>
        )}

        {/* Signature Actions - Preview and Download */}
        {agentSigned && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Signed Contract Actions</h4>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Generate contract preview with signature
                  const contractData = {
                    title: contract?.player?.full_name ? `${contract.player.full_name} Transfer Contract` : 'Contract Agreement',
                    agentSignature: contract?.signatures?.agent_signature_data,
                    agentSignedAt: contract?.signatures?.agent_signed_at,
                    teamConfirmed: teamConfirmed,
                    contract: contract
                  };
                  
                  
                  // Open preview in new window
                  const previewWindow = window.open('', '_blank', 'width=900,height=700');
                  if (previewWindow) {
                    previewWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Contract Preview - ${contractData.title}</title>
                          <style>
                            body { 
                              font-family: Arial, sans-serif; 
                              margin: 20px; 
                              line-height: 1.6;
                              color: #333;
                            }
                            .contract-header { 
                              text-align: center; 
                              margin-bottom: 30px;
                              border-bottom: 2px solid #ddd;
                              padding-bottom: 20px;
                            }
                            .contract-content {
                              margin-bottom: 30px;
                            }
                            .signature-section { 
                              margin: 30px 0; 
                              padding: 20px; 
                              border: 2px solid #4a5568;
                              border-radius: 8px;
                              background-color: #f7fafc;
                            }
                            .signature-block {
                              margin: 20px 0;
                              padding: 15px 0;
                              border-bottom: 1px solid #e2e8f0;
                            }
                            .signature-block:last-child {
                              border-bottom: none;
                            }
                            .signature-label {
                              font-weight: bold;
                              font-size: 14px;
                              color: #2d3748;
                              margin-bottom: 10px;
                            }
                            .signature-container {
                              min-height: 60px;
                              display: flex;
                              align-items: center;
                              justify-content: flex-start;
                              margin: 10px 0;
                            }
                            .signature-image-black { 
                              max-width: 250px; 
                              max-height: 60px;
                              border: 1px solid #000;
                              background-color: white;
                              filter: contrast(1.2) brightness(0.9);
                            }
                            .signature-line {
                              border-bottom: 1px solid #000;
                              width: 250px;
                              height: 40px;
                              margin: 10px 0;
                            }
                            .signature-date {
                              font-size: 12px;
                              color: #4a5568;
                              margin-top: 5px;
                            }
                            h1 { color: #2d3748; }
                            h3 { color: #4a5568; margin-top: 0; }
                            .signature-status {
                              font-weight: bold;
                              padding: 5px 10px;
                              border-radius: 4px;
                              display: inline-block;
                            }
                            .confirmed { background-color: #c6f6d5; color: #22543d; }
                            .pending { background-color: #fef5e7; color: #744210; }
                          </style>
                        </head>
                        <body>
                          <div class="contract-header">
                            <h1>${contractData.title}</h1>
                            <p><strong>Contract Value:</strong> ${contract?.currency} ${contract?.contract_value?.toLocaleString() || 'N/A'}</p>
                            <p><strong>Transfer Type:</strong> ${contract?.transfer_type || 'N/A'}</p>
                            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                          </div>
                          
                          <div class="contract-content">
                            ${contractPreview || '<p>Contract details not available</p>'}
                          </div>
                          
                          <div class="signature-section">
                            <h3>Contract Signatures</h3>
                            
                            <div class="signature-block">
                              <div class="signature-label">Agent Signature</div>
                            ${contractData.agentSignature && contractData.agentSignature !== 'null' ? 
                              `<div class="signature-container">
                                 <img src="${contractData.agentSignature}" class="signature-image-black" alt="Agent Signature" onerror="console.log('Signature image failed to load:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                 <div style="display:none; color:red; font-size:12px;">Signature image failed to load</div>
                               </div>` : 
                              '<div class="signature-line">________________________</div>'
                            }
                              <div class="signature-date">Date: ${contractData.agentSignedAt ? new Date(contractData.agentSignedAt).toLocaleDateString() : '_______________'}</div>
                            </div>
                            
                            <div class="signature-block">
                              <div class="signature-label">Player Signature</div>
                              <div class="signature-line">________________________</div>
                              <div class="signature-date">Date: _______________</div>
                            </div>
                            
                            <div class="signature-block">
                              <div class="signature-label">Club Representative</div>
                              <div class="signature-line">________________________</div>
                              <div class="signature-date">Date: _______________</div>
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
                    previewWindow.document.close();
                  }
                }}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Contract
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // Generate downloadable contract
                  const contractData = {
                    title: contract?.player?.full_name ? `${contract.player.full_name} Transfer Contract` : 'Contract Agreement',
                    agentSignature: contract?.signatures?.agent_signature_data,
                    agentSignedAt: contract?.signatures?.agent_signed_at,
                    teamConfirmed: teamConfirmed,
                    contract: contract
                  };
                  
                  
                  const contractHtml = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>${contractData.title}</title>
                        <style>
                          body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                            line-height: 1.6;
                            color: #333;
                          }
                          .contract-header { 
                            text-align: center; 
                            margin-bottom: 30px;
                            border-bottom: 2px solid #ddd;
                            padding-bottom: 20px;
                          }
                          .contract-content {
                            margin-bottom: 30px;
                          }
                          .signature-section { 
                            margin: 30px 0; 
                            padding: 20px; 
                            border: 2px solid #4a5568;
                            border-radius: 8px;
                            background-color: #f7fafc;
                          }
                          .signature-block {
                            margin: 20px 0;
                            padding: 15px 0;
                            border-bottom: 1px solid #e2e8f0;
                          }
                          .signature-block:last-child {
                            border-bottom: none;
                          }
                          .signature-label {
                            font-weight: bold;
                            font-size: 14px;
                            color: #2d3748;
                            margin-bottom: 10px;
                          }
                          .signature-container {
                            min-height: 60px;
                            display: flex;
                            align-items: center;
                            justify-content: flex-start;
                            margin: 10px 0;
                          }
                          .signature-image-black { 
                            max-width: 250px; 
                            max-height: 60px;
                            border: 1px solid #000;
                            background-color: white;
                            filter: contrast(1.2) brightness(0.9);
                          }
                          .signature-line {
                            border-bottom: 1px solid #000;
                            width: 250px;
                            height: 40px;
                            margin: 10px 0;
                          }
                          .signature-date {
                            font-size: 12px;
                            color: #4a5568;
                            margin-top: 5px;
                          }
                          h1 { color: #2d3748; }
                          h3 { color: #4a5568; margin-top: 0; }
                          .signature-status {
                            font-weight: bold;
                            padding: 5px 10px;
                            border-radius: 4px;
                            display: inline-block;
                          }
                          .confirmed { background-color: #c6f6d5; color: #22543d; }
                          .pending { background-color: #fef5e7; color: #744210; }
                        </style>
                      </head>
                      <body>
                        <div class="contract-header">
                          <h1>${contractData.title}</h1>
                          <p><strong>Contract Value:</strong> ${contract?.currency} ${contract?.contract_value?.toLocaleString() || 'N/A'}</p>
                          <p><strong>Transfer Type:</strong> ${contract?.transfer_type || 'N/A'}</p>
                          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <div class="contract-content">
                          ${contractPreview || '<p>Contract details not available</p>'}
                        </div>
                        
                        <div class="signature-section">
                          <h3>Contract Signatures</h3>
                          
                          <div class="signature-block">
                            <div class="signature-label">Agent Signature</div>
                            ${contractData.agentSignature && contractData.agentSignature !== 'null' ? 
                              `<div class="signature-container">
                                 <img src="${contractData.agentSignature}" class="signature-image-black" alt="Agent Signature" onerror="console.log('Download signature image failed to load:', this.src); this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                 <div style="display:none; color:red; font-size:12px;">Signature image failed to load</div>
                               </div>` : 
                              '<div class="signature-line">________________________</div>'
                            }
                            <div class="signature-date">Date: ${contractData.agentSignedAt ? new Date(contractData.agentSignedAt).toLocaleDateString() : '_______________'}</div>
                          </div>
                          
                          <div class="signature-block">
                            <div class="signature-label">Player Signature</div>
                            <div class="signature-line">________________________</div>
                            <div class="signature-date">Date: _______________</div>
                          </div>
                          
                          <div class="signature-block">
                            <div class="signature-label">Club Representative</div>
                            <div class="signature-line">________________________</div>
                            <div class="signature-date">Date: _______________</div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `;
                  
                  const blob = new Blob([contractHtml], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${contractData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_signed.html`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Contract
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Contract Summary */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">Contract Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Player:</p>
              <p className="font-medium">{contract?.player?.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Team:</p>
              <p className="font-medium">{contract?.team?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Contract Value:</p>
              <p className="font-medium">
                {contract?.currency} {contract?.contract_value?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Duration:</p>
              <p className="font-medium">{contract?.terms?.duration || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileSignature className="w-3 h-3 text-blue-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Legal Notice</p>
              <p className="text-blue-700">
                By signing this contract digitally, you agree to all terms and conditions outlined. 
                This electronic signature has the same legal validity as a handwritten signature.
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {agentSigned && teamConfirmed && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Contract Fully Signed!</p>
                <p className="text-sm text-green-700">
                  Proceeding to payment phase. The agent can now make the transfer payment.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Hand-Drawn Signature Component */}
      {showSignatureCanvas && (
        <div ref={signatureRef} className="mt-6">
          <HandDrawnSignature
            onSignatureComplete={(signatureData) => {
              // Process the signature data and call onSign
              console.log('Signature completed:', signatureData);
              setShowSignatureCanvas(false);
              onSign(signatureData);
            }}
            onCancel={() => setShowSignatureCanvas(false)}
            userRole={userRole}
            contractTitle={`${contract?.player?.full_name || 'Player'} Transfer Contract`}
          />
        </div>
      )}
    </Card>
  );
};

export default DigitalSignature;
