import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useCryptoMarketData } from "@/hooks/useCryptoMarketData";

import { LogOut, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

import {
  MobileLayout,
  SafeAreaHeader,
  BalanceCard,
} from "@/components/mobile";
import { AccountEditDialog } from "@/components/mobile/AccountEditDialog";
import { SortableAccountList } from "@/components/mobile/SortableAccountList";


import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransfers } from "@/hooks/useTransfers";
import { useAssetTransactions } from "@/hooks/useAssetTransactions";
import { useAccountHoldings } from "@/hooks/useAccountHoldings";

const PatrimonyEvolution = lazy(() =>
  import("@/components/home/PatrimonyEvolution").then((m) => ({ default: m.PatrimonyEvolution }))
);
import { useDCAPortfolios } from "@/hooks/useDCAPortfolios";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { useFxRates } from "@/hooks/useFxRates";

interface HomePageProps {
  user: User;
}

export function HomePage({ user }: HomePageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<typeof bankAccounts[0] | null>(null);

  const { data: metrics } = useDashboardMetrics(user.id);

  const { data: transactions = [] } = useTransactions(user.id);
  const { data: bankAccounts = [], updateSortOrder } = useBankAccounts(user.id);
  const { data: categories = [], create: createCategory } = useCategories(user.id, undefined);
  const { data: transfers = [] } = useTransfers(user.id);
  const { data: assetTransactions = [] } = useAssetTransactions(user.id);
  const { data: allAccountHoldings = [] } = useAccountHoldings(user.id);
  const { data: portfolios = [] } = useDCAPortfolios(user.id);
  const fxRates = useFxRates();

  useEffect(() => {
    if (!selectedAccount) return;
    const updatedAccount = bankAccounts.find(acc => acc.id === selectedAccount.id);
    if (updatedAccount && updatedAccount !== selectedAccount) {
      setSelectedAccount(updatedAccount);
    }
  }, [bankAccounts, selectedAccount]);

  // Ensure default categories exist
  useEffect(() => {
    if (categories.length > 0) {
      const defaults = ["Ahorros", "Inversiones"];
      const missing = defaults.filter(def =>
        !categories.some(c => c.name.toLowerCase() === def.toLowerCase())
      );

      if (missing.length > 0) {
        const createDefaults = async () => {
          for (const name of missing) {
            try {
              await createCategory({
                name,
                scope: "account",
                sort_order: categories.length,
                is_archived: false
              });
            } catch (e) {
              console.error(`Error creating default category ${name}:`, e);
            }
          }
        };
        createDefaults();
      }
    }
  }, [categories, createCategory]);

  // Get unique symbols from asset transactions and account holdings
  const allSymbols = useMemo(() => {
    const dcaSymbols = assetTransactions.map(tx => tx.symbol.toUpperCase());
    const holdingSymbols = allAccountHoldings.map(h => h.symbol.toUpperCase());
    return [...new Set([...dcaSymbols, ...holdingSymbols])];
  }, [assetTransactions, allAccountHoldings]);
  const { data: currentPrices = {}, refreshPrices } = useCurrentPrices(allSymbols);

  // Get USDT/EUR rate
  const usdtEurRate = fxRates.getLatestRate("USDT_EUR") || 1;

  // Auto-refresh prices on mount
  useEffect(() => {
    handleRefreshPrices();
  }, []);

  // Calculate account balances in their original currency
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    // Initialize with initial_balance when enabled
    for (const acc of bankAccounts) {
      balances[acc.id] = acc.importe_inicial ? (Number(acc.initial_balance) || 0) : 0;
    }

    // Add income, subtract expenses (matching currency)
    for (const tx of transactions) {
      if (tx.bank_account_id && balances[tx.bank_account_id] !== undefined) {
        const account = bankAccounts.find(a => a.id === tx.bank_account_id);
        if (account && tx.currency === account.currency) {
          if (tx.type === "income") {
            balances[tx.bank_account_id] += Number(tx.amount);
          } else {
            balances[tx.bank_account_id] -= Number(tx.amount);
          }
        }
      }
    }

    // Apply transfers
    for (const transfer of transfers) {
      const fromAccount = bankAccounts.find(a => a.id === transfer.from_account_id);
      const toAccount = bankAccounts.find(a => a.id === transfer.to_account_id);

      if (fromAccount && transfer.currency_from === fromAccount.currency) {
        balances[transfer.from_account_id] -= Number(transfer.amount_from);
      }
      if (toAccount && transfer.currency_to === toAccount.currency) {
        balances[transfer.to_account_id] += Number(transfer.amount_to);
      }
    }

    return balances;
  }, [bankAccounts, transactions, transfers]);



  // Filter accounts (Savings, Investment, Crypto)
  const displayedAccounts = useMemo(() => {
    const includedCategoryIds = categories
      .filter(c =>
        c.name.toLowerCase().includes("ahorro") ||
        c.name.toLowerCase().includes("inversión") ||
        c.name.toLowerCase().includes("inversion") ||
        c.name.toLowerCase().includes("crypto") ||
        c.name.toLowerCase().includes("cripto") ||
        c.name.toLowerCase().includes("corriente")
      )
      .map(c => c.id);

    return bankAccounts.filter(
      acc => !acc.is_archived && acc.category_id && includedCategoryIds.includes(acc.category_id)
    );
  }, [bankAccounts, categories]);

  // --- CRYPTO LIVE DELTA LOGIC & HOLDINGS FOR HOOK - MOVED UP ---
  const allCryptoHoldings = useMemo(() => {
    const holdings: Record<string, number> = {};
    if (allAccountHoldings) {
      for (const h of allAccountHoldings) holdings[h.symbol.toUpperCase()] = (holdings[h.symbol.toUpperCase()] || 0) + Number(h.quantity);
    }
    // DCA Holdings (Calculated from transactions for robustness)
    const activePortfolioIds = new Set(portfolios?.map(p => p.id) || []);
    const validTransactions = assetTransactions?.filter(tx => tx.dca_portfolio_id && activePortfolioIds.has(tx.dca_portfolio_id)) || [];
    for (const tx of validTransactions) {
      const s = tx.symbol.toUpperCase();
      holdings[s] = (holdings[s] || 0) + (tx.side === "buy" ? Number(tx.quantity) : -Number(tx.quantity));
    }
    return holdings;
  }, [allAccountHoldings, assetTransactions, portfolios]);








  // Calculate DCA Total in USD (Enhanced with Live Prices)
  const dcaTotalUsd = useMemo(() => {
    if (assetTransactions.length === 0 && portfolios.length === 0) return 0;

    // Calculate holdings from transactions again (or reuse logic if complex, but re-calc is safe here)
    let holdings: Record<string, number> = {};
    const activePortfolioIds = new Set(portfolios?.map(p => p.id) || []);
    const validTransactions = assetTransactions?.filter(tx => tx.dca_portfolio_id && activePortfolioIds.has(tx.dca_portfolio_id)) || [];

    for (const tx of validTransactions) {
      const s = tx.symbol.toUpperCase();
      holdings[s] = (holdings[s] || 0) + (tx.side === "buy" ? Number(tx.quantity) : -Number(tx.quantity));
    }

    let totalUsd = 0;
    for (const [symbol, qty] of Object.entries(holdings)) {
      // Priority: Current Price from DB > 0 (Live Price removed for stability)
      const priceData = currentPrices[symbol];
      const price = typeof priceData === 'number' ? priceData : (priceData?.price || 0);
      totalUsd += qty * price;
    }

    return totalUsd;
  }, [assetTransactions, currentPrices, portfolios]);

  // DCA total in EUR for patrimonio calculation
  const dcaTotal = dcaTotalUsd * usdtEurRate;


  // Calculate crypto account values from account_holdings (Enhanced with Live Prices) - MOVED UP
  const cryptoAccountValues = useMemo(() => {
    const values: Record<string, number> = {};

    for (const holding of allAccountHoldings) {
      const symbol = holding.symbol.toUpperCase();
      // Priority: Current Price from DB > 0
      const priceData = currentPrices[symbol];
      const price = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
      const value = Number(holding.quantity) * price;

      if (!values[holding.bank_account_id]) {
        values[holding.bank_account_id] = 0;
      }
      values[holding.bank_account_id] += value;
    }

    return values;
  }, [allAccountHoldings, currentPrices]);

  // Calculate total patrimonio in EUR
  const totalPatrimonio = useMemo(() => {
    let total = 0;
    for (const acc of displayedAccounts) {
      const balance = accountBalances[acc.id] || 0;
      const cryptoValue = cryptoAccountValues[acc.id] || 0;

      if (acc.currency === "EUR") {
        total += balance;
      } else if (acc.currency === "USD" || acc.currency === "USDT") {
        // For crypto accounts, use holdings value instead of balance
        total += cryptoValue * usdtEurRate;
      }
    }

    // Add DCA
    total += dcaTotal;
    return total;
  }, [displayedAccounts, accountBalances, cryptoAccountValues, dcaTotal, usdtEurRate]);





  const cryptoSymbols = useMemo(() => Object.keys(allCryptoHoldings), [allCryptoHoldings]);
  const { data: marketData } = useCryptoMarketData(cryptoSymbols);











  // Format account currency based on account's currency
  const formatAccountCurrency = (amount: number, currency: string) => {
    return formatCurrency(amount, currency);
  };

  // Get display value for account (holdings value for crypto, balance for others)
  const getAccountDisplayValue = (acc: typeof bankAccounts[0]) => {
    if (acc.currency === "USDT" || acc.currency === "USD") {
      const holdingsValue = cryptoAccountValues[acc.id] || 0;
      return formatAccountCurrency(holdingsValue, acc.currency);
    }
    return formatAccountCurrency(accountBalances[acc.id] || 0, acc.currency);
  };

  const formatEur = (amount: number) => formatCurrency(amount, "EUR");

  const handleRefreshPrices = async () => {
    console.log("[HomePage] 🔍 Checking symbols list:", allSymbols);

    if (allSymbols.length === 0) {
      console.log("[HomePage] ⚠️ No symbols to refresh, skipping.");
      return;
    }

    setIsRefreshing(true);
    console.log("[HomePage] 🚀 Starting refresh for symbols:", allSymbols);

    try {
      await Promise.all([
        refreshPrices(),
        fxRates.fetchRate(),
      ]);

      console.log("[HomePage] 🔄 Invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });

      console.log("[HomePage] ✅ Refresh completed successfully");
      toast({ title: "Precios actualizados" });
    } catch (error) {
      console.error("[HomePage] ❌ Refresh failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "Error al actualizar precios",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Sesión cerrada" });
  };

  const userName = user.email?.split("@")[0] || "Usuario";
  const greeting = getGreeting();

  // Balance = savings + investments + crypto
  const totalBalance = (metrics?.savingsBalance ?? 0) + (metrics?.investmentsBalance ?? 0) + (metrics?.cryptoBalance ?? 0);

  // Temporary simple calculation for balance card
  const liveTotalBalance = totalPatrimonio > 0 ? totalPatrimonio : totalBalance;
  const liveCryptoBalance = (metrics?.cryptoBalance ?? 0);

  return (
    <MobileLayout>
      {/* Header */}
      <SafeAreaHeader>
        <header className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">{greeting}</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold capitalize">{userName}</p>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">v{APP_VERSION}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
      </SafeAreaHeader>

      {/* Balance Card */}
      <div className="px-4 py-4">
        <BalanceCard
          balance={liveTotalBalance}
          subtitle="Total patrimonio"
          savingsTotal={metrics?.savingsBalance ?? 0}
          investmentsTotal={metrics?.investmentsBalance ?? 0}
          cryptoTotal={liveCryptoBalance}
        />
      </div>

      {/* Patrimony Evolution Section */}
      <div className="px-4 pb-4">
        <div className="rounded-3xl glass-panel p-5">
          <Suspense fallback={<div className="h-72 rounded-2xl bg-muted/40 animate-pulse" />}>
            <PatrimonyEvolution userId={user.id} />
          </Suspense>
        </div>
      </div>

      {/* Savings Accounts Panel */}
      <div className="px-4 py-2">
        <div className="rounded-3xl glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Desglose Patrimonio</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshPrices}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          <div className="space-y-3">
            <SortableAccountList
              accounts={displayedAccounts}
              getDisplayValue={getAccountDisplayValue}
              onAccountClick={(acc) => setSelectedAccount(acc as typeof bankAccounts[0])}
              onReorder={updateSortOrder}
            />

            {/* DCA Total - Show if has value */}
            {(dcaTotalUsd > 0) && (
              <div className="flex items-center justify-between p-2 rounded-2xl bg-chart-income/10 border border-chart-income/20">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-chart-income animate-pulse" />
                  <span className="text-sm font-medium">DCA</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold block">{formatCurrency(dcaTotal, "EUR")}</span>
                  <span className="text-xs text-muted-foreground">{formatCurrency(dcaTotalUsd, "USDT")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AccountEditDialog
        open={!!selectedAccount}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
        account={selectedAccount}
        userId={user.id}
        currentBalance={selectedAccount ? accountBalances[selectedAccount.id] : undefined}
      />
    </MobileLayout >
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días!";
  if (hour < 18) return "Buenas tardes!";
  return "Buenas noches!";
}
