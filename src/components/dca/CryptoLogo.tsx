import { useState } from "react";
import { cn } from "@/lib/utils";

interface CryptoLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function CryptoLogo({ symbol, size = 32, className }: CryptoLogoProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSymbol = symbol.toLowerCase();
  const logoUrl = `https://assets.coincap.io/assets/icons/${normalizedSymbol}@2x.png`;

  if (hasError) {
    return (
      <div
        className={cn(
          "rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {symbol.substring(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
    />
  );
}
