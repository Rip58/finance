import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function DebugHistory() {
    const { data: history, isLoading, error } = useQuery({
        queryKey: ["debug-history"],
        queryFn: async () => {
            console.log("Fetching history...");
            const { data, error } = await supabase
                .from("balance_history")
                .select("*")
                .order("date", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error fetching history:", error);
                throw error;
            }
            return data;
        }
    });

    return (
        <div className="p-8 bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
            <h1 className="text-2xl font-bold mb-4">Balance History Debug</h1>

            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">Error: {(error as any).message}</p>}

            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="p-2">Date (UTC)</th>
                            <th className="p-2">Total Balance</th>
                            <th className="p-2">Savings</th>
                            <th className="p-2">Investments</th>
                            <th className="p-2">Crypto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(history || []).map((h: any) => (
                            <tr key={h.id} className="border-b border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                <td className="p-2 font-mono">{new Date(h.date).toISOString().split('T')[0]} <span className="text-gray-500">{new Date(h.date).toLocaleTimeString()}</span></td>
                                <td className="p-2 font-bold">{Number(h.total_balance).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                <td className="p-2">{Number(h.savings_balance).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                <td className="p-2">{Number(h.investments_balance).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                <td className="p-2">{Number(h.crypto_balance).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                            </tr>
                        ))}
                        {history?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center">No snapshot data found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
