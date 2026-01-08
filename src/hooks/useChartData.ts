import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Interval } from "@/components/IntervalSelector";
import { subDays, subMonths, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface ChartDataPoint {
  label: string;
  inversiones: number;
  ahorros: number;
  crypto: number;
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

// Get price for a symbol at date (closest past price)
function getPriceAtDate(prices: AssetPrice[], symbol: string, targetDate: Date): number {
  const symbolPrices = prices
    .filter(p => p.symbol === symbol)
    .sort((a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime());

  // Find the first price that is on or before the target date
  const price = symbolPrices.find(p => new Date(p.price_date) <= targetDate);

  // If found, return it
  if (price) return Number(price.close_price);

  // If NOT found (target date is before first price), 
  // we can either return 0 (technically correct if asset didn't exist) 
  // or return the oldest known price to avoid weird drops at the start of the chart.
  // For better UX, if no past price exists, we return 0. 
  // But if we have NO data at all for "today", we might want to fallback to most recent.
  // The sort is DESC, so symbolPrices[0] is the absolute latest.
  // If targetDate is in the future relative to our latest price, we should use latest price.
  if (symbolPrices.length > 0) {
    const latestPrice = symbolPrices[0];
    if (new Date(latestPrice.price_date) < targetDate) {
      return Number(latestPrice.close_price);
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

// Helper to calculate balance for a list of accounts
function calculateAccountBalanceAtDate(
  bankAccounts: BankAccount[],
  accountIds: string[],
  transactions: Transaction[],
  transfers: Transfer[],
  fxRates: FxRate[],
  targetDate: Date
): number {
  const toEur = (amount: number, currency: string, date: Date) => {
    if (currency === "USDT") return amount * getFxRateAtDate(fxRates, date);
    return amount;
  };

  let total = 0;
  // Initial balances
  for (const acc of bankAccounts) {
    if (accountIds.includes(acc.id)) {
      total += toEur(acc.initial_balance, acc.currency, targetDate);
    }
  }

  // Transactions
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate <= targetDate && tx.bank_account_id && accountIds.includes(tx.bank_account_id)) {
      const amount = toEur(Number(tx.amount), tx.currency, txDate);
      if (tx.type === "income") {
        total += amount;
      } else {
        total -= amount;
      }
    }
  }

  // Transfers
  for (const transfer of transfers) {
    const txDate = new Date(transfer.date);
    if (txDate <= targetDate) {
      if (accountIds.includes(transfer.from_account_id)) {
        total -= toEur(Number(transfer.amount_from), transfer.currency_from, txDate);
      }
      if (accountIds.includes(transfer.to_account_id)) {
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
          dates = eachDayOfInterval({ start: subDays(now, 6), end: now });
          formatLabel = (d) => format(d, "EEE", { locale: es });
          break;
        case "15D":
          dates = eachDayOfInterval({ start: subDays(now, 14), end: now })
            .filter((_, i, arr) => i % 2 === 0 || i === arr.length - 1);
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          break;
        case "1M":
          dates = eachDayOfInterval({ start: subDays(now, 29), end: now })
            .filter((_, i, arr) => i % 4 === 0 || i === arr.length - 1);
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          break;
        case "3M":
          dates = eachWeekOfInterval({ start: subMonths(now, 3), end: now });
          formatLabel = (d) => format(d, "dd MMM", { locale: es });
          break;
        case "1Y":
          dates = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
          formatLabel = (d) => format(d, "MMM yy", { locale: es });
          break;
      }

      // Fetch all data in parallel
      const [assetTxResult, txResult, pricesResult, fxRatesResult, accountsResult, categoriesResult, transfersResult, holdingsResult] = await Promise.all([
        supabase.from("asset_transactions").select("symbol, side, quantity, transaction_date").eq("user_id", userId).order("transaction_date", { ascending: true }),
        supabase.from("transactions").select("type, amount, currency, date, bank_account_id").eq("user_id", userId),
        supabase.from("asset_prices").select("symbol, price_date, close_price").order("price_date", { ascending: true }),
        supabase.from("fx_rates").select("pair, rate, as_of").eq("pair", "USDT_EUR").order("as_of", { ascending: false }),
        supabase.from("bank_accounts").select("id, category_id, currency, initial_balance").eq("user_id", userId).eq("is_archived", false),
        supabase.from("categories").select("id, name").eq("user_id", userId),
        supabase.from("transfers").select("from_account_id, to_account_id, amount_from, amount_to, currency_from, currency_to, date").eq("user_id", userId),
        supabase.from("account_holdings").select("symbol, quantity").eq("user_id", userId),
      ]);

      const assetTransactions = (assetTxResult.data || []) as AssetTransaction[];
      const transactions = (txResult.data || []) as Transaction[];
      const prices = (pricesResult.data || []) as AssetPrice[];
      const fxRates = (fxRatesResult.data || []) as FxRate[];
      const bankAccounts = (accountsResult.data || []) as BankAccount[];
      const categories = (categoriesResult.data || []) as Category[];
      const transfers = (transfersResult.data || []) as Transfer[];
      const accountHoldings = (holdingsResult.data || []) as { symbol: string; quantity: number }[];

      // Calculate static holdings
      const staticHoldings: Record<string, number> = {};
      for (const h of accountHoldings) {
        const symbol = h.symbol.toUpperCase();
        staticHoldings[symbol] = (staticHoldings[symbol] || 0) + Number(h.quantity);
      }

      // Identify category IDs
      const savingsCategoryIds = categories.filter(c => c.name.toLowerCase().includes("ahorro")).map(c => c.id);
      const investmentsCategoryIds = categories.filter(c => c.name.toLowerCase().includes("inversión") || c.name.toLowerCase().includes("inversion")).map(c => c.id);
      const cryptoCategoryIds = categories.filter(c => c.name.toLowerCase().includes("crypto") || c.name.toLowerCase().includes("cripto")).map(c => c.id);

      // Identify Account IDs
      const savingsAccountIds = bankAccounts.filter(acc => acc.category_id && savingsCategoryIds.includes(acc.category_id)).map(acc => acc.id);
      const investmentAccountIds = bankAccounts.filter(acc => acc.category_id && investmentsCategoryIds.includes(acc.category_id)).map(acc => acc.id);
      const cryptoAccountIds = bankAccounts.filter(acc => acc.category_id && cryptoCategoryIds.includes(acc.category_id)).map(acc => acc.id);

      // Generate chart data points
      const chartData: ChartDataPoint[] = dates.map((date) => {
        const actualEnd = date > now ? now : endOfMonth(date) > now ? now : endOfMonth(date);

        // 1. Crypto from DCA & Holdings
        const dcaHoldings = calculateHoldingsAtDate(assetTransactions, actualEnd);
        const dcaValue = calculateCryptoAssetsAtDate(dcaHoldings, prices, actualEnd);

        let accountHoldingsValue = 0;
        for (const [symbol, quantity] of Object.entries(staticHoldings)) {
          const price = getPriceAtDate(prices, symbol, actualEnd);
          accountHoldingsValue += quantity * price;
        }

        const fxRate = getFxRateAtDate(fxRates, actualEnd);
        const cryptoAssetsValue = (dcaValue + accountHoldingsValue) * fxRate;

        // 2. Account Balances
        const savingsBalance = calculateAccountBalanceAtDate(bankAccounts, savingsAccountIds, transactions, transfers, fxRates, actualEnd);
        const investmentsBalance = calculateAccountBalanceAtDate(bankAccounts, investmentAccountIds, transactions, transfers, fxRates, actualEnd);
        const cryptoAccountsBalance = calculateAccountBalanceAtDate(bankAccounts, cryptoAccountIds, transactions, transfers, fxRates, actualEnd);

        // Sum up
        // Crypto Total = Crypto Assets + Crypto Accounts
        const cryptoTotal = cryptoAssetsValue + cryptoAccountsBalance;

        const balanceTotal = savingsBalance + investmentsBalance + cryptoTotal;

        return {
          label: formatLabel(date),
          inversiones: Math.round(investmentsBalance * 100) / 100,
          ahorros: Math.round(savingsBalance * 100) / 100,
          crypto: Math.round(cryptoTotal * 100) / 100,
          balanceTotal: Math.round(balanceTotal * 100) / 100,
        };
      });

      return chartData;
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}
