import { useState, useEffect } from "react";
import { Trade, useTrades } from "@/hooks/useTrades";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface AddEditTradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId?: string;
    tradeToEdit?: Trade | null;
}

export function AddEditTradeDialog({ open, onOpenChange, userId, tradeToEdit }: AddEditTradeDialogProps) {
    const { createTrade, updateTrade } = useTrades(userId);
    const { data: assets = [] } = useCryptoAssets(userId);
    const [isLoading, setIsLoading] = useState(false);

    const [symbol, setSymbol] = useState("");
    const [direction, setDirection] = useState<'LONG' | 'SHORT'>("LONG");
    const [entryPrice, setEntryPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [leverage, setLeverage] = useState("1");
    const [stopLoss, setStopLoss] = useState("");
    const [tp1, setTp1] = useState("");
    const [tp2, setTp2] = useState("");
    const [tp3, setTp3] = useState("");
    const [notes, setNotes] = useState("");

    // Exit fields
    const [status, setStatus] = useState<'OPEN' | 'CLOSED'>("OPEN");
    const [exitPrice, setExitPrice] = useState("");
    // We handle dates automatically for simplicity, or add fields if requested.

    useEffect(() => {
        if (tradeToEdit) {
            setSymbol(tradeToEdit.symbol);
            setDirection(tradeToEdit.direction);
            setEntryPrice(tradeToEdit.entry_price.toString());
            setQuantity(tradeToEdit.quantity.toString());
            setLeverage(tradeToEdit.leverage.toString());
            setStopLoss(tradeToEdit.stop_loss?.toString() || "");
            setTp1(tradeToEdit.take_profit_1?.toString() || "");
            setTp2(tradeToEdit.take_profit_2?.toString() || "");
            setTp3(tradeToEdit.take_profit_3?.toString() || "");
            setNotes(tradeToEdit.notes || "");
            setStatus(tradeToEdit.status);
            setExitPrice(tradeToEdit.exit_price?.toString() || "");
        } else {
            resetForm();
        }
    }, [tradeToEdit, open]);

    const resetForm = () => {
        setSymbol("");
        setDirection("LONG");
        setEntryPrice("");
        setQuantity("");
        setLeverage("1");
        setStopLoss("");
        setTp1("");
        setTp2("");
        setTp3("");
        setNotes("");
        setStatus("OPEN");
        setExitPrice("");
    };

    const handleSubmit = async () => {
        if (!userId) return;
        setIsLoading(true);

        try {
            const commonData = {
                symbol: symbol.toUpperCase(),
                direction,
                entry_price: parseFloat(entryPrice),
                quantity: parseFloat(quantity),
                leverage: parseFloat(leverage),
                stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
                take_profit_1: tp1 ? parseFloat(tp1) : undefined,
                take_profit_2: tp2 ? parseFloat(tp2) : undefined,
                take_profit_3: tp3 ? parseFloat(tp3) : undefined,
                notes,
                status,
                exit_price: exitPrice ? parseFloat(exitPrice) : undefined,
                exit_date: status === 'CLOSED' && !tradeToEdit?.exit_date ? new Date().toISOString() : tradeToEdit?.exit_date,
            };

            if (tradeToEdit) {
                await updateTrade({
                    id: tradeToEdit.id,
                    updates: commonData
                });
            } else {
                await createTrade({
                    ...commonData,
                    entry_date: new Date().toISOString(),
                });
            }
            onOpenChange(false);
            resetForm();
        } catch (error) {
            console.error("Error saving trade:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{tradeToEdit ? "Editar Trade" : "Nuevo Trade"}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Basic Info */}
                    <div className="space-y-2">
                        <Label>Símbolo</Label>
                        <div className="relative">
                            <Input
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                placeholder="BTC, ETH..."
                                className="uppercase"
                                list="crypto-assets-list"
                            />
                            <datalist id="crypto-assets-list">
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.symbol}>
                                        {asset.name}
                                    </option>
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Dirección</Label>
                        <div className="flex bg-muted/50 p-1 rounded-lg">
                            <button
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === 'LONG' ? 'bg-green-500/20 text-green-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setDirection('LONG')}
                            >
                                LONG
                            </button>
                            <button
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === 'SHORT' ? 'bg-red-500/20 text-red-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => setDirection('SHORT')}
                            >
                                SHORT
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Precio Entrada</Label>
                        <Input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Cantidad (SIZE / MARGIN)</Label>
                        <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Apalancamiento</Label>
                        <Input type="number" value={leverage} onChange={(e) => setLeverage(e.target.value)} placeholder="1" />
                    </div>

                    {/* Risk Management */}
                    <div className="space-y-2 md:col-span-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="text-red-500">Stop Loss</Label>
                                <Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="border-red-500/20 focus-visible:ring-red-500/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-green-500">TP 1</Label>
                                <Input type="number" value={tp1} onChange={(e) => setTp1(e.target.value)} className="border-green-500/20 focus-visible:ring-green-500/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-green-500">TP 2</Label>
                                <Input type="number" value={tp2} onChange={(e) => setTp2(e.target.value)} className="border-green-500/20 focus-visible:ring-green-500/20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-green-500">TP 3</Label>
                                <Input type="number" value={tp3} onChange={(e) => setTp3(e.target.value)} className="border-green-500/20 focus-visible:ring-green-500/20" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label>Notas</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Estrategia, pensamientos..." />
                    </div>

                    {/* Exit Info (Only if editing or explicitly closing) */}
                    {tradeToEdit && (
                        <div className="space-y-4 md:col-span-2 border-t pt-4 mt-2">
                            <div className="flex items-center justify-between">
                                <Label>Estado del Trade</Label>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm ${status === 'OPEN' ? 'text-green-500' : 'text-muted-foreground'}`}>OPEN</span>
                                    <Switch
                                        checked={status === 'CLOSED'}
                                        onCheckedChange={(c) => setStatus(c ? 'CLOSED' : 'OPEN')}
                                    />
                                    <span className={`text-sm ${status === 'CLOSED' ? 'text-red-500' : 'text-muted-foreground'}`}>CLOSED</span>
                                </div>
                            </div>

                            {status === 'CLOSED' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Precio Salida</Label>
                                        <Input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
                                    </div>
                                    {/* Date handled automatically on save for now */}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !symbol || !entryPrice || !quantity}>
                        {isLoading ? "Guardando..." : "Guardar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
