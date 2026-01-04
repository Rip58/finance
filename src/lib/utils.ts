import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with European format (1.000,00 €)
 * Supports EUR, USD, and USDT
 */
export const formatCurrency = (value: number, currency: string = "EUR"): string => {
  if (currency === "USDT") {
    return `${value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USDT`;
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency === "USDT" ? "USD" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format number in compact form for charts (1.5k, 2.3M)
 */
export const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("es-ES");
};

/**
 * Format percentage with sign (+/-) 
 */
export const formatPercent = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};
