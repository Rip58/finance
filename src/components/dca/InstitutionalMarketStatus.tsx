import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function InstitutionalMarketStatus() {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isOpen, setIsOpen] = useState<boolean>(false);

    useEffect(() => {
        const calculateStatus = () => {
            const now = new Date();

            // Convert to New York time
            const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
            const day = nyTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const hour = nyTime.getHours();
            const minute = nyTime.getMinutes();

            // Market Hours: 09:30 - 16:00 ET, Mon-Fri
            const marketOpenHour = 9;
            const marketOpenMinute = 30;
            const marketCloseHour = 16;
            const marketCloseMinute = 0;

            const isWeekend = day === 0 || day === 6;

            // Check if currently open
            let currentlyOpen = false;
            if (!isWeekend) {
                if (hour > marketOpenHour && hour < marketCloseHour) {
                    currentlyOpen = true;
                } else if (hour === marketOpenHour && minute >= marketOpenMinute) {
                    currentlyOpen = true;
                }
            }

            setIsOpen(currentlyOpen);

            if (currentlyOpen) {
                setTimeLeft("");
                return;
            }

            // Calculate time until next open
            const getETDate = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));

            const nowET = getETDate();
            let targetET = new Date(nowET);
            targetET.setHours(marketOpenHour, marketOpenMinute, 0, 0);

            // Logic to advance targetET
            // If today is weekend, skip to Monday
            if (day === 6) targetET.setDate(targetET.getDate() + 2); // Sat -> Mon
            else if (day === 0) targetET.setDate(targetET.getDate() + 1); // Sun -> Mon
            else if (nowET.getHours() >= 16 || (nowET.getHours() === 16 && nowET.getMinutes() >= 0)) {
                // Past close, move to tomorrow
                targetET.setDate(targetET.getDate() + 1);
                // If tomorrow is Saturday, move to Monday
                if (targetET.getDay() === 6) targetET.setDate(targetET.getDate() + 2);
            } else if (nowET < targetET) {
                // It's morning before 9:30, target is today 9:30, do nothing
            }

            // Check edge case: Friday after close -> moved to Sat -> moved to Mon
            if (targetET.getDay() === 6) targetET.setDate(targetET.getDate() + 2);
            if (targetET.getDay() === 0) targetET.setDate(targetET.getDate() + 1);

            const diff = targetET.getTime() - nowET.getTime();

            if (diff <= 0) {
                // Should be open? logic might overlap slightly but useEffect runs every sec
                setTimeLeft("Calculando...");
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const pad = (n: number) => n.toString().padStart(2, '0');
            setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        };

        calculateStatus();
        const interval = setInterval(calculateStatus, 1000);

        return () => clearInterval(interval);
    }, []);

    if (isOpen) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 mb-2 w-fit">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">
                    Mercado Abierto
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-3 w-3 text-amber-600" />
                <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                    Abre en: <span className="font-bold tabular-nums ml-1">{timeLeft}</span>
                </span>
            </div>
        </div>
    );
}
