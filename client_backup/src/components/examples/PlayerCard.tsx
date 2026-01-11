import PlayerCard from "../PlayerCard";
import { mockPlayers } from "@/lib/mock-data";

export default function PlayerCardExample() {
  return (
    <div className="max-w-sm">
      <PlayerCard 
        player={mockPlayers[0]} 
        onViewProfile={(id) => console.log("View player", id)}
        onGenerateReport={(id) => console.log("Generate report", id)}
      />
    </div>
  );
}
