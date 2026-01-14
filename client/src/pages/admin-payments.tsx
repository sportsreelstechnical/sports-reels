import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  Clock, 
  Building,
  TrendingUp,
  RefreshCw,
  FileText
} from "lucide-react";

type FederationPayment = {
  id: string;
  federationId: string;
  requestId: string;
  amount: number;
  currency: string;
  paymentType: string;
  status: string;
  payerName: string | null;
  payerEmail: string | null;
  createdAt: string;
};

type FeeSchedule = {
  id: string;
  federationId: string;
  federationName: string;
  federationCountry: string;
  letterType: string;
  basePrice: number;
  currency: string;
  processingFee: number;
  expediteFee: number;
  active: boolean;
};

export default function AdminPayments() {
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const { data: payments, isLoading: paymentsLoading, refetch } = useQuery<FederationPayment[]>({
    queryKey: ["/api/admin/payments"],
  });

  const { data: feeSchedules, isLoading: feesLoading } = useQuery<FeeSchedule[]>({
    queryKey: ["/api/admin/fee-schedules"],
  });

  const { data: federations, isLoading: federationsLoading } = useQuery<Array<{
    id: string;
    name: string;
    country: string;
    status: string;
  }>>({
    queryKey: ["/api/admin/federations"],
  });

  const totalRevenue = payments?.reduce((sum, p) => p.status === "completed" ? sum + p.amount : sum, 0) || 0;
  const pendingAmount = payments?.reduce((sum, p) => p.status === "pending" ? sum + p.amount : sum, 0) || 0;

  const filteredPayments = payments?.filter(p => {
    if (paymentFilter === "all") return true;
    return p.status === paymentFilter;
  });

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-payments-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-payments-title">
            <DollarSign className="h-6 w-6" />
            Financial Analytics
          </h1>
          <p className="text-muted-foreground">Track federation fees and payment history</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">${totalRevenue.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">${pendingAmount.toLocaleString()}</span>
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{federations?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Federations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{payments?.length || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-fee-schedules">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fee Schedules
            </CardTitle>
            <CardDescription>Current federation fee structure</CardDescription>
          </CardHeader>
          <CardContent>
            {feesLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : feeSchedules && feeSchedules.length > 0 ? (
              <div className="space-y-3">
                {feeSchedules.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`fee-schedule-${fee.id}`}>
                    <div>
                      <div className="font-medium">{fee.federationName}</div>
                      <div className="text-sm text-muted-foreground">
                        {fee.federationCountry} - {fee.letterType.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{fee.currency} {fee.basePrice}</div>
                      <div className="text-xs text-muted-foreground">
                        +{fee.processingFee} proc. / +{fee.expediteFee} exp.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No fee schedules found</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-federations">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Registered Federations
            </CardTitle>
            <CardDescription>All registered football federations</CardDescription>
          </CardHeader>
          <CardContent>
            {federationsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : federations && federations.length > 0 ? (
              <div className="space-y-2">
                {federations.map((fed) => (
                  <div key={fed.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50" data-testid={`federation-${fed.id}`}>
                    <div>
                      <div className="font-medium">{fed.name}</div>
                      <div className="text-sm text-muted-foreground">{fed.country}</div>
                    </div>
                    <Badge variant={fed.status === "active" ? "default" : "outline"}>
                      {fed.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No federations found</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-payment-history">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All federation payment transactions</CardDescription>
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-payment-filter">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : filteredPayments && filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{payment.paymentType.replace(/_/g, " ")}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.payerName || "Unknown"}</div>
                        {payment.payerEmail && (
                          <div className="text-xs text-muted-foreground">{payment.payerEmail}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">
                        {payment.currency} {payment.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
