import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMetrics {
  totalAssets: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netBalance: number;
  assetChange: number;
  incomeChange: number;
  expenseChange: number;
}

export function useDashboardMetrics(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-metrics", userId],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!userId) {
        return {
          totalAssets: 0,
          monthlyIncome: 0,
          monthlyExpense: 0,
          netBalance: 0,
          assetChange: 0,
          incomeChange: 0,
          expenseChange: 0,
        };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch cash transactions for current and last month
      const [currentMonthCash, lastMonthCash, assetTransactions, assetPrices] = await Promise.all([
        supabase
          .from("cash_transactions")
          .select("type, amount_eur")
          .eq("user_id", userId)
          .gte("transaction_date", startOfMonth.toISOString()),
        supabase
          .from("cash_transactions")
          .select("type, amount_eur")
          .eq("user_id", userId)
          .gte("transaction_date", startOfLastMonth.toISOString())
          .lt("transaction_date", startOfMonth.toISOString()),
        supabase
          .from("asset_transactions")
          .select("symbol, side, quantity")
          .eq("user_id", userId),
        supabase
          .from("asset_prices")
          .select("symbol, close_price, price_date")
          .order("price_date", { ascending: false }),
      ]);

      // Calculate current month income/expense
      let monthlyIncome = 0;
      let monthlyExpense = 0;
      for (const tx of currentMonthCash.data || []) {
        if (tx.type === "income") monthlyIncome += Number(tx.amount_eur);
        else monthlyExpense += Number(tx.amount_eur);
      }

      // Calculate last month income/expense for comparison
      let lastMonthIncome = 0;
      let lastMonthExpense = 0;
      for (const tx of lastMonthCash.data || []) {
        if (tx.type === "income") lastMonthIncome += Number(tx.amount_eur);
        else lastMonthExpense += Number(tx.amount_eur);
      }

      // Calculate current holdings
      const holdings: Record<string, number> = {};
      for (const tx of (assetTransactions.data || []) as { symbol: string; side: string; quantity: number }[]) {
        if (!holdings[tx.symbol]) holdings[tx.symbol] = 0;
        if (tx.side === "buy") holdings[tx.symbol] += Number(tx.quantity);
        else holdings[tx.symbol] -= Number(tx.quantity);
      }

      // Get latest prices for each symbol
      const latestPrices: Record<string, number> = {};
      for (const price of assetPrices.data || []) {
        if (!latestPrices[price.symbol]) {
          latestPrices[price.symbol] = Number(price.close_price);
        }
      }

      // Calculate total assets
      let totalAssets = 0;
      for (const [symbol, quantity] of Object.entries(holdings)) {
        const price = latestPrices[symbol] || 0;
        totalAssets += quantity * price;
      }

      const netBalance = monthlyIncome - monthlyExpense;
      const incomeChange = lastMonthIncome > 0 
        ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome) * 100 
        : 0;
      const expenseChange = lastMonthExpense > 0 
        ? ((monthlyExpense - lastMonthExpense) / lastMonthExpense) * 100 
        : 0;

      return {
        totalAssets: Math.round(totalAssets * 100) / 100,
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        monthlyExpense: Math.round(monthlyExpense * 100) / 100,
        netBalance: Math.round(netBalance * 100) / 100,
        assetChange: 0, // Would need historical data to calculate
        incomeChange: Math.round(incomeChange * 10) / 10,
        expenseChange: Math.round(expenseChange * 10) / 10,
      };
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}
