import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Settings {
  user_id: string;
  base_currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export function useSettings(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["settings", userId],
    queryFn: async (): Promise<Settings | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (settings: Partial<Settings>) => {
      if (!userId) throw new Error("No user");
      
      const { error } = await supabase
        .from("settings")
        .upsert({
          user_id: userId,
          ...settings,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", userId] });
      toast({ title: "Preferencias guardadas" });
    },
    onError: (error) => {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    },
  });

  return { ...query, upsert: upsertMutation.mutateAsync, isUpserting: upsertMutation.isPending };
}
