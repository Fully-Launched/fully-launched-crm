export default function StatTile({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold ${
          tone === "warning" && value !== "0" ? "text-red-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sublabel && <p className="mt-1 text-sm text-neutral-500">{sublabel}</p>}
    </div>
  );
}
