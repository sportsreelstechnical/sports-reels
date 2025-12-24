import PlayerProfileHeader from "../PlayerProfileHeader";
import { mockPlayers } from "@/lib/mock-data";

export default function PlayerProfileHeaderExample() {
  return (
    <PlayerProfileHeader 
      player={mockPlayers[2]}
      onGenerateReport={() => console.log("Generate report")}
      onShare={() => console.log("Share")}
    />
  );
}
