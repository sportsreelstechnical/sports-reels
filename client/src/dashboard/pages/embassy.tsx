import { useState } from "react";
import EmbassyVerificationTable from "@/components/EmbassyVerificationTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Bell, CheckCircle, Clock, XCircle } from "lucide-react";
import { mockEmbassyVerifications } from "@/lib/mock-data";
import StatsCard from "@/components/StatsCard";

export default function Embassy() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // todo: remove mock functionality
  const verifications = mockEmbassyVerifications;

  const filteredVerifications = verifications.filter((v) => {
    const matchesSearch =
      v.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.clubName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: verifications.filter((v) => v.status === "pending").length,
    underReview: verifications.filter((v) => v.status === "under_review").length,
    approved: verifications.filter((v) => v.status === "approved").length,
    rejected: verifications.filter((v) => v.status === "rejected").length,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-embassy">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Embassy Verification</h1>
          <p className="text-muted-foreground">Monitor and manage consular data submissions</p>
        </div>
        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <Bell className="h-3 w-3 mr-1" />
          {stats.pending + stats.underReview} Pending Action
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          description="Awaiting review"
        />
        <StatsCard
          title="Under Review"
          value={stats.underReview}
          icon={Search}
          description="Being processed"
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          description="Verification complete"
        />
        <StatsCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          description="Requires attention"
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg">Verification Requests</CardTitle>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-56"
                  data-testid="input-search-embassy"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-embassy-status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmbassyVerificationTable
            verifications={filteredVerifications}
            onView={(id) => console.log("View", id)}
            onApprove={(id) => console.log("Approve", id)}
            onReject={(id) => console.log("Reject", id)}
          />
          {filteredVerifications.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">
              No verification requests found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
