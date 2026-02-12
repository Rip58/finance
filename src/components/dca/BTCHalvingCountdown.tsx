import { useState, useEffect } from "react";
import { Pickaxe } from "lucide-react";

export function BTCHalvingCountdown() {
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        const calculateTimeLeft = () => {
            // Estimated Halving Date: April 2028
            // Accurate enough for "Years, Months, Days"
            const targetDate = new Date("2028-04-20T00:00:00Z");
            const now = new Date();

            const diff = targetDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("¡Halving completado!");
                return;
            }

            // Calculate differences approximately
            // Years
            let years = targetDate.getFullYear() - now.getFullYear();
            let months = targetDate.getMonth() - now.getMonth();
            let days = targetDate.getDate() - now.getDate();

            // Adjust if negative
            if (days < 0) {
                months--;
                // Get days in previous month
                const prevMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            const parts = [];
            if (years > 0) parts.push(`${years}a`);
            if (months > 0) parts.push(`${months}m`);
            if (days > 0) parts.push(`${days}d`);

            setTimeLeft(parts.join(" "));
        };

        calculateTimeLeft();
        // Update daily (or minutely to be safe)
        const interval = setInterval(calculateTimeLeft, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
                <Pickaxe className="h-3 w-3 text-orange-600" />
                <span className="text-[10px] font-medium text-orange-600 uppercase tracking-wide">
                    Próximo Halving: <span className="font-bold tabular-nums ml-1">{timeLeft}</span>
                </span>
            </div>
        </div>
    );
}
