import { useState, useEffect } from "react";
import { Trash2, Plus, Pencil, Check, X, AlertTriangle } from "lucide-react";
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
  const {
    data: holdings = [],
    create,
    update,
    delete: deleteHolding,
    isCreating,
    isUpdating: isUpdatingHolding
  } = useAccountHoldings(userId, account?.id);
  const { data: cryptoAssets = [], create: createAsset } = useCryptoAssets(userId);
  const { delete: deleteAccount, isDeleting: isDeletingAccount } = useBankAccounts(userId);

  const [newSymbol, setNewSymbol] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [newAssetSymbol, setNewAssetSymbol] = useState("");
  const [newAssetName, setNewAssetName] = useState("");

  // Edit state
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  const handleAddHolding = async () => {
    let finalSymbol = newSymbol;

    if (isCreatingAsset) {
      if (!newAssetSymbol || !newAssetName) return;
      finalSymbol = newAssetSymbol.toUpperCase();

      try {
        await createAsset({
          symbol: finalSymbol,
          name: newAssetName,
          asset_type: "crypto",
          is_active: true,
        });
      } catch (e) {
        console.error("Error creating asset:", e);
        return;
      }
    }

    if (!finalSymbol || (!newQuantity && !isCreatingAsset)) return;

    if (newQuantity) {
      await create({
        bank_account_id: account!.id,
        symbol: finalSymbol,
        quantity: parseFloat(newQuantity),
      });

      try {
        await supabase.functions.invoke("get-asset-prices", {
          body: { symbols: [finalSymbol] },
        });
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

  const handleUpdateHolding = async (id: string) => {
    if (!editQuantity) return;

    await update({
      id,
      quantity: parseFloat(editQuantity),
    });

    queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["chart-data"] });

    setEditingHoldingId(null);
    setEditQuantity("");
  };

  const handleDeleteHolding = async (id: string) => {
    await deleteHolding(id);
    queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["chart-data"] });
  };

  const handleDeleteAccount = async () => {
    if (holdings.length > 0) {
      const confirmDelete = window.confirm(
        "⚠️ ATENCIÓN: Esta cuenta tiene activos asociados.\n\nSi la eliminas, se perderán todos los datos de los activos y su historial asociado.\n\n¿Estás seguro de que quieres continuar?"
      );
      if (!confirmDelete) return;
    } else {
      if (!window.confirm("¿Estás seguro de que quieres eliminar esta cuenta?")) return;
    }

    await deleteAccount(account!.id);
    onOpenChange(false);
  };

  const availableAssets = cryptoAssets.filter(
    asset => !holdings.some(h => h.symbol === asset.symbol)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>{account?.name} - Activos</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Eliminar Cuenta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
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
                    <div className="flex-1">
                      <span className="font-medium">{holding.symbol}</span>
                      {editingHoldingId === holding.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="h-7 w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            autoFocus
                            step="any"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground ml-2">
                          {holding.quantity.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {editingHoldingId === holding.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => handleUpdateHolding(holding.id)}
                            disabled={isUpdatingHolding}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => {
                              setEditingHoldingId(null);
                              setEditQuantity("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingHoldingId(holding.id);
                              setEditQuantity(holding.quantity.toString());
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteHolding(holding.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
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
                    placeholder="Símbolo"
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
                className="w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
  const { update, delete: deleteAccount, isUpdating, isDeleting } = useBankAccounts(userId);
  const { create: createTransaction } = useTransactions(userId);
  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (account) {
      setBalance((currentBalance ?? account.initial_balance).toString());
    }
  }, [account, currentBalance]);

  const handleSave = async () => {
    if (!account) return;

    if (currentBalance !== undefined) {
      const newBalance = parseFloat(balance) || 0;
      const diff = newBalance - currentBalance;

      try {
        if (Math.abs(diff) > 0.01) {
          await createTransaction({
            amount: Math.abs(diff),
            type: diff > 0 ? "income" : "expense",
            description: "Ajuste manual de saldo",
            date: new Date().toISOString(),
            bank_account_id: account.id,
            currency: account.currency,
            category_id: null,
            value_date: null,
          });
        }
      } catch (error) {
        console.error("Error creating adjustment transaction:", error);
      }
    } else {
      try {
        await update({
          id: account.id,
          initial_balance: parseFloat(balance) || 0,
        });
      } catch (error) {
        console.error("Error updating initial balance:", error);
      }
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta cuenta y sus movimientos asociados?")) {
      return;
    }
    await deleteAccount(account!.id);
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
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>{account?.name}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Eliminar Cuenta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo actual de la cuenta</Label>
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => {
                let val = e.target.value;
                if (val.length > 1 && val.startsWith("0") && val[1] !== ".") {
                  val = val.substring(1);
                }
                setBalance(val);
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              step="0.01"
              className="text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <p className="text-sm text-muted-foreground">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
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
