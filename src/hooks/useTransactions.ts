import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category_id: string | null;
  bank_account_id: string | null;
  description: string | null;
  date: string;
  value_date: string | null;
  is_validated?: boolean;
  created_at: string;
}

export function useTransactions(userId: string | undefined, type?: TransactionType) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMissingColumn = (error: unknown, column: string) => {
    if (!error || typeof error !== "object") return false;
    const err = error as { code?: string; message?: string };
    if (err.code === "42703") return true;
    if (typeof err.message === "string" && err.message.includes(`"${column}"`)) return true;
    return false;
  };

  const query = useQuery({
    queryKey: ["transactions", userId, type],
    queryFn: async (): Promise<Transaction[]> => {
      if (!userId) return [];

      const baseFields = "id, user_id, type, amount, currency, category_id, bank_account_id, description, date, value_date, created_at";
      const fieldsWithValidation = `${baseFields}, is_validated`;

      const buildQuery = (fields: string) => {
        let q = supabase
          .from("transactions")
          .select(fields)
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (type) {
          q = q.eq("type", type);
        }

        return q;
      };

      const { data, error } = await buildQuery(fieldsWithValidation);
      if (error && isMissingColumn(error, "is_validated")) {
        const { data: fallbackData, error: fallbackError } = await buildQuery(baseFields);
        if (fallbackError) throw fallbackError;
        return (fallbackData || []) as unknown as Transaction[];
      }
      if (error) throw error;
      return (data || []) as unknown as Transaction[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");

      const { error } = await supabase
        .from("transactions")
        .insert({ ...transaction, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      toast({ title: "Transacción creada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      toast({ title: "Transacción actualizada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      queryClient.invalidateQueries({ queryKey: ["chart-data"] });
      toast({ title: "Transacción eliminada" });
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
