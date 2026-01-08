import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { updateCryptoPrices } from "@/lib/cryptoPrices";

export type AssetType = "crypto" | "commodity" | "other";
export type AssetSide = "buy" | "sell";

export interface AssetTransaction {
  id: string;
  user_id: string;
  asset_type: AssetType;
  symbol: string;
  category_id: string | null;
  side: AssetSide;
  quantity: number;
  price_eur: number;
  transaction_date: string;
  value_date: string | null;
  notes: string | null;
  created_at: string;
  dca_portfolio_id: string | null;
}

export function useAssetTransactions(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["asset-transactions", userId],
    queryFn: async (): Promise<AssetTransaction[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("asset_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return (data || []) as AssetTransaction[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (transaction: Omit<AssetTransaction, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");

      const { error } = await supabase
        .from("asset_transactions")
        .insert({ ...transaction, user_id: userId });

      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      // Update price for the symbol to ensure chart and home are correct
      try {
        await updateCryptoPrices([variables.symbol]);
      } catch (error) {
        console.error("Error updating price:", error);
      }

      queryClient.invalidateQueries({ queryKey: ["asset-transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      queryClient.invalidateQueries({ queryKey: ["current-prices"] });
      toast({ title: "Movimiento creado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssetTransaction> & { id: string }) => {
      const { error } = await supabase
        .from("asset_transactions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      queryClient.invalidateQueries({ queryKey: ["current-prices"] });
      toast({ title: "Movimiento actualizado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("asset_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      queryClient.invalidateQueries({ queryKey: ["current-prices"] });
      toast({ title: "Movimiento eliminado" });
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
