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
}

export function AccountEditDialog({
  open,
  onOpenChange,
  account,
  userId,
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
  const { data: cryptoAssets = [] } = useCryptoAssets(userId);
  
  const [newSymbol, setNewSymbol] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const handleAddHolding = async () => {
    if (!newSymbol || !newQuantity || !account) return;
    
    await create({
      bank_account_id: account.id,
      symbol: newSymbol,
      quantity: parseFloat(newQuantity),
    });
    
    // Fetch price for the new symbol from CMC
    try {
      await supabase.functions.invoke("get-asset-prices", {
        body: { symbols: [newSymbol.toUpperCase()] },
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["current-prices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
    } catch (e) {
      console.error("Error fetching price for new holding:", e);
    }
    
    setNewSymbol("");
    setNewQuantity("");
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
              <Select value={newSymbol} onValueChange={setNewSymbol}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Activo" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.symbol}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                  {availableAssets.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No hay activos disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
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
                disabled={!newSymbol || !newQuantity || isCreating}
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
function SavingsAccountDialog({
  open,
  onOpenChange,
  account,
  userId,
}: AccountEditDialogProps) {
  const { update, isUpdating } = useBankAccounts(userId);
  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (account) {
      setBalance(account.initial_balance.toString());
    }
  }, [account]);

  const handleSave = async () => {
    if (!account) return;
    
    await update({
      id: account.id,
      initial_balance: parseFloat(balance) || 0,
    });
    
    onOpenChange(false);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(num);
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
