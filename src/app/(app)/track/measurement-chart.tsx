"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { format } from "date-fns";

interface MeasurementEntry {
  id: string;
  date: string;
  chest?: number;
  waist?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
}

const lineColors: Record<string, string> = {
  chest: "#dc2626",
  waist: "#f87171",
  leftArm: "#3b82f6",
  rightArm: "#60a5fa",
  leftThigh: "#10b981",
  rightThigh: "#34d399",
};

export function MeasurementChart({ data }: { data: MeasurementEntry[] }) {
  const chartData = [...data].reverse().map((entry) => ({
    date: format(new Date(entry.date), "M/d"),
    chest: entry.chest,
    waist: entry.waist,
    leftArm: entry.leftArm,
    rightArm: entry.rightArm,
    leftThigh: entry.leftThigh,
    rightThigh: entry.rightThigh,
  }));

  // Only show lines for fields that have data
  const activeFields = Object.keys(lineColors).filter((key) =>
    chartData.some((d) => d[key as keyof typeof d] != null)
  );

  if (activeFields.length === 0) {
    return <p className="text-sm text-muted-foreground">No measurement data to chart</p>;
  }

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
        <Legend
          wrapperStyle={{ fontSize: 11 }}
        />
        {activeFields.map((field) => (
          <Line
            key={field}
            type="monotone"
            dataKey={field}
            stroke={lineColors[field]}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
