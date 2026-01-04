import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "finance_app_currencies";
const DEFAULT_CURRENCIES = ["EUR", "USD", "USDT", "BTC", "ETH", "GBP", "JPY", "CHF"];

export function useCurrencies() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["currencies"],
        queryFn: async () => {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored) as string[];
            }
            return DEFAULT_CURRENCIES;
        },
    });

    const addMutation = useMutation({
        mutationFn: async (currency: string) => {
            const current = query.data || DEFAULT_CURRENCIES;
            if (current.includes(currency)) throw new Error("La divisa ya existe");
            const updated = [...current, currency];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currencies"] });
            toast({ title: "Divisa añadida" });
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (currency: string) => {
            const current = query.data || DEFAULT_CURRENCIES;
            const updated = current.filter(c => c !== currency);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currencies"] });
            toast({ title: "Divisa eliminada" });
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    return {
        currencies: query.data || DEFAULT_CURRENCIES,
        isLoading: query.isLoading,
        addCurrency: addMutation.mutateAsync,
        removeCurrency: removeMutation.mutateAsync,
        isAdding: addMutation.isPending,
        isRemoving: removeMutation.isPending,
    };
}
