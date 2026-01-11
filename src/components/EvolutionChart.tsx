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
import { formatCurrency, formatCompact, cn, formatPercent } from "@/lib/utils";

interface EvolutionChartProps {
  interval: Interval;
  userId: string | undefined;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const change = data.change || 0;
    const pctChange = data.pctChange || 0;
    const isPositive = change >= 0;

    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg min-w-[180px]">
        <p className="mb-2 text-sm font-medium text-foreground">{label}</p>

        {/* Variation Header */}
        <div className="mb-3 pb-2 border-b border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Variación diaria</p>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", isPositive ? "text-green-500" : "text-red-500")}>
              {isPositive ? "+" : ""}{formatCurrency(change, "EUR")}
            </span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
              {formatPercent(pctChange)}
            </span>
          </div>
        </div>

        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm flex justify-between gap-4"
            style={{ color: entry.color }}
          >
            <span>{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value, "EUR")}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function EvolutionChart({ interval, userId }: EvolutionChartProps) {
  const { data, isLoading } = useChartData(interval, userId);

  const processedData = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => {
      if (index === 0) return { ...item, change: 0, pctChange: 0 };
      const prev = data[index - 1];
      const change = item.balanceTotal - prev.balanceTotal;
      const pctChange = prev.balanceTotal !== 0 ? (change / prev.balanceTotal) * 100 : 0;
      return { ...item, change, pctChange };
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const hasData = processedData.some(d => d.inversiones > 0 || d.ahorros > 0 || d.crypto > 0 || d.balanceTotal > 0);

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
          data={processedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 45 }}
        >
          <defs>
            <linearGradient id="inversionesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ahorrosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cryptoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
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
            domain={[0, (dataMax: number) => dataMax + 2000]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={24}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: "12px" }}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="inversiones"
            name="Inversiones"
            stroke="hsl(192, 91%, 50%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#inversionesGradient)"
          />
          <Area
            type="monotone"
            dataKey="crypto"
            name="Crypto"
            stroke="hsl(45, 93%, 47%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cryptoGradient)"
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
