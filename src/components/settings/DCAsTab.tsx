import { useState } from "react";
import { TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDCAPortfolios, type DCAPortfolio } from "@/hooks/useDCAPortfolios";
import { useAssetTransactions } from "@/hooks/useAssetTransactions";

interface DCAsTabProps {
  userId: string;
}

const COMMON_SYMBOLS = ["BTC", "ETH", "SOL", "ADA", "DOT", "AVAX", "MATIC", "LINK", "XRP"];

export function DCAsTab({ userId }: DCAsTabProps) {
  const portfolios = useDCAPortfolios(userId);
  const assetTransactions = useAssetTransactions(userId);
  const [showForm, setShowForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<DCAPortfolio | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      customSymbol: "",
      asset_type: "crypto",
      initialQuantity: "",
      initialPrice: "",
      initialDate: new Date().toISOString().split("T")[0],
    });
    setEditingPortfolio(null);
  };

  const handleOpenForm = (portfolio?: DCAPortfolio) => {
    if (portfolio) {
      setEditingPortfolio(portfolio);
      const isCommon = COMMON_SYMBOLS.includes(portfolio.symbol);
      setFormData({
        name: portfolio.name,
        symbol: isCommon ? portfolio.symbol : "OTHER",
        customSymbol: isCommon ? "" : portfolio.symbol,
        asset_type: portfolio.asset_type,
        initialQuantity: "",
        initialPrice: "",
        initialDate: new Date().toISOString().split("T")[0],
      });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSymbol = formData.symbol === "OTHER" ? formData.customSymbol.toUpperCase() : formData.symbol;
    
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

    setShowForm(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await portfolios.delete(deleteId);
      setDeleteId(null);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

  const totalInitial = (parseFloat(formData.initialQuantity) || 0) * (parseFloat(formData.initialPrice) || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portafolios DCA</h2>
        <Button size="sm" onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo DCA
        </Button>
      </div>

      {portfolios.data?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No tienes DCAs configurados</p>
          <p className="text-sm">Crea uno para empezar a trackear tus inversiones</p>
        </div>
      )}

      <div className="space-y-2">
        {portfolios.data?.map((portfolio) => (
          <div
            key={portfolio.id}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {portfolio.symbol.slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{portfolio.name}</p>
              <p className="text-sm text-muted-foreground">{portfolio.symbol}</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenForm(portfolio)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(portfolio.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPortfolio ? "Editar DCA" : "Nuevo DCA"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Ej: Mi DCA Bitcoin"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Activo</Label>
                <Select
                  value={formData.symbol}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, symbol: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SYMBOLS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value="OTHER">Otro...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset_type">Tipo</Label>
                <Select
                  value={formData.asset_type}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, asset_type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="commodity">Commodity</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.symbol === "OTHER" && (
              <div className="space-y-2">
                <Label htmlFor="customSymbol">Símbolo personalizado</Label>
                <Input
                  id="customSymbol"
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
                    <Label htmlFor="initialDate" className="text-xs">Fecha</Label>
                    <Input
                      id="initialDate"
                      type="date"
                      value={formData.initialDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, initialDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="initialQuantity" className="text-xs">Cantidad</Label>
                    <Input
                      id="initialQuantity"
                      type="number"
                      step="any"
                      placeholder="0.05"
                      value={formData.initialQuantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, initialQuantity: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="initialPrice" className="text-xs">Precio (EUR)</Label>
                  <Input
                    id="initialPrice"
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
                    <p className="font-bold text-primary">{formatCurrency(totalInitial)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar DCA?</AlertDialogTitle>
            <AlertDialogDescription>
              Las transacciones asociadas no se eliminarán, pero perderán la vinculación a este portafolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
