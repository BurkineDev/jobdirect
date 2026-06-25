export function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-brand-200 bg-brand-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p
        className={`text-2xl font-bold ${
          accent ? "text-brand-700" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
    </div>
  );
}
