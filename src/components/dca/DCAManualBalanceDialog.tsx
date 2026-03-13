import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DCAManualBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  currentQuantity: number;
  onSubmit: (newQuantity: number) => Promise<void>;
  isSubmitting?: boolean;
}

export function DCAManualBalanceDialog({
  open,
  onOpenChange,
  symbol,
  currentQuantity,
  onSubmit,
  isSubmitting,
}: DCAManualBalanceDialogProps) {
  const [quantity, setQuantity] = useState(String(currentQuantity));

  useEffect(() => {
    if (open) {
      setQuantity(String(currentQuantity));
    }
  }, [open, currentQuantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newQty = parseFloat(quantity);
    if (!isNaN(newQty) && newQty >= 0) {
      await onSubmit(newQty);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Ajustar balance de {symbol}</DialogTitle>
          <DialogDescription>
            Si las cantidades no cuadran por fees o pequeños desajustes, introduce aquí tu cantidad real en cartera.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="manual_quantity">Cantidad actual exacta ({symbol})</Label>
            <Input
              id="manual_quantity"
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || quantity === ""}>
              Ajustar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
