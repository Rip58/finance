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
import { formatCurrency, formatCompact } from "@/lib/utils";

interface EvolutionChartProps {
  interval: Interval;
  userId: string | undefined;
}

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
            {entry.name}: {formatCurrency(entry.value, "EUR")}
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
      <div className="h-full w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const chartData = data || [];
  const hasData = chartData.some(d => d.activos > 0 || d.ahorros > 0 || d.balanceTotal > 0);

  if (!hasData) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium">Sin datos todavía</p>
          <p className="text-xs mt-1">Añade transacciones para ver la evolución</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="activosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ahorrosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
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
            tickFormatter={(value) => formatCompact(value)}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={24}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: "8px" }}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="activos"
            name="Activos"
            stroke="hsl(192, 91%, 50%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#activosGradient)"
          />
          <Area
            type="monotone"
            dataKey="ahorros"
            name="Ahorros"
            stroke="hsl(142, 71%, 45%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#ahorrosGradient)"
          />
          <Area
            type="monotone"
            dataKey="balanceTotal"
            name="Balance Total"
            stroke="hsl(262, 83%, 58%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
