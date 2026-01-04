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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useTransfers } from "@/hooks/useTransfers";
import { useAssetTransactions } from "@/hooks/useAssetTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
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
  const { data: allCategories = [] } = useCategories(user.id, undefined);
  const { data: transfers = [] } = useTransfers(user.id);
  const { data: assetTransactions = [] } = useAssetTransactions(user.id);
  const { data: bankAccounts = [] } = useBankAccounts(user.id);

  // Identify savings/investment accounts
  const savingsAccountIds = useMemo(() => {
    const savingsCategoryIds = allCategories
      .filter(c => 
        c.name.toLowerCase().includes("ahorro") || 
        c.name.toLowerCase().includes("inversión") ||
        c.name.toLowerCase().includes("inversion")
      )
      .map(c => c.id);
    
    return bankAccounts
      .filter(acc => acc.category_id && savingsCategoryIds.includes(acc.category_id))
      .map(acc => acc.id);
  }, [bankAccounts, allCategories]);

  // Chart data with expenses and savings
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      // Expenses
      const expenses = transactions
        .filter((tx) => isWithinInterval(new Date(tx.date), { start, end }))
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Savings: Transfers to savings/investment accounts
      const transfersToSavings = transfers
        .filter(t => {
          const txDate = new Date(t.date);
          return isWithinInterval(txDate, { start, end }) && 
                 savingsAccountIds.includes(t.to_account_id);
        })
        .reduce((sum, t) => sum + t.amount_to, 0);

      // Savings: Asset purchases
      const assetPurchases = assetTransactions
        .filter(at => {
          const txDate = new Date(at.transaction_date);
          return isWithinInterval(txDate, { start, end }) && at.side === "buy";
        })
        .reduce((sum, at) => sum + (at.quantity * at.price_eur), 0);

      const savings = transfersToSavings + assetPurchases;

      months.push({
        name: format(monthDate, "MMM", { locale: es }),
        gastos: expenses,
        ahorro: savings,
        isCurrentMonth: i === 0,
      });
    }
    return months;
  }, [transactions, transfers, assetTransactions, savingsAccountIds]);

  // Calculate totals
  const totalExpense = useMemo(() => {
    return chartData.reduce((sum, m) => sum + m.gastos, 0);
  }, [chartData]);

  const totalSavings = useMemo(() => {
    return chartData.reduce((sum, m) => sum + m.ahorro, 0);
  }, [chartData]);

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

  const RangeSelector = () => (
    <Select value={range} onValueChange={(v) => setRange(v as RangeType)}>
      <SelectTrigger className="w-28 h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="monthly">Mensual</SelectItem>
        <SelectItem value="weekly">Semanal</SelectItem>
        <SelectItem value="daily">Diario</SelectItem>
      </SelectContent>
    </Select>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <MobileLayout>
      <MobilePageHeader title="Informe" showBack />

      <div className="px-4 py-4">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="expenses">Gastos</TabsTrigger>
            <TabsTrigger value="savings">Ahorros</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Total gastos</p>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
              </div>
              <RangeSelector />
            </div>

            {/* Stacked Bar Chart */}
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                  <Bar 
                    dataKey="gastos" 
                    stackId="a" 
                    fill="hsl(var(--destructive))" 
                    radius={[0, 0, 4, 4]} 
                    name="Gastos"
                  />
                  <Bar 
                    dataKey="ahorro" 
                    stackId="a" 
                    fill="hsl(142.1 76.2% 36.3%)" 
                    radius={[4, 4, 0, 0]} 
                    name="Ahorro"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            <CategorySummaryList
              categories={categoryBreakdown}
              onSeeAll={() => navigate("/account?tab=categories")}
            />
          </TabsContent>

          <TabsContent value="savings">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Total ahorro</p>
                <p className="text-3xl font-bold text-green-500">{formatCurrency(totalSavings)}</p>
              </div>
              <RangeSelector />
            </div>

            {/* Savings Bar Chart */}
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="ahorro" 
                    fill="hsl(142.1 76.2% 36.3%)" 
                    radius={[4, 4, 4, 4]} 
                    name="Ahorro"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Savings breakdown info */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">El ahorro incluye:</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>• Transferencias a cuentas de ahorro/inversión</li>
                  <li>• Compras de activos (crypto, etc.)</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
