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
        "gradient-primary text-zinc-900", // Changed text-white to text-zinc-900 (dark)
        "glow-primary",
        className
      )}
    >
      <div className="relative z-10">
        {/* Main balance - top section */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-zinc-900/60 tracking-wider uppercase mb-1">Total Balance</p>
          <div className="flex items-center gap-4">
            {hidden ? (
              <div className="h-10 w-48 bg-black/5 rounded-lg animate-pulse backdrop-blur-md" />
            ) : (
              <span className="text-4xl font-bold tracking-tight text-zinc-900 drop-shadow-sm">
                {formatCurrency(balance, currency)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHidden(!hidden)}
              className="h-8 w-8 text-zinc-900/50 hover:text-zinc-900 hover:bg-black/5 rounded-full transition-all"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {subtitle && (
            <div className="flex items-center gap-2 mt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <p className="text-xs text-zinc-900/70 font-medium">
                {subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Savings, Crypto & Investments - 3 columns */}
        <div className="grid grid-cols-3 gap-4 border-t border-black/10 pt-4">
          {/* Savings */}
          <div className="flex flex-col gap-1.5 group">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 bg-black/5 rounded-full">
                <PiggyBank className="h-3 w-3 text-zinc-900" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide text-zinc-900">Ahorros</span>
            </div>
            {hidden ? (
              <div className="h-5 w-16 bg-black/5 rounded-md backdrop-blur-sm" />
            ) : (
              <span className="text-sm font-semibold pl-1 text-zinc-900">
                {formatCurrency(savingsTotal, currency)}
              </span>
            )}
          </div>

          {/* Crypto */}
          <div className="flex flex-col gap-1.5 items-center text-center border-l border-r border-black/10 px-2 group">
            <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 bg-black/5 rounded-full">
                {/* Coins icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 text-zinc-900"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                  <path d="M7 6h1v4" />
                  <path d="m16.71 13.88.7.71-2.82 2.82" />
                </svg>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide text-zinc-900">Crypto</span>
            </div>
            {hidden ? (
              <div className="h-5 w-16 bg-black/5 rounded-md backdrop-blur-sm" />
            ) : (
              <span className="text-sm font-semibold pl-1 text-zinc-900">
                {formatCurrency(cryptoTotal, currency)}
              </span>
            )}
          </div>

          {/* Investments */}
          <div className="flex flex-col gap-1.5 items-end text-right group">
            <div className="flex items-center gap-1.5 flex-row-reverse opacity-70 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 bg-black/5 rounded-full">
                <TrendingUp className="h-3 w-3 text-zinc-900" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide text-zinc-900">Inversiones</span>
            </div>
            {hidden ? (
              <div className="h-5 w-16 bg-black/5 rounded-md backdrop-blur-sm" />
            ) : (
              <span className="text-sm font-semibold pr-1 text-zinc-900">
                {formatCurrency(investmentsTotal, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decorative background circles - darkened for contrast on light bg */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/40 rounded-full blur-2xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/30 rounded-full blur-xl" />
    </div>
  );
}
