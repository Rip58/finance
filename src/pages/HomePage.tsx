import { useState, useMemo, useEffect } from "react";
import { LogOut, RefreshCw, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MobileLayout,
  SafeAreaHeader,
  BalanceCard,
} from "@/components/mobile";
import { AccountEditDialog } from "@/components/mobile/AccountEditDialog";
import { SortableAccountList } from "@/components/mobile/SortableAccountList";
import { IntervalSelector, type Interval } from "@/components/IntervalSelector";
import { EvolutionChart } from "@/components/EvolutionChart";
import { useChartData } from "@/hooks/useChartData";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransfers } from "@/hooks/useTransfers";
import { useAssetTransactions } from "@/hooks/useAssetTransactions";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { useFxRates } from "@/hooks/useFxRates";
import { useAccountHoldings } from "@/hooks/useAccountHoldings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface HomePageProps {
  user: User;
}

export function HomePage({ user }: HomePageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [interval, setInterval] = useState<Interval>("1M");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<typeof bankAccounts[0] | null>(null);

  const { data: metrics } = useDashboardMetrics(user.id);
  const { data: chartData } = useChartData(interval, user.id);
  const { data: transactions = [] } = useTransactions(user.id);
  const { data: bankAccounts = [], updateSortOrder } = useBankAccounts(user.id);
  const { data: categories = [], create: createCategory } = useCategories(user.id, undefined);
  const { data: transfers = [] } = useTransfers(user.id);
  const { data: assetTransactions = [] } = useAssetTransactions(user.id);
  const { data: allAccountHoldings = [] } = useAccountHoldings(user.id);
  const fxRates = useFxRates();

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

  // Calculate account balances in their original currency
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    // Initialize with initial_balance
    for (const acc of bankAccounts) {
      balances[acc.id] = Number(acc.initial_balance) || 0;
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

  // Calculate crypto account values from account_holdings
  const cryptoAccountValues = useMemo(() => {
    const values: Record<string, number> = {};

    for (const holding of allAccountHoldings) {
      const price = currentPrices[holding.symbol.toUpperCase()] || 0;
      const value = Number(holding.quantity) * price;

      if (!values[holding.bank_account_id]) {
        values[holding.bank_account_id] = 0;
      }
      values[holding.bank_account_id] += value;
    }

    return values;
  }, [allAccountHoldings, currentPrices]);

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

  // Calculate DCA total in USD (not converted to EUR)
  const dcaTotalUsd = useMemo(() => {
    const holdings: Record<string, number> = {};
    for (const tx of assetTransactions) {
      if (!holdings[tx.symbol]) holdings[tx.symbol] = 0;
      if (tx.side === "buy") holdings[tx.symbol] += Number(tx.quantity);
      else holdings[tx.symbol] -= Number(tx.quantity);
    }

    let totalUsd = 0;
    for (const [symbol, qty] of Object.entries(holdings)) {
      const price = currentPrices[symbol.toUpperCase()] || 0;
      totalUsd += qty * price;
    }

    return totalUsd;
  }, [assetTransactions, currentPrices]);

  // DCA total in EUR for patrimonio calculation
  const dcaTotal = dcaTotalUsd * usdtEurRate;

  // Calculate account holdings total in EUR
  const accountHoldingsTotal = useMemo(() => {
    let totalUsd = 0;
    for (const holding of allAccountHoldings) {
      const price = currentPrices[holding.symbol.toUpperCase()] || 0;
      totalUsd += Number(holding.quantity) * price;
    }
    return totalUsd * usdtEurRate;
  }, [allAccountHoldings, currentPrices, usdtEurRate]);

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

    // DCA logic: If DCA assets are NOT in displayedAccounts (they aren't, they are separate transactions),
    // we should add them. However, if 'Cryptocoin' category covers them, we might double count if we aren't careful.
    // But DCA transactions are `asset_transactions`, separate from `bank_accounts`.
    // So we add them. Except if the user intends DCA to be 'part of' a crypto account.
    // Based on `useDashboardMetrics`, we treat `asset_transactions` (DCA) as purely crypto assets.
    // So we add them here.
    total += dcaTotal;
    return total;
  }, [displayedAccounts, accountBalances, cryptoAccountValues, dcaTotal, usdtEurRate]);

  // Calculate percentage change and absolute variation from chart data
  const { percentageChange, absoluteChange } = useMemo(() => {
    if (!chartData || chartData.length < 2) return { percentageChange: null, absoluteChange: null };

    const firstValue = chartData[0].balanceTotal;
    const lastValue = chartData[chartData.length - 1].balanceTotal;

    const absChange = lastValue - firstValue;

    if (firstValue === 0) return { percentageChange: null, absoluteChange: absChange };

    const pctChange = ((lastValue - firstValue) / firstValue) * 100;
    return { percentageChange: pctChange, absoluteChange: absChange };
  }, [chartData]);

  // Format account currency based on account's currency
  const formatAccountCurrency = (amount: number, currency: string) => {
    return formatCurrency(amount, currency);
  };

  // Format USD with $ symbol
  const formatUsd = (amount: number) => formatCurrency(amount, "USD");

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
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshPrices(),
        fxRates.fetchRate(),
      ]);
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      toast({ title: "Precios actualizados" });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los precios",
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
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">v2.4</span>
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
          balance={totalBalance}
          subtitle="Total patrimonio"
          savingsTotal={metrics?.savingsBalance ?? 0}
          investmentsTotal={metrics?.investmentsBalance ?? 0}
          cryptoTotal={metrics?.cryptoBalance ?? 0}
        />
      </div>


      {/* Chart Section */}
      <div className="px-4 py-4">
        <div className="rounded-3xl glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Evolución Balance</p>
              <div className="flex items-center gap-2 flex-wrap">
                {absoluteChange !== null && (
                  <p className={cn(
                    "text-xl font-bold",
                    absoluteChange >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {absoluteChange >= 0 ? "+" : ""}{formatEur(absoluteChange)}
                  </p>
                )}
                {percentageChange !== null && (
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    percentageChange >= 0
                      ? "text-green-500 bg-green-500/10"
                      : "text-red-500 bg-red-500/10"
                  )}>
                    {percentageChange >= 0 ? "+" : ""}{percentageChange.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <IntervalSelector value={interval} onChange={setInterval} />
          </div>
          <div className="h-56 overflow-hidden">
            <EvolutionChart interval={interval} userId={user.id} />
          </div>
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

            {/* DCA Entry */}
            <div className="flex items-center justify-between p-2 -mx-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">DCA (Total)</span>
              </div>
              <span className="font-medium text-sm text-primary">
                {formatUsd(dcaTotalUsd)}
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Account Edit Dialog */}
      <AccountEditDialog
        open={!!selectedAccount}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
        account={selectedAccount}
        userId={user.id}
        currentBalance={selectedAccount ? accountBalances[selectedAccount.id] : undefined}
      />
    </MobileLayout>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días!";
  if (hour < 18) return "Buenas tardes!";
  return "Buenas noches!";
}
