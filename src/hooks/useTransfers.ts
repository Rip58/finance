import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Transfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_from: number;
  currency_from: string;
  amount_to: number;
  currency_to: string;
  fx_rate: number | null;
  date: string;
  value_date: string | null;
  description: string | null;
  is_validated?: boolean;
  created_at: string;
}

export function useTransfers(userId: string | undefined) {
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
    queryKey: ["transfers", userId],
    queryFn: async (): Promise<Transfer[]> => {
      if (!userId) return [];

      const baseFields = "id, user_id, from_account_id, to_account_id, amount_from, currency_from, amount_to, currency_to, fx_rate, date, value_date, description, created_at";
      const fieldsWithValidation = `${baseFields}, is_validated`;

      const buildQuery = (fields: string) => (
        supabase
          .from("transfers")
          .select(fields)
          .eq("user_id", userId)
          .order("date", { ascending: false })
      );

      const { data, error } = await buildQuery(fieldsWithValidation);
      if (error && isMissingColumn(error, "is_validated")) {
        const { data: fallbackData, error: fallbackError } = await buildQuery(baseFields);
        if (fallbackError) throw fallbackError;
        return (fallbackData || []) as unknown as Transfer[];
      }

      if (error) throw error;
      return (data || []) as unknown as Transfer[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (transfer: Omit<Transfer, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");

      const { error } = await supabase
        .from("transfers")
        .insert({ ...transfer, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers", userId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", userId] });
      toast({ title: "Transferencia creada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transfer> & { id: string }) => {
      const { error } = await supabase
        .from("transfers")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers", userId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", userId] });
      toast({ title: "Transferencia actualizada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transfers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers", userId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", userId] });
      toast({ title: "Transferencia eliminada" });
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
