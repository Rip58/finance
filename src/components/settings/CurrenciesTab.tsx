import { useState } from "react";
import { useCurrencies } from "@/hooks/useCurrencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function CurrenciesTab() {
    const { currencies, addCurrency, removeCurrency, isAdding, isRemoving } = useCurrencies();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCurrency, setNewCurrency] = useState("");

    const handleAdd = async () => {
        if (!newCurrency.trim()) return;
        try {
            await addCurrency(newCurrency.trim().toUpperCase());
            setIsDialogOpen(false);
            setNewCurrency("");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Divisas</h3>
                    <p className="text-sm text-muted-foreground">Gestiona las divisas disponibles</p>
                </div>
                <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva
                </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currencies.map((currency) => (
                    <div
                        key={currency}
                        className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Coins className="h-4 w-4" />
                            </div>
                            <span className="font-semibold">{currency}</span>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar divisa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esto solo eliminará la divisa de la lista de opciones. Las cuentas existentes no se verán afectadas.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeCurrency(currency)}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-sm mx-4">
                    <DialogHeader>
                        <DialogTitle>Nueva Divisa</DialogTitle>
                        <DialogDescription>
                            Añade el código de la divisa (ej. GBP, JPY).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Código de divisa</Label>
                            <Input
                                value={newCurrency}
                                onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
                                placeholder="GBP"
                                maxLength={4}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAdd} disabled={isAdding || !newCurrency.trim()}>
                            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Añadir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
