import { useState, useMemo, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
// import { MobilePageHeader } from "@/components/mobile/MobilePageHeader"; // Removed
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import { useAssetTransactions, type AssetTransaction } from "@/hooks/useAssetTransactions";
import { useDCAPortfolios, type DCAPortfolio } from "@/hooks/useDCAPortfolios";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { DCASummaryCard } from "@/components/dca/DCASummaryCard";
import { DCAEntryList } from "@/components/dca/DCAEntryList";
import { CryptoLogo } from "@/components/dca/CryptoLogo";
import { DCAFormDialog } from "@/components/dca/DCAFormDialog";
import { DCAPortfolioDialog } from "@/components/dca/DCAPortfolioDialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DCAGlobalSummary } from "@/components/dca/DCAGlobalSummary";
import { calculateDCAStats } from "@/lib/dcaUtils";

interface DCAPageProps {
  user: User;
}

export function DCAPage({ user }: DCAPageProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingTx, setEditingTx] = useState<AssetTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePortfolioId, setDeletePortfolioId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

  const portfolios = useDCAPortfolios(user.id);
  const assetTransactions = useAssetTransactions(user.id);
  const bankAccounts = useBankAccounts(user.id);

  // Filter only non-archived bank accounts for the select
  const activeBankAccounts = useMemo(() => {
    return (bankAccounts.data || []).filter(acc => !acc.is_archived);
  }, [bankAccounts.data]);

  // Auto-select first portfolio when data loads
  useEffect(() => {
    if (portfolios.data && portfolios.data.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(portfolios.data[0].id);
    }
  }, [portfolios.data, selectedPortfolioId]);

  // Get selected portfolio
  const selectedPortfolio = useMemo(() => {
    return portfolios.data?.find((p) => p.id === selectedPortfolioId) || null;
  }, [portfolios.data, selectedPortfolioId]);

  // Filter transactions for selected portfolio
  const filteredTransactions = useMemo(() => {
    if (!assetTransactions.data || !selectedPortfolioId) return [];
    return assetTransactions.data.filter(
      (tx) => tx.dca_portfolio_id === selectedPortfolioId
    );
  }, [assetTransactions.data, selectedPortfolioId]);

  // Get ALL symbols for global summary
  const allSymbols = useMemo(() => {
    return portfolios.data?.map(p => p.symbol.toUpperCase()) || [];
  }, [portfolios.data]);

  const { data: currentPrices, refreshPrices } = useCurrentPrices(allSymbols);

  const globalStats = useMemo(() => {
    if (!portfolios.data || !assetTransactions.data || !currentPrices) {
      return { totalInvested: 0, totalCurrentValue: 0, totalPnL: 0, totalPnLPercent: 0 };
    }

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealizedPnL = 0;
    let totalInvestedAllTime = 0;

    portfolios.data.forEach(portfolio => {
      const portfolioTxs = assetTransactions.data!.filter(tx => tx.dca_portfolio_id === portfolio.id);

      const { netQuantity, costBasis, realizedPnL, totalInvestedAllTime: portInvestedAllTime } = calculateDCAStats(portfolioTxs);

      const priceData = currentPrices[portfolio.symbol.toUpperCase()];
      const price = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
      const value = netQuantity * price;

      totalInvested += costBasis;
      totalCurrentValue += value;
      totalRealizedPnL += realizedPnL;
      totalInvestedAllTime += portInvestedAllTime;
    });

    const totalUnrealizedPnL = totalCurrentValue - totalInvested;
    const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
    const totalPnLPercent = totalInvestedAllTime > 0 ? (totalPnL / totalInvestedAllTime) * 100 : 0;

    return { totalInvested, totalCurrentValue, totalPnL, totalPnLPercent };
  }, [portfolios.data, assetTransactions.data, currentPrices]);

  const handleRefreshPrices = async () => {
    if (allSymbols.length === 0) {
      return;
    }
    setIsRefreshing(true);
    try {
      await refreshPrices();
    } catch (error) {
      console.error("Failed to refresh prices", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh on symbols change
  useEffect(() => {
    if (allSymbols.length > 0) {
      handleRefreshPrices();
    }
  }, [allSymbols.join(',')]);


  const handleSubmit = async (data: {
    side: "buy" | "sell";
    quantity: number;
    price_eur: number;
    transaction_date: string;
    notes: string | null;
    bank_account_id: string | null;
  }) => {
    if (!selectedPortfolio) return;

    if (editingTx) {
      await assetTransactions.update({
        id: editingTx.id,
        side: data.side,
        quantity: data.quantity,
        price_eur: data.price_eur,
        transaction_date: data.transaction_date,
        notes: data.notes,
      });
    } else {
      await assetTransactions.create({
        symbol: selectedPortfolio.symbol,
        asset_type: selectedPortfolio.asset_type as "crypto" | "commodity" | "other",
        side: data.side,
        quantity: data.quantity,
        price_eur: data.price_eur,
        transaction_date: data.transaction_date,
        notes: data.notes,
        value_date: null,
        category_id: null,
        dca_portfolio_id: selectedPortfolioId,
      });
    }
    setEditingTx(null);
  };

  const handleEdit = (tx: AssetTransaction) => {
    setEditingTx(tx);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await assetTransactions.delete(deleteId);
      setDeleteId(null);
    }
  };

  const handleDeletePortfolio = async () => {
    if (deletePortfolioId) {
      await portfolios.delete(deletePortfolioId);
      setDeletePortfolioId(null);
      // If deleted portfolio was selected, clear selection
      if (selectedPortfolioId === deletePortfolioId) {
        setSelectedPortfolioId(null);
      }
      toast({ title: "DCA eliminado" });
    }
  };

  // No portfolios state
  if (portfolios.data && portfolios.data.length === 0) {
    return (
      <MobileLayout>
        <PageHeader title="DCA" />
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Settings2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No tienes DCAs</h2>
          <p className="text-muted-foreground mb-6">
            Crea tu primer portafolio DCA para empezar a trackear tus inversiones
          </p>
          <Button onClick={() => setShowPortfolioForm(true)}>
            Configurar DCAs
          </Button>

          <DCAPortfolioDialog
            userId={user.id}
            open={showPortfolioForm}
            onOpenChange={setShowPortfolioForm}
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <MobileLayout className="bg-[#F6F7F9] dark:bg-background">
        <div className="container mx-auto p-4 space-y-4 pb-20 fade-in safe-area-pt min-h-screen">
          <PageHeader
            title="DCA"
            description="Estrategia de inversión recurrente"
            actions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPortfolioForm(true)}
                  className="h-8 text-xs"
                >
                  Nuevo DCA
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setEditingTx(null);
                    setShowForm(true);
                  }}
                  disabled={!selectedPortfolioId}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Entrada
                </Button>
              </div>
            }
          />

          <DCAGlobalSummary
            totalInvested={globalStats.totalInvested}
            totalCurrentValue={globalStats.totalCurrentValue}
            totalPnL={globalStats.totalPnL}
            totalPnLPercent={globalStats.totalPnLPercent}
          />

          {/* Portfolio selector */}
          <div className="py-1 flex justify-center w-full">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-full px-2">
              {portfolios.data?.map((portfolio) => (
                <Button
                  key={portfolio.id}
                  variant={selectedPortfolioId === portfolio.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPortfolioId(portfolio.id)}
                  className="flex-shrink-0 rounded-full flex items-center gap-2 px-3"
                >
                  <CryptoLogo symbol={portfolio.symbol} size={20} />
                  {selectedPortfolioId === portfolio.id && (
                    <span>{portfolio.symbol}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pb-24">
            {selectedPortfolioId && (
              <>
                <DCASummaryCard
                  transactions={filteredTransactions}
                  currentPrices={currentPrices || {}}
                  symbol={selectedPortfolio?.symbol || ""}
                  onRefresh={handleRefreshPrices}
                  isRefreshing={isRefreshing}
                  onDelete={() => setDeletePortfolioId(selectedPortfolioId)}
                />

                <DCAEntryList
                  transactions={filteredTransactions}
                  bankAccounts={bankAccounts.data || []}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteId(id)}
                />
              </>
            )}
          </div>

          {/* Floating action button removed */}
        </div>
      </MobileLayout>


      {/* Transaction Form (Entry) */}
      <DCAFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        symbol={selectedPortfolio?.symbol || ""}
        editingTx={editingTx}
        bankAccounts={activeBankAccounts}
        currentPrices={currentPrices || {}}
        onSubmit={handleSubmit}
        isSubmitting={assetTransactions.isCreating || assetTransactions.isUpdating}
      />

      {/* Portfolio Form (New DCA) */}
      <DCAPortfolioDialog
        userId={user.id}
        open={showPortfolioForm}
        onOpenChange={setShowPortfolioForm}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePortfolioId} onOpenChange={() => setDeletePortfolioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar DCA?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el portafolio DCA y todas sus transacciones asociadas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePortfolio}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
