import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FxRate {
  id: string;
  pair: string;
  rate: number;
  as_of: string;
  source: string;
}

export function useFxRates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["fx-rates"],
    queryFn: async (): Promise<FxRate[]> => {
      const { data, error } = await supabase
        .from("fx_rates")
        .select("*")
        .order("as_of", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const getLatestRate = (pair: string): number | null => {
    const rates = query.data || [];
    const rate = rates.find(r => r.pair === pair);
    return rate ? Number(rate.rate) : null;
  };

  const getRateAtDate = (pair: string, date: Date): number | null => {
    const rates = (query.data || [])
      .filter(r => r.pair === pair)
      .sort((a, b) => new Date(b.as_of).getTime() - new Date(a.as_of).getTime());
    
    for (const rate of rates) {
      if (new Date(rate.as_of) <= date) {
        return Number(rate.rate);
      }
    }
    
    // Fallback to latest if no rate found before date
    return rates.length > 0 ? Number(rates[0].rate) : null;
  };

  const fetchRateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-fx-rate");
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fx-rates"] });
      toast({ title: "Tipo de cambio actualizado", description: `USDT/EUR: ${data.rate}` });
    },
    onError: (error) => {
      toast({ title: "Error al obtener tipo de cambio", description: error.message, variant: "destructive" });
    },
  });

  return {
    ...query,
    getLatestRate,
    getRateAtDate,
    fetchRate: fetchRateMutation.mutateAsync,
    isFetching: fetchRateMutation.isPending,
  };
}
