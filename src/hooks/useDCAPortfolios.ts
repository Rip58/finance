import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DCAPortfolio {
  id: string;
  user_id: string;
  name: string;
  symbol: string;
  asset_type: string;
  is_active: boolean;
  created_at: string;
}

export function useDCAPortfolios(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["dca-portfolios", userId],
    queryFn: async (): Promise<DCAPortfolio[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("dca_portfolios")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return (data || []) as DCAPortfolio[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (portfolio: Omit<DCAPortfolio, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { data, error } = await supabase
        .from("dca_portfolios")
        .insert({ ...portfolio, user_id: userId })
        .select()
        .single();
      
      if (error) throw error;
      return data as DCAPortfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-portfolios", userId] });
      toast({ title: "DCA creado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DCAPortfolio> & { id: string }) => {
      const { error } = await supabase
        .from("dca_portfolios")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-portfolios", userId] });
      toast({ title: "DCA actualizado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dca_portfolios")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca-portfolios", userId] });
      queryClient.invalidateQueries({ queryKey: ["asset-transactions", userId] });
      toast({ title: "DCA eliminado" });
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
