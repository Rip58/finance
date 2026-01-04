import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";

interface DCAFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  editingTx?: AssetTransaction | null;
  onSubmit: (data: {
    quantity: number;
    price_eur: number;
    transaction_date: string;
    notes: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function DCAFormDialog({
  open,
  onOpenChange,
  symbol,
  editingTx,
  onSubmit,
  isSubmitting,
}: DCAFormDialogProps) {
  const [formData, setFormData] = useState({
    quantity: "",
    price_eur: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (editingTx) {
      setFormData({
        quantity: String(editingTx.quantity),
        price_eur: String(editingTx.price_eur),
        transaction_date: editingTx.transaction_date.split("T")[0],
        notes: editingTx.notes || "",
      });
    } else {
      setFormData({
        quantity: "",
        price_eur: "",
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
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
    });
    onOpenChange(false);
  };

  const formatUSDT = (value: number) =>
    `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              {formatUSDT(totalInvestment)}
            </p>
          </div>

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
