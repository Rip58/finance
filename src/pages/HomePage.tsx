import { useState, useMemo } from "react";
import { LogOut, ChevronDown, ChevronUp, RefreshCw, Building2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MobileLayout,
  BalanceCard,
  QuickActionsGrid,
  TransactionList,
  type QuickActionType,
  type TransactionItem,
} from "@/components/mobile";
import { AccountEditDialog } from "@/components/mobile/AccountEditDialog";
import { IntervalSelector, type Interval } from "@/components/IntervalSelector";
import { EvolutionChart } from "@/components/EvolutionChart";
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
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface HomePageProps {
  user: User;
}

export function HomePage({ user }: HomePageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [interval, setInterval] = useState<Interval>("1M");
  const [showTransactions, setShowTransactions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<typeof bankAccounts[0] | null>(null);

  const { data: metrics } = useDashboardMetrics(user.id);
  const { data: transactions = [] } = useTransactions(user.id);
  const { data: bankAccounts = [] } = useBankAccounts(user.id);
  const { data: categories = [] } = useCategories(user.id, undefined);
  const { data: transfers = [] } = useTransfers(user.id);
  const { data: assetTransactions = [] } = useAssetTransactions(user.id);
  const { data: allAccountHoldings = [] } = useAccountHoldings(user.id);
  const fxRates = useFxRates();

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

  // Filter savings/investment accounts
  const savingsAccounts = useMemo(() => {
    const savingsCategoryIds = categories
      .filter(c => 
        c.name.toLowerCase().includes("ahorro") || 
        c.name.toLowerCase().includes("inversión") ||
        c.name.toLowerCase().includes("inversion")
      )
      .map(c => c.id);
    
    return bankAccounts.filter(
      acc => !acc.is_archived && acc.category_id && savingsCategoryIds.includes(acc.category_id)
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
    for (const acc of savingsAccounts) {
      const balance = accountBalances[acc.id] || 0;
      const cryptoValue = cryptoAccountValues[acc.id] || 0;
      
      if (acc.currency === "EUR") {
        total += balance;
      } else if (acc.currency === "USD" || acc.currency === "USDT") {
        // For crypto accounts, use holdings value instead of balance
        total += cryptoValue * usdtEurRate;
      }
    }
    
    total += dcaTotal;
    return total;
  }, [savingsAccounts, accountBalances, cryptoAccountValues, dcaTotal, usdtEurRate]);

  // Format currency based on account's currency
  const formatAccountCurrency = (amount: number, currency: string) => {
    if (currency === "USDT" || currency === "USD") {
      return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Format USD with $ symbol
  const formatUsd = (amount: number) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get display value for account (holdings value for crypto, balance for others)
  const getAccountDisplayValue = (acc: typeof bankAccounts[0]) => {
    if (acc.currency === "USDT" || acc.currency === "USD") {
      const holdingsValue = cryptoAccountValues[acc.id] || 0;
      return formatAccountCurrency(holdingsValue, acc.currency);
    }
    return formatAccountCurrency(accountBalances[acc.id] || 0, acc.currency);
  };

  const formatEur = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

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

  const handleEditTransaction = (tx: TransactionItem) => {
    if (tx.type === "income") {
      navigate(`/add-income?edit=${tx.id}`);
    } else if (tx.type === "expense") {
      navigate(`/add-expense?edit=${tx.id}`);
    } else if (tx.type === "transfer") {
      navigate(`/add-transfer?edit=${tx.id}`);
    }
  };

  const recentTransactions: TransactionItem[] = transactions
    .slice(0, 5)
    .map((tx) => ({
      id: tx.id,
      description: tx.description || "",
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type as "income" | "expense",
      date: tx.date,
    }));

  const userName = user.email?.split("@")[0] || "Usuario";
  const greeting = getGreeting();
  
  // Balance = savings + investments
  const totalBalance = (metrics?.savingsBalance ?? 0) + (metrics?.investmentsBalance ?? 0);

  return (
    <MobileLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">{greeting}</p>
            <p className="font-semibold capitalize">{userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="px-4 py-4">
        <BalanceCard
          balance={totalBalance}
          subtitle="Total patrimonio"
          savingsTotal={metrics?.savingsBalance ?? 0}
          investmentsTotal={metrics?.investmentsBalance ?? 0}
        />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2">
        <QuickActionsGrid onAction={handleQuickAction} />
      </div>

      {/* Chart Section */}
      <div className="px-4 py-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Evolución Balance</p>
              <p className="text-xl font-bold">
                {formatEur(metrics?.totalAssets ?? 0)}
              </p>
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
        <div className="rounded-2xl border border-border bg-card p-4">
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
            {savingsAccounts.map(acc => (
              <button 
                key={acc.id} 
                onClick={() => setSelectedAccount(acc)}
                className="flex items-center justify-between w-full hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{acc.name}</span>
                </div>
                <span className="font-medium text-sm">
                  {getAccountDisplayValue(acc)}
                </span>
              </button>
            ))}
            
            {/* DCA Entry */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">DCA (Total)</span>
              </div>
              <span className="font-medium text-sm text-primary">
                {formatUsd(dcaTotalUsd)}
              </span>
            </div>
            
            {/* Separator + Total */}
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Patrimonio</span>
                <span className="text-lg font-bold">
                  {formatEur(totalPatrimonio)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History - Collapsible */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Historial Transacciones</h3>
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            {showTransactions ? "Ocultar" : "Ver todo"}
            {showTransactions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        
        {showTransactions && (
          <TransactionList
            transactions={recentTransactions}
            showSeeAll={false}
            onEdit={handleEditTransaction}
          />
        )}
        
        {!showTransactions && recentTransactions.length > 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {recentTransactions.length} transacciones recientes
          </p>
        )}
      </div>

      {/* Account Edit Dialog */}
      <AccountEditDialog
        open={!!selectedAccount}
        onOpenChange={(open) => !open && setSelectedAccount(null)}
        account={selectedAccount}
        userId={user.id}
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
