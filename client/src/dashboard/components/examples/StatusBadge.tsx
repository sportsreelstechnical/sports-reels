import StatusBadge from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-4">
      <StatusBadge score={85} />
      <StatusBadge score={45} />
      <StatusBadge score={20} />
      <StatusBadge score={60} size="sm" />
    </div>
  );
}
