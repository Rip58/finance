import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CryptoAsset {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_type: string;
  is_active: boolean;
  created_at: string;
}

export function useCryptoAssets(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crypto-assets", userId],
    queryFn: async (): Promise<CryptoAsset[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("crypto_assets")
        .select("*")
        .eq("user_id", userId)
        .order("symbol", { ascending: true });
      
      if (error) throw error;
      return (data || []) as CryptoAsset[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (asset: Omit<CryptoAsset, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("crypto_assets")
        .insert({ ...asset, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto-assets", userId] });
      toast({ title: "Activo creado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CryptoAsset> & { id: string }) => {
      const { error } = await supabase
        .from("crypto_assets")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto-assets", userId] });
      toast({ title: "Activo actualizado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crypto_assets")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto-assets", userId] });
      toast({ title: "Activo eliminado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    ...query,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
