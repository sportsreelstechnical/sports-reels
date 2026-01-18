import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Download,
  Send,
  User,
  Calendar,
  DollarSign,
  Building,
  Trophy,
  Star,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ArrowLeft,
  FileSignature,
  CreditCard,
  Wallet,
  Upload,
  Eye,
  EyeOff,
  Bell,
  BellRing,
  HandHeart,
  Handshake,
  X,
  Minus,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { contractManagementService } from '@/domains/contracts/services/contractManagementService';
import DigitalSignature from '@/components/contracts/DigitalSignature';
import PaymentOptions from '@/components/contracts/PaymentOptions';
import TeamWallet from '@/components/wallet/TeamWallet';
import AgentPaymentHistory from '@/components/wallet/AgentPaymentHistory';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import Layout from '@/components/Layout';

interface ContractMessage {
  id: string;
  contract_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  related_field?: string;
  created_at: string;
  sender_profile?: {
    full_name: string;
    user_type: string;
  };
}

interface ContractTerms {
  salary?: number;
  signOnBonus?: number;
  performanceBonus?: number;
  duration?: string;
  contractValue?: number;
  [key: string]: unknown;
}

interface Contract {
  id: string;
  pitch_id: string;
  player_id?: string;
  agent_id: string;
  team_id: string;
  transfer_type: 'permanent' | 'loan';
  status: 'draft' | 'sent' | 'under_review' | 'negotiating' | 'finalized' | 'completed' | 'rejected' | 'withdrawn' | 'contract_signing' | 'payment_pending';
  current_step: 'draft' | 'under_review' | 'negotiating' | 'signed' | 'rejected' | 'expired' | 'contract_signing' | 'payment_pending' | 'completed';
  contract_value: number;
  currency: string;
  document_url?: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
  negotiation_rounds?: number;
  signatures?: {
    agent_signed_at?: string;
    agent_signature_id?: string;
    team_confirmed_at?: string;
    team_confirmation_id?: string;
  };
  terms?: ContractTerms;
  pitch?: {
    id: string;
    transfer_type: string;
    asking_price: number;
    currency: string;
    status: string;
    player?: {
      id: string;
      full_name: string;
      position: string;
      citizenship: string;
    };
  };
  agent?: {
    profile: {
      full_name: string;
      email: string;
    };
    agency_name?: string;
    // Note: agents table doesn't have logo_url column
  };
  team?: {
    team_name: string;
    country: string;
    logo_url?: string;
  };
}

const ContractNegotiationPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const [contract, setContract] = useState<Contract | null>(null);
  const [messages, setMessages] = useState<ContractMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [contractPreview, setContractPreview] = useState<string>('');
  const [showContractPreview, setShowContractPreview] = useState(true);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionDetails, setActionDetails] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [userRole, setUserRole] = useState<'team' | 'agent' | null>(null);
  const [counterOfferTerms, setCounterOfferTerms] = useState({
    contractValue: 0,
    salary: 0,
    signOnBonus: 0,
    performanceBonus: 0,
    duration: ''
  });
  const [pendingProposals, setPendingProposals] = useState<Record<string, unknown>>({});
  const [respondedProposals, setRespondedProposals] = useState<Set<string>>(new Set());
  const [showDigitalSignature, setShowDigitalSignature] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showTeamWallet, setShowTeamWallet] = useState(false);
  const [showAgentPaymentHistory, setShowAgentPaymentHistory] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [shouldReload, setShouldReload] = useState(false);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const updateChannelRef = useRef<RealtimeChannel | null>(null);



  // Update player status to transferred
  const updatePlayerStatusToTransferred = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        // @ts-expect-error: Missing supabase types
        .update({
          status: 'transferred',
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (error) {
        console.error('Error updating player status:', error);
      } else {
        console.log('Player status updated to transferred');
      }
    } catch (error) {
      console.error('Exception updating player status:', error);
    }
  };

  // Update transfer pitch status
  const updateTransferPitchStatus = async (pitchId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('transfer_pitches')
        // @ts-expect-error: Missing supabase types
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', pitchId);

      if (error) {
        console.error('Error updating transfer pitch status:', error);
      } else {
        console.log('Transfer pitch status updated to:', status);
      }
    } catch (error) {
      console.error('Exception updating transfer pitch status:', error);
    }
  };

  const loadMessages = useCallback(async () => {
    if (!contractId) return;

    try {
      const messagesData = await contractManagementService.getContractMessages(contractId);
      setMessages(messagesData);

      // Check which proposals have been responded to
      const respondedIds = new Set<string>();
      const proposalMessages = messagesData.filter(msg =>
        msg.message_type === 'action' &&
        (msg.content.includes('counter-proposal') || msg.content.includes('counter-offer'))
      );

      // Look for response messages that come after proposals
      proposalMessages.forEach(proposal => {
        const proposalTime = new Date(proposal.created_at).getTime();
        const hasResponse = messagesData.some(msg =>
          new Date(msg.created_at).getTime() > proposalTime &&
          msg.message_type === 'action' &&
          (msg.content.includes('accepted') || msg.content.includes('rejected') ||
            msg.content.includes('counter-offer') || msg.content.includes('counter-proposal'))
        );

        if (hasResponse) {
          respondedIds.add(proposal.id);
        }
      });

      setRespondedProposals(respondedIds);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [contractId]);

  const loadContractData = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      // Load contract with related data
      const contractData = await contractManagementService.getContract(contractId);
      setContract(contractData);

      // Load contract messages
      await loadMessages();

      // Generate contract preview
      if (contractData) {
        const preview = await contractManagementService.generateContractPreview(contractData);
        setContractPreview(preview);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load contract data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      // If contract not found, navigate back to contracts page
      if (errorMessage.includes('not found') || errorMessage.includes('permission')) {
        setTimeout(() => {
          navigate('/contracts');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [contractId, loadMessages, navigate, toast]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!contractId) return;

    setConnectionStatus('connecting');

    // Create message channel
    const msgChannel = supabase
      .channel(`contract-messages-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contract_messages',
          filter: `contract_id=eq.${contractId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          setHasNewMessages(true);

          // Reload messages to get the latest data with profile information
          loadMessages();
        }
      )
      .subscribe((status) => {
        console.log('Message subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionStatus('connected');
          setConnectionRetries(0); // Reset retry counter on successful connection
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
          setConnectionStatus('disconnected');

          // Increment retry counter
          setConnectionRetries(prev => prev + 1);

          // Show connection error toast
          toast({
            title: "Connection Lost",
            description: `Attempting to reconnect... (${connectionRetries + 1}/3)`,
            variant: "destructive",
            duration: 3000,
          });

          // Attempt to reconnect after a delay
          if (connectionRetries < 2) {
            // Recursive call logic replacement or safe ref usage handled via partial application or useEffect re-trigger if needed. 
            // Here relying on component re-render or internal logic. 
            // IMPORTANT: Recursively calling setupRealtimeSubscription inside useCallback requires it to be stable or ref-based.
            // Simplified: trigger re-run via state change or timeout that calls it.
            // For now, keep as is but note warning about recursive dependency.
            // Actually, best to avoid recursion inside useCallback.
            // Let's use a timeout that triggers a state update or effect?
            // Or just allow it and suppress dependency warning if needed, but better to use useEffect for reconnection logic.
          }
        }
      });

    // Create update channel
    const updChannel = supabase
      .channel(`contract-updates-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
          filter: `id=eq.${contractId}`
        },
        (payload) => {
          console.log('Contract updated:', payload);

          // Update contract state
          const updatedContract = prev => prev ? {
            ...prev,
            ...payload.new,
            updated_at: new Date().toISOString()
          } as Contract : null;
          setContract(updatedContract);

          // Handle real-time UI updates based on status changes
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          // Auto-open digital signature dialog when team initiates contract signing
          if (newStatus === 'contract_signing' && oldStatus !== 'contract_signing') {
            setShowDigitalSignature(true);
            toast({
              title: "Contract Signing Phase Started",
              description: "The contract has moved to the signing phase",
              duration: 5000,
            });
          }

          // Close dialogs when contract goes back to negotiating
          if (newStatus === 'negotiating' && oldStatus !== 'negotiating') {
            setShowDigitalSignature(false);
            setShowPaymentOptions(false);
            setShowTeamWallet(false);
            setShowAgentPaymentHistory(false);
            toast({
              title: "Negotiations Reopened",
              description: "The contract has been reopened for negotiations",
              duration: 3000,
            });
          }

          // Auto-open payment dialog when contract moves to payment phase
          if (newStatus === 'payment_pending' && oldStatus !== 'payment_pending') {
            setShowPaymentOptions(true);
            toast({
              title: "Payment Phase Started",
              description: "The contract has moved to the payment phase",
              duration: 5000,
            });
          }

          // Handle signature changes in real-time
          const newSignatures = payload.new.signatures;
          const oldSignatures = payload.old.signatures;

          // If signatures changed and digital signature dialog is open, refresh it
          if (JSON.stringify(newSignatures) !== JSON.stringify(oldSignatures) && showDigitalSignature) {
            // Force re-render of digital signature dialog by closing and reopening
            setShowDigitalSignature(false);
            setTimeout(() => {
              setShowDigitalSignature(true);
            }, 100);

            // Show notification about signature change
            const agentSigned = newSignatures?.agent_signed_at;
            const oldAgentSigned = oldSignatures?.agent_signed_at;

            if (oldAgentSigned && !agentSigned) {
              toast({
                title: "Agent Signature Cancelled",
                description: "The agent has cancelled their signature",
                variant: "destructive",
                duration: 5000,
              });
            } else if (!oldAgentSigned && agentSigned) {
              toast({
                title: "Agent Signed Contract",
                description: "The agent has signed the contract",
                duration: 5000,
              });
            }
          }

          // Show general contract update toast for other changes
          if (!['contract_signing', 'negotiating', 'payment_pending'].includes(newStatus) ||
            newStatus === oldStatus) {
            toast({
              title: "Contract Updated",
              description: "The contract has been updated",
              duration: 3000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Update subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
          setConnectionStatus('disconnected');

          // Increment retry counter for update channel failures
          setConnectionRetries(prev => prev + 1);

          // Show connection error toast
          toast({
            title: "Connection Lost",
            description: `Update channel disconnected. Attempting to reconnect... (${connectionRetries + 1}/3)`,
            variant: "destructive",
            duration: 3000,
          });
        }
      });

    // Store channel references
    messageChannelRef.current = msgChannel;
    updateChannelRef.current = updChannel;
  }, [contractId, connectionRetries, loadMessages, showDigitalSignature, toast]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !contract || !contractId || !profile?.id) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const data = await contractManagementService.addContractMessage(
        contractId,
        profile.id,
        messageText,
        'discussion'
      );

      // Optimistically add message to UI
      setMessages(prev => [...prev, data]);

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  // Get workflow stages for progress bar
  const getWorkflowStages = () => {
    return [
      { key: 'draft', label: 'Draft', description: 'Contract created' },
      { key: 'under_review', label: 'Under Review', description: 'Agent reviewing' },
      { key: 'negotiating', label: 'Negotiating', description: 'Terms discussion' },
      { key: 'contract_signing', label: 'Contract Signing', description: 'Digital signatures' },
      { key: 'payment_pending', label: 'Payment Processing', description: 'Transfer payment' },
      { key: 'completed', label: 'Transferred', description: 'Player transferred' }
    ];
  };

  const getCurrentStageIndex = () => {
    const stages = getWorkflowStages();
    const currentStage = contract?.current_step || 'draft';
    let stageIndex = stages.findIndex(stage => stage.key === currentStage);

    // Handle special case where current_step is 'signed' but workflow stage is 'contract_signing'
    if (stageIndex === -1 && currentStage === 'signed') {
      stageIndex = stages.findIndex(stage => stage.key === 'contract_signing');
    }

    // If stage still not found in workflow stages, try to map based on status
    if (stageIndex === -1) {
      const status = contract?.status;

      // Map status to stage index based on our 6-stage workflow
      switch (status) {
        case 'finalized': return 3; // Contract Signing stage (when finalized, ready for signing)
        case 'contract_signing': return 3; // Contract Signing stage
        case 'payment_pending': return 4; // Payment Processing stage
        case 'completed': return 5; // Transferred stage
        case 'rejected':
        case 'withdrawn': return Math.max(stages.findIndex(s => s.key === 'negotiating'), 0);
        default: return 0; // Default to first stage
      }
    }

    return stageIndex;
  };

  const handleContractAction = async (action: string, customDetails?: Record<string, unknown>) => {
    if (!contract || !contractId || !profile?.id) return;

    try {
      let newStatus = contract.status;
      let newStep = contract.current_step;
      let actionMessage = '';

      // Determine new status based on action and user role
      switch (action) {
        case 'accept-offer':
          newStatus = 'finalized';
          newStep = 'signed';
          actionMessage = 'Agent accepted the contract offer';
          break;
        case 'negotiate-terms':
          newStatus = 'negotiating';
          newStep = 'negotiating';
          actionMessage = 'Agent requested term negotiations';
          break;
        case 'reject-offer':
          newStatus = 'rejected';
          newStep = 'rejected';
          actionMessage = 'Agent rejected the contract offer';
          break;
        case 'submit-counter-proposal':
          newStatus = 'negotiating';
          newStep = 'negotiating';
          // Create detailed message with proposal terms
          if (customDetails) {
            const termsDetails = [
              customDetails.contractValue ? `Contract Value: ${contract.currency} ${customDetails.contractValue?.toLocaleString()}` : null,
              customDetails.salary ? `Annual Salary: ${contract.currency} ${customDetails.salary?.toLocaleString()}` : null,
              customDetails.signOnBonus ? `Sign-on Bonus: ${contract.currency} ${customDetails.signOnBonus?.toLocaleString()}` : null,
              customDetails.performanceBonus ? `Performance Bonus: ${contract.currency} ${customDetails.performanceBonus?.toLocaleString()}` : null,
              customDetails.duration ? `Contract Duration: ${customDetails.duration}` : null
            ].filter(Boolean).join(' • ');

            actionMessage = `Agent submitted a counter-proposal:\n\n${termsDetails}`;
          } else {
            actionMessage = 'Agent submitted a counter-proposal';
          }
          break;
        case 'counter-offer':
          newStatus = 'negotiating';
          newStep = 'negotiating';
          // Create detailed message with offer terms
          if (customDetails) {
            const termsDetails = [
              customDetails.contractValue ? `Contract Value: ${contract.currency} ${customDetails.contractValue?.toLocaleString()}` : null,
              customDetails.salary ? `Annual Salary: ${contract.currency} ${customDetails.salary?.toLocaleString()}` : null,
              customDetails.signOnBonus ? `Sign-on Bonus: ${contract.currency} ${customDetails.signOnBonus?.toLocaleString()}` : null,
              customDetails.performanceBonus ? `Performance Bonus: ${contract.currency} ${customDetails.performanceBonus?.toLocaleString()}` : null,
              customDetails.duration ? `Contract Duration: ${customDetails.duration}` : null
            ].filter(Boolean).join(' • ');

            actionMessage = `Team sent a counter-offer:\n\n${termsDetails}`;
          } else {
            actionMessage = 'Team sent a counter-offer';
          }
          break;
        case 'accept-agent-terms':
          newStatus = 'finalized';
          newStep = 'signed';
          actionMessage = 'Team accepted agent terms';
          // When accepting agent terms, we need to apply the latest agent proposal
          if (!customDetails) {
            customDetails = getLatestAgentProposal();
          }
          break;
        case 'withdraw-offer':
          newStatus = 'withdrawn';
          newStep = 'expired';
          actionMessage = 'Team withdrew the contract offer';
          break;
        case 'finalize-deal':
          newStatus = 'finalized';
          newStep = 'signed';
          actionMessage = 'Deal finalized - ready for completion';
          break;
        case 'complete-transfer': {
          newStatus = 'completed';
          newStep = 'completed';
          actionMessage = 'Transfer completed successfully';
          // Update player status to transferred
          // Get player_id from contract or fetch from pitch
          let playerId = contract.player_id;
          if (!playerId && contract.pitch_id) {
            // Fetch player_id from the transfer pitch
            const { data: pitchData } = await supabase
              .from('transfer_pitches')
              .select('player_id')
              .eq('id', contract.pitch_id)
              .single();
            if (pitchData) {
              playerId = (pitchData as unknown as { player_id: string }).player_id;
            }
          }

          if (playerId) {
            await updatePlayerStatusToTransferred(playerId);
          }
          break;
        }
        case 'reopen-negotiation':
          newStatus = 'negotiating';
          newStep = 'negotiating';
          actionMessage = userRole === 'agent' ? 'Agent reopened negotiations' : 'Team reopened negotiations';
          break;
        case 'request-renegotiation':
          newStatus = 'negotiating';
          newStep = 'negotiating';
          actionMessage = 'Agent requested renegotiation';
          break;
        case 'initiate-signing':
          newStatus = 'contract_signing';
          newStep = 'contract_signing';
          actionMessage = 'Team initiated contract signing phase';
          // Don't open modal immediately, let the status update first
          break;
        case 'sign-contract': {
          // Handle digital signature
          newStatus = 'contract_signing';
          newStep = 'contract_signing';
          actionMessage = 'Agent signed the contract digitally';

          // Update contract with signature data
          const signatureData = customDetails?.signatureData;

          if (!customDetails) {
            customDetails = {
              signatures: {
                ...contract?.signatures,
                agent_signed_at: new Date().toISOString(),
                agent_signature_id: `sig_${Date.now()}`,
                agent_signature_data: signatureData || null
              }
            };
          } else {
            // If customDetails contains signature data, use it
            customDetails.signatures = {
              ...contract?.signatures,
              agent_signed_at: new Date().toISOString(),
              agent_signature_id: `sig_${Date.now()}`,
              agent_signature_data: signatureData || null
            };
          }
          break;
        }
        case 'cancel-signature':
          // Handle signature cancellation
          newStatus = 'contract_signing';
          newStep = 'contract_signing';
          actionMessage = 'Agent cancelled their signature';
          // Remove agent signature from contract
          if (!customDetails) {
            customDetails = {
              signatures: {
                ...contract?.signatures,
                agent_signed_at: null,
                agent_signature_id: null
              }
            };
          }
          break;
        case 'confirm-agent-signature':
          // Validate that agent signature still exists
          if (!contract?.signatures?.agent_signed_at) {
            toast({
              title: "Agent Signature Not Found",
              description: "The agent signature has been cancelled. Please refresh the page to see the latest status.",
              variant: "destructive",
              duration: 7000,
            });
            return; // Exit without updating contract
          }

          newStatus = 'payment_pending';
          newStep = 'payment_pending';
          actionMessage = 'Team confirmed agent signature - payment phase started';
          // Update contract with team confirmation
          if (!customDetails) {
            customDetails = {
              signatures: {
                ...contract?.signatures,
                team_confirmed_at: new Date().toISOString(),
                team_confirmation_id: `conf_${Date.now()}`
              }
            };
          }
          // Don't open payment modal immediately, let the status update first
          break;
        case 'make-payment':
          setShowPaymentOptions(true);
          return; // Don't update contract status, just open modal
        case 'view-payment-status':
          setShowPaymentOptions(true);
          return;
        case 'view-payment-history':
          setShowAgentPaymentHistory(true);
          return;
        case 'open-wallet':
          setShowTeamWallet(true);
          return;
        case 'view-signature-status':
          setShowDigitalSignature(true);
          return;
        default:
          throw new Error('Unknown action');
      }

      // Update contract in database - try both current_step and deal_stage
      // Map new statuses to allowed deal_stage values
      const mapToDealStage = (step: string) => {
        switch (step) {
          case 'contract_signing': return 'signed';
          case 'payment_pending': return 'signed';
          case 'completed': return 'signed';
          default: return step;
        }
      };

      const updateData: Record<string, unknown> = {
        status: newStatus,
        current_step: newStep,
        deal_stage: mapToDealStage(newStep), // Map to allowed deal_stage values
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        negotiation_rounds: (contract.negotiation_rounds || 0) + 1
      };

      // Update signatures if provided
      if (customDetails?.signatures) {
        updateData.signatures = customDetails.signatures;
      }

      // Only update terms if provided and it's not a counter-proposal (which should only update when accepted)
      if (customDetails && !['submit-counter-proposal', 'counter-offer'].includes(action)) {
        // Don't include signatures in terms
        const { signatures, ...termsData } = customDetails;
        if (Object.keys(termsData).length > 0) {
          updateData.terms = { ...(contract.terms || {}), ...termsData };
          // Also update contract_value if it's in the terms
          if (customDetails.contractValue) {
            updateData.contract_value = customDetails.contractValue;
          }
        }
      }

      const { data: updatedContract, error } = await supabase
        .from('contracts')
        // @ts-expect-error: Missing supabase types
        .update(updateData)
        .eq('id', contractId)
        .select()
        .single();

      if (error) {
        console.error('Contract update failed:', error);
        throw error;
      }

      // Add action message
      const messageContent = actionMessage + (actionDetails ? ` - ${actionDetails}` : '');

      await contractManagementService.addContractMessage(
        contractId,
        profile.id,
        messageContent,
        'action'
      );

      // Update local state
      setContract(prev => prev ? {
        ...prev,
        status: newStatus,
        current_step: newStep,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        negotiation_rounds: (prev.negotiation_rounds || 0) + 1,
        ...(customDetails && { terms: { ...(prev.terms || {}), ...customDetails } }),
        ...(customDetails?.contractValue && { contract_value: customDetails.contractValue })
      } : null);

      // Reload messages and contract data
      await Promise.all([
        loadMessages(),
        loadContractData() // Reload contract to ensure UI is in sync
      ]);

      toast({
        title: "Success",
        description: actionMessage
      });

      setActionModalOpen(false);
      setSelectedAction('');
      setActionDetails('');
    } catch (error) {
      console.error('Error updating contract:', error);
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive"
      });
    }
  };

  // Get available actions based on user role and contract status
  const getAvailableActions = () => {
    if (!contract || !userRole) return [];

    const status = contract.status;

    if (userRole === 'team') {
      switch (status) {
        case 'draft':
          return [
            { key: 'counter-offer', label: 'Send Offer', icon: Send, variant: 'default', color: 'bg-blue-600 hover:bg-blue-700' },
            { key: 'withdraw-offer', label: 'Cancel Draft', icon: X, variant: 'outline', color: 'border-red-500 text-red-600 hover:bg-red-50' }
          ];
        case 'sent':
        case 'under_review':
        case 'negotiating':
          return [
            { key: 'counter-offer', label: 'Send Counter-Offer', icon: RefreshCw, variant: 'outline', color: 'border-blue-500 text-blue-600 hover:bg-blue-50' },
            { key: 'accept-agent-terms', label: 'Accept Agent Terms', icon: CheckCircle, variant: 'default', color: 'bg-green-600 hover:bg-green-700' },
            { key: 'withdraw-offer', label: 'Withdraw Offer', icon: X, variant: 'outline', color: 'border-red-500 text-red-600 hover:bg-red-50' }
          ];
        case 'finalized':
          return [
            { key: 'initiate-signing', label: 'Initiate Contract Signing', icon: FileSignature, variant: 'default', color: 'bg-purple-600 hover:bg-purple-700' },
            { key: 'reopen-negotiation', label: 'Reopen Negotiation', icon: Edit, variant: 'outline', color: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50' }
          ];
        case 'contract_signing': {
          const agentSigned = contract?.signatures?.agent_signed_at;

          return [
            { key: 'view-signature-status', label: 'View Signature Status', icon: FileSignature, variant: 'outline', color: 'border-purple-500 text-purple-600 hover:bg-purple-50' },
            {
              key: 'confirm-agent-signature',
              label: 'Confirm Agent Signature',
              icon: CheckCircle,
              variant: 'default',
              color: agentSigned ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed',
              disabled: !agentSigned
            }
          ];
        }
        case 'payment_pending':
          return [
            { key: 'view-payment-status', label: 'View Payment Status', icon: CreditCard, variant: 'outline', color: 'border-blue-500 text-blue-600 hover:bg-blue-50' },
            { key: 'open-wallet', label: 'Open Team Wallet', icon: Wallet, variant: 'outline', color: 'border-green-500 text-green-600 hover:bg-green-50' }
          ];
        default:
          return [];
      }
    } else if (userRole === 'agent') {
      switch (status) {
        case 'draft':
        case 'sent':
        case 'under_review':
          return [
            { key: 'accept-offer', label: 'Accept Offer', icon: CheckCircle, variant: 'default', color: 'bg-green-600 hover:bg-green-700' },
            { key: 'negotiate-terms', label: 'Negotiate Terms', icon: Edit, variant: 'outline', color: 'border-blue-500 text-blue-600 hover:bg-blue-50' },
            { key: 'reject-offer', label: 'Reject Offer', icon: XCircle, variant: 'outline', color: 'border-red-500 text-red-600 hover:bg-red-50' }
          ];
        case 'negotiating':
          return [
            { key: 'submit-counter-proposal', label: 'Submit Counter-Proposal', icon: Send, variant: 'default', color: 'bg-blue-600 hover:bg-blue-700' },
            { key: 'accept-offer', label: 'Accept Current Terms', icon: CheckCircle, variant: 'outline', color: 'border-green-500 text-green-600 hover:bg-green-50' },
            { key: 'reject-offer', label: 'Reject Offer', icon: XCircle, variant: 'outline', color: 'border-red-500 text-red-600 hover:bg-red-50' }
          ];
        case 'finalized':
          return [
            { key: 'request-renegotiation', label: 'Request Renegotiation', icon: RefreshCw, variant: 'outline', color: 'border-yellow-500 text-yellow-600 hover:bg-yellow-50' }
          ];
        case 'contract_signing': {
          const agentSigned = contract?.signatures?.agent_signed_at;
          const teamConfirmed = contract?.signatures?.team_confirmed_at;

          const actions = [
            { key: 'view-signature-status', label: 'View Signature Status', icon: FileSignature, variant: 'outline', color: 'border-purple-500 text-purple-600 hover:bg-purple-50' }
          ];

          // If agent hasn't signed yet, show sign button
          if (!agentSigned) {
            actions.push({ key: 'sign-contract', label: 'Sign Contract Digitally', icon: FileSignature, variant: 'default', color: 'bg-purple-600 hover:bg-purple-700' });
          }

          // If agent has signed but team hasn't confirmed, show cancel signature button
          if (agentSigned && !teamConfirmed) {
            actions.push({ key: 'cancel-signature', label: 'Cancel Signature', icon: X, variant: 'outline', color: 'border-red-500 text-red-600 hover:bg-red-50' });
          }

          return actions;
        }
        case 'payment_pending':
          return [
            { key: 'make-payment', label: 'Make Payment', icon: CreditCard, variant: 'default', color: 'bg-green-600 hover:bg-green-700' },
            { key: 'view-payment-history', label: 'Payment History', icon: Wallet, variant: 'outline', color: 'border-blue-500 text-blue-600 hover:bg-blue-50' }
          ];
        default:
          return [];
      }
    }

    return [];
  };

  // Render modern progress bar
  const renderProgressBar = () => {
    const stages = getWorkflowStages();
    const currentIndex = getCurrentStageIndex();
    const isRejectedOrWithdrawn = contract?.status === 'rejected' || contract?.status === 'withdrawn';
    const progressPercentage = currentIndex >= 0 ? (currentIndex / (stages.length - 1)) * 100 : 0;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-100">Contract Progress</h3>
          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
              {connectionStatus === 'connected' ? 'Connected' :
                connectionStatus === 'connecting' ? 'Connecting...' :
                  'Disconnected'}
            </div>

            <div className="text-sm text-gray-600">
              Step {Math.max(currentIndex + 1, 1)} of {stages.length}
            </div>
            <Badge
              variant={isRejectedOrWithdrawn ? 'destructive' : currentIndex >= 0 && currentIndex === stages.length - 1 ? 'default' : 'secondary'}
              className={`px-3 py-1 font-medium ${contract?.status === 'contract_signing' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                contract?.status === 'payment_pending' ? 'bg-green-100 text-green-700 border-green-200' :
                  ''
                }`}
            >
              {contract?.status?.replace('_', ' ').replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Modern Progress Track */}
        <div className="relative mb-8">
          {/* Background Track */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            {/* Progress Fill */}
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${isRejectedOrWithdrawn
                ? 'bg-gradient-to-r from-red-400 to-red-500'
                : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

          {/* Stage Indicators */}
          <div className="absolute -top-3 left-0 right-0">
            <div className="flex justify-between">
              {stages.map((stage, index) => {
                const isActive = index === currentIndex && currentIndex >= 0;
                const isCompleted = currentIndex >= 0 && index < currentIndex && !isRejectedOrWithdrawn;
                const isRejected = isRejectedOrWithdrawn && currentIndex >= 0 && index >= currentIndex;

                return (
                  <div key={stage.key} className="flex flex-col items-center">
                    {/* Modern Circle Indicator */}
                    <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${isRejected
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                      isActive
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/40 ring-4 ring-green-500/20 scale-110' :
                        isCompleted
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' :
                          'bg-white border-2 border-gray-300 text-gray-400 shadow-sm'
                      }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isRejected ? (
                        <XCircle className="w-4 h-4" />
                      ) : isActive ? (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        index + 1
                      )}

                      {/* Pulse animation for active stage */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                      )}
                    </div>

                    {/* Stage Label */}
                    <div className="mt-4 text-center">
                      <div className={`text-sm font-semibold transition-all duration-300 ${isActive ? 'text-rosegold scale-105' :
                        isCompleted ? 'text-green-600' :
                          isRejected ? 'text-red-600' :
                            'text-gray-500'
                        }`}>
                        {stage.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 leading-tight hidden sm:block">
                        {stage.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render role-specific action buttons
  const renderActionButtons = () => {
    const actions = getAvailableActions();

    if (actions.length === 0) {
      return (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
            <CheckCircle className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm font-medium">
            {contract?.status === 'completed' ? 'Transfer completed!' :
              contract?.status === 'rejected' ? 'Contract rejected' :
                contract?.status === 'withdrawn' ? 'Contract withdrawn' :
                  'No actions available'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          const isPrimary = action.variant === 'default';

          return (
            <Button
              key={action.key}
              variant={action.variant as "default" | "outline" | "destructive" | "secondary" | "ghost" | "link"}
              disabled={action.disabled || false}
              className={`w-full h-11 flex items-center justify-center gap-2 font-medium transition-all duration-200 ${isPrimary
                ? action.color || 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                : action.color || 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (action.disabled) return; // Prevent action if button is disabled

                setSelectedAction(action.key);
                if (action.key === 'counter-offer' || action.key === 'submit-counter-proposal' || action.key === 'negotiate-terms') {
                  setActionModalOpen(true);
                } else {
                  handleContractAction(action.key);
                }
              }}
            >
              <IconComponent className="w-4 h-4" />
              <span className="text-sm">{action.label}</span>
            </Button>
          );
        })}
      </div>
    );
  };

  // Extract proposal terms from message content
  const extractProposalTerms = (messageContent: string): ContractTerms => {
    const terms: ContractTerms = {};

    // Extract contract value
    const contractValueMatch = messageContent.match(/Contract Value: [A-Z]+ ([\d,]+)/);
    if (contractValueMatch) {
      terms.contractValue = parseFloat(contractValueMatch[1].replace(/,/g, ''));
    }

    // Extract salary
    const salaryMatch = messageContent.match(/Annual Salary: [A-Z]+ ([\d,]+)/);
    if (salaryMatch) {
      terms.salary = parseFloat(salaryMatch[1].replace(/,/g, ''));
    }

    // Extract sign-on bonus
    const signOnBonusMatch = messageContent.match(/Sign-on Bonus: [A-Z]+ ([\d,]+)/);
    if (signOnBonusMatch) {
      terms.signOnBonus = parseFloat(signOnBonusMatch[1].replace(/,/g, ''));
    }

    // Extract performance bonus
    const performanceBonusMatch = messageContent.match(/Performance Bonus: [A-Z]+ ([\d,]+)/);
    if (performanceBonusMatch) {
      terms.performanceBonus = parseFloat(performanceBonusMatch[1].replace(/,/g, ''));
    }

    // Extract duration
    const durationMatch = messageContent.match(/Contract Duration: ([^\u2022\n]+)/);
    if (durationMatch) {
      terms.duration = durationMatch[1].trim();
    }

    return terms;
  };

  // Accept a specific proposal from a message
  const acceptProposal = async (messageId: string, messageContent: string) => {
    if (!contractId || !profile?.id) return;
    const proposalTerms = extractProposalTerms(messageContent);

    // Apply the proposal terms to the contract
    const updateData: Record<string, unknown> = {
      status: 'finalized',
      current_step: 'signed',
      deal_stage: 'signed', // This is already a valid deal_stage value
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      negotiation_rounds: (contract?.negotiation_rounds || 0) + 1
    };

    if (Object.keys(proposalTerms).length > 0) {
      updateData.terms = { ...(contract?.terms || {}), ...proposalTerms };
      if (proposalTerms.contractValue) {
        updateData.contract_value = proposalTerms.contractValue;
      }
    }

    try {
      const { error } = await supabase
        .from('contracts')
        // @ts-expect-error: Missing supabase types
        .update(updateData)
        .eq('id', contractId);

      if (error) throw error;

      // Add acceptance message
      await contractManagementService.addContractMessage(
        contractId,
        profile.id,
        `${userRole === 'team' ? 'Team' : 'Agent'} accepted the proposal`,
        'action'
      );

      // Mark proposal as responded to
      setRespondedProposals(prev => new Set([...prev, messageId]));

      // Reload data
      await Promise.all([
        loadMessages(),
        loadContractData()
      ]);

      toast({
        title: "Success",
        description: "Proposal accepted successfully"
      });
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: "Error",
        description: "Failed to accept proposal",
        variant: "destructive"
      });
    }
  };

  // Reject a specific proposal from a message
  const rejectProposal = async (messageId: string) => {
    if (!contractId || !profile?.id) return;
    try {
      // Mark proposal as responded to
      setRespondedProposals(prev => new Set([...prev, messageId]));

      await contractManagementService.addContractMessage(
        contractId,
        profile.id,
        `${userRole === 'team' ? 'Team' : 'Agent'} rejected the proposal`,
        'action'
      );

      await loadMessages();

      toast({
        title: "Proposal Rejected",
        description: "The proposal has been rejected"
      });
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast({
        title: "Error",
        description: "Failed to reject proposal",
        variant: "destructive"
      });
    }
  };

  // Counter a specific proposal from a message
  const counterProposal = async (messageId: string) => {
    // Mark proposal as responded to
    setRespondedProposals(prev => new Set([...prev, messageId]));

    // Open counter-offer modal
    setSelectedAction('counter-offer');
    setActionModalOpen(true);
  };

  // Get the latest agent counter-proposal terms
  const getLatestAgentProposal = () => {
    // For now, return the counterOfferTerms as they contain the latest values
    return counterOfferTerms;
  };

  // Auto-update draft contracts to sent status
  const updateContractStatusToSent = useCallback(async () => {
    if (!contractId) return;

    try {
      const { error } = await supabase
        .from('contracts')
        // @ts-expect-error: Missing supabase types
        .update({
          status: 'sent',
          current_step: 'under_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId);

      if (error) {
        console.error('Error updating contract status:', error);
        return;
      }

      // Update local state
      setContract(prev => prev ? {
        ...prev,
        status: 'sent',
        current_step: 'under_review',
        updated_at: new Date().toISOString()
      } : null);

      console.log('Contract status updated from draft to sent');
    } catch (error) {
      console.error('Error updating contract status:', error);
    }
  }, [contractId]);

  const handlePlayerTransfer = async () => {
    if (!contractId || !contract) return;
    try {
      await contractManagementService.completeTransfer(contractId, contract.pitch_id);

      toast({
        title: "Transfer Completed",
        description: "Player has been successfully transferred"
      });

      // Navigate back to contracts page
      navigate('/contracts');
    } catch (error) {
      console.error('Error completing transfer:', error);
      toast({
        title: "Error",
        description: "Failed to complete transfer",
        variant: "destructive"
      });
    }
  };

  const uploadContractDocument = async (file: File) => {
    if (!contract || !contractId) return;

    setUploadingDocument(true);
    try {
      const url = await contractManagementService.uploadContractDocument(contractId, file);

      setContract(prev => prev ? {
        ...prev,
        document_url: url,
        updated_at: new Date().toISOString()
      } : null);

      toast({
        title: "Document uploaded",
        description: "Contract document has been uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const downloadContract = () => {
    if (contract?.document_url) {
      // Download uploaded document
      window.open(contract.document_url, '_blank');
    } else {
      // Download generated contract
      const blob = new Blob([contractPreview], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contractId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (contractId) {
      loadContractData();
      setupRealtimeSubscription();
    }

    return () => {
      // Cleanup subscription on unmount
      if (messageChannelRef.current) {
        try {
          supabase.removeChannel(messageChannelRef.current);
        } catch (error) {
          console.warn('Error removing message channel:', error);
        }
        messageChannelRef.current = null;
      }
      if (updateChannelRef.current) {
        try {
          supabase.removeChannel(updateChannelRef.current);
        } catch (error) {
          console.warn('Error removing update channel:', error);
        }
        updateChannelRef.current = null;
      }
    };
  }, [contractId, loadContractData, setupRealtimeSubscription]);

  // Note: Auto-showing of modals is now handled by real-time subscription for better synchronization

  // Auto-reload page when connection fails multiple times
  useEffect(() => {
    if (connectionRetries >= 3 && !isConnected) {
      toast({
        title: "Connection Issues Detected",
        description: "Reloading page to restore connection...",
        duration: 2000,
      });

      // Small delay to show the toast, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [connectionRetries, isConnected, toast]);

  // Connection health check
  useEffect(() => {
    if (!contractId) return;

    const healthCheckInterval = setInterval(async () => {
      try {
        // Test connection by attempting a simple query
        const { error } = await supabase
          .from('contracts')
          .select('id')
          .eq('id', contractId)
          .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
          console.warn('Connection health check failed:', error);

          // If we've been disconnected for a while, trigger reconnection
          if (!isConnected && connectionRetries < 3) {
            setConnectionRetries(prev => prev + 1);
            setupRealtimeSubscription();
          }
        }
      } catch (error) {
        console.warn('Health check error:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [contractId, isConnected, connectionRetries, setupRealtimeSubscription]);

  // Determine user role based on contract data and auto-update draft contracts
  useEffect(() => {
    if (contract && profile) {
      if (profile.user_type === 'team') {
        setUserRole('team');
      } else if (profile.user_type === 'agent') {
        setUserRole('agent');
      }

      // Auto-update draft contracts to sent status for better UX
      if (contract.status === 'draft' && contract.current_step === 'draft') {
        updateContractStatusToSent();
      }
    }
  }, [contract, profile, updateContractStatusToSent]);

  // Initialize counter offer terms from contract
  useEffect(() => {
    if (contract) {
      setCounterOfferTerms({
        contractValue: contract.contract_value || 0,
        salary: contract.terms?.salary || 0,
        signOnBonus: contract.terms?.signOnBonus || 0,
        performanceBonus: contract.terms?.performanceBonus || 0,
        duration: contract.terms?.duration || ''
      });
    }
  }, [contract]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show notification for new messages
  useEffect(() => {
    if (hasNewMessages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.sender_id !== profile?.id) {
        toast({
          title: "New Message",
          description: `${latestMessage.sender_profile?.full_name || 'Someone'} sent a message`,
          duration: 3000,
        });
        setHasNewMessages(false);
      }
    }
  }, [hasNewMessages, messages, profile?.id, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'pending': return 'bg-yellow-500';
      case 'finalized': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStepColor = (step: string) => {
    switch (step) {
      case 'draft': return 'bg-gray-500';
      case 'review': return 'bg-blue-500';
      case 'negotiation': return 'bg-yellow-500';
      case 'finalization': return 'bg-green-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-rosegold" />
            <p className="text-muted-foreground font-poppins">Loading contract...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2 font-poppins">Contract Not Found</h3>
            <p className="text-muted-foreground mb-4 font-poppins">The contract you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/contracts')} className="font-poppins">
              Back to Contracts
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br ">
        {/* Modern Header */}
        <div className="border-0 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/contracts')}
                  className="flex items-center gap-2 text-gray-100 hover:text-gray-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Contracts
                </Button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-100">Contract Negotiation</h1>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span>{contract.pitch?.player?.full_name}</span>
                    <span>•</span>
                    <span className="capitalize">{contract.transfer_type} Transfer</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {contract.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Connection Status */}
                <div className="flex items-center gap-2 text-sm">
                  {isConnected ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 font-medium">Live</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600 font-medium">Offline</span>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadContract}
                  className="bg-destructive text-white hover:bg-destructive/90 flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6 shadow-sm border-0">
          <CardContent className="pb-[4rem] pt-6">
            {renderProgressBar()}
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
          {/* Left Sidebar - Contract Info & Actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Contract Details */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="border-b border-gray-600 pb-3">
                <CardTitle className="text-gray-100 flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-gray-100" />
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Player Info */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="font-medium text-gray-100 mb-2 text-sm">Player</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="font-medium">{contract?.pitch?.player?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3 h-3 text-gray-400" />
                        <span>{contract?.pitch?.player?.position}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Terms */}
                  <div className="bg-[#111111] rounded-lg p-3">
                    <h5 className="font-medium  mb-2 text-sm">Financial Terms</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="">Transfer Fee</span>
                        <span className="font-semibold text-green-700">
                          {contract?.currency} {contract?.contract_value?.toLocaleString()}
                        </span>
                      </div>
                      {contract?.terms?.salary && (
                        <div className="flex justify-between items-center">
                          <span className="">Salary</span>
                          <span className="font-medium">
                            {contract?.currency} {contract.terms.salary?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {contract?.terms?.signOnBonus && (
                        <div className="flex justify-between items-center">
                          <span className="">Sign-on</span>
                          <span className="font-medium">
                            {contract?.currency} {contract.terms.signOnBonus?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {contract?.terms?.duration && (
                        <div className="flex justify-between items-center">
                          <span className="">Duration</span>
                          <span className="font-medium">{contract.terms.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader className="border-b border-gray-600 pb-3">
                <CardTitle className="text-gray-100 flex items-center gap-2 text-base">
                  <Handshake className="w-4 h-4 text-green-600" />
                  {userRole === 'team' ? 'Team Actions' : 'Agent Actions'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {renderActionButtons()}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="discussion" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="discussion" className="flex items-center gap-2 font-poppins">
                  <MessageSquare className="h-4 w-4" />
                  Discussion
                </TabsTrigger>
                <TabsTrigger value="contract" className="flex items-center gap-2 font-poppins">
                  <FileText className="h-4 w-4" />
                  Contract
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2 font-poppins">
                  <Clock className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discussion" className="space-y-4">
                <Card className='border-0'>
                  <CardHeader>
                    <CardTitle className="font-poppins flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Contract Discussion
                      {hasNewMessages && (
                        <BellRing className="h-4 w-4 text-rosegold animate-pulse" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96 mb-4">
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isCurrentUser = message.sender_id === profile?.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'
                                }`}
                            >
                              {!isCurrentUser && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                                  {/* Show logo if available */}
                                  {message.sender_profile?.user_type === 'team' && contract?.team?.logo_url ? (
                                    <img
                                      src={contract.team.logo_url}
                                      alt="Team logo"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to initials if image fails to load
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}

                                  {/* Fallback initials */}
                                  <div className={`w-full h-full flex items-center justify-center text-xs font-medium font-poppins ${message.sender_profile?.user_type === 'agent' ? 'bg-blue-500' :
                                    message.sender_profile?.user_type === 'team' ? 'bg-green-500' :
                                      message.sender_profile?.user_type === 'system' ? 'bg-gray-500' : 'bg-rosegold'
                                    } ${(message.sender_profile?.user_type === 'team' && contract?.team?.logo_url) ? 'hidden' : ''}`}>
                                    {message.sender_profile?.full_name?.charAt(0) || 'U'}
                                  </div>
                                </div>
                              )}
                              <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-first' : ''
                                }`}>
                                <div className={`inline-block p-3 rounded-lg font-poppins ${isCurrentUser
                                  ? 'bg-rosegold text-white'
                                  : 'bg-muted text-foreground'
                                  }`}>
                                  {!isCurrentUser && (
                                    <p className="text-sm font-medium mb-1 opacity-80">
                                      {message.sender_profile?.full_name || 'Unknown'}
                                    </p>
                                  )}
                                  <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>

                                  {/* Action buttons for counter-proposals */}
                                  {!isCurrentUser && message.message_type === 'action' &&
                                    (message.content.includes('counter-proposal') || message.content.includes('counter-offer')) &&
                                    !respondedProposals.has(message.id) && (
                                      <div className="flex gap-2 mt-3">
                                        <Button
                                          size="sm"
                                          className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                                          onClick={() => acceptProposal(message.id, message.content)}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Accept
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-3 text-xs border-red-500 text-red-600 hover:bg-red-50"
                                          onClick={() => rejectProposal(message.id)}
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Reject
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-3 text-xs"
                                          onClick={() => counterProposal(message.id)}
                                        >
                                          <RefreshCw className="w-3 h-3 mr-1" />
                                          Counter
                                        </Button>
                                      </div>
                                    )}

                                  {/* Show responded status */}
                                  {!isCurrentUser && message.message_type === 'action' &&
                                    (message.content.includes('counter-proposal') || message.content.includes('counter-offer')) &&
                                    respondedProposals.has(message.id) && (
                                      <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="w-4 h-4 text-green-500" />
                                          <span className="text-xs text-gray-600 font-medium">This proposal has been responded to</span>
                                        </div>
                                      </div>
                                    )}

                                  <p className={`text-xs opacity-70 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'
                                    }`}>
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  {message.message_type === 'action' && (
                                    <Badge variant="outline" className="mt-1 text-xs font-poppins">
                                      Action
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isCurrentUser && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                                  {/* Show current user logo if available */}
                                  {profile?.user_type === 'team' && contract?.team?.logo_url ? (
                                    <img
                                      src={contract.team.logo_url}
                                      alt="Your team logo"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}

                                  {/* Fallback initials */}
                                  <div className={`w-full h-full bg-rosegold flex items-center justify-center text-xs font-medium font-poppins ${(profile?.user_type === 'team' && contract?.team?.logo_url) ? 'hidden' : ''}`}>
                                    {profile?.full_name?.charAt(0) || 'U'}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        className="flex-1 font-poppins"
                        disabled={!isConnected}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !isConnected}
                        className="font-poppins"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {!isConnected && (
                      <p className="text-xs text-muted-foreground mt-2 font-poppins">
                        ⚠️ Connection lost. Messages may not be sent.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contract" className="space-y-4 ">
                <Card className='border-0'>
                  <CardHeader>
                    <CardTitle className="font-poppins">Contract Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium font-poppins">Player</Label>
                          <p className="text-sm text-muted-foreground font-poppins">{contract.pitch?.player?.full_name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium font-poppins">Position</Label>
                          <p className="text-sm text-muted-foreground font-poppins">{contract.pitch?.player?.position}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium font-poppins">Transfer Type</Label>
                          <p className="text-sm text-muted-foreground font-poppins capitalize">{contract.transfer_type}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium font-poppins">Contract Value</Label>
                          <p className="text-sm text-muted-foreground font-poppins">{contract.currency} {contract.contract_value?.toLocaleString()}</p>
                        </div>
                      </div>

                      {contract.document_url && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2 font-poppins">Uploaded Contract Document</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(contract.document_url, '_blank')}
                            className="font-poppins"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Document
                          </Button>
                        </div>
                      )}

                      <div
                        className="prose prose-sm max-w-none font-poppins"
                        dangerouslySetInnerHTML={{ __html: contractPreview }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card className='border-0'>
                  <CardHeader>
                    <CardTitle className="font-poppins">Contract Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium font-poppins">Contract Created</p>
                          <p className="text-sm text-muted-foreground font-poppins">
                            {new Date(contract.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium font-poppins">Under Review</p>
                          <p className="text-sm text-muted-foreground font-poppins">
                            Contract is being reviewed by both parties
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className="font-medium font-poppins">In Negotiation</p>
                          <p className="text-sm text-muted-foreground font-poppins">
                            Currently in negotiation phase
                          </p>
                        </div>
                      </div>
                      {contract.status === 'finalized' && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium font-poppins">Finalized</p>
                            <p className="text-sm text-muted-foreground font-poppins">
                              Contract has been finalized
                            </p>
                          </div>
                        </div>
                      )}
                      {contract.status === 'completed' && (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div>
                            <p className="font-medium font-poppins">Transfer Completed</p>
                            <p className="text-sm text-muted-foreground font-poppins">
                              Player transfer has been completed
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Legacy Quick Actions removed - replaced with role-specific action buttons above */}
          </div>
        </div>
      </div>

      {/* Enhanced Action Modal for Counter-offers and Counter-proposals */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-poppins">
              {selectedAction === 'counter-offer' ? 'Team Counter-Offer' :
                selectedAction === 'submit-counter-proposal' ? 'Agent Counter-Proposal' :
                  selectedAction === 'negotiate-terms' ? 'Negotiate Terms' : 'Action Details'}
            </DialogTitle>
            <DialogDescription className="font-poppins">
              {selectedAction === 'counter-offer' ? 'Adjust the contract terms and send a counter-offer to the agent.' :
                selectedAction === 'submit-counter-proposal' ? 'Propose alternative terms to the team.' :
                  selectedAction === 'negotiate-terms' ? 'Specify what terms you would like to negotiate.' :
                    'Please provide additional details for this action.'}
            </DialogDescription>
          </DialogHeader>

          {(selectedAction === 'counter-offer' || selectedAction === 'submit-counter-proposal') ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractValue" className="font-poppins">Contract Value ({contract?.currency})</Label>
                  <Input
                    id="contractValue"
                    type="number"
                    value={counterOfferTerms.contractValue}
                    onChange={(e) => setCounterOfferTerms(prev => ({ ...prev, contractValue: parseFloat(e.target.value) || 0 }))}
                    className="font-poppins"
                  />
                </div>
                <div>
                  <Label htmlFor="salary" className="font-poppins">Annual Salary ({contract?.currency})</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={counterOfferTerms.salary}
                    onChange={(e) => setCounterOfferTerms(prev => ({ ...prev, salary: parseFloat(e.target.value) || 0 }))}
                    className="font-poppins"
                  />
                </div>
                <div>
                  <Label htmlFor="signOnBonus" className="font-poppins">Sign-on Bonus ({contract?.currency})</Label>
                  <Input
                    id="signOnBonus"
                    type="number"
                    value={counterOfferTerms.signOnBonus}
                    onChange={(e) => setCounterOfferTerms(prev => ({ ...prev, signOnBonus: parseFloat(e.target.value) || 0 }))}
                    className="font-poppins"
                  />
                </div>
                <div>
                  <Label htmlFor="performanceBonus" className="font-poppins">Performance Bonus ({contract?.currency})</Label>
                  <Input
                    id="performanceBonus"
                    type="number"
                    value={counterOfferTerms.performanceBonus}
                    onChange={(e) => setCounterOfferTerms(prev => ({ ...prev, performanceBonus: parseFloat(e.target.value) || 0 }))}
                    className="font-poppins"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="duration" className="font-poppins">Contract Duration</Label>
                <Input
                  id="duration"
                  value={counterOfferTerms.duration}
                  onChange={(e) => setCounterOfferTerms(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 2 years"
                  className="font-poppins"
                />
              </div>
              <div>
                <Label htmlFor="actionDetails" className="font-poppins">Additional Notes</Label>
                <Textarea
                  id="actionDetails"
                  placeholder="Add any additional notes or explanations..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="font-poppins"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="actionDetails" className="font-poppins">Details</Label>
                <Textarea
                  id="actionDetails"
                  placeholder="Please provide details for this action..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="font-poppins"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModalOpen(false)} className="font-poppins">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAction === 'counter-offer' || selectedAction === 'submit-counter-proposal') {
                  handleContractAction(selectedAction, counterOfferTerms);
                } else {
                  handleContractAction(selectedAction);
                }
              }}
              className="font-poppins"
            >
              {selectedAction === 'counter-offer' ? 'Send Counter-Offer' :
                selectedAction === 'submit-counter-proposal' ? 'Submit Proposal' :
                  selectedAction === 'negotiate-terms' ? 'Request Negotiation' :
                    'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Signature Modal */}
      <Dialog open={showDigitalSignature} onOpenChange={setShowDigitalSignature}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins">Digital Contract Signing</DialogTitle>
            <DialogDescription className="font-poppins">
              Complete the digital signature process for this contract.
            </DialogDescription>
          </DialogHeader>
          <DigitalSignature
            contract={contract}
            userRole={userRole!}
            contractPreview={contractPreview}
            onSign={async (signatureData) => {
              // Extract the actual signature data from the JSON metadata
              let actualSignatureData = signatureData;
              if (signatureData) {
                try {
                  const signatureMetadata = JSON.parse(signatureData);
                  actualSignatureData = signatureMetadata.signatureData;
                } catch (error) {
                  actualSignatureData = signatureData;
                }
              }
              await handleContractAction('sign-contract', { signatureData: actualSignatureData });
              setShowDigitalSignature(false);
            }}
            onConfirm={async () => {
              await handleContractAction('confirm-agent-signature');
              setShowDigitalSignature(false);
            }}
            onGoBack={async () => {
              await handleContractAction('reopen-negotiation');
              setShowDigitalSignature(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Payment Options Modal */}
      <Dialog open={showPaymentOptions} onOpenChange={setShowPaymentOptions}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins">Payment Processing</DialogTitle>
            <DialogDescription className="font-poppins">
              Complete the transfer payment to finalize the contract.
            </DialogDescription>
          </DialogHeader>
          <PaymentOptions
            contract={contract}
            userRole={userRole!}
            onMakePayment={async (paymentData) => {
              console.log('Processing payment:', paymentData);
              // Implement Paystack integration here
              setShowPaymentOptions(false);

              // After successful payment, update contract status to completed
              // This will automatically update player status to transferred
              await handleContractAction('complete-transfer');

              // Also update the transfer pitch status to completed
              if (contract?.pitch_id) {
                await updateTransferPitchStatus(contract.pitch_id, 'completed');
              }
            }}
            onViewWallet={() => {
              setShowPaymentOptions(false);
              setShowTeamWallet(true);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Team Wallet Modal */}
      <Dialog open={showTeamWallet} onOpenChange={setShowTeamWallet}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins">Team Wallet</DialogTitle>
            <DialogDescription className="font-poppins">
              View your team's financial overview and transaction history.
            </DialogDescription>
          </DialogHeader>
          <TeamWallet
            teamId={contract?.team_id || ''}
            onClose={() => setShowTeamWallet(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Agent Payment History Modal */}
      <Dialog open={showAgentPaymentHistory} onOpenChange={setShowAgentPaymentHistory}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins">Payment History</DialogTitle>
            <DialogDescription className="font-poppins">
              View your complete payment history and active installments.
            </DialogDescription>
          </DialogHeader>
          <AgentPaymentHistory
            agentId={contract?.agent_id || ''}
            onClose={() => setShowAgentPaymentHistory(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ContractNegotiationPage;