import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingDown,
  Download,
  Eye,
  RefreshCw,
  Building,
  User,
  DollarSign
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  contractId: string;
  teamName: string;
  playerName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'installment_active';
  paymentType: 'full' | 'installment';
  date: string;
  installmentInfo?: {
    current: number;
    total: number;
    nextPaymentDate?: string;
    remainingAmount: number;
  };
  paymentMethod: string;
  transactionId?: string;
}

interface AgentPaymentHistoryProps {
  agentId: string;
  onClose?: () => void;
}

const AgentPaymentHistory: React.FC<AgentPaymentHistoryProps> = ({ agentId, onClose }) => {
  const [paymentData, setPaymentData] = useState({
    totalSpent: 0,
    activeInstallments: 0,
    completedTransfers: 0,
    pendingPayments: 0,
    currency: 'USD'
  });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPaymentData();
    loadPayments();
  }, [agentId]);

  const loadPaymentData = async () => {
    // Mock data - replace with actual API call
    setPaymentData({
      totalSpent: 275000,
      activeInstallments: 2,
      completedTransfers: 5,
      pendingPayments: 1,
      currency: 'USD'
    });
  };

  const loadPayments = async () => {
    // Mock data - replace with actual API call
    const mockPayments: PaymentRecord[] = [
      {
        id: '1',
        contractId: 'contract-1',
        teamName: 'Manchester United',
        playerName: 'Marcus Johnson',
        amount: 75000,
        currency: 'USD',
        status: 'installment_active',
        paymentType: 'installment',
        date: '2025-01-15T10:30:00Z',
        installmentInfo: {
          current: 2,
          total: 3,
          nextPaymentDate: '2025-02-15T00:00:00Z',
          remainingAmount: 25000
        },
        paymentMethod: 'Credit Card',
        transactionId: 'TXN-001'
      },
      {
        id: '2',
        contractId: 'contract-2',
        teamName: 'Liverpool FC',
        playerName: 'David Rodriguez',
        amount: 50000,
        currency: 'USD',
        status: 'completed',
        paymentType: 'full',
        date: '2025-01-10T14:20:00Z',
        paymentMethod: 'Bank Transfer',
        transactionId: 'TXN-002'
      },
      {
        id: '3',
        contractId: 'contract-3',
        teamName: 'Arsenal FC',
        playerName: 'Alex Thompson',
        amount: 100000,
        currency: 'USD',
        status: 'installment_active',
        paymentType: 'installment',
        date: '2025-01-08T09:15:00Z',
        installmentInfo: {
          current: 1,
          total: 6,
          nextPaymentDate: '2025-02-08T00:00:00Z',
          remainingAmount: 83333
        },
        paymentMethod: 'Credit Card',
        transactionId: 'TXN-003'
      },
      {
        id: '4',
        contractId: 'contract-4',
        teamName: 'Chelsea FC',
        playerName: 'Roberto Silva',
        amount: 30000,
        currency: 'USD',
        status: 'pending',
        paymentType: 'full',
        date: '2025-01-12T16:45:00Z',
        paymentMethod: 'Credit Card',
        transactionId: 'TXN-004'
      },
      {
        id: '5',
        contractId: 'contract-5',
        teamName: 'Tottenham',
        playerName: 'James Wilson',
        amount: 20000,
        currency: 'USD',
        status: 'failed',
        paymentType: 'full',
        date: '2025-01-05T11:30:00Z',
        paymentMethod: 'Bank Transfer',
        transactionId: 'TXN-005'
      }
    ];

    setPayments(mockPayments);
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'installment_active':
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const retryPayment = (paymentId: string) => {
    console.log('Retrying payment:', paymentId);
    // Implement retry logic
  };

  const exportPayments = () => {
    console.log('Exporting payment history...');
    // Implement export functionality
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Payment History</h1>
            <p className="text-sm sm:text-base text-gray-400">Track all your transfer payments and installments</p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="h-10 px-4 text-sm border-gray-600 text-white hover:bg-gray-700">
            Close
          </Button>
        )}
      </div>

      {/* Payment Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200 font-medium">Total Spent</p>
                <p className="text-2xl font-bold text-white">
                  {paymentData.currency} {paymentData.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600/60 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900 to-emerald-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200 font-medium">Completed Transfers</p>
                <p className="text-2xl font-bold text-white">
                  {paymentData.completedTransfers}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600/60 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900 to-amber-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-200 font-medium">Active Installments</p>
                <p className="text-2xl font-bold text-white">
                  {paymentData.activeInstallments}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-600/60 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900 to-rose-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-200 font-medium">Pending Payments</p>
                <p className="text-2xl font-bold text-white">
                  {paymentData.pendingPayments}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-600/60 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="border border-gray-800 bg-[#0d0d0d]">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl text-white">Payment Records</CardTitle>
            <Button variant="outline" size="sm" onClick={exportPayments} className="h-10 px-4 text-sm border-gray-600 text-white hover:bg-gray-700">
              <Download className="w-4 h-4 mr-2" />
              Export History
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <Tabs defaultValue="completed" className="w-full space-y-4">
            <TabsList className="flex flex-wrap gap-2 bg-[#111111] border border-gray-800 rounded-lg p-1 overflow-visible">
              <TabsTrigger value="completed" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Completed
              </TabsTrigger>
              <TabsTrigger value="installments" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Installments
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Pending
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Failed
              </TabsTrigger>
            </TabsList>

            {/* Other tab contents similar to above but filtered */}
            <TabsContent value="completed" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {payments.filter(p => p.status === 'completed').map((payment) => (
                    <div key={payment.id} className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white text-sm sm:text-base">{payment.teamName} - {payment.playerName}</p>
                          <p className="text-xs sm:text-sm text-gray-400">
                            Completed on {new Date(payment.date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold text-green-400">
                          {payment.currency} {payment.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="installments" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {payments.filter(p => p.status === 'installment_active').map((payment) => (
                    <div key={payment.id} className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-white text-sm sm:text-base">{payment.teamName} - {payment.playerName}</p>
                          <p className="text-xs sm:text-sm text-gray-400">
                            {payment.installmentInfo?.current}/{payment.installmentInfo?.total} payments made
                          </p>
                        </div>
                        <p className="font-semibold text-blue-400">
                          {payment.currency} {payment.amount.toLocaleString()}
                        </p>
                      </div>
                      {payment.installmentInfo && (
                        <Progress
                          value={(payment.installmentInfo.current / payment.installmentInfo.total) * 100}
                          className="h-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {payments.filter(p => p.status === 'pending').map((payment) => (
                    <div key={payment.id} className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white text-sm sm:text-base">{payment.teamName} - {payment.playerName}</p>
                          <p className="text-xs sm:text-sm text-gray-400">Payment processing...</p>
                        </div>
                        <p className="font-semibold text-yellow-400">
                          {payment.currency} {payment.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="failed" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {payments.filter(p => p.status === 'failed').map((payment) => (
                    <div key={payment.id} className="p-4 bg-[#111111] border border-red-500/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white text-sm sm:text-base">{payment.teamName} - {payment.playerName}</p>
                          <p className="text-xs sm:text-sm text-gray-400">Payment failed - retry required</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-red-400">
                            {payment.currency} {payment.amount.toLocaleString()}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryPayment(payment.id)}
                            className="h-9 px-3 border-red-400/50 text-red-400 hover:bg-red-500/10 text-sm"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPaymentHistory;
