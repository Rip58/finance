import { useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAssetTransactions, type AssetTransaction } from "@/hooks/useAssetTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { DCASummaryCard } from "@/components/dca/DCASummaryCard";
import { DCAEntryList } from "@/components/dca/DCAEntryList";
import { DCAFormDialog } from "@/components/dca/DCAFormDialog";
import { useToast } from "@/hooks/use-toast";
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
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<AssetTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const assetTransactions = useAssetTransactions(user.id);
  const accounts = useBankAccounts(user.id);

  // Get unique symbols from transactions
  const symbols = useMemo(() => {
    if (!assetTransactions.data) return [];
    return [...new Set(assetTransactions.data.map((tx) => tx.symbol.toUpperCase()))];
  }, [assetTransactions.data]);

  const { data: currentPrices, refreshPrices } = useCurrentPrices(symbols);

  const handleRefreshPrices = async () => {
    if (symbols.length === 0) {
      toast({ title: "No hay activos", description: "Añade primero alguna compra" });
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
    symbol: string;
    quantity: number;
    price_eur: number;
    transaction_date: string;
    notes: string | null;
    category_id: string | null;
  }) => {
    if (editingTx) {
      await assetTransactions.update({
        id: editingTx.id,
        ...data,
      });
    } else {
      await assetTransactions.create({
        ...data,
        asset_type: "crypto",
        side: "buy",
        value_date: null,
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

  return (
    <MobileLayout>
      <MobilePageHeader title="DCA" />

      <div className="space-y-4 pb-24">
        <DCASummaryCard
          transactions={assetTransactions.data}
          currentPrices={currentPrices || {}}
          onRefresh={handleRefreshPrices}
          isRefreshing={isRefreshing}
        />

        <DCAEntryList
          transactions={assetTransactions.data}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      </div>

      {/* Floating action button */}
      <Button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={() => {
          setEditingTx(null);
          setShowForm(true);
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <DCAFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        accounts={accounts.data}
        editingTx={editingTx}
        onSubmit={handleSubmit}
        isSubmitting={assetTransactions.isCreating || assetTransactions.isUpdating}
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
