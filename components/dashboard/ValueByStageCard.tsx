import { STAGES, STAGE_CHART_COLORS, type Stage } from "@/lib/theme";
import type { StageValue } from "@/lib/dashboard";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Build (one-time $) and MRR ($/mo) are different units, so they sit in
// separate columns rather than on one shared scale.
export default function ValueByStageCard({
  totals,
}: {
  totals: Record<Stage, StageValue>;
}) {
  const stagesWithValue = STAGES.filter(
    (s) => totals[s].build > 0 || totals[s].mrr > 0
  );

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Pipeline Value by Stage
      </h2>
      {stagesWithValue.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-400">
          No build or subscription value yet.
        </p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="pb-2 text-left font-semibold">Stage</th>
              <th className="pb-2 text-right font-semibold">Build</th>
              <th className="pb-2 text-right font-semibold">MRR</th>
            </tr>
          </thead>
          <tbody>
            {stagesWithValue.map((stage) => (
              <tr key={stage}>
                <td className="py-1.5">
                  <span className="flex items-center gap-2 text-neutral-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STAGE_CHART_COLORS[stage] }}
                    />
                    {stage}
                  </span>
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums text-foreground">
                  {totals[stage].build > 0 ? (
                    currencyFormat.format(totals[stage].build)
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums text-foreground">
                  {totals[stage].mrr > 0 ? (
                    `${currencyFormat.format(totals[stage].mrr)}/mo`
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
