
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BalanceHistoryPoint {
    time: number;
    value: number;
}

export function useBalanceHistory(range: "1D" | "7D" | "1M" | "3M" | "1Y", userId: string) {
    return useQuery({
        queryKey: ["balance-history", range, userId],
        queryFn: async (): Promise<BalanceHistoryPoint[]> => {
            console.log(`[useBalanceHistory] Fetching history for range: ${range}`);

            const { data, error } = await supabase.functions.invoke('get-balance-history', {
                body: { range, user_id: userId }
            });

            if (error) {
                console.error("[useBalanceHistory] Error fetching history:", error);
                throw error;
            }

            if (!data?.data) {
                console.warn("[useBalanceHistory] No data returned");
                return [];
            }

            return data.data.map((p: any) => ({
                time: p.time,
                value: Number(p.value)
            }));
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        refetchOnWindowFocus: false
    });
}
