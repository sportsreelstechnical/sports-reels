import EmbassyVerificationTable from "../EmbassyVerificationTable";
import { mockEmbassyVerifications } from "@/lib/mock-data";

export default function EmbassyVerificationTableExample() {
  return (
    <EmbassyVerificationTable 
      verifications={mockEmbassyVerifications}
      onView={(id) => console.log("View", id)}
      onApprove={(id) => console.log("Approve", id)}
      onReject={(id) => console.log("Reject", id)}
    />
  );
}
