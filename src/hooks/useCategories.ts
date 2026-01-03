import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CategoryScope = "expense" | "income" | "subscription" | "account" | "asset";

export interface Category {
  id: string;
  user_id: string;
  scope: CategoryScope;
  name: string;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
}

export function useCategories(userId: string | undefined, scope?: CategoryScope) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["categories", userId, scope],
    queryFn: async (): Promise<Category[]> => {
      if (!userId) return [];
      
      let q = supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      
      if (scope) {
        q = q.eq("scope", scope);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (category: Omit<Category, "id" | "user_id" | "created_at">) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("categories")
        .insert({ ...category, user_id: userId });
      
      if (error) {
        if (error.code === "23505") {
          throw new Error("Ya existe una categoría con ese nombre");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", userId] });
      toast({ title: "Categoría creada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id);
      
      if (error) {
        if (error.code === "23505") {
          throw new Error("Ya existe una categoría con ese nombre");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", userId] });
      toast({ title: "Categoría actualizada" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", userId] });
      toast({ title: "Categoría eliminada" });
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
