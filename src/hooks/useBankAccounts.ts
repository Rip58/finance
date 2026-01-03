import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  currency: string;
  is_archived: boolean;
  created_at: string;
}

export function useBankAccounts(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bank-accounts", userId],
    queryFn: async (): Promise<BankAccount[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (account: Omit<BankAccount, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("bank_accounts")
        .insert({ ...account, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", userId] });
      toast({ title: "Cuenta creada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { error } = await supabase
        .from("bank_accounts")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", userId] });
      toast({ title: "Cuenta actualizada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", userId] });
      toast({ title: "Cuenta eliminada" });
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
