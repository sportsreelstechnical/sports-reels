import ConsularSummaryGenerator from "../ConsularSummaryGenerator";

export default function ConsularSummaryGeneratorExample() {
  return (
    <div className="max-w-lg">
      <ConsularSummaryGenerator 
        playerName="Emmanuel Okonkwo"
        onGenerate={(config) => console.log("Generate", config)}
        onSubmitToEmbassy={(config) => console.log("Submit", config)}
      />
    </div>
  );
}
