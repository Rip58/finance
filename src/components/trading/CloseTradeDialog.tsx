import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trade } from "@/hooks/useTrades";
import { format } from "date-fns";

interface CloseTradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trade: Trade | null;
    currentPrice?: number;
    onConfirm: (tradeId: string, exitPrice: number, exitDate: Date) => Promise<void>;
}

export function CloseTradeDialog({ open, onOpenChange, trade, currentPrice, onConfirm }: CloseTradeDialogProps) {
    const [exitPrice, setExitPrice] = useState<string>("");
    const [exitDate, setExitDate] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && trade) {
            // Default to current price if available, otherwise keep empty or last known
            if (currentPrice) {
                setExitPrice(currentPrice.toString());
            } else {
                setExitPrice("");
            }
            // Default to now
            setExitDate(new Date().toISOString().slice(0, 16)); // Format for datetime-local
        }
    }, [open, trade, currentPrice]);

    const handleConfirm = async () => {
        if (!trade || !exitPrice || !exitDate) return;

        setIsLoading(true);
        try {
            await onConfirm(trade.id, parseFloat(exitPrice), new Date(exitDate));
            onOpenChange(false);
        } catch (error) {
            console.error("Error closing trade:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!trade) return null;

    const isLong = trade.direction === "LONG";
    const estimatedPnl = exitPrice
        ? (parseFloat(exitPrice) - trade.entry_price) * trade.quantity * (isLong ? 1 : -1)
        : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Cerrar Trade {trade.symbol}</DialogTitle>
                    <DialogDescription>
                        Ingrese el precio de salida y la fecha para cerrar este trade.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Precio de Salida</Label>
                        <Input
                            type="number"
                            step="any"
                            value={exitPrice}
                            onChange={(e) => setExitPrice(e.target.value)}
                            placeholder="Precio de cierre..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Fecha de Cierre</Label>
                        <Input
                            type="datetime-local"
                            value={exitDate}
                            onChange={(e) => setExitDate(e.target.value)}
                        />
                    </div>

                    {exitPrice && (
                        <div className={`p-3 rounded-md border ${estimatedPnl >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">PnL Estimado:</span>
                                <span className={`font-bold font-mono ${estimatedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {estimatedPnl > 0 ? "+" : ""}{estimatedPnl.toFixed(2)} $
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={!exitPrice || !exitDate || isLoading} variant={estimatedPnl >= 0 ? "default" : "destructive"}>
                        {isLoading ? "Cerrando..." : "Confirmar Cierre"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
