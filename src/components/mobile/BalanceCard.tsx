import { useState } from "react";
import { Eye, EyeOff, PiggyBank, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  currency?: string;
  subtitle?: string;
  savingsTotal?: number;
  investmentsTotal?: number;
  cryptoTotal?: number;
  className?: string;
}

export function BalanceCard({
  balance,
  currency = "EUR",
  subtitle,
  savingsTotal = 0,
  investmentsTotal = 0,
  cryptoTotal = 0,
  className,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "gradient-primary text-white",
        "glow-primary",
        className
      )}
    >
      <div className="relative z-10">
        {/* Main balance - top section */}
        <div className="mb-6">
          <p className="text-sm font-medium text-white/80">Balance</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-4xl font-bold tracking-tight">
              {hidden ? "••••••" : formatCurrency(balance, currency)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHidden(!hidden)}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {subtitle && (
            <p className="text-sm text-white/60 mt-2 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60" />
              {subtitle}
            </p>
          )}
        </div>

        {/* Savings, Crypto & Investments - 3 columns */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
          {/* Savings */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-white/10 rounded-full">
                <PiggyBank className="h-3 w-3 text-white/90" />
              </div>
              <span className="text-[10px] text-white/70 truncate">Ahorros</span>
            </div>
            <span className="text-sm font-semibold truncate pl-1">
              {hidden ? "•••" : formatCurrency(savingsTotal, currency)}
            </span>
          </div>

          {/* Crypto */}
          <div className="flex flex-col gap-1 min-w-0 items-center text-center border-l border-r border-white/10 px-1">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-white/10 rounded-full">
                {/* Coins icon isn't imported yet, assuming available or use fallback */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-white/90"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                  <path d="M7 6h1v4" />
                  <path d="m16.71 13.88.7.71-2.82 2.82" />
                </svg>
              </div>
              <span className="text-[10px] text-white/70 truncate">Crypto</span>
            </div>
            <span className="text-sm font-semibold truncate pl-1">
              {hidden ? "•••" : formatCurrency(cryptoTotal, currency)}
            </span>
          </div>

          {/* Investments */}
          <div className="flex flex-col gap-1 min-w-0 items-end text-right">
            <div className="flex items-center gap-1.5 flex-row-reverse">
              <div className="p-1 bg-white/10 rounded-full">
                <TrendingUp className="h-3 w-3 text-white/90" />
              </div>
              <span className="text-[10px] text-white/70 truncate">Inversiones</span>
            </div>
            <span className="text-sm font-semibold truncate pr-1">
              {hidden ? "•••" : formatCurrency(investmentsTotal, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Decorative background circles */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-black/10 rounded-full blur-xl" />
    </div>
  );
}
