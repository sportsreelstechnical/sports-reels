import StatsCard from "../StatsCard";
import { Users, FileCheck, AlertTriangle, TrendingUp } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatsCard title="Total Players" value={48} icon={Users} trend={12} />
      <StatsCard title="Reports" value={34} icon={FileCheck} trend={-5} description="This month" />
      <StatsCard title="Pending" value={5} icon={AlertTriangle} />
      <StatsCard title="Inquiries" value={12} icon={TrendingUp} trend={8} />
    </div>
  );
}
