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

      // Fetch transactions, asset data, and fx rates in parallel
      const [currentMonthTx, lastMonthTx, assetTransactions, assetPrices, fxRates] = await Promise.all([
        supabase
          .from("transactions")
          .select("type, amount, currency, date, value_date")
          .eq("user_id", userId)
          .gte("date", startOfMonth.toISOString()),
        supabase
          .from("transactions")
          .select("type, amount, currency, date, value_date")
          .eq("user_id", userId)
          .gte("date", startOfLastMonth.toISOString())
          .lt("date", startOfMonth.toISOString()),
        supabase
          .from("asset_transactions")
          .select("symbol, side, quantity")
          .eq("user_id", userId),
        supabase
          .from("asset_prices")
          .select("symbol, close_price, price_date")
          .order("price_date", { ascending: false }),
        supabase
          .from("fx_rates")
          .select("pair, rate, as_of")
          .eq("pair", "USDT/EUR")
          .order("as_of", { ascending: false })
          .limit(1),
      ]);

      // Get latest USDT/EUR rate (fallback to 1 if none)
      const usdtRate = fxRates.data?.[0]?.rate ? Number(fxRates.data[0].rate) : 1;

      // Helper to convert amount to EUR
      const toEur = (amount: number, currency: string) => {
        if (currency === "USDT") return amount * usdtRate;
        return amount;
      };

      // Calculate current month income/expense with currency conversion
      let monthlyIncome = 0;
      let monthlyExpense = 0;
      for (const tx of currentMonthTx.data || []) {
        const amountEur = toEur(Number(tx.amount), tx.currency);
        if (tx.type === "income") monthlyIncome += amountEur;
        else monthlyExpense += amountEur;
      }

      // Calculate last month income/expense for comparison
      let lastMonthIncome = 0;
      let lastMonthExpense = 0;
      for (const tx of lastMonthTx.data || []) {
        const amountEur = toEur(Number(tx.amount), tx.currency);
        if (tx.type === "income") lastMonthIncome += amountEur;
        else lastMonthExpense += amountEur;
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
