"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BRANCHES, BRANCH_CHART_COLORS } from "@/lib/theme";
import type { Branch } from "@/lib/theme";

export default function BranchChart({
  counts,
}: {
  counts: Record<Branch, number>;
}) {
  const data = BRANCHES.map((branch) => ({ branch, count: counts[branch] }));

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Projects by Branch
      </h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e5e5e5" />
            <XAxis
              dataKey="branch"
              tick={{ fontSize: 12, fill: "#525252" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e5e5" }}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "#f5f5f5" }}
              formatter={(value) => [value, "Projects"]}
              contentStyle={{
                borderRadius: 8,
                borderColor: "#e5e5e5",
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((d) => (
                <Cell key={d.branch} fill={BRANCH_CHART_COLORS[d.branch]} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                style={{ fontSize: 12, fill: "#171717" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
