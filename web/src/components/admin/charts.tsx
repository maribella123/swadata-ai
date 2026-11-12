"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Categorical order validated with the dataviz palette validator (light surface): fixed order, never cycled.
export const SERIES = ["#3D6FA8", "#159B79", "#B8862F", "#B8577A"];
const AXIS = { stroke: "#94a3b8", fontSize: 12, tickLine: false, axisLine: false } as const;
const GRID = "#e9edeb";

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      <p className="mb-1 font-semibold text-navy-900">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color }} /> {p.name}: <span className="font-semibold tabular-nums text-navy-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ActivityChart({ data }: { data: Array<{ day: string; submissions: number; approvals: number; reviews: number; signups: number }> }) {
  const rows = data.map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) }));
  const series = [
    { key: "submissions", name: "Submissions" },
    { key: "reviews", name: "Reviews" },
    { key: "approvals", name: "Approvals" },
    { key: "signups", name: "New contributors" },
  ];
  return (
    <div className="h-72 w-full" role="img" aria-label="Daily platform activity line chart">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "#cbd5e1" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#475569" }} />
          {series.map((s, i) => (
            <Line key={s.key} isAnimationActive={false} type="monotone" dataKey={s.key} name={s.name} stroke={SERIES[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBarChart({ data, label, color = SERIES[1], height = 260 }: { data: Array<{ name: string; value: number }>; label: string; color?: string; height?: number }) {
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" {...AXIS} interval={0} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 56 : 30} />
          <YAxis {...AXIS} allowDecimals={false} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(16,42,67,0.04)" }} />
          <Bar isAnimationActive={false} dataKey="value" name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
