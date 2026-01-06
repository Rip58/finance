import { useState, useEffect } from "react";
import { useCryptoAssets, CryptoAsset } from "@/hooks/useCryptoAssets";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Coins } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CryptoAssetsTabProps {
  userId: string;
}

export function CryptoAssetsTab({ userId }: CryptoAssetsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: assets, isLoading, create, update, delete: deleteAsset, isCreating, isUpdating } = useCryptoAssets(userId);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CryptoAsset | null>(null);
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    asset_type: "crypto",
    is_active: true,
  });

  const DEFAULT_CRYPTO_ASSETS = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "USDT", name: "Tether" },
    { symbol: "XRP", name: "XRP" },
    { symbol: "BNB", name: "BNB" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "USDC", name: "USDC" },
    { symbol: "ADA", name: "Cardano" },
    { symbol: "DOGE", name: "Dogecoin" },
    { symbol: "TRX", name: "TRON" },
  ];

  const handleInitializeDefaults = async () => {
    setIsInitializing(true);
    try {
      const assetsToInsert = DEFAULT_CRYPTO_ASSETS.map(asset => ({
        symbol: asset.symbol,
        name: asset.name,
        asset_type: "crypto",
        is_active: true,
        user_id: userId
      }));

      const { error } = await supabase
        .from("crypto_assets")
        .insert(assetsToInsert);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["crypto-assets", userId] });
    } catch (error) {
      console.error("Error creating default assets:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isLoading || isInitializing || !assets || assets.length > 0) return;
    handleInitializeDefaults();
  }, [assets, isLoading, userId]);

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.symbol || !formData.name) return;

    // CMC Validation for new assets or if symbol changed
    const needsValidation = !editingAsset || (editingAsset.symbol !== formData.symbol);

    if (needsValidation && formData.asset_type === 'crypto') {
      try {
        const { data, error } = await supabase.functions.invoke('validate-crypto-symbol', {
          body: { symbol: formData.symbol }
        });

        if (error) throw error;

        if (!data.valid) {
          toast({
            title: "Símbolo inválido",
            description: data.message || "El símbolo no existe en CoinMarketCap",
            variant: "destructive"
          });
          return; // Stop saving
        }

        // If valid, check name match and maybe auto-correct
        if (data.name && data.name.toLowerCase() !== formData.name.toLowerCase()) {
          // We could auto-correct or ask, but for now let's just warn or use the official name?
          // The user said "ponga el correcto". Let's update the name automatically or notify.
          setFormData(prev => ({ ...prev, name: data.name }));
          toast({
            title: "Nombre actualizado",
            description: `Se actualizado el nombre a: ${data.name} (oficial de CMC)`,
          });
          // We continue to save with the new name
        }

      } catch (err) {
        console.error("Validation error:", err);
        toast({
          title: "Error de validación",
          description: "No se pudo verificar el símbolo. Inténtalo de nuevo.",
          variant: "destructive"
        });
        return;
      }
    }

    // Proceed to save
    if (editingAsset) {
      await update({ id: editingAsset.id, ...formData });
    } else {
      await create(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ symbol: "", name: "", asset_type: "crypto", is_active: true });
    setEditingAsset(null);
  };

  const openEdit = (asset: CryptoAsset) => {
    setEditingAsset(asset);
    setFormData({
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      is_active: asset.is_active,
    });
    setIsDialogOpen(true);
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Activos Crypto</h3>
          <p className="text-sm text-muted-foreground">{assets?.length || 0} activos</p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {/* Assets List */}
      {assets?.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
          <Coins className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No hay activos configurados</p>
          <p className="text-muted-foreground">
            {isInitializing ? "Configurando activos por defecto..." : "No hay activos configurados"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Añade activos para usarlos en DCAs y cuentas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {assets?.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {asset.symbol.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{asset.symbol}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{asset.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(asset)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar activo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esto no eliminará las transacciones asociadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteAsset(asset.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Editar activo" : "Nuevo activo"}</DialogTitle>
            <DialogDescription>
              {editingAsset ? "Modifica los datos del activo" : "Añade un nuevo activo crypto"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Bitcoin, Ethereum..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Símbolo</Label>
              <Input
                placeholder="BTC, ETH, SOL..."
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Activo</Label>
              <Select
                value={formData.asset_type}
                onValueChange={(val) => setFormData({ ...formData, asset_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="institutional">Institucional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || isUpdating || !formData.symbol || !formData.name}
            >
              {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAsset ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
