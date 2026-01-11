import EligibilityScoreCard from "../EligibilityScoreCard";

export default function EligibilityScoreCardExample() {
  return (
    <div className="max-w-md">
      <EligibilityScoreCard 
        scores={{
          schengen: 78,
          ukGbe: 72,
          usP1: 65,
          usO1: 58,
        }}
      />
    </div>
  );
}
