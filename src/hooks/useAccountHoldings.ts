import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AccountHolding {
  id: string;
  bank_account_id: string;
  symbol: string;
  quantity: number;
  user_id: string;
  created_at: string;
}

export function useAccountHoldings(userId: string | undefined, bankAccountId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["account-holdings", userId, bankAccountId],
    queryFn: async (): Promise<AccountHolding[]> => {
      if (!userId) return [];
      
      let q = supabase
        .from("account_holdings")
        .select("*")
        .eq("user_id", userId);
      
      if (bankAccountId) {
        q = q.eq("bank_account_id", bankAccountId);
      }
      
      const { data, error } = await q.order("symbol", { ascending: true });
      if (error) throw error;
      return (data || []) as AccountHolding[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (holding: Omit<AccountHolding, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("account_holdings")
        .insert({ ...holding, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-holdings", userId] });
      toast({ title: "Holding añadido" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccountHolding> & { id: string }) => {
      const { error } = await supabase
        .from("account_holdings")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-holdings", userId] });
      toast({ title: "Holding actualizado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_holdings")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-holdings", userId] });
      toast({ title: "Holding eliminado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (holding: Omit<AccountHolding, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("account_holdings")
        .upsert({ ...holding, user_id: userId }, { onConflict: "bank_account_id,symbol" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-holdings", userId] });
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
    upsert: upsertMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
