import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addWeeks, addMonths, addYears, format, startOfMonth, endOfMonth, isBefore, isAfter, parseISO } from "date-fns";

export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  name: string;
  amount: number;
  currency: string;
  category_id: string | null;
  bank_account_id: string | null;
  cadence: "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  next_occurrence_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface RecurringConfirmation {
  id: string;
  recurring_id: string;
  user_id: string;
  occurrence_date: string;
  transaction_id: string | null;
  confirmed_at: string;
}

export interface PendingRecurring extends RecurringTransaction {
  occurrence_date: string;
}

function getNextOccurrence(currentDate: string, cadence: string): string {
  const date = parseISO(currentDate);
  switch (cadence) {
    case "weekly":
      return format(addWeeks(date, 1), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(date, 1), "yyyy-MM-dd");
    case "quarterly":
      return format(addMonths(date, 3), "yyyy-MM-dd");
    case "yearly":
      return format(addYears(date, 1), "yyyy-MM-dd");
    default:
      return format(addMonths(date, 1), "yyyy-MM-dd");
  }
}

export function useRecurringTransactions(userId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all recurring transactions
  const recurringQuery = useQuery({
    queryKey: ["recurring_transactions", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("next_occurrence_date", { ascending: true });

      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!userId,
  });

  // Fetch confirmations for current month
  const confirmationsQuery = useQuery({
    queryKey: ["recurring_confirmations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_confirmations")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as RecurringConfirmation[];
    },
    enabled: !!userId,
  });

  // Calculate pending transactions (not yet confirmed and due)
  const getPendingTransactions = (): PendingRecurring[] => {
    if (!recurringQuery.data || !confirmationsQuery.data) return [];

    const today = new Date();
    const pending: PendingRecurring[] = [];

    for (const recurring of recurringQuery.data) {
      const nextDate = parseISO(recurring.next_occurrence_date);

      // Check if this occurrence is due (today or past) and not confirmed
      if (!isAfter(nextDate, today)) {
        const isConfirmed = confirmationsQuery.data.some(
          (c) => c.recurring_id === recurring.id && c.occurrence_date === recurring.next_occurrence_date
        );

        if (!isConfirmed) {
          pending.push({
            ...recurring,
            occurrence_date: recurring.next_occurrence_date,
          });
        }
      }
    }

    return pending;
  };

  // Confirm a recurring transaction (Check as paid)
  // This update: DOES NOT create a real transaction anymore, just marks it as "checked"
  const confirmMutation = useMutation({
    mutationFn: async ({
      recurring,
    }: {
      recurring: PendingRecurring;
      adjustedAmount?: number;
    }) => {
      // 1. Create confirmation record (without transaction_id)
      const { error: confError } = await supabase
        .from("recurring_confirmations")
        .insert({
          recurring_id: recurring.id,
          user_id: userId,
          occurrence_date: recurring.occurrence_date,
          transaction_id: null, // No transaction created
        });

      if (confError) throw confError;

      // 2. Update next_occurrence_date
      const nextDate = getNextOccurrence(recurring.occurrence_date, recurring.cadence);
      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update({ next_occurrence_date: nextDate })
        .eq("id", recurring.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recurring_confirmations"] });
      toast({ title: "Marcado como pagado" });
    },
    onError: (error) => {
      toast({ title: "Error al confirmar", description: error.message, variant: "destructive" });
    },
  });

  // Create a new recurring template
  const createMutation = useMutation({
    mutationFn: async (data: Omit<RecurringTransaction, "id" | "user_id" | "created_at">) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .insert({ ...data, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      toast({ title: "Plantilla creada" });
    },
    onError: (error) => {
      toast({ title: "Error al crear", description: error.message, variant: "destructive" });
    },
  });

  // Update a recurring template
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringTransaction> & { id: string }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      toast({ title: "Plantilla actualizada" });
    },
    onError: (error) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    },
  });

  // Delete a recurring template
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      toast({ title: "Plantilla eliminada" });
    },
    onError: (error) => {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    },
  });

  return {
    recurring: recurringQuery.data ?? [],
    confirmations: confirmationsQuery.data ?? [],
    pending: getPendingTransactions(),
    isLoading: recurringQuery.isLoading || confirmationsQuery.isLoading,
    confirm: confirmMutation.mutateAsync,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
  };
}
