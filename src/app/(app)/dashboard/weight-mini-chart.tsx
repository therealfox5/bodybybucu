"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export function WeightMiniChart({
  data,
}: {
  data: { date: string; weight: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#a3a3a3" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={["dataMin - 2", "dataMax + 2"]}
          tick={{ fontSize: 10, fill: "#a3a3a3" }}
          axisLine={false}
          tickLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141414",
            border: "1px solid #262626",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#a3a3a3" }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
