import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Interval } from "@/components/IntervalSelector";
import { startOfDay, subDays, subWeeks, subMonths, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, endOfWeek, endOfMonth, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface ChartDataPoint {
  label: string;
  activos: number;
  ahorros: number;
  balanceTotal: number;
}

interface AssetTransaction {
  symbol: string;
  side: string;
  quantity: number;
  transaction_date: string;
}

interface Transfer {
  from_account_id: string;
  to_account_id: string;
  amount_from: number;
  amount_to: number;
  currency_from: string;
  currency_to: string;
  date: string;
}

interface Transaction {
  type: string;
  amount: number;
  currency: string;
  date: string;
  bank_account_id: string | null;
}

interface FxRate {
  pair: string;
  rate: number;
  as_of: string;
}

interface AssetPrice {
  symbol: string;
  price_date: string;
  close_price: number;
}

interface BankAccount {
  id: string;
  category_id: string | null;
  currency: string;
  initial_balance: number;
}

interface Category {
  id: string;
  name: string;
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
  
  return 0;
}

// Calculate total crypto assets value at date
function calculateCryptoAssetsAtDate(
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

// Get FX rate for a date
function getFxRateAtDate(fxRates: FxRate[], targetDate: Date): number {
  const usdtRates = fxRates
    .filter(r => r.pair === "USDT_EUR")
    .sort((a, b) => new Date(b.as_of).getTime() - new Date(a.as_of).getTime());
  
  for (const rate of usdtRates) {
    if (new Date(rate.as_of) <= targetDate) {
      return Number(rate.rate);
    }
  }
  
  return usdtRates.length > 0 ? Number(usdtRates[0].rate) : 1;
}

// Calculate savings account balance at date
function calculateSavingsAtDate(
  bankAccounts: BankAccount[],
  savingsAccountIds: string[],
  transactions: Transaction[],
  transfers: Transfer[],
  fxRates: FxRate[],
  targetDate: Date
): number {
  const toEur = (amount: number, currency: string, date: Date) => {
    if (currency === "USDT") return amount * getFxRateAtDate(fxRates, date);
    return amount;
  };

  // Start with initial balances
  let total = 0;
  for (const acc of bankAccounts) {
    if (savingsAccountIds.includes(acc.id)) {
      total += toEur(acc.initial_balance, acc.currency, targetDate);
    }
  }

  // Add/subtract transactions up to date
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate <= targetDate && tx.bank_account_id && savingsAccountIds.includes(tx.bank_account_id)) {
      const amount = toEur(Number(tx.amount), tx.currency, txDate);
      if (tx.type === "income") {
        total += amount;
      } else {
        total -= amount;
      }
    }
  }

  // Apply transfers up to date
  for (const transfer of transfers) {
    const txDate = new Date(transfer.date);
    if (txDate <= targetDate) {
      if (savingsAccountIds.includes(transfer.from_account_id)) {
        total -= toEur(Number(transfer.amount_from), transfer.currency_from, txDate);
      }
      if (savingsAccountIds.includes(transfer.to_account_id)) {
        total += toEur(Number(transfer.amount_to), transfer.currency_to, txDate);
      }
    }
  }

  return total;
}

export function useChartData(interval: Interval, userId: string | undefined) {
  return useQuery({
    queryKey: ["chart-data", interval, userId],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      if (!userId) return [];
      
      const now = new Date();
      let dates: Date[] = [];
      let formatLabel: (date: Date) => string;
      
      switch (interval) {
        case "7D":
          // Last 7 days, daily points
          dates = eachDayOfInterval({
            start: subDays(now, 6),
            end: now,
          });
          formatLabel = (d) => format(d, "EEE", { locale: es });
          break;
        case "15D":
          // Last 15 days, points every 2 days
          dates = eachDayOfInterval({
            start: subDays(now, 14),
            end: now,
          }).filter((_, i, arr) => i % 2 === 0 || i === arr.length - 1);
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          break;
        case "1M":
          // Last 30 days, points every 4 days
          dates = eachDayOfInterval({
            start: subDays(now, 29),
            end: now,
          }).filter((_, i, arr) => i % 4 === 0 || i === arr.length - 1);
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          break;
        case "3M":
          // Last 3 months, weekly points
          dates = eachWeekOfInterval({
            start: subMonths(now, 3),
            end: now,
          });
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          break;
        case "1Y":
          // Last 12 months
          dates = eachMonthOfInterval({
            start: subMonths(now, 11),
            end: now,
          });
          formatLabel = (d) => format(d, "MMM yy", { locale: es });
          break;
      }
      
      // Fetch all data in parallel
      const [assetTxResult, txResult, pricesResult, fxRatesResult, accountsResult, categoriesResult, transfersResult, holdingsResult] = await Promise.all([
        supabase
          .from("asset_transactions")
          .select("symbol, side, quantity, transaction_date")
          .eq("user_id", userId)
          .order("transaction_date", { ascending: true }),
        supabase
          .from("transactions")
          .select("type, amount, currency, date, bank_account_id")
          .eq("user_id", userId),
        supabase
          .from("asset_prices")
          .select("symbol, price_date, close_price")
          .order("price_date", { ascending: true }),
        supabase
          .from("fx_rates")
          .select("pair, rate, as_of")
          .eq("pair", "USDT_EUR")
          .order("as_of", { ascending: false }),
        supabase
          .from("bank_accounts")
          .select("id, category_id, currency, initial_balance")
          .eq("user_id", userId)
          .eq("is_archived", false),
        supabase
          .from("categories")
          .select("id, name")
          .eq("user_id", userId),
        supabase
          .from("transfers")
          .select("from_account_id, to_account_id, amount_from, amount_to, currency_from, currency_to, date")
          .eq("user_id", userId),
        supabase
          .from("account_holdings")
          .select("symbol, quantity")
          .eq("user_id", userId),
      ]);
      
      const assetTransactions = (assetTxResult.data || []) as AssetTransaction[];
      const transactions = (txResult.data || []) as Transaction[];
      const prices = (pricesResult.data || []) as AssetPrice[];
      const fxRates = (fxRatesResult.data || []) as FxRate[];
      const bankAccounts = (accountsResult.data || []) as BankAccount[];
      const categories = (categoriesResult.data || []) as Category[];
      const transfers = (transfersResult.data || []) as Transfer[];
      const accountHoldings = (holdingsResult.data || []) as { symbol: string; quantity: number }[];
      
      // Calculate static holdings from account_holdings (not date-based, use latest prices)
      const staticHoldings: Record<string, number> = {};
      for (const h of accountHoldings) {
        const symbol = h.symbol.toUpperCase();
        staticHoldings[symbol] = (staticHoldings[symbol] || 0) + Number(h.quantity);
      }
      
      // Find savings/investment accounts
      const savingsCategoryIds = categories
        .filter(c => 
          c.name.toLowerCase().includes("ahorro") || 
          c.name.toLowerCase().includes("inversión") ||
          c.name.toLowerCase().includes("inversion")
        )
        .map(c => c.id);
      
      const savingsAccountIds = bankAccounts
        .filter(acc => acc.category_id && savingsCategoryIds.includes(acc.category_id))
        .map(acc => acc.id);
      
      // Generate chart data points
      const chartData: ChartDataPoint[] = dates.map((date) => {
        const actualEnd = date > now ? now : endOfMonth(date) > now ? now : endOfMonth(date);
        
        // Calculate crypto assets from DCA at end of period
        const dcaHoldings = calculateHoldingsAtDate(assetTransactions, actualEnd);
        const dcaValue = calculateCryptoAssetsAtDate(dcaHoldings, prices, actualEnd);
        
        // Calculate crypto assets from account_holdings (static - use latest prices)
        let accountHoldingsValue = 0;
        for (const [symbol, quantity] of Object.entries(staticHoldings)) {
          const price = getPriceAtDate(prices, symbol, actualEnd);
          accountHoldingsValue += quantity * price;
        }
        
        // Convert crypto assets from USD to EUR
        const fxRate = getFxRateAtDate(fxRates, actualEnd);
        const activos = (dcaValue + accountHoldingsValue) * fxRate;
        
        // Calculate savings account balance at end of period
        const ahorros = calculateSavingsAtDate(
          bankAccounts,
          savingsAccountIds,
          transactions,
          transfers,
          fxRates,
          actualEnd
        );
        
        // Balance total = activos + ahorros
        const balanceTotal = activos + ahorros;
        
        return {
          label: formatLabel(date),
          activos: Math.round(activos * 100) / 100,
          ahorros: Math.round(ahorros * 100) / 100,
          balanceTotal: Math.round(balanceTotal * 100) / 100,
        };
      });
      
      return chartData;
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}
