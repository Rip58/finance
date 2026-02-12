import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Trade {
    id: string;
    user_id: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    entry_date: string;
    entry_price: number;
    quantity: number;
    leverage: number;
    stop_loss?: number;
    take_profit_1?: number;
    take_profit_2?: number;
    take_profit_3?: number;
    exit_date?: string;
    exit_price?: number;
    status: 'OPEN' | 'CLOSED';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export type CreateTradeDTO = Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateTradeDTO = Partial<CreateTradeDTO>;

export function useTrades(userId?: string) {
    const queryClient = useQueryClient();

    // Fetch Trades
    const query = useQuery({
        queryKey: ['trades', userId],
        queryFn: async (): Promise<Trade[]> => {
            if (!userId) return [];

            const { data, error } = await (supabase
                .from('trading_journal' as any)
                .select('*')
                .order('entry_date', { ascending: false })) as any;

            if (error) throw error;
            return data as Trade[];
        },
        enabled: !!userId,
    });

    // Create Trade
    const createMutation = useMutation({
        mutationFn: async (newTrade: CreateTradeDTO) => {
            if (!userId) throw new Error("User not logged in");

            const { data, error } = await (supabase
                .from('trading_journal' as any)
                .insert([{ ...newTrade, user_id: userId }])
                .select()
                .single()) as any;

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trades'] });
        }
    });

    // Update Trade
    const updateMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateTradeDTO }) => {
            const { data, error } = await (supabase
                .from('trading_journal' as any)
                .update(updates)
                .eq('id', id)
                .select()
                .single()) as any;

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trades'] });
        }
    });

    // Delete Trade
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase
                .from('trading_journal' as any)
                .delete()
                .eq('id', id)) as any;

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trades'] });
        }
    });

    return {
        trades: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        createTrade: createMutation.mutateAsync,
        updateTrade: updateMutation.mutateAsync,
        deleteTrade: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        refetch: query.refetch,
    };
}
