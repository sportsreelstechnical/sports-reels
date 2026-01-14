import PerformanceMetrics from "../PerformanceMetrics";
import { mockPlayers } from "@/lib/mock-data";

export default function PerformanceMetricsExample() {
  return <PerformanceMetrics player={mockPlayers[0]} />;
}
