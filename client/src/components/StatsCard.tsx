import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  description?: string;
  accentColor?: string;
}

export default function StatsCard({ title, value, icon: Icon, trend, description, accentColor }: StatsCardProps) {
  const colorClass = accentColor || "text-primary bg-primary/10";
  const iconBg = colorClass.includes("bg-") ? colorClass.split(" ").find(c => c.startsWith("bg-")) : "bg-primary/10";
  const iconText = colorClass.includes("text-") ? colorClass.split(" ").find(c => c.startsWith("text-")) : "text-primary";

  return (
    <Card className="stat-glow group relative overflow-hidden border-border/30 hover:border-border/60 transition-all duration-300" data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 -translate-y-6 translate-x-6 bg-current" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest truncate">
              {title}
            </p>
            <p className="text-3xl font-bold mt-2 tabular-nums animate-count-up">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div className={`p-2.5 rounded-lg ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconText}`} />
            </div>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-[11px] font-medium ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="tabular-nums">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
