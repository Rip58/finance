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
  savingsBalance: number;
  investmentsBalance: number;
  cryptoBalance: number;
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
          savingsBalance: 0,
          investmentsBalance: 0,
          cryptoBalance: 0,
        };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Fetch transactions, asset data, fx rates, accounts, categories, and account holdings in parallel
      const [currentMonthTx, lastMonthTx, assetTransactions, assetPrices, fxRates, accounts, categories, allTransactions, transfers, accountHoldingsResult, portfoliosResult] = await Promise.all([
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
          .select("symbol, side, quantity, dca_portfolio_id")
          .eq("user_id", userId),
        supabase
          .from("asset_prices")
          .select("symbol, close_price, price_date")
          .order("price_date", { ascending: false }),
        supabase
          .from("fx_rates")
          .select("pair, rate, as_of")
          .eq("pair", "USDT_EUR")
          .order("as_of", { ascending: false })
          .limit(1),
        supabase
          .from("bank_accounts")
          .select("id, name, currency, category_id, is_archived, initial_balance, importe_inicial")
          .eq("user_id", userId)
          .eq("is_archived", false),
        supabase
          .from("categories")
          .select("id, name, scope")
          .eq("user_id", userId),
        supabase
          .from("transactions")
          .select("type, amount, currency, bank_account_id")
          .eq("user_id", userId),
        supabase
          .from("transfers")
          .select("from_account_id, to_account_id, amount_from, amount_to, currency_from, currency_to")
          .eq("user_id", userId),
        supabase
          .from("account_holdings")
          .select("symbol, quantity, bank_account_id")
          .eq("user_id", userId),
        supabase
          .from("dca_portfolios")
          .select("id")
          .eq("user_id", userId),
      ]);

      // Get latest USDT/EUR rate (fallback to 1 if none)
      const usdtRate = fxRates.data?.[0]?.rate ? Number(fxRates.data[0].rate) : 1;
      const accountsData = (accounts.data || []) as unknown as Array<{
        id: string;
        name: string;
        currency: string;
        category_id: string | null;
        is_archived: boolean;
        initial_balance: number;
        importe_inicial?: boolean;
      }>;
      const cryptoAccountIds = new Set(
        (accountHoldingsResult.data || []).map((holding) => holding.bank_account_id)
      );

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

      // Filter asset transactions to only those belonging to active/existing portfolios
      const portfolios = portfoliosResult.data || [];
      const validPortfolioIds = new Set(portfolios.map(p => p.id));

      const validAssetTransactions = (assetTransactions.data || [])
        .map(tx => tx as { symbol: string; side: string; quantity: number; dca_portfolio_id: string | null }) // explicit cast
        .filter(tx => tx.dca_portfolio_id && validPortfolioIds.has(tx.dca_portfolio_id));

      // Calculate current holdings from valid transactions
      const holdings: Record<string, number> = {};
      for (const tx of validAssetTransactions) {
        const symbol = tx.symbol.toUpperCase();
        if (!holdings[symbol]) holdings[symbol] = 0;
        if (tx.side === "buy") holdings[symbol] += Number(tx.quantity);
        else holdings[symbol] -= Number(tx.quantity);
      }

      // Get latest prices for each symbol
      const latestPrices: Record<string, number> = {};
      for (const price of assetPrices.data || []) {
        if (!latestPrices[price.symbol]) {
          latestPrices[price.symbol] = Number(price.close_price);
        }
      }

      // Find categories early — needed for account classification below
      const savingsCategoryIds = (categories.data || [])
        .filter(c => c.name?.toLowerCase().includes("ahorro"))
        .map(c => c.id);

      const investmentsCategoryIds = (categories.data || [])
        .filter(c => c.name?.toLowerCase().includes("inversión") || c.name?.toLowerCase().includes("inversion"))
        .map(c => c.id);

      const cryptoCategoryIds = (categories.data || [])
        .filter(c => c.name?.toLowerCase().includes("crypto") || c.name?.toLowerCase().includes("cripto"))
        .map(c => c.id);

      // Calculate total assets from DCA transactions
      let totalAssets = 0;
      for (const [symbol, quantity] of Object.entries(holdings)) {
        const price = latestPrices[symbol] || 0;
        totalAssets += quantity * price;
      }

      // Add account holdings value (non-DCA, non-investment crypto accounts)
      // Investment-category accounts with holdings are handled separately in the classification loop below
      const investmentAccountIds = new Set(
        accountsData
          .filter(acc => acc.category_id && investmentsCategoryIds.includes(acc.category_id))
          .map(acc => acc.id)
      );
      let accountHoldingsValue = 0;
      for (const h of accountHoldingsResult.data || []) {
        if (investmentAccountIds.has(h.bank_account_id)) continue; // already handled separately
        const price = latestPrices[h.symbol.toUpperCase()] || latestPrices[h.symbol] || 0;
        accountHoldingsValue += Number(h.quantity) * price;
      }
      totalAssets += accountHoldingsValue;

      // Calculate account balances
      const accountBalances: Record<string, number> = {};
      for (const acc of accountsData) {
        accountBalances[acc.id] = acc.importe_inicial ? (Number(acc.initial_balance) || 0) : 0;
      }
      const accountCurrencyMap = new Map(accountsData.map((acc) => [acc.id, acc.currency]));

      // Add income, subtract expenses
      for (const tx of allTransactions.data || []) {
        if (tx.bank_account_id && accountBalances[tx.bank_account_id] !== undefined) {
          const accountCurrency = accountCurrencyMap.get(tx.bank_account_id);
          if (!accountCurrency || accountCurrency !== tx.currency) continue;
          const amount = toEur(Number(tx.amount), tx.currency);
          if (tx.type === "income") {
            accountBalances[tx.bank_account_id] += amount;
          } else {
            accountBalances[tx.bank_account_id] -= amount;
          }
        }
      }

      // Apply transfers
      for (const transfer of transfers.data || []) {
        if (transfer.from_account_id && accountBalances[transfer.from_account_id] !== undefined) {
          const accountCurrency = accountCurrencyMap.get(transfer.from_account_id);
          if (accountCurrency === transfer.currency_from) {
            accountBalances[transfer.from_account_id] -= toEur(Number(transfer.amount_from), transfer.currency_from);
          }
        }
        if (transfer.to_account_id && accountBalances[transfer.to_account_id] !== undefined) {
          const accountCurrency = accountCurrencyMap.get(transfer.to_account_id);
          if (accountCurrency === transfer.currency_to) {
            accountBalances[transfer.to_account_id] += toEur(Number(transfer.amount_to), transfer.currency_to);
          }
        }
      }


      // Calculate balances
      let savingsBalance = 0;
      let investmentsBalance = 0;
      let cryptoBalance = 0;

      for (const acc of accountsData) {
        const balance = accountBalances[acc.id] || 0;

        // Priority 1: Explicit category assignment wins always
        if (acc.category_id) {
          if (savingsCategoryIds.includes(acc.category_id)) {
            // Always count EUR savings by balance
            if (acc.currency === "EUR") savingsBalance += balance;
            continue;
          }
          if (investmentsCategoryIds.includes(acc.category_id)) {
            // Investment accounts: use balance for EUR/non-crypto, use holdings for USD/USDT
            if (acc.currency === "EUR") investmentsBalance += balance;
            // USD-denominated investment accounts (like andbank BTC portion) go into crypto
            // because their actual value is derived from holdings, not from a EUR balance
            else if (acc.currency === "USD" || acc.currency === "USDT") {
              const holdingsValue = (accountHoldingsResult.data || [])
                .filter(h => h.bank_account_id === acc.id)
                .reduce((sum, h) => {
                  const price = latestPrices[h.symbol.toUpperCase()] || latestPrices[h.symbol] || 0;
                  return sum + Number(h.quantity) * price;
                }, 0);
              cryptoBalance += holdingsValue * usdtRate;
            }
            continue;
          }
          if (cryptoCategoryIds.includes(acc.category_id)) {
            // Pure crypto category → include in cryptoBalance via holdings
            continue; // already computed via accountHoldingsValue below
          }
        }

        // Priority 2: No explicit investment/savings category → fallback to heuristics
        const isCryptoByHeuristic = cryptoAccountIds.has(acc.id)
          || acc.currency === "USD"
          || acc.currency === "USDT";

        if (isCryptoByHeuristic) {
          continue; // counted in accountHoldingsValue block below
        }
      }

      // Add Crypto Holdings (excluding DCA) to Crypto Balance
      cryptoBalance += accountHoldingsValue * usdtRate;

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
        assetChange: 0,
        incomeChange: Math.round(incomeChange * 10) / 10,
        expenseChange: Math.round(expenseChange * 10) / 10,
        savingsBalance: Math.round(savingsBalance * 100) / 100,
        investmentsBalance: Math.round(investmentsBalance * 100) / 100,
        cryptoBalance: Math.round(cryptoBalance * 100) / 100,
      };
    },
    enabled: !!userId,
    staleTime: 60000,
  });
}
