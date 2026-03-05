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
        "relative overflow-hidden rounded-2xl p-5",
        "gradient-primary text-zinc-900",
        "glow-primary",
        className
      )}
    >
      <div className="relative z-10">
        {/* Main balance */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-zinc-900/60 tracking-widest uppercase mb-1">
            Total Balance
          </p>
          <div className="flex items-center gap-3">
            {hidden ? (
              <div className="h-9 w-44 bg-black/5 rounded-lg animate-pulse backdrop-blur-md" />
            ) : (
              <span className="text-3xl font-bold tracking-tight text-zinc-900 drop-shadow-sm">
                {formatCurrency(balance, currency)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHidden(!hidden)}
              className="h-7 w-7 text-zinc-900/50 hover:text-zinc-900 hover:bg-black/5 rounded-full transition-all"
            >
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {subtitle && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
              </span>
              <p className="text-[11px] text-zinc-900/70 font-medium">{subtitle}</p>
            </div>
          )}
        </div>

        {/* 3-column breakdown */}
        <div className="grid grid-cols-3 gap-3 border-t border-black/10 pt-3">
          {/* Savings */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 opacity-60">
              <PiggyBank className="h-2.5 w-2.5 text-zinc-900" />
              <span className="text-[9px] uppercase font-bold tracking-wide text-zinc-900">Ahorros</span>
            </div>
            {hidden ? (
              <div className="h-4 w-14 bg-black/5 rounded" />
            ) : (
              <span className="text-xs font-semibold text-zinc-900">
                {formatCurrency(savingsTotal, currency)}
              </span>
            )}
          </div>

          {/* Crypto */}
          <div className="flex flex-col gap-1 items-center text-center border-l border-r border-black/10 px-1">
            <div className="flex items-center gap-1 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5 text-zinc-900">
                <circle cx="8" cy="8" r="6" />
                <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                <path d="M7 6h1v4" />
                <path d="m16.71 13.88.7.71-2.82 2.82" />
              </svg>
              <span className="text-[9px] uppercase font-bold tracking-wide text-zinc-900">Crypto</span>
            </div>
            {hidden ? (
              <div className="h-4 w-14 bg-black/5 rounded" />
            ) : (
              <span className="text-xs font-semibold text-zinc-900">
                {formatCurrency(cryptoTotal, currency)}
              </span>
            )}
          </div>

          {/* Investments */}
          <div className="flex flex-col gap-1 items-end text-right">
            <div className="flex items-center gap-1 flex-row-reverse opacity-60">
              <TrendingUp className="h-2.5 w-2.5 text-zinc-900" />
              <span className="text-[9px] uppercase font-bold tracking-wide text-zinc-900">Inversiones</span>
            </div>
            {hidden ? (
              <div className="h-4 w-14 bg-black/5 rounded" />
            ) : (
              <span className="text-xs font-semibold text-zinc-900">
                {formatCurrency(investmentsTotal, currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/30 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-white/20 rounded-full blur-xl" />
    </div>
  );
}
