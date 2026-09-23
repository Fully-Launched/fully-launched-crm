import { STAGES, STAGE_CHART_COLORS, type Stage } from "@/lib/theme";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function ValueByStageCard({
  totals,
}: {
  totals: Record<Stage, number>;
}) {
  const stagesWithValue = STAGES.filter((s) => totals[s] > 0);

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Pipeline Value by Stage
      </h2>
      {stagesWithValue.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">No project value yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {stagesWithValue.map((stage) => (
            <li key={stage} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-neutral-700">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STAGE_CHART_COLORS[stage] }}
                />
                {stage}
              </span>
              <span className="font-medium text-foreground">
                {currencyFormat.format(totals[stage])}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
