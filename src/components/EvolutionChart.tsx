import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Interval } from "./IntervalSelector";

interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  totalAssets: number;
}

interface EvolutionChartProps {
  interval: Interval;
}

// Generate mock data based on interval
function generateMockData(interval: Interval): ChartDataPoint[] {
  const now = new Date();
  const data: ChartDataPoint[] = [];

  let points: number;
  let labelFormat: (date: Date) => string;

  switch (interval) {
    case "1D":
      points = 30;
      labelFormat = (d) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
      break;
    case "7D":
      points = 12;
      labelFormat = (d) => `Sem ${Math.ceil((d.getDate()) / 7)}/${d.getMonth() + 1}`;
      break;
    case "1M":
      points = 12;
      labelFormat = (d) => d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
      break;
  }

  let cumulativeAssets = 45000;

  for (let i = points - 1; i >= 0; i--) {
    const date = new Date(now);
    
    switch (interval) {
      case "1D":
        date.setDate(date.getDate() - i);
        break;
      case "7D":
        date.setDate(date.getDate() - i * 7);
        break;
      case "1M":
        date.setMonth(date.getMonth() - i);
        break;
    }

    const baseIncome = 2000 + Math.random() * 3000;
    const baseExpense = 1500 + Math.random() * 2000;
    const multiplier = interval === "1D" ? 0.15 : interval === "7D" ? 0.5 : 1;

    const income = Math.round(baseIncome * multiplier);
    const expense = Math.round(baseExpense * multiplier);
    
    cumulativeAssets += (income - expense) * 2 + (Math.random() - 0.5) * 2000;
    cumulativeAssets = Math.max(cumulativeAssets, 30000);

    data.push({
      label: labelFormat(date),
      income,
      expense,
      totalAssets: Math.round(cumulativeAssets),
    });
  }

  return data;
}

const formatEUR = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: {formatEUR(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function EvolutionChart({ interval }: EvolutionChartProps) {
  const data = useMemo(() => generateMockData(interval), [interval]);

  return (
    <div className="h-[400px] w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(222, 30%, 16%)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            wrapperStyle={{ paddingBottom: "20px" }}
            formatter={(value) => (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Ingresos"
            stroke="hsl(142, 71%, 45%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#incomeGradient)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Gastos"
            stroke="hsl(0, 72%, 51%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#expenseGradient)"
          />
          <Area
            type="monotone"
            dataKey="totalAssets"
            name="Total Activos"
            stroke="hsl(192, 91%, 50%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#assetsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
