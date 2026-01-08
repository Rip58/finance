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
  onSubmit: (data: {
    quantity: number;
    price_eur: number;
    transaction_date: string;
    notes: string | null;
    bank_account_id: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function DCAFormDialog({
  open,
  onOpenChange,
  symbol,
  editingTx,
  bankAccounts = [],
  onSubmit,
  isSubmitting,
}: DCAFormDialogProps) {
  const [formData, setFormData] = useState({
    quantity: "",
    price_eur: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
    bank_account_id: "",
  });

  useEffect(() => {
    if (editingTx) {
      setFormData({
        quantity: String(editingTx.quantity),
        price_eur: String(editingTx.price_eur),
        transaction_date: editingTx.transaction_date.split("T")[0],
        notes: editingTx.notes || "",
        bank_account_id: (editingTx as any).bank_account_id || "",
      });
    } else {
      setFormData({
        quantity: "",
        price_eur: "",
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
        bank_account_id: "",
      });
    }
  }, [editingTx, open]);

  const totalInvestment = useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price_eur) || 0;
    return qty * price;
  }, [formData.quantity, formData.price_eur]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      quantity: parseFloat(formData.quantity),
      price_eur: parseFloat(formData.price_eur),
      transaction_date: formData.transaction_date,
      notes: formData.notes || null,
      bank_account_id: formData.bank_account_id || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingTx ? "Editar compra" : `Nueva compra ${symbol}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_eur">Precio (USDT)</Label>
              <Input
                id="price_eur"
                type="number"
                step="0.01"
                placeholder="85000"
                value={formData.price_eur}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, price_eur: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Inversión total</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalInvestment, "USDT")}
            </p>
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
              placeholder="Ej: Compra mensual programada"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
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
