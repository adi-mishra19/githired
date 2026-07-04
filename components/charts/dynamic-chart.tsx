"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card } from "@/components/ui/card";

interface DynamicChartProps {
  data: any[];
  chartType: "bar" | "line" | "pie" | "radar" | "table" | "metric" | "funnel";
  visualization?: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
  };
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function DynamicChart({ data, chartType, visualization }: DynamicChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed border-primary/40 bg-primary/5 dark:bg-primary/10">
        No data available to visualize
      </Card>
    );
  }

  // Metric type - single number display
  if (chartType === "metric") {
    const metrics = data[0];
    const keys = Object.keys(metrics);
    
    // Helper function to format numbers to 3 decimal places
    const formatNumber = (value: any): string => {
      // Try to parse as number
      const num = typeof value === 'number' ? value : parseFloat(value);
      
      // If it's not a valid number, return as string
      if (isNaN(num)) {
        return String(value);
      }
      
      // If it's a whole number, don't show decimals
      if (Number.isInteger(num)) {
        return num.toString();
      }
      
      // Round to 3 decimal places and remove trailing zeros
      const rounded = Math.round(num * 1000) / 1000;
      return rounded.toString();
    };
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 w-full">
        {keys.map((key) => (
          <Card key={key} className="p-6 flex flex-col gap-3 min-w-0 shadow-sm border border-primary/10 bg-gradient-to-br from-white to-blue-50/60 dark:from-slate-900 dark:to-blue-900/30">
            <div className="text-xs uppercase tracking-wide text-primary/70 dark:text-primary/80 font-semibold">
              {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {formatNumber(metrics[key])}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Table type
  if (chartType === "table") {
    const keys = Object.keys(data[0] || {});
    
    // Helper function to format values based on column name
    const formatCellValue = (key: string, value: any): string => {
      // Format salary columns with LPA suffix
      const salaryKeys = ['salary', 'avg_salary', 'average_salary', 'min_salary', 'max_salary', 'total_salary'];
      const lowerKey = key.toLowerCase();
      
      if (salaryKeys.some(sk => lowerKey.includes(sk))) {
        // If value is already a string with LPA, return as is
        if (typeof value === 'string' && (value.includes('LPA') || value.includes('Lakh'))) {
          return value;
        }
        // Otherwise, format as number with LPA suffix
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(num)) {
          // If it's a whole number, show without decimals
          if (Number.isInteger(num)) {
            return `${num} LPA`;
          }
          // Otherwise, round to 2 decimals
          return `${num.toFixed(2)} LPA`;
        }
      }
      
      // Format other numeric values
      if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          return value.toString();
        }
        return value.toFixed(2);
      }
      
      return String(value);
    };
    
    return (
      <Card className="overflow-hidden border border-primary/10 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60 dark:bg-slate-900/60 text-muted-foreground uppercase text-xs tracking-wide">
                {keys.map((key) => (
                  <th key={key} className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t border-muted/40 odd:bg-muted/20 dark:odd:bg-slate-900/40 hover:bg-primary/5 transition-colors"
                >
                  {keys.map((key) => (
                    <td key={key} className="px-4 py-3 whitespace-pre-line">
                      {formatCellValue(key, row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  // Helper function to format values for tooltips and axes
  const formatValue = (key: string, value: any): string => {
    // Format salary columns with LPA suffix
    const salaryKeys = ['salary', 'avg_salary', 'average_salary', 'min_salary', 'max_salary', 'total_salary'];
    const lowerKey = key.toLowerCase();
    
    if (salaryKeys.some(sk => lowerKey.includes(sk))) {
      if (typeof value === 'string' && (value.includes('LPA') || value.includes('Lakh'))) {
        return value;
      }
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (!isNaN(num)) {
        if (Number.isInteger(num)) {
          return `${num} LPA`;
        }
        return `${num.toFixed(2)} LPA`;
      }
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return String(value);
  };

  // Determine axes
  const keys = Object.keys(data[0] || {});
  const xKey = visualization?.xAxis || keys[0];
  const yKey = visualization?.yAxis || keys[1];

  // Bar Chart
  if (chartType === "bar") {
    return (
      <Card className="p-6 shadow-sm border border-primary/10 bg-gradient-to-br from-white to-blue-50/60 dark:from-slate-950 dark:to-blue-950/20">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c7d2fe" opacity={0.4} />
              <XAxis dataKey={xKey} />
              <YAxis tickFormatter={(value) => formatValue(yKey, value)} />
              <Tooltip formatter={(value: any) => formatValue(yKey, value)} />
              <Legend />
              <Bar dataKey={yKey} fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  // Line Chart
  if (chartType === "line") {
    return (
      <Card className="p-6 shadow-sm border border-primary/10 bg-gradient-to-br from-white to-purple-50/60 dark:from-slate-950 dark:to-purple-950/20">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c4b5fd" opacity={0.4} />
              <XAxis dataKey={xKey} />
              <YAxis tickFormatter={(value) => formatValue(yKey, value)} />
              <Tooltip formatter={(value: any) => formatValue(yKey, value)} />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  // Pie Chart
  if (chartType === "pie") {
    return (
      <Card className="p-6 shadow-sm border border-primary/10 bg-gradient-to-br from-white to-pink-50/60 dark:from-slate-950 dark:to-pink-950/20">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatValue(yKey, value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  // Radar Chart
  if (chartType === "radar") {
    return (
      <Card className="p-6 shadow-sm border border-primary/10 bg-gradient-to-br from-white to-teal-50/60 dark:from-slate-950 dark:to-teal-950/20">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="#99f6e4" opacity={0.4} />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <Radar
                name="Score"
                dataKey={yKey}
                stroke="#0ea5e9"
                fill="#0ea5e9"
                fillOpacity={0.5}
              />
              <Tooltip formatter={(value: any) => formatValue(yKey, value)} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  // Funnel Chart (using bar chart horizontally)
  if (chartType === "funnel") {
    const sortedData = [...data].reverse(); // Reverse for funnel effect
    
    return (
      <Card className="p-6 shadow-sm border border-primary/10 bg-gradient-to-br from-white to-amber-50/60 dark:from-slate-950 dark:to-amber-950/20">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#fcd34d" opacity={0.4} />
              <XAxis type="number" tickFormatter={(value) => formatValue(yKey, value)} />
              <YAxis dataKey={xKey} type="category" width={150} />
              <Tooltip formatter={(value: any) => formatValue(yKey, value)} />
              <Legend />
              <Bar dataKey={yKey} fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  return null;
}

