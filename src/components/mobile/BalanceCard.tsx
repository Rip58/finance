import { useState } from "react";
import { Eye, EyeOff, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  currency?: string;
  subtitle?: string;
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
  className,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground",
        "shadow-lg",
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-4 right-4 opacity-20">
        <CreditCard className="h-16 w-16" />
      </div>
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-background/10" />
      
      <div className="relative z-10">
        <p className="text-sm font-medium opacity-90">Balance</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-3xl font-bold tracking-tight">
            {hidden ? "••••••" : formatCurrency(balance, currency)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHidden(!hidden)}
            className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-background/10"
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {subtitle && (
          <p className="text-sm opacity-75 mt-3 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
