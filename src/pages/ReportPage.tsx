import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MobileLayout,
  MobilePageHeader,
  CategorySummaryList,
  type CategorySummary,
} from "@/components/mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";

type RangeType = "monthly" | "weekly" | "daily";

interface ReportPageProps {
  user: User;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);

export function ReportPage({ user }: ReportPageProps) {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeType>("monthly");

  const { data: transactions = [] } = useTransactions(user.id, "expense");
  const { data: categories = [] } = useCategories(user.id, "expense");

  // Calculate total expenses
  const totalExpense = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, range === "monthly" ? 0 : range === "weekly" ? 0 : 0));
    const endDate = endOfMonth(now);

    return transactions
      .filter((tx) => {
        const txDate = new Date(tx.date);
        return isWithinInterval(txDate, { start: startDate, end: endDate });
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, range]);

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const total = transactions
        .filter((tx) => {
          const txDate = new Date(tx.date);
          return isWithinInterval(txDate, { start, end });
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      months.push({
        name: format(monthDate, "MMM", { locale: es }),
        value: total,
        isCurrentMonth: i === 0,
      });
    }
    return months;
  }, [transactions]);

  // Category breakdown
  const categoryBreakdown: CategorySummary[] = useMemo(() => {
    const categoryMap = new Map<string, { name: string; count: number; total: number }>();

    transactions.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.category_id);
      const catName = cat?.name || "Sin categoría";
      const catId = tx.category_id || "uncategorized";

      const existing = categoryMap.get(catId) || { name: catName, count: 0, total: 0 };
      categoryMap.set(catId, {
        name: catName,
        count: existing.count + 1,
        total: existing.total + tx.amount,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        total: data.total,
        currency: "EUR",
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, categories]);

  return (
    <MobileLayout>
      <MobilePageHeader title="Expenses" showBack />

      {/* Total Expense Card */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total expense</p>
            <p className="text-3xl font-bold">{formatCurrency(totalExpense)}</p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as RangeType)}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bar Chart */}
        <div className="h-40 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis hide />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isCurrentMonth ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="px-4 py-4">
        <CategorySummaryList
          categories={categoryBreakdown}
          onSeeAll={() => navigate("/account?tab=categories")}
        />
      </div>
    </MobileLayout>
  );
}
