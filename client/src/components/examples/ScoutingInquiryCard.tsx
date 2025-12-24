import ScoutingInquiryCard from "../ScoutingInquiryCard";
import { mockScoutingInquiries, mockPlayers } from "@/lib/mock-data";

export default function ScoutingInquiryCardExample() {
  const inquiry = mockScoutingInquiries[0];
  const player = mockPlayers.find(p => p.id === inquiry.playerId)!;
  
  return (
    <div className="max-w-sm">
      <ScoutingInquiryCard 
        inquiry={inquiry}
        playerName={`${player.firstName} ${player.lastName}`}
        onViewDetails={(id) => console.log("View details", id)}
        onMessage={(id) => console.log("Message", id)}
      />
    </div>
  );
}
