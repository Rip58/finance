import { useState } from "react";
import { Eye, EyeOff, PiggyBank, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  currency?: string;
  subtitle?: string;
  savingsTotal?: number;
  investmentsTotal?: number;
  className?: string;
}

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function BalanceCard({
  balance,
  currency = "EUR",
  subtitle,
  savingsTotal = 0,
  investmentsTotal = 0,
  className,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5",
        "bg-primary text-primary-foreground",
        "shadow-lg",
        className
      )}
    >
      
      <div className="relative z-10 flex justify-between">
        {/* Left side - Main balance */}
        <div className="flex-1">
          <p className="text-xs font-medium opacity-90">Balance</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight">
              {hidden ? "••••••" : formatCurrency(balance, currency)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHidden(!hidden)}
              className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-background/10"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {subtitle && (
            <p className="text-xs opacity-75 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-current opacity-60" />
              {subtitle}
            </p>
          )}
        </div>

        {/* Right side - Savings & Investments */}
        <div className="flex flex-col items-end justify-center gap-2 pl-4 border-l border-primary-foreground/20">
          <div className="flex items-center gap-1.5">
            <PiggyBank className="h-3.5 w-3.5 opacity-70" />
            <span className="text-xs opacity-80">Ahorros</span>
            <span className="text-sm font-semibold">
              {hidden ? "••••" : formatCurrency(savingsTotal, currency)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 opacity-70" />
            <span className="text-xs opacity-80">Inversiones</span>
            <span className="text-sm font-semibold">
              {hidden ? "••••" : formatCurrency(investmentsTotal, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
