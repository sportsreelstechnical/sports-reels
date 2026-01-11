import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, TrendingUp, TrendingDown, Clock, User, Video, Eye, Star, MessageSquare, Zap, Package, CreditCard, History, FileText, Send } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TokenBalance {
  id: string;
  userId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
  action: string;
  description: string;
  playerId?: string;
  videoId?: string;
  packId?: string;
  balanceAfter: number;
  expiresAt?: string;
  createdAt: string;
}

interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  priceUsd: number;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

type TokenCosts = Record<string, number>;

const actionIcons: Record<string, any> = {
  view_profile: User,
  shortlist: Star,
  video_analysis: Zap,
  watch_video: Video,
  contact_request: MessageSquare,
  scouting_messaging: Send,
  transfer_report: FileText,
  welcome_bonus: Coins,
  purchase: Package,
};

const actionLabels: Record<string, string> = {
  view_profile: "View Profile",
  shortlist: "Shortlist Player",
  video_analysis: "Video Analysis",
  watch_video: "Watch Video",
  contact_request: "Contact Request",
  scouting_messaging: "Scouting Message",
  transfer_report: "Transfer Report",
  welcome_bonus: "Welcome Bonus",
  purchase: "Token Purchase",
};

export default function TokenBank() {
  const { toast } = useToast();

  const { data: balance, isLoading: loadingBalance } = useQuery<TokenBalance>({
    queryKey: ["/api/tokens/balance"],
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<TokenTransaction[]>({
    queryKey: ["/api/tokens/transactions"],
  });

  const { data: packs = [], isLoading: loadingPacks } = useQuery<TokenPack[]>({
    queryKey: ["/api/tokens/packs"],
  });

  const { data: costs } = useQuery<TokenCosts>({
    queryKey: ["/api/tokens/costs"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packId: string) => {
      const result = await apiRequest("POST", "/api/tokens/purchase", { packId });
      return result.json();
    },
    onSuccess: async (data) => {
      if (data.simulatedCheckout) {
        const confirmResult = await apiRequest("POST", `/api/tokens/purchase/${data.purchase.id}/confirm`, {});
        const confirmed = await confirmResult.json();
        queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tokens/transactions"] });
        toast({
          title: "Tokens Added",
          description: `${confirmed.tokensAdded} tokens have been added to your account.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSpendingBreakdown = () => {
    const breakdown: Record<string, number> = {};
    transactions.filter(t => t.type === "debit").forEach(t => {
      breakdown[t.action] = (breakdown[t.action] || 0) + t.amount;
    });
    return breakdown;
  };

  const spendingBreakdown = getSpendingBreakdown();
  const totalSpent = Object.values(spendingBreakdown).reduce((a, b) => a + b, 0);

  if (loadingBalance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading token balance...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Token Bank</h1>
          <p className="text-muted-foreground">Manage your tokens and track usage</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2" data-testid="badge-token-balance">
          <Coins className="w-5 h-5 mr-2" />
          {balance?.balance || 0} Tokens
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-current-balance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Coins className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{balance?.balance || 0}</div>
            <p className="text-xs text-muted-foreground">Available tokens</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-purchased">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{balance?.lifetimePurchased || 0}</div>
            <p className="text-xs text-muted-foreground">Lifetime tokens acquired</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-spent">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{balance?.lifetimeSpent || 0}</div>
            <p className="text-xs text-muted-foreground">Lifetime tokens used</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="packs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="packs" data-testid="tab-buy-tokens">
            <Package className="w-4 h-4 mr-2" />
            Buy Tokens
          </TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">
            <Eye className="w-4 h-4 mr-2" />
            Usage Breakdown
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="w-4 h-4 mr-2" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Packs</CardTitle>
              <CardDescription>
                Purchase tokens to unlock player profiles, videos, and more. Tokens expire after 6 months and are non-transferable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {loadingPacks ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">Loading packs...</div>
                ) : (
                  packs.map((pack) => (
                    <Card key={pack.id} className="relative" data-testid={`card-pack-${pack.tokens}`}>
                      {pack.tokens === 100 && (
                        <Badge className="absolute -top-2 -right-2 bg-primary">Best Value</Badge>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{pack.name}</CardTitle>
                        <CardDescription>{pack.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">${(pack.priceUsd / 100).toFixed(2)}</span>
                          <span className="text-muted-foreground">USD</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-amber-500" />
                          <span className="text-xl font-semibold">{pack.tokens} tokens</span>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => purchaseMutation.mutate(pack.id)}
                          disabled={purchaseMutation.isPending}
                          data-testid={`button-buy-pack-${pack.tokens}`}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          {purchaseMutation.isPending ? "Processing..." : "Buy Now"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {costs && (
            <Card>
              <CardHeader>
                <CardTitle>Token Costs</CardTitle>
                <CardDescription>How many tokens each action costs for your role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(costs).map(([action, cost]) => {
                    const Icon = actionIcons[action] || Coins;
                    const iconColors: Record<string, string> = {
                      view_profile: "text-blue-500",
                      shortlist: "text-amber-500",
                      video_analysis: "text-purple-500",
                      watch_video: "text-green-500",
                      contact_request: "text-pink-500",
                      scouting_messaging: "text-cyan-500",
                      transfer_report: "text-orange-500",
                    };
                    return (
                      <div 
                        key={action}
                        className="flex flex-col items-center p-4 rounded-md bg-muted/50" 
                        data-testid={`cost-${action}`}
                      >
                        <Icon className={`w-8 h-8 mb-2 ${iconColors[action] || "text-muted-foreground"}`} />
                        <span className="font-medium text-center">{actionLabels[action] || action}</span>
                        <Badge variant="secondary">{cost} {cost === 1 ? "token" : "tokens"}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Breakdown</CardTitle>
              <CardDescription>How you've been using your tokens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {totalSpent === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No tokens spent yet</p>
                  <p className="text-sm">Start exploring player profiles to use your tokens</p>
                </div>
              ) : (
                Object.entries(spendingBreakdown).map(([action, amount]) => {
                  const Icon = actionIcons[action] || Coins;
                  const percentage = (amount / totalSpent) * 100;
                  return (
                    <div key={action} className="space-y-2" data-testid={`breakdown-${action}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{actionLabels[action] || action}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{amount} tokens ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Complete audit trail of all token activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {loadingTransactions ? (
                  <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => {
                      const Icon = actionIcons[tx.action] || Coins;
                      const isCredit = tx.type === "credit";
                      return (
                        <div 
                          key={tx.id} 
                          className="flex items-center justify-between p-4 rounded-md border"
                          data-testid={`transaction-${tx.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${isCredit ? "bg-green-100 dark:bg-green-900" : "bg-orange-100 dark:bg-orange-900"}`}>
                              <Icon className={`w-4 h-4 ${isCredit ? "text-green-600" : "text-orange-600"}`} />
                            </div>
                            <div>
                              <p className="font-medium">{tx.description || actionLabels[tx.action] || tx.action}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </div>
                              {tx.expiresAt && (
                                <p className="text-xs text-muted-foreground">
                                  Expires: {format(new Date(tx.expiresAt), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${isCredit ? "text-green-600" : "text-orange-600"}`}>
                              {isCredit ? "+" : "-"}{tx.amount}
                            </p>
                            <p className="text-sm text-muted-foreground">Balance: {tx.balanceAfter}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
