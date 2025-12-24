import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { MessageSquare, ArrowRight, ClipboardCheck } from "lucide-react";
import type { ScoutingInquiry } from "@/lib/types";

interface ScoutingInquiryCardProps {
  inquiry: ScoutingInquiry;
  playerName: string;
  onViewDetails?: (id: string) => void;
  onMessage?: (id: string) => void;
}

export default function ScoutingInquiryCard({ 
  inquiry, 
  playerName, 
  onViewDetails, 
  onMessage 
}: ScoutingInquiryCardProps) {
  const getStatusConfig = (status: ScoutingInquiry["status"]) => {
    const config = {
      inquiry: { label: "Inquiry", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
      negotiation: { label: "Negotiation", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
      due_diligence: { label: "Due Diligence", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
      closed: { label: "Closed", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
    };
    return config[status];
  };

  const statusConfig = getStatusConfig(inquiry.status);

  return (
    <Card className="hover-elevate" data-testid={`card-inquiry-${inquiry.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">{playerName}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{inquiry.sellingClub}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{inquiry.buyingClub}</span>
            </div>
          </div>
          <Badge variant="secondary" className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Compliance Score</p>
            <StatusBadge score={inquiry.complianceScore} size="sm" />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
            <p className="text-sm">{new Date(inquiry.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {inquiry.lastMessage && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Latest Message</p>
            <p className="text-sm truncate">{inquiry.lastMessage}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails?.(inquiry.id)}
            data-testid={`button-view-inquiry-${inquiry.id}`}
          >
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Details
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onMessage?.(inquiry.id)}
            data-testid={`button-message-inquiry-${inquiry.id}`}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
