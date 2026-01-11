import { useTokenBalance } from "@/hooks/use-tokens";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { Link } from "wouter";

export default function TokenBalanceIndicator() {
  const { data: tokenBalance, isLoading } = useTokenBalance();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 opacity-50">
        <Coins className="h-3 w-3" />
        ...
      </Badge>
    );
  }

  const balance = tokenBalance?.balance || 0;

  return (
    <Link href="/token-bank">
      <Badge 
        variant={balance < 10 ? "destructive" : "secondary"} 
        className="gap-1 cursor-pointer"
        data-testid="badge-token-balance"
      >
        <Coins className="h-3 w-3" />
        {balance} tokens
      </Badge>
    </Link>
  );
}
