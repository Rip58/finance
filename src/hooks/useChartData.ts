import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Interval } from "@/components/IntervalSelector";
import { startOfDay, subDays, subWeeks, subMonths, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, endOfWeek, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  totalAssets: number;
}

interface AssetTransaction {
  symbol: string;
  side: string;
  quantity: number;
  transaction_date: string;
}

interface CashTransaction {
  type: string;
  amount_eur: number;
  transaction_date: string;
}

interface AssetPrice {
  symbol: string;
  price_date: string;
  close_price: number;
}

// Calculate holdings at a specific date from transactions
function calculateHoldingsAtDate(transactions: AssetTransaction[], targetDate: Date): Record<string, number> {
  const holdings: Record<string, number> = {};
  
  for (const tx of transactions) {
    const txDate = new Date(tx.transaction_date);
    if (txDate <= targetDate) {
      if (!holdings[tx.symbol]) holdings[tx.symbol] = 0;
      if (tx.side === "buy") {
        holdings[tx.symbol] += Number(tx.quantity);
      } else {
        holdings[tx.symbol] -= Number(tx.quantity);
      }
    }
  }
  
  return holdings;
}

// Get price for a symbol at date with carry-forward
function getPriceAtDate(prices: AssetPrice[], symbol: string, targetDate: Date): number {
  const symbolPrices = prices
    .filter(p => p.symbol === symbol)
    .sort((a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime());
  
  for (const price of symbolPrices) {
    if (new Date(price.price_date) <= targetDate) {
      return Number(price.close_price);
    }
  }
  
  return 0; // No price found
}

// Calculate total assets value at date
function calculateTotalAssetsAtDate(
  holdings: Record<string, number>,
  prices: AssetPrice[],
  date: Date
): number {
  let total = 0;
  for (const [symbol, quantity] of Object.entries(holdings)) {
    const price = getPriceAtDate(prices, symbol, date);
    total += quantity * price;
  }
  return total;
}

// Aggregate cash transactions for a period
function aggregateCashTransactions(
  transactions: CashTransaction[],
  startDate: Date,
  endDate: Date
): { income: number; expense: number } {
  let income = 0;
  let expense = 0;
  
  for (const tx of transactions) {
    const txDate = new Date(tx.transaction_date);
    if (txDate >= startDate && txDate <= endDate) {
      if (tx.type === "income") {
        income += Number(tx.amount_eur);
      } else {
        expense += Number(tx.amount_eur);
      }
    }
  }
  
  return { income, expense };
}

export function useChartData(interval: Interval, userId: string | undefined) {
  return useQuery({
    queryKey: ["chart-data", interval, userId],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      if (!userId) return [];
      
      const now = new Date();
      let dates: Date[] = [];
      let formatLabel: (date: Date) => string;
      let getPeriodBounds: (date: Date) => { start: Date; end: Date };
      
      switch (interval) {
        case "1D":
          dates = eachDayOfInterval({
            start: subDays(now, 29),
            end: now,
          });
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          getPeriodBounds = (d) => ({ start: startOfDay(d), end: d });
          break;
        case "7D":
          dates = eachWeekOfInterval({
            start: subWeeks(now, 11),
            end: now,
          });
          formatLabel = (d) => `Sem ${format(d, "w")}`;
          getPeriodBounds = (d) => ({ start: d, end: endOfWeek(d) });
          break;
        case "1M":
          dates = eachMonthOfInterval({
            start: subMonths(now, 11),
            end: now,
          });
          formatLabel = (d) => format(d, "MMM yy", { locale: es });
          getPeriodBounds = (d) => ({ start: d, end: endOfMonth(d) });
          break;
      }
      
      // Fetch all data in parallel
      const [assetTxResult, cashTxResult, pricesResult] = await Promise.all([
        supabase
          .from("asset_transactions")
          .select("symbol, side, quantity, transaction_date")
          .eq("user_id", userId)
          .order("transaction_date", { ascending: true }),
        supabase
          .from("cash_transactions")
          .select("type, amount_eur, transaction_date")
          .eq("user_id", userId),
        supabase
          .from("asset_prices")
          .select("symbol, price_date, close_price")
          .order("price_date", { ascending: true }),
      ]);
      
      const assetTransactions = (assetTxResult.data || []) as AssetTransaction[];
      const cashTransactions = (cashTxResult.data || []) as CashTransaction[];
      const prices = (pricesResult.data || []) as AssetPrice[];
      
      // Generate chart data points
      const chartData: ChartDataPoint[] = dates.map((date, index) => {
        const { start, end } = getPeriodBounds(date);
        const actualEnd = end > now ? now : end;
        
        // Calculate holdings and total assets at end of period
        const holdings = calculateHoldingsAtDate(assetTransactions, actualEnd);
        const totalAssets = calculateTotalAssetsAtDate(holdings, prices, actualEnd);
        
        // Aggregate cash for the period
        const periodStart = index === 0 ? start : dates[index - 1];
        const { income, expense } = aggregateCashTransactions(cashTransactions, periodStart, actualEnd);
        
        return {
          label: formatLabel(date),
          income: Math.round(income * 100) / 100,
          expense: Math.round(expense * 100) / 100,
          totalAssets: Math.round(totalAssets * 100) / 100,
        };
      });
      
      return chartData;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute
  });
}
