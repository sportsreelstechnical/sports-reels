import { Badge } from "@/components/ui/badge";
import type { VisaStatus } from "@/lib/types";

interface StatusBadgeProps {
  score: number;
  size?: "sm" | "default";
}

export function getVisaStatus(score: number): VisaStatus {
  if (score >= 60) return "green";
  if (score >= 35) return "yellow";
  return "red";
}

export function getStatusLabel(status: VisaStatus): string {
  switch (status) {
    case "green": return "Eligible";
    case "yellow": return "Conditional";
    case "red": return "Ineligible";
  }
}

export default function StatusBadge({ score, size = "default" }: StatusBadgeProps) {
  const status = getVisaStatus(score);
  
  const colorClasses = {
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Badge 
      variant="secondary"
      className={`${colorClasses[status]} ${size === "sm" ? "text-xs" : ""}`}
      data-testid={`badge-status-${status}`}
    >
      {score}% - {getStatusLabel(status)}
    </Badge>
  );
}
