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
        <div className="mb-8">
          <p className="text-xs font-semibold text-white/60 tracking-wider uppercase mb-1">Total Balance</p>
          <div className="flex items-center gap-4">
            {hidden ? (
              <div className="h-10 w-48 bg-white/20 rounded-lg animate-pulse backdrop-blur-md" />
            ) : (
              <span className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                {formatCurrency(balance, currency)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHidden(!hidden)}
              className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {subtitle && (
            <div className="flex items-center gap-2 mt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-xs text-white/70 font-medium">
                {subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Savings, Crypto & Investments - 3 columns */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          {/* Savings */}
          <div className="flex flex-col gap-1.5 group">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 bg-white/10 rounded-full">
                <PiggyBank className="h-3 w-3 text-white" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide">Ahorros</span>
            </div>
            {hidden ? (
              <div className="h-5 w-16 bg-white/10 rounded-md backdrop-blur-sm" />
            ) : (
              <span className="text-sm font-semibold pl-1">
                {formatCurrency(savingsTotal, currency)}
              </span>
            )}
          </div>

          {/* Crypto */}
          <div className="flex flex-col gap-1.5 items-center text-center border-l border-r border-white/10 px-2 group">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 bg-white/10 rounded-full">
                {/* Coins icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-white"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                  <path d="M7 6h1v4" />
                  <path d="m16.71 13.88.7.71-2.82 2.82" />
                </svg>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide">Crypto</span>
            </div>
            {hidden ? (
              <div className="h-5 w-16 bg-white/10 rounded-md backdrop-blur-sm" />
            ) : (
              <span className="text-sm font-semibold pl-1">
                {formatCurrency(cryptoTotal, currency)}
              </span>
            )}
          </div>

          {/* Investments */}
          <div className="flex flex-col gap-1.5 items-end text-right group">
            <div className="flex items-center gap-1.5 flex-row-reverse opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 bg-white/10 rounded-full">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide">Inversiones</span>
            </div>
            {hidden ? (
              <div className="h-5 w-16 bg-white/10 rounded-md backdrop-blur-sm" />
            ) : (
              <span className="text-sm font-semibold pr-1">
                {formatCurrency(investmentsTotal, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decorative background circles */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-black/10 rounded-full blur-xl" />
    </div>
  );
}
