import { useState, useMemo, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
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

  // Get symbol from selected portfolio
  const symbols = useMemo(() => {
    if (!selectedPortfolio) return [];
    return [selectedPortfolio.symbol.toUpperCase()];
  }, [selectedPortfolio]);

  const { data: currentPrices, refreshPrices } = useCurrentPrices(symbols);

  const handleRefreshPrices = async () => {
    if (symbols.length === 0) {
      toast({ title: "No hay activos", description: "Selecciona un DCA primero" });
      return;
    }
    setIsRefreshing(true);
    try {
      await refreshPrices();
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

  const handleSubmit = async (data: {
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
        ...data,
      });
    } else {
      await assetTransactions.create({
        symbol: selectedPortfolio.symbol,
        asset_type: selectedPortfolio.asset_type as "crypto" | "commodity" | "other",
        side: "buy",
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

  // No portfolios state
  if (portfolios.data && portfolios.data.length === 0) {
    return (
      <MobileLayout>
        <MobilePageHeader title="DCA" />
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
    <MobileLayout>
      <MobilePageHeader
        title="DCA"
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => setShowPortfolioForm(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {/* Portfolio selector */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {portfolios.data?.map((portfolio) => (
            <Button
              key={portfolio.id}
              variant={selectedPortfolioId === portfolio.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPortfolioId(portfolio.id)}
              className="flex-shrink-0 rounded-full flex items-center gap-2 px-3"
            >
              <CryptoLogo symbol={portfolio.symbol} size={20} />
              <span>{portfolio.symbol}</span>
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
            />

            <DCAEntryList
              transactions={filteredTransactions}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteId(id)}
            />
          </>
        )}
      </div>

      {/* Floating action button */}
      {selectedPortfolioId && (
        <Button
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
          onClick={() => {
            setEditingTx(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Transaction Form (Entry) */}
      <DCAFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        symbol={selectedPortfolio?.symbol || ""}
        editingTx={editingTx}
        bankAccounts={activeBankAccounts}
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
    </MobileLayout>
  );
}
