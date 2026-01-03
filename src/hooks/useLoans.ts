import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addMonths, format } from "date-fns";

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  monthly_payment: number;
  total_installments: number;
  paid_installments: number;
  start_date: string;
  end_date: string;
  next_payment_date: string;
  category_id: string | null;
  bank_account_id: string | null;
  currency: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PendingLoanPayment {
  loan: Loan;
  dueDate: string;
}

export function useLoans(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["loans", userId],
    queryFn: async (): Promise<Loan[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("next_payment_date", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Loan[];
    },
    enabled: !!userId,
  });

  // Get pending payments (loans with next_payment_date <= today)
  const getPendingPayments = (): PendingLoanPayment[] => {
    if (!query.data) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return query.data
      .filter((loan) => {
        const nextPayment = new Date(loan.next_payment_date);
        nextPayment.setHours(0, 0, 0, 0);
        return nextPayment <= today && loan.paid_installments < loan.total_installments;
      })
      .map((loan) => ({
        loan,
        dueDate: loan.next_payment_date,
      }));
  };

  const createMutation = useMutation({
    mutationFn: async (loan: Omit<Loan, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("loans")
        .insert({ ...loan, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", userId] });
      toast({ title: "Préstamo creado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Loan> & { id: string }) => {
      const { error } = await supabase
        .from("loans")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", userId] });
      toast({ title: "Préstamo actualizado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("loans")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", userId] });
      toast({ title: "Préstamo eliminado" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mark payment as paid - creates expense transaction and updates loan
  const payInstallmentMutation = useMutation({
    mutationFn: async (loan: Loan) => {
      if (!userId) throw new Error("No user");

      // 1. Create expense transaction for the payment
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          type: "expense",
          amount: loan.monthly_payment,
          currency: loan.currency,
          category_id: loan.category_id,
          bank_account_id: loan.bank_account_id,
          description: `Cuota ${loan.paid_installments + 1}/${loan.total_installments} - ${loan.name}`,
          date: new Date().toISOString(),
        });

      if (txError) throw txError;

      // 2. Update loan: increment paid_installments and update next_payment_date
      const newPaidInstallments = loan.paid_installments + 1;
      const isCompleted = newPaidInstallments >= loan.total_installments;
      
      const nextPaymentDate = isCompleted 
        ? loan.end_date 
        : format(addMonths(new Date(loan.next_payment_date), 1), "yyyy-MM-dd");

      const { error: loanError } = await supabase
        .from("loans")
        .update({
          paid_installments: newPaidInstallments,
          next_payment_date: nextPaymentDate,
          is_active: !isCompleted,
        })
        .eq("id", loan.id);

      if (loanError) throw loanError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans", userId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", userId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics", userId] });
      toast({ title: "Cuota pagada" });
    },
    onError: (error) => {
      toast({ title: "Error al pagar cuota", description: error.message, variant: "destructive" });
    },
  });

  return {
    ...query,
    loans: query.data ?? [],
    pendingPayments: getPendingPayments(),
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    payInstallment: payInstallmentMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPaying: payInstallmentMutation.isPending,
  };
}
