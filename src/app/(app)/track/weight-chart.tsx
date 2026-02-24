"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

export function WeightChart({ data }: { data: WeightEntry[] }) {
  const chartData = [...data]
    .reverse()
    .map((entry) => ({
      date: format(new Date(entry.date), "M/d"),
      weight: entry.weight,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#a3a3a3" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={["dataMin - 3", "dataMax + 3"]}
          tick={{ fontSize: 11, fill: "#a3a3a3" }}
          axisLine={false}
          tickLine={false}
          width={40}
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
          dot={{ fill: "#dc2626", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
