import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MobileLayout,
  MobilePageHeader,
} from "@/components/mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const { data: expenseTransactions = [], update: updateTransaction } = useTransactions(user.id, "expense");
  const { data: incomeTransactions = [], update: updateIncomeTransaction } = useTransactions(user.id, "income");
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

  // Chart data with expenses, income and savings
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      // Expenses
      const gastos = expenseTransactions
        .filter((tx) => isWithinInterval(new Date(tx.date), { start, end }))
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Income
      const ingresos = incomeTransactions
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

      const ahorro = transfersToSavings + assetPurchases;

      months.push({
        name: format(monthDate, "MMM", { locale: es }),
        gastos,
        ingresos,
        ahorro,
        isCurrentMonth: i === 0,
      });
    }
    return months;
  }, [expenseTransactions, incomeTransactions, transfers, assetTransactions, savingsAccountIds]);

  // Calculate totals
  const totalExpense = useMemo(() => {
    return chartData.reduce((sum, m) => sum + m.gastos, 0);
  }, [chartData]);

  const totalSavings = useMemo(() => {
    return chartData.reduce((sum, m) => sum + m.ahorro, 0);
  }, [chartData]);

  // Get current month transactions
  const currentMonthTransactions = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    
    const expenses = expenseTransactions.filter(tx => 
      isWithinInterval(new Date(tx.date), { start, end })
    );
    const income = incomeTransactions.filter(tx => 
      isWithinInterval(new Date(tx.date), { start, end })
    );
    
    return { expenses, income };
  }, [expenseTransactions, incomeTransactions]);

  const handleToggleValidation = async (id: string, isValidated: boolean, type: "income" | "expense") => {
    if (type === "income") {
      await updateIncomeTransaction({ id, is_validated: isValidated });
    } else {
      await updateTransaction({ id, is_validated: isValidated });
    }
  };

  const totalIncome = useMemo(() => {
    return chartData.reduce((sum, m) => sum + m.ingresos, 0);
  }, [chartData]);

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
            <TabsTrigger value="expenses">Gastos & Ingresos</TabsTrigger>
            <TabsTrigger value="savings">Ahorros</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total gastos</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpense)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total ingresos</p>
                    <p className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome)}</p>
                  </div>
                </div>
              </div>
              <RangeSelector />
            </div>

            {/* Bar Chart with Expenses and Income side by side */}
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
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 4, 4]} 
                    name="Gastos"
                  />
                  <Bar 
                    dataKey="ingresos" 
                    fill="hsl(142.1 76.2% 36.3%)" 
                    radius={[4, 4, 4, 4]} 
                    name="Ingresos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Income / Expense Validation Lists */}
            <div className="grid grid-cols-2 gap-4">
              {/* Ingresos */}
              <div>
                <h4 className="text-sm font-medium text-green-500 mb-3">Ingresos</h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-2">
                    {currentMonthTransactions.income.map(tx => (
                      <div key={tx.id} className="flex items-start gap-2">
                        <Checkbox 
                          checked={tx.is_validated}
                          onCheckedChange={(checked) => handleToggleValidation(tx.id, !!checked, "income")}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{tx.description || "Sin descripción"}</span>
                          <span className="text-xs font-medium text-green-500">{formatCurrency(tx.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {currentMonthTransactions.income.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin ingresos este mes</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Gastos */}
              <div>
                <h4 className="text-sm font-medium text-destructive mb-3">Gastos</h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-2">
                    {currentMonthTransactions.expenses.map(tx => (
                      <div key={tx.id} className="flex items-start gap-2">
                        <Checkbox 
                          checked={tx.is_validated}
                          onCheckedChange={(checked) => handleToggleValidation(tx.id, !!checked, "expense")}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{tx.description || "Sin descripción"}</span>
                          <span className="text-xs font-medium text-destructive">{formatCurrency(tx.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {currentMonthTransactions.expenses.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin gastos este mes</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
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
