import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
  Building
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'installment_active';
  date: string;
  agent_name?: string;
  player_name?: string;
  installment_info?: {
    current: number;
    total: number;
  };
}

interface TeamWalletProps {
  teamId: string;
  onClose?: () => void;
}

const TeamWallet: React.FC<TeamWalletProps> = ({ teamId, onClose }) => {
  const [walletData, setWalletData] = useState({
    balance: 0,
    pending: 0,
    reserved: 0,
    currency: 'USD'
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
    loadTransactions();
  }, [teamId]);

  const loadWalletData = async () => {
    // Mock data - replace with actual API call
    setWalletData({
      balance: 145000,
      pending: 25000,
      reserved: 5000,
      currency: 'USD'
    });
  };

  const loadTransactions = async () => {
    // Mock data - replace with actual API call
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'incoming',
        amount: 50000,
        currency: 'USD',
        description: 'Transfer payment from Agent John Smith',
        status: 'completed',
        date: '2025-01-15T10:30:00Z',
        agent_name: 'John Smith',
        player_name: 'Marcus Johnson'
      },
      {
        id: '2',
        type: 'incoming',
        amount: 25000,
        currency: 'USD',
        description: 'Installment payment (2/3) from Agent Maria Garcia',
        status: 'installment_active',
        date: '2025-01-14T14:20:00Z',
        agent_name: 'Maria Garcia',
        player_name: 'David Rodriguez',
        installment_info: { current: 2, total: 3 }
      },
      {
        id: '3',
        type: 'incoming',
        amount: 30000,
        currency: 'USD',
        description: 'Transfer payment from Agent Chen Wei',
        status: 'pending',
        date: '2025-01-13T09:15:00Z',
        agent_name: 'Chen Wei',
        player_name: 'Alex Thompson'
      },
      {
        id: '4',
        type: 'outgoing',
        amount: 2500,
        currency: 'USD',
        description: 'Platform service fee',
        status: 'completed',
        date: '2025-01-12T16:45:00Z'
      },
      {
        id: '5',
        type: 'incoming',
        amount: 75000,
        currency: 'USD',
        description: 'Transfer payment from Agent Sarah Wilson',
        status: 'failed',
        date: '2025-01-11T11:30:00Z',
        agent_name: 'Sarah Wilson',
        player_name: 'Roberto Silva'
      }
    ];

    setTransactions(mockTransactions);
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

  const exportTransactions = () => {
    // Mock export functionality
    console.log('Exporting transactions...');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Team Wallet</h1>
            <p className="text-sm sm:text-base text-gray-400">Financial overview and transaction history</p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="h-10 px-4 text-sm border-gray-600 text-white hover:bg-gray-700">
            Close
          </Button>
        )}
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-green-900 to-emerald-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200 font-medium">Available Balance</p>
                <p className="text-2xl font-bold text-white">
                  {walletData.currency} {walletData.balance.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-700/60 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-900 to-yellow-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-300 font-medium">Pending Payments</p>
                <p className="text-2xl font-bold text-white">
                  {walletData.currency} {walletData.pending.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-700/60 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900 to-indigo-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300 font-medium">Reserved Funds</p>
                <p className="text-2xl font-bold text-white">
                  {walletData.currency} {walletData.reserved.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-700/60 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900 to-pink-800 border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300 font-medium">Total Value</p>
                <p className="text-2xl font-bold text-white">
                  {walletData.currency} {(walletData.balance + walletData.pending + walletData.reserved).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-700/60 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="border border-gray-800 bg-[#0d0d0d]">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl text-white">Transaction History</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportTransactions} className="h-10 px-4 text-sm border-gray-600 text-white hover:bg-gray-700">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportTransactions} className="h-10 px-4 text-sm border-gray-600 text-white hover:bg-gray-700">
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <Tabs defaultValue="incoming" className="w-full space-y-4">
            <TabsList className="flex flex-wrap gap-2 bg-[#111111] border border-gray-800 rounded-lg p-1 overflow-visible">
              <TabsTrigger value="incoming" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Incoming
              </TabsTrigger>
              <TabsTrigger value="outgoing" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Outgoing
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 sm:flex-none px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-rosegold data-[state=active]:text-white">
                Pending
              </TabsTrigger>
            </TabsList>

            {/* Similar content for other tabs */}
            <TabsContent value="incoming" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {transactions.filter(t => t.type === 'incoming').map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
                      <p className="font-medium text-white text-sm sm:text-base">{transaction.description}</p>
                      <p className="text-sm text-green-400 mt-1">
                        +{transaction.currency} {transaction.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="outgoing" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {transactions.filter(t => t.type === 'outgoing').map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
                      <p className="font-medium text-white text-sm sm:text-base">{transaction.description}</p>
                      <p className="text-sm text-red-400 mt-1">
                        -{transaction.currency} {transaction.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending" className="mt-4 sm:mt-6">
              <ScrollArea className="h-[360px]">
                <div className="space-y-3 sm:space-y-4">
                  {transactions.filter(t => t.status === 'pending').map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-[#111111] border border-gray-800 rounded-xl">
                      <p className="font-medium text-white text-sm sm:text-base">{transaction.description}</p>
                      <p className="text-sm text-yellow-400 mt-1">
                        {transaction.currency} {transaction.amount.toLocaleString()} - Pending
                      </p>
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

export default TeamWallet;
