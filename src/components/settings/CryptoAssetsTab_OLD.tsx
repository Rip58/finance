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
import { updateCryptoPrices } from "@/lib/cryptoPrices";
import { updateInstitutionalPrices } from "@/lib/institutionalPrices";
import { fetchAssetPrice, searchSymbolOnline, NAME_TO_SYMBOL } from "@/lib/finance_api";


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
  const [isSearching, setIsSearching] = useState(false);

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

      try {
        await updateCryptoPrices(assetsToInsert.map(asset => asset.symbol));
      } catch (updateError) {
        console.error("Error updating default crypto prices:", updateError);
      }

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

      } catch (err: any) {
        console.error("Validation error:", err);
        const errorMessage = err.message || "Error desconocido al contactar con el servidor";
        toast({
          title: "Error de conexión",
          description: `No se pudo verificar: ${errorMessage}. Asegúrate de que la función 'validate-crypto-symbol' está desplegada.`,
          variant: "destructive"
        });
        return;
      }
    } else if (needsValidation && formData.asset_type === 'institutional') {
      try {
        // SKIPPING validation for Trusted/Auto-filled symbols to allow instant creation
        // The user specifically asked: "si el simbolo lo buscas tu casi que no tienen sentido verificar"
        const isTrusted = Object.values(NAME_TO_SYMBOL).includes(formData.symbol);

        if (isTrusted) {
          // It's a trusted mapping (Tesla -> TSLA), skip network check
          console.log("Skipping validation for trusted symbol:", formData.symbol);
        } else {
          // Only validate unknown symbols
          const priceData = await fetchAssetPrice(formData.symbol);
          if (priceData.name && priceData.name.toLowerCase() !== formData.name.toLowerCase()) {
            setFormData(prev => ({ ...prev, name: priceData.name || prev.name }));
            toast({
              title: "Nombre actualizado (API)",
              description: `Nombre: ${priceData.name}`,
            });
          }
        }
      } catch (err: any) {
        console.error("Validation error:", err);
        // If it fails but it's institutional, maybe we let them pass with a warning?
        // Or strictly block? The screenshot showed "Símbolo inválido" blocking action.
        // Let's degrade to warning for now if it's FMP failure? No, safer to block invalid inputs unless trusted.
        toast({
          title: "Símbolo no verificado",
          description: "No se pudo verificar el precio. Comprueba el ticker o prueba más tarde.",
          variant: "destructive"
        });
        return;
      }
    }

    // Proceed to save
    if (editingAsset) {
      await update({ id: editingAsset.id, ...formData });
      if (editingAsset.symbol !== formData.symbol) {
        try {
          if (formData.asset_type === "crypto") {
            await updateCryptoPrices([formData.symbol.toUpperCase()]);
          } else if (formData.asset_type === "institutional") {
            await updateInstitutionalPrices([formData.symbol]);
          }
        } catch (updateError) {
          console.error("Error updating price:", updateError);
        }
      }
    } else {
      await create(formData);
      try {
        if (formData.asset_type === "crypto") {
          await updateCryptoPrices([formData.symbol.toUpperCase()]);
        } else if (formData.asset_type === "institutional") {
          await updateInstitutionalPrices([formData.symbol]);
        }
      } catch (updateError) {
        console.error("Error updating price:", updateError);
      }
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
              <div className="flex gap-2">
                <Input
                  placeholder="Bitcoin, Tesla, Apple..."
                  value={formData.name}
                  onChange={async (e) => {
                    const newName = e.target.value;
                    setFormData(prev => ({ ...prev, name: newName }));

                    // Auto-suggest symbol
                    if (newName.length > 2 && !formData.symbol) {
                      setIsSearching(true);
                      try {
                        const suggested = await findSymbolByName(newName);
                        if (suggested) {
                          setFormData(current => {
                            if (!current.symbol) {
                              const upper = suggested.toUpperCase();
                              const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'USDT', 'USDC'].includes(upper);

                              toast({
                                title: "Símbolo encontrado",
                                description: `${suggested} asignado a ${newName}`,
                              });

                              return {
                                ...current,
                                symbol: suggested,
                                asset_type: isCrypto ? 'crypto' : 'institutional'
                              };
                            }
                            return current;
                          });
                        }
                      } catch (err) {
                        console.warn("Auto-suggest failed", err);
                      } finally {
                        setIsSearching(false);
                      }
                    }
                  }}
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
