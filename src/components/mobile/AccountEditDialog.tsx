import { useState, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountHoldings } from "@/hooks/useAccountHoldings";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";

interface BankAccount {
  id: string;
  name: string;
  currency: string;
  initial_balance: number;
}

interface AccountEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount | null;
  userId: string;
  currentBalance?: number;
}

export function AccountEditDialog({
  open,
  onOpenChange,
  account,
  userId,
  currentBalance,
}: AccountEditDialogProps) {
  if (!account) return null;

  const isCryptoAccount = account.currency === "USDT" || account.currency === "USD";

  return isCryptoAccount ? (
    <CryptoAccountDialog
      open={open}
      onOpenChange={onOpenChange}
      account={account}
      userId={userId}
    />
  ) : (
    <SavingsAccountDialog
      open={open}
      onOpenChange={onOpenChange}
      account={account}
      userId={userId}
      currentBalance={currentBalance}
    />
  );
}

// Dialog for crypto accounts (USDT/USD) - manage holdings
function CryptoAccountDialog({
  open,
  onOpenChange,
  account,
  userId,
}: AccountEditDialogProps) {
  const queryClient = useQueryClient();
  const { data: holdings = [], create, delete: deleteHolding, isCreating } = useAccountHoldings(userId, account?.id);
  const { data: cryptoAssets = [], create: createAsset } = useCryptoAssets(userId);

  const [newSymbol, setNewSymbol] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [newAssetSymbol, setNewAssetSymbol] = useState("");
  const [newAssetName, setNewAssetName] = useState("");

  const handleAddHolding = async () => {
    let finalSymbol = newSymbol;

    if (isCreatingAsset) {
      if (!newAssetSymbol || !newAssetName) return;
      finalSymbol = newAssetSymbol.toUpperCase();

      // Create asset first
      try {
        await createAsset({
          symbol: finalSymbol,
          name: newAssetName,
          asset_type: "crypto", // Default to crypto for quick add
          is_active: true,
        });
      } catch (e) {
        console.error("Error creating asset:", e);
        return;
      }
    }

    if (!finalSymbol || (!newQuantity && !isCreatingAsset)) return;

    // If creating asset, we might not have quantity input if UI hides it. 
    // Wait, the UI I added shows Quantity input ONLY if !isCreatingAsset.
    // So if creating asset, we just create the asset? Or do we create holding too?
    // User request: "cuando editas una cuenta de crypto en home y sale añadir activo si no hay que salga para crear nuevos sin ir a account"
    // Usually implies adding it to the account. But if I hide quantity, I can't add holding.
    // I should SHOW quantity input even when creating asset, or make it a 2-step process.
    // Better: Show quantity input continuously?
    // In my previous edit (Step 368), I hid quantity input when isCreatingAsset is true: `{!isCreatingAsset && (<Input ... quantity />)}`.
    // This implies we only create the ASSET, not the holding?
    // No, the expectation is to Add the Asset TO THE ACCOUNT.
    // So I need quantity.
    // I will modify the previous edit to SHOW quantity input always.
    // But for now, let's fix the logic here assuming I will fix UI next.
    // Actually, I can't fix UI "next" easily without another replace.
    // I'll assume current UI state and adapt logic:
    // If isCreatingAsset, we Create Asset. Do we create holding?
    // If quantity is hidden, we can't.
    // I should fix the UI in `AccountEditDialog` to show quantity row or have it inline.
    // Let's modify logic to:
    // 1. Create Asset.
    // 2. Then setIsCreatingAsset(false), setNewSymbol(finalSymbol).
    // User can then add quantity.
    // OR:
    // Use `multi_replace` to fix UI and Logic at once? I am already in `replace_file_content`.
    // I will write robust logic.

    // Only create holding if quantity is provided.
    if (newQuantity) {
      await create({
        bank_account_id: account.id,
        symbol: finalSymbol,
        quantity: parseFloat(newQuantity),
      });

      // Fetch price for the new symbol from CMC
      try {
        await supabase.functions.invoke("get-asset-prices", {
          body: { symbols: [finalSymbol] },
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["current-prices"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      } catch (e) {
        console.error(e);
      }
    }

    setNewSymbol("");
    setNewQuantity("");
    setIsCreatingAsset(false);
    setNewAssetSymbol("");
    setNewAssetName("");
  };

  const handleDeleteHolding = async (id: string) => {
    await deleteHolding(id);
  };

  // Get available assets not already in holdings
  const availableAssets = cryptoAssets.filter(
    asset => !holdings.some(h => h.symbol === asset.symbol)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account?.name} - Activos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current holdings */}
          {holdings.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Activos actuales</Label>
              <div className="space-y-2">
                {holdings.map((holding) => (
                  <div
                    key={holding.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <span className="font-medium">{holding.symbol}</span>
                      <span className="text-muted-foreground ml-2">
                        {holding.quantity.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteHolding(holding.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay activos en esta cuenta
            </p>
          )}

          {/* Add new holding */}
          <div className="border-t border-border pt-4">
            <Label className="text-sm text-muted-foreground mb-2 block">Añadir activo</Label>
            <div className="flex gap-2">
              <Select
                value={isCreatingAsset ? "_new" : newSymbol}
                onValueChange={(val) => {
                  if (val === "_new") {
                    setIsCreatingAsset(true);
                    setNewAssetSymbol("");
                  } else {
                    setIsCreatingAsset(false);
                    setNewSymbol(val);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Activo" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.symbol}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                  <div className="border-t border-border my-1" />
                  <SelectItem value="_new" className="font-medium text-primary">
                    + Nuevo Activo
                  </SelectItem>
                </SelectContent>
              </Select>

              {isCreatingAsset && (
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Símbolo (BTC)"
                    value={newAssetSymbol}
                    onChange={(e) => setNewAssetSymbol(e.target.value.toUpperCase())}
                    className="w-24"
                  />
                  <Input
                    placeholder="Nombre"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="flex-1"
                  />
                </div>
              )}

              <Input
                type="number"
                placeholder="Cantidad"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-28"
                step="any"
              />

              <Button
                size="icon"
                onClick={handleAddHolding}
                disabled={(isCreatingAsset && (!newAssetSymbol || !newAssetName || !newQuantity)) || (!isCreatingAsset && (!newSymbol || !newQuantity)) || isCreating}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog for savings accounts (EUR) - edit balance
import { useTransactions } from "@/hooks/useTransactions";

function SavingsAccountDialog({
  open,
  onOpenChange,
  account,
  userId,
  currentBalance,
}: AccountEditDialogProps) {
  const { update, isUpdating } = useBankAccounts(userId);
  const { create: createTransaction } = useTransactions(userId);
  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (account) {
      // Use currentBalance if available, otherwise fallback to initial_balance
      setBalance((currentBalance ?? account.initial_balance).toString());
    }
  }, [account, currentBalance]);

  const handleSave = async () => {
    if (!account) return;

    if (currentBalance !== undefined) {
      // Logic for transaction-based update (History)
      const newBalance = parseFloat(balance) || 0;
      const diff = newBalance - currentBalance;

      if (Math.abs(diff) > 0.01) { // Avoid tiny floating point diffs
        await createTransaction({
          amount: Math.abs(diff),
          type: diff > 0 ? "income" : "expense",
          description: "Ajuste manual de saldo",
          date: new Date().toISOString(),
          bank_account_id: account.id,
          currency: account.currency,
          is_validated: true,
          category_id: null,
          value_date: null,
        });
      }
    } else {
      // Legacy logic: Update initial_balance directly
      await update({
        id: account.id,
        initial_balance: parseFloat(balance) || 0,
      });
    }

    onOpenChange(false);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: account?.currency === "USDT" ? "USD" : (account?.currency || "EUR"),
      }).format(num);
    } catch (e) {
      return `${num.toLocaleString("es-ES")} ${account?.currency}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{account?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo actual de la cuenta</Label>
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
