import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import type { EmbassyVerification } from "@/lib/types";

interface EmbassyVerificationTableProps {
  verifications: EmbassyVerification[];
  onView?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function EmbassyVerificationTable({ 
  verifications, 
  onView, 
  onApprove, 
  onReject 
}: EmbassyVerificationTableProps) {
  const getStatusBadge = (status: EmbassyVerification["status"]) => {
    const config = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
      under_review: { label: "Under Review", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
      approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    };
    return config[status];
  };

  return (
    <div className="border rounded-md overflow-hidden" data-testid="table-embassy-verifications">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold text-xs uppercase">Player</TableHead>
            <TableHead className="font-bold text-xs uppercase">Club</TableHead>
            <TableHead className="font-bold text-xs uppercase">Visa Type</TableHead>
            <TableHead className="font-bold text-xs uppercase">Target</TableHead>
            <TableHead className="font-bold text-xs uppercase">Status</TableHead>
            <TableHead className="font-bold text-xs uppercase">Submitted</TableHead>
            <TableHead className="font-bold text-xs uppercase text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {verifications.map((verification) => {
            const statusConfig = getStatusBadge(verification.status);
            return (
              <TableRow key={verification.id} data-testid={`row-verification-${verification.id}`}>
                <TableCell className="font-medium">{verification.playerName}</TableCell>
                <TableCell>{verification.clubName}</TableCell>
                <TableCell>{verification.visaType}</TableCell>
                <TableCell>{verification.targetCountry}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(verification.submittedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => onView?.(verification.id)}
                      data-testid={`button-view-verification-${verification.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {verification.status === "under_review" && (
                      <>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => onApprove?.(verification.id)}
                          data-testid={`button-approve-${verification.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => onReject?.(verification.id)}
                          data-testid={`button-reject-${verification.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
