
import { useState, useEffect, useMemo, useRef } from "react";
import { BinanceService, binanceService, Kline } from "../services/binance";
import { format } from "date-fns";

export interface PortfolioAsset {
    symbol: string;
    quantity: number;
}

export interface ChartDataPoint {
    time: number;
    label: string;
    value: number;
    isLive?: boolean;
}

interface UseBinancePortfolioProps {
    assets: PortfolioAsset[];
    interval: "1D" | "7D" | "30D" | "6M" | "1Y";
    fiatBalance: number;
    usdtEurRate: number; // To convert crypto (USDT) to EUR
}

export function useBinancePortfolio({ assets, interval, fiatBalance, usdtEurRate }: UseBinancePortfolioProps) {
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});

    // Ref to keep track of the latest prices for the "Live" point calculation
    // We use a ref to access it inside the WS callback without re-binding
    const pricesRef = useRef<Record<string, number>>({});
    const lastUpdateRef = useRef<number>(0);

    // 1. Fetch Historical Data
    useEffect(() => {
        const fetchHistory = async () => {
            if (assets.length === 0) return;

            setIsLoading(true);
            try {
                const binanceInterval = BinanceService.getBinanceInterval(interval);
                const limit = BinanceService.getLimit(interval);

                // Filter out Stablecoins (USDT/USD) that don't need fetching
                // We assume their price is always 1.0 USD
                const fetchableAssets = assets.filter(a => a.symbol !== "USDT" && a.symbol !== "USD");
                const stableAssets = assets.filter(a => a.symbol === "USDT" || a.symbol === "USD");

                // Fetch klines for fetchable assets in parallel
                const promises = fetchableAssets.map(asset =>
                    binanceService.getKlines(asset.symbol, binanceInterval, limit)
                        .then(klines => ({ symbol: asset.symbol, klines }))
                );

                const results = await Promise.all(promises);

                // Map Results to a dictionary: symbol -> klines
                const assetKlines: Record<string, Kline[]> = {};
                results.forEach(res => {
                    assetKlines[res.symbol] = res.klines;
                });

                // Determine common timestamps
                // Use first result as baseline, or create synthetic if only stables exist
                let baseKlines: Kline[] = [];
                if (results.length > 0) {
                    baseKlines = results[0].klines;
                } else if (stableAssets.length > 0) {
                    // If we only have stablecoins, create synthetic history
                    // specific for the requested interval
                    const now = Date.now();
                    // This is a simplified fallback; for a perfect line we might need real ticks
                    // But for stables, value is constant.
                    baseKlines = [{ closeTime: now, close: "1.0", open: "1.0", high: "1.0", low: "1.0", volume: "0" } as any];
                }

                if (baseKlines.length === 0) {
                    setData([]);
                    return;
                }

                const chartPoints: ChartDataPoint[] = [];

                // Seed initial live prices
                const initialPrices: Record<string, number> = {};

                // Set Stables to 1.0
                stableAssets.forEach(a => {
                    initialPrices[a.symbol] = 1.0;
                });

                // Set Fetched Assets to last kline close
                results.forEach(res => {
                    const klines = res.klines;
                    if (klines && klines.length > 0) {
                        initialPrices[res.symbol] = parseFloat(klines[klines.length - 1].close);
                    }
                });

                setLivePrices(initialPrices);
                pricesRef.current = initialPrices;

                // Build Historical Points
                for (let i = 0; i < baseKlines.length; i++) {
                    const timestamp = baseKlines[i].closeTime;
                    let cryptoValueUsd = 0;

                    // Sum Fetchable Assets
                    for (const asset of fetchableAssets) {
                        const klines = assetKlines[asset.symbol];
                        if (klines && klines[i]) {
                            const price = parseFloat(klines[i].close);
                            cryptoValueUsd += price * asset.quantity;
                        } else if (klines && klines.length > 0) {
                            // Fallback to last known if index mismatch
                            const price = parseFloat(klines[klines.length - 1].close);
                            cryptoValueUsd += price * asset.quantity;
                        }
                    }

                    // Sum Stable Assets (Price = 1.0)
                    for (const asset of stableAssets) {
                        cryptoValueUsd += 1.0 * asset.quantity;
                    }

                    const cryptoValueEur = cryptoValueUsd * usdtEurRate;
                    const totalValue = fiatBalance + cryptoValueEur;

                    chartPoints.push({
                        time: timestamp,
                        label: formatLabel(timestamp, interval),
                        value: totalValue
                    });
                }

                setData(chartPoints);
            } catch (err) {
                console.error("Error fetching historical portfolio:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [assets, interval, fiatBalance, usdtEurRate]); // Re-fetch only when major props change

    // 2. Real-time updates via WebSocket (Aggregated ticker)
    useEffect(() => {
        // Subscribe to all symbols
        const symbols = assets.map(a => a.symbol);
        if (symbols.length === 0) return;

        // Callback for WS data
        // Binance specific payload: { s: "BTCUSDT", c: "1234.56", ... }
        const handleTicker = (tickerData: any) => {
            const rawSymbol = tickerData.s; // e.g. BTCUSDT
            const rawPrice = tickerData.c;  // e.g. "23000.00"

            if (!rawSymbol || !rawPrice) return;

            // Remove USDT suffix to match our internal asset symbols
            const symbol = rawSymbol.replace("USDT", "");

            setLivePrices(prev => ({
                ...prev,
                [symbol]: parseFloat(rawPrice)
            }));
        };

        const unsubscribe = binanceService.subscribeToTicker(symbols, handleTicker);

        return () => {
            unsubscribe();
        };
    }, [assets]); // Re-subscribe if assets list changes

    return { data, isLoading, livePrices };
}

function formatLabel(timestamp: number, interval: string): string {
    const date = new Date(timestamp);
    if (interval === "1D") return format(date, "HH:mm");
    if (interval === "7D" || interval === "30D" || interval === "15D") return format(date, "dd MMM");
    if (interval === "6M" || interval === "1Y") return format(date, "MMM yy");
    return format(date, "dd MMM");
}
