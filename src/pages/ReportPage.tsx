import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  MobileLayout,
  MobilePageHeader,
  QuickActionsGrid,
  type QuickActionType,
} from "@/components/mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";

type RangeType = "1M" | "3M" | "1Y";

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
  const [range, setRange] = useState<RangeType>("1M");

  const { data: expenseTransactions = [], update: updateTransaction } = useTransactions(user.id, "expense");
  const { data: incomeTransactions = [], update: updateIncomeTransaction } = useTransactions(user.id, "income");
  const { data: categories = [] } = useCategories(user.id, "expense");
  const { data: allCategories = [] } = useCategories(user.id, undefined);
  const { data: transfers = [] } = useTransfers(user.id);
  const { data: assetTransactions = [] } = useAssetTransactions(user.id);
  const { data: bankAccounts = [] } = useBankAccounts(user.id);
  const { recurring } = useRecurringTransactions(user.id);
  const { data: subscriptions = [] } = useSubscriptions(user.id);

  // Handle quick actions
  const handleQuickAction = (action: QuickActionType) => {
    switch (action) {
      case "income":
        navigate("/add-income");
        break;
      case "expense":
        navigate("/add-expense");
        break;
      case "transfer":
        navigate("/add-transfer");
        break;
      case "pending-payments":
        navigate("/pending-payments");
        break;
      case "data":
        navigate("/account?tab=data");
        break;
    }
  };

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

  // Chart data based on range
  const chartData = useMemo(() => {
    const data = [];
    
    if (range === "1M") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekEnd = subWeeks(new Date(), i);
        const start = startOfWeek(weekEnd, { weekStartsOn: 1 });
        const end = endOfWeek(weekEnd, { weekStartsOn: 1 });

        const gastos = expenseTransactions
          .filter((tx) => isWithinInterval(new Date(tx.date), { start, end }))
          .reduce((sum, tx) => sum + tx.amount, 0);

        const ingresos = incomeTransactions
          .filter((tx) => isWithinInterval(new Date(tx.date), { start, end }))
          .reduce((sum, tx) => sum + tx.amount, 0);

        const transfersToSavings = transfers
          .filter(t => isWithinInterval(new Date(t.date), { start, end }) && savingsAccountIds.includes(t.to_account_id))
          .reduce((sum, t) => sum + t.amount_to, 0);

        const assetPurchases = assetTransactions
          .filter(at => isWithinInterval(new Date(at.transaction_date), { start, end }) && at.side === "buy")
          .reduce((sum, at) => sum + (at.quantity * at.price_eur), 0);

        data.push({
          name: `S${4 - i}`,
          gastos,
          ingresos,
          ahorro: transfersToSavings + assetPurchases,
        });
      }
    } else {
      // 3M or 1Y - monthly data
      const monthsCount = range === "3M" ? 3 : 12;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);

        const gastos = expenseTransactions
          .filter((tx) => isWithinInterval(new Date(tx.date), { start, end }))
          .reduce((sum, tx) => sum + tx.amount, 0);

        const ingresos = incomeTransactions
          .filter((tx) => isWithinInterval(new Date(tx.date), { start, end }))
          .reduce((sum, tx) => sum + tx.amount, 0);

        const transfersToSavings = transfers
          .filter(t => isWithinInterval(new Date(t.date), { start, end }) && savingsAccountIds.includes(t.to_account_id))
          .reduce((sum, t) => sum + t.amount_to, 0);

        const assetPurchases = assetTransactions
          .filter(at => isWithinInterval(new Date(at.transaction_date), { start, end }) && at.side === "buy")
          .reduce((sum, at) => sum + (at.quantity * at.price_eur), 0);

        data.push({
          name: format(monthDate, "MMM", { locale: es }),
          gastos,
          ingresos,
          ahorro: transfersToSavings + assetPurchases,
        });
      }
    }
    
    return data;
  }, [expenseTransactions, incomeTransactions, transfers, assetTransactions, savingsAccountIds, range]);

  // Calculate totals
  const totalExpense = useMemo(() => chartData.reduce((sum, m) => sum + m.gastos, 0), [chartData]);
  const totalSavings = useMemo(() => chartData.reduce((sum, m) => sum + m.ahorro, 0), [chartData]);
  const totalIncome = useMemo(() => chartData.reduce((sum, m) => sum + m.ingresos, 0), [chartData]);

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

  // Fixed income/expenses from recurring transactions
  const fixedIncome = useMemo(() => 
    recurring.filter(r => r.type === "income" && r.is_active), 
    [recurring]
  );
  
  const fixedExpenses = useMemo(() => 
    recurring.filter(r => r.type === "expense" && r.is_active), 
    [recurring]
  );

  // Active subscriptions as fixed expenses too
  const activeSubscriptions = useMemo(() => 
    subscriptions.filter(s => s.is_active), 
    [subscriptions]
  );

  const handleToggleValidation = async (id: string, isValidated: boolean, type: "income" | "expense") => {
    if (type === "income") {
      await updateIncomeTransaction({ id, is_validated: isValidated });
    } else {
      await updateTransaction({ id, is_validated: isValidated });
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return "-";
    const account = bankAccounts.find(a => a.id === accountId);
    return account?.name || "-";
  };

  const RangeSelector = () => (
    <div className="flex gap-1 bg-muted rounded-full p-1">
      {(["1M", "3M", "1Y"] as const).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            range === r 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r}
        </button>
      ))}
    </div>
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
        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActionsGrid onAction={handleQuickAction} />
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="expenses">Gastos & Ingresos</TabsTrigger>
            <TabsTrigger value="savings">Ahorros</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-lg font-bold text-destructive truncate">{formatCurrency(totalExpense)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="text-lg font-bold text-green-500 truncate">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
              <RangeSelector />
            </div>

            {/* Bar Chart */}
            <div className="h-40 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => <span className="text-muted-foreground text-xs">{value}</span>}
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

            {/* Fixed Income/Expenses Section */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Fixed Income */}
              <div className="rounded-xl border border-border bg-card p-3">
                <h4 className="text-xs font-semibold text-green-500 mb-2 uppercase tracking-wide">Ingresos Fijos</h4>
                <div className="space-y-2">
                  {fixedIncome.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="truncate text-foreground">{item.name}</span>
                      <span className="font-medium text-green-500 ml-1">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {fixedIncome.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin ingresos fijos</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/pending-payments")}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Añadir
                  </Button>
                </div>
              </div>

              {/* Fixed Expenses */}
              <div className="rounded-xl border border-border bg-card p-3">
                <h4 className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wide">Gastos Fijos</h4>
                <div className="space-y-2">
                  {fixedExpenses.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="truncate text-foreground">{item.name}</span>
                      <span className="font-medium text-destructive ml-1">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {activeSubscriptions.map(sub => (
                    <div key={sub.id} className="flex justify-between items-center text-sm">
                      <span className="truncate text-foreground">{sub.name}</span>
                      <span className="font-medium text-destructive ml-1">{formatCurrency(sub.amount)}</span>
                    </div>
                  ))}
                  {fixedExpenses.length === 0 && activeSubscriptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin gastos fijos</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/pending-payments")}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Añadir
                  </Button>
                </div>
              </div>
            </div>

            {/* Variable Income/Expenses - Transaction Lists */}
            <div className="grid grid-cols-2 gap-3">
              {/* Variable Income */}
              <div className="rounded-xl border border-border bg-card p-3">
                <h4 className="text-xs font-semibold text-green-500 mb-2 uppercase tracking-wide">Ingresos Variables</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-2">
                    {currentMonthTransactions.income.map(tx => (
                      <div key={tx.id} className="flex items-start gap-1.5">
                        <Checkbox 
                          checked={tx.is_validated}
                          onCheckedChange={(checked) => handleToggleValidation(tx.id, !!checked, "income")}
                          className="mt-0.5 h-3.5 w-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs truncate block text-foreground">{tx.description || "Sin desc."}</span>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate">{getAccountName(tx.bank_account_id)}</span>
                            <span className="font-medium text-green-500">{formatCurrency(tx.amount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {currentMonthTransactions.income.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin ingresos este mes</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Variable Expenses */}
              <div className="rounded-xl border border-border bg-card p-3">
                <h4 className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wide">Gastos Variables</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-2">
                    {currentMonthTransactions.expenses.map(tx => (
                      <div key={tx.id} className="flex items-start gap-1.5">
                        <Checkbox 
                          checked={tx.is_validated}
                          onCheckedChange={(checked) => handleToggleValidation(tx.id, !!checked, "expense")}
                          className="mt-0.5 h-3.5 w-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs truncate block text-foreground">{tx.description || "Sin desc."}</span>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate">{getAccountName(tx.bank_account_id)}</span>
                            <span className="font-medium text-destructive">{formatCurrency(tx.amount)}</span>
                          </div>
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Total ahorro</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(totalSavings)}</p>
              </div>
              <RangeSelector />
            </div>

            {/* Savings Bar Chart */}
            <div className="h-40 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
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
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">El ahorro incluye:</p>
                <ul className="text-sm mt-2 space-y-1 text-foreground">
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
