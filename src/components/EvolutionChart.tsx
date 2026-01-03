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
import { useChartData } from "@/hooks/useChartData";
import { Skeleton } from "@/components/ui/skeleton";

interface EvolutionChartProps {
  interval: Interval;
  userId: string | undefined;
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

export function EvolutionChart({ interval, userId }: EvolutionChartProps) {
  const { data, isLoading } = useChartData(interval, userId);

  if (isLoading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const chartData = data || [];
  const hasData = chartData.some(d => d.income > 0 || d.expense > 0 || d.totalAssets > 0);

  if (!hasData) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Sin datos todavía</p>
          <p className="text-sm mt-1">Añade transacciones para ver la evolución</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
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
