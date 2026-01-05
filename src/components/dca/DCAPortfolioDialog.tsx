import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useDCAPortfolios, type DCAPortfolio } from "@/hooks/useDCAPortfolios";
import { useAssetTransactions } from "@/hooks/useAssetTransactions";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { formatCurrency } from "@/lib/utils";

interface DCAPortfolioDialogProps {
    userId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingPortfolio?: DCAPortfolio | null;
    onSuccess?: () => void;
}

export function DCAPortfolioDialog({
    userId,
    open,
    onOpenChange,
    editingPortfolio,
    onSuccess
}: DCAPortfolioDialogProps) {
    const portfolios = useDCAPortfolios(userId);
    const assetTransactions = useAssetTransactions(userId);
    const cryptoAssets = useCryptoAssets(userId);

    // Get unique symbols from user's crypto assets
    const availableSymbols = useMemo(() => {
        return cryptoAssets.data?.filter(a => a.is_active).map(a => a.symbol) || [];
    }, [cryptoAssets.data]);

    const [formData, setFormData] = useState({
        name: "",
        symbol: "",
        customSymbol: "",
        asset_type: "crypto",
        // Initial purchase fields
        initialQuantity: "",
        initialPrice: "",
        initialDate: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        if (editingPortfolio) {
            const isInList = availableSymbols.includes(editingPortfolio.symbol);
            setFormData({
                name: editingPortfolio.name,
                symbol: isInList ? editingPortfolio.symbol : "OTHER",
                customSymbol: isInList ? "" : editingPortfolio.symbol,
                asset_type: editingPortfolio.asset_type || "crypto",
                initialQuantity: "",
                initialPrice: "",
                initialDate: new Date().toISOString().split("T")[0],
            });
        } else {
            setFormData({
                name: "",
                symbol: "",
                customSymbol: "",
                asset_type: "crypto",
                initialQuantity: "",
                initialPrice: "",
                initialDate: new Date().toISOString().split("T")[0],
            });
        }
    }, [editingPortfolio, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalSymbol = formData.symbol === "OTHER" ? formData.customSymbol.toUpperCase() : formData.symbol;

        try {
            // Check if we need to create the asset first
            if (formData.symbol === "OTHER") {
                const existingAsset = cryptoAssets.data?.find(a => a.symbol === finalSymbol);
                if (!existingAsset) {
                    try {
                        await cryptoAssets.create({
                            symbol: finalSymbol,
                            name: finalSymbol, // Default name to symbol
                            asset_type: formData.asset_type as "crypto" | "commodity" | "other" | "institutional",
                            is_active: true
                        });
                    } catch (error) {
                        console.error("Error creating asset:", error);
                    }
                }
            }

            if (editingPortfolio) {
                await portfolios.update({
                    id: editingPortfolio.id,
                    name: formData.name,
                    symbol: finalSymbol,
                    asset_type: formData.asset_type,
                });
            } else {
                // Create portfolio
                const newPortfolio = await portfolios.create({
                    name: formData.name,
                    symbol: finalSymbol,
                    asset_type: formData.asset_type,
                    is_active: true,
                });

                // If initial purchase data provided, create transaction
                if (formData.initialQuantity && formData.initialPrice && newPortfolio) {
                    await assetTransactions.create({
                        symbol: finalSymbol,
                        asset_type: formData.asset_type as "crypto" | "commodity" | "other",
                        side: "buy",
                        quantity: parseFloat(formData.initialQuantity),
                        price_eur: parseFloat(formData.initialPrice),
                        transaction_date: formData.initialDate,
                        value_date: null,
                        notes: "Compra inicial",
                        category_id: null,
                        dca_portfolio_id: newPortfolio.id,
                    });
                }
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error saving portfolio:", error);
        }
    };

    const totalInitial = (parseFloat(formData.initialQuantity) || 0) * (parseFloat(formData.initialPrice) || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md z-[200] pointer-events-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingPortfolio ? "Editar DCA" : "Nuevo DCA"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="dca-port-name">Nombre</Label>
                        <Input
                            id="dca-port-name"
                            placeholder="Ej: Mi DCA Bitcoin"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dca-port-symbol">Activo</Label>
                            <Select
                                value={formData.symbol}
                                onValueChange={(val) => setFormData((prev) => ({ ...prev, symbol: val }))}
                            >
                                <SelectTrigger id="dca-port-symbol">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent className="z-[250]">
                                    {availableSymbols.length === 0 ? (
                                        <SelectItem value="NONE" disabled>
                                            Sin activos configurados
                                        </SelectItem>
                                    ) : (
                                        availableSymbols.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))
                                    )}
                                    <SelectItem value="OTHER">Otro...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dca-port-type">Tipo</Label>
                            <Select
                                value={formData.asset_type}
                                onValueChange={(val) => setFormData((prev) => ({ ...prev, asset_type: val }))}
                            >
                                <SelectTrigger id="dca-port-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[250]">
                                    <SelectItem value="crypto">Crypto</SelectItem>
                                    <SelectItem value="institutional">Institucional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.symbol === "OTHER" && (
                        <div className="space-y-2">
                            <Label htmlFor="dca-port-customSymbol">Símbolo personalizado</Label>
                            <Input
                                id="dca-port-customSymbol"
                                placeholder="Ej: DOGE"
                                value={formData.customSymbol}
                                onChange={(e) => setFormData((prev) => ({ ...prev, customSymbol: e.target.value.toUpperCase() }))}
                                required
                            />
                        </div>
                    )}

                    {/* Initial purchase - only for new portfolios */}
                    {!editingPortfolio && (
                        <div className="space-y-3 pt-2 border-t border-border">
                            <p className="text-sm font-medium text-muted-foreground">Primera compra (opcional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="dca-port-initialDate" className="text-xs">Fecha</Label>
                                    <Input
                                        id="dca-port-initialDate"
                                        type="date"
                                        value={formData.initialDate}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, initialDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="dca-port-initialQuantity" className="text-xs">Cantidad</Label>
                                    <Input
                                        id="dca-port-initialQuantity"
                                        type="number"
                                        step="any"
                                        placeholder="0.05"
                                        value={formData.initialQuantity}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, initialQuantity: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dca-port-initialPrice" className="text-xs">Precio (USDT)</Label>
                                <Input
                                    id="dca-port-initialPrice"
                                    type="number"
                                    step="0.01"
                                    placeholder="85000"
                                    value={formData.initialPrice}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, initialPrice: e.target.value }))}
                                />
                            </div>
                            {totalInitial > 0 && (
                                <div className="p-2 rounded-lg bg-primary/10 text-center">
                                    <p className="text-xs text-muted-foreground">Inversión inicial</p>
                                    <p className="font-bold text-primary">{formatCurrency(totalInitial, "USDT")}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={portfolios.isCreating || portfolios.isUpdating || !formData.name || (!formData.symbol || (formData.symbol === "OTHER" && !formData.customSymbol))}
                        >
                            {editingPortfolio ? "Guardar" : "Crear"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
