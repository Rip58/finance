import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  category_id: string | null;
  bank_account_id: string | null;
  cadence: Cadence;
  start_date: string;
  next_charge_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface SubscriptionCharge {
  id: string;
  subscription_id: string;
  charge_date: string;
  transaction_id: string | null;
  created_at: string;
}

export function useSubscriptions(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscriptions", userId],
    queryFn: async (): Promise<Subscription[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("next_charge_date", { ascending: true });
      
      if (error) throw error;
      return (data || []) as Subscription[];
    },
    enabled: !!userId,
  });

  const chargesQuery = useQuery({
    queryKey: ["subscription-charges", userId],
    queryFn: async (): Promise<SubscriptionCharge[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("subscription_charges")
        .select("*")
        .eq("user_id", userId)
        .order("charge_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (subscription: Omit<Subscription, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("subscriptions")
        .insert({ ...subscription, user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
      toast({ title: "Suscripción creada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subscription> & { id: string }) => {
      const { error } = await supabase
        .from("subscriptions")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
      toast({ title: "Suscripción actualizada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", userId] });
      toast({ title: "Suscripción eliminada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    ...query,
    charges: chargesQuery.data || [],
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
