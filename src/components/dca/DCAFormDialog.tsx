import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";
import { formatCurrency } from "@/lib/utils";
import { Zap } from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
}

interface DCAFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  editingTx?: AssetTransaction | null;
  bankAccounts?: BankAccount[];
  currentPrices?: Record<string, number>;
  onSubmit: (data: {
    side: "buy" | "sell";
    quantity: number;
    price_eur: number;
    transaction_date: string;
    notes: string | null;
    bank_account_id: string | null;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  isSubmitting?: boolean;
}

export function DCAFormDialog({
  open,
  onOpenChange,
  symbol,
  editingTx,
  bankAccounts = [],
  currentPrices = {},
  onSubmit,
  onDelete,
  isSubmitting,
}: DCAFormDialogProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [formData, setFormData] = useState({
    quantity: "",
    price_eur: "",
    totalOutput: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
    bank_account_id: "",
  });

  useEffect(() => {
    if (editingTx) {
      setSide(editingTx.side);
      const qty = Number(editingTx.quantity);
      const price = Number(editingTx.price_eur);
      const total = qty * price;
      setFormData({
        quantity: String(qty),
        price_eur: String(price),
        totalOutput: String(total),
        transaction_date: editingTx.transaction_date.split("T")[0],
        notes: editingTx.notes || "",
        bank_account_id: (editingTx as any).bank_account_id || "",
      });
    } else {
      setSide("buy");
      setFormData({
        quantity: "",
        price_eur: "",
        totalOutput: "",
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
        bank_account_id: "",
      });
    }
  }, [editingTx, open]);

  const formatVal = (num: number) => {
    // Avoid scientific notation and long decimals
    return Number(num.toFixed(8)).toString();
  };

  const handleQuantityChange = (val: string) => {
    const qty = parseFloat(val);
    const price = parseFloat(formData.price_eur);
    const total = parseFloat(formData.totalOutput);

    if (!isNaN(qty) && qty >= 0) {
      if (!isNaN(price) && price > 0) {
        setFormData(prev => ({ ...prev, quantity: val, totalOutput: formatVal(qty * price) }));
      } else if (!isNaN(total) && total > 0) {
        setFormData(prev => ({ ...prev, quantity: val, price_eur: formatVal(total / qty) }));
      } else {
        setFormData(prev => ({ ...prev, quantity: val }));
      }
    } else {
      setFormData(prev => ({ ...prev, quantity: val }));
    }
  };

  const handlePriceChange = (val: string) => {
    const price = parseFloat(val);
    const qty = parseFloat(formData.quantity);
    const total = parseFloat(formData.totalOutput);

    if (!isNaN(price) && price > 0) {
      if (!isNaN(qty) && qty > 0) {
        setFormData(prev => ({ ...prev, price_eur: val, totalOutput: formatVal(qty * price) }));
      } else if (!isNaN(total) && total > 0) {
        setFormData(prev => ({ ...prev, price_eur: val, quantity: formatVal(total / price) }));
      } else {
        setFormData(prev => ({ ...prev, price_eur: val }));
      }
    } else {
      setFormData(prev => ({ ...prev, price_eur: val }));
    }
  };

  const handleTotalChange = (val: string) => {
    const total = parseFloat(val);
    const price = parseFloat(formData.price_eur);
    const qty = parseFloat(formData.quantity);

    if (!isNaN(total) && total >= 0) {
      if (!isNaN(price) && price > 0) {
        setFormData(prev => ({ ...prev, totalOutput: val, quantity: formatVal(total / price) }));
      } else if (!isNaN(qty) && qty > 0) {
        setFormData(prev => ({ ...prev, totalOutput: val, price_eur: formatVal(total / qty) }));
      } else {
        setFormData(prev => ({ ...prev, totalOutput: val }));
      }
    } else {
      setFormData(prev => ({ ...prev, totalOutput: val }));
    }
  };

  const handleFetchPrice = () => {
    const upperSymbol = symbol.toUpperCase();
    const price = currentPrices[upperSymbol];
    if (price) {
      handlePriceChange(String(price));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      side,
      quantity: parseFloat(formData.quantity),
      price_eur: parseFloat(formData.price_eur),
      transaction_date: formData.transaction_date,
      notes: formData.notes || null,
      bank_account_id: formData.bank_account_id || null,
    });
    onOpenChange(false);
  };

  const isSell = side === "sell";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingTx
              ? `Editar ${isSell ? "venta" : "compra"}`
              : `${isSell ? "Nueva venta" : "Nueva compra"} ${symbol}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy / Sell toggle */}
          <div className="flex rounded-xl bg-muted p-1">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isSell
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setSide("buy")}
            >
              Compra
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isSell
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setSide("sell")}
            >
              Venta
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_date">Fecha</Label>
            <Input
              id="transaction_date"
              type="date"
              value={formData.transaction_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, transaction_date: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad ({symbol})</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="0.001"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_eur">Precio ($)</Label>
              <div className="flex gap-1.5">
                <Input
                  id="price_eur"
                  type="number"
                  step="0.01"
                  placeholder="85000"
                  value={formData.price_eur}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleFetchPrice}
                  title="Precio actual"
                  className="shrink-0"
                >
                  <Zap className="h-4 w-4 text-yellow-500" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border ${isSell
              ? "bg-destructive/10 border-destructive/20 text-destructive focus-within:ring-1 focus-within:ring-destructive/50"
              : "bg-primary/10 border-primary/20 text-primary focus-within:ring-1 focus-within:ring-primary/50"
              } transition-all`}
          >
            <Label htmlFor="totalOutput" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Total
            </Label>
            <div className="flex items-center">
              <span className="text-2xl font-bold mr-1">$</span>
              <Input
                id="totalOutput"
                type="number"
                step="any"
                placeholder="0.00"
                value={formData.totalOutput}
                onChange={(e) => handleTotalChange(e.target.value)}
                required
                className={`text-2xl font-bold h-10 w-full bg-transparent border-none p-0 focus-visible:ring-0 shadow-none ${isSell ? "text-destructive placeholder:text-destructive/40" : "text-primary placeholder:text-primary/40"}`}
              />
            </div>
          </div>

          {bankAccounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="bank_account">Cuenta asociada (opcional)</Label>
              <Select
                value={formData.bank_account_id}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, bank_account_id: val === "none" ? "" : val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cuenta</SelectItem>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder={isSell ? "Ej: Toma de beneficios parcial" : "Ej: Compra mensual programada"}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            {editingTx && onDelete && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  if (confirm("¿Eliminar esta transacción?")) {
                    onDelete();
                    onOpenChange(false);
                  }
                }}
              >
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.quantity || !formData.price_eur}>
              {editingTx ? "Guardar" : "Añadir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
