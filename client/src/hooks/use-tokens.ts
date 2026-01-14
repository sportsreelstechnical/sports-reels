import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface TokenBalance {
  id: string;
  userId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lastUpdated: string;
}

export type ScoutTokenAction = "view_profile" | "shortlist" | "video_analysis" | "watch_video" | "contact_request";
export type TeamTokenAction = "video_analysis" | "scouting_messaging" | "transfer_report" | "federation_letter_request";
export type TokenAction = ScoutTokenAction | TeamTokenAction;

export interface SpendTokensRequest {
  action: TokenAction;
  playerId?: string;
  videoId?: string;
}

const SCOUT_TOKEN_COSTS: Record<ScoutTokenAction, number> = {
  view_profile: 2,
  shortlist: 1,
  video_analysis: 8,
  watch_video: 1,
  contact_request: 2,
};

const TEAM_TOKEN_COSTS: Record<TeamTokenAction, number> = {
  video_analysis: 8,
  scouting_messaging: 3,
  transfer_report: 5,
  federation_letter_request: 10,
};

export function useTokenBalance() {
  return useQuery<TokenBalance>({
    queryKey: ["/api/tokens/balance"],
    staleTime: 30000,
  });
}

export function useSpendTokens() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SpendTokensRequest) => {
      const response = await apiRequest("POST", "/api/tokens/spend", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to spend tokens");
      }
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/transactions"] });
      toast({
        title: "Tokens Spent",
        description: `${result.cost} token(s) used. Balance: ${result.newBalance}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Insufficient Tokens",
        description: error.message || "You don't have enough tokens for this action.",
        variant: "destructive",
      });
    },
  });
}

export function useCheckTokens(role: "scout" | "team" = "scout") {
  const { data: balance } = useTokenBalance();
  const costs = role === "scout" ? SCOUT_TOKEN_COSTS : TEAM_TOKEN_COSTS;
  
  return {
    balance: balance?.balance || 0,
    canAfford: (action: TokenAction) => {
      if (!balance) return false;
      const cost = (costs as Record<string, number>)[action];
      return cost ? balance.balance >= cost : false;
    },
    getCost: (action: TokenAction) => (costs as Record<string, number>)[action] || 0,
    TOKEN_COSTS: costs,
    SCOUT_TOKEN_COSTS,
    TEAM_TOKEN_COSTS,
  };
}
