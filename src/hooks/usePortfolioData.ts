
import { useState, useEffect, useMemo, useRef } from "react";
import { binanceService, BinanceService, Kline } from "@/services/binance";

export interface PortfolioAsset {
    symbol: string;
    quantity: number;
}

export interface ChartDataPoint {
    time: number;
    value: number;
    isLive: boolean; // True only for the very last pulsing point
}

export function usePortfolioData(assets: PortfolioAsset[], interval: "1D" | "7D" | "30D" | "1Y") {
    const [historyData, setHistoryData] = useState<ChartDataPoint[]>([]);
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);

    // 1. Fetch Historical Aggregated Data
    useEffect(() => {
        const fetchHistory = async () => {
            if (assets.length === 0) {
                setHistoryData([]);
                return;
            }

            setIsLoading(true);
            try {
                const { interval: binanceInterval, limit } = BinanceService.getBinanceConfig(interval);

                // Fetch all assets in parallel
                const results = await Promise.all(
                    assets.map(async (asset) => {
                        const klines = await binanceService.getKlines(asset.symbol, binanceInterval, limit);
                        return { symbol: asset.symbol, quantity: asset.quantity, klines };
                    })
                );

                // Check if we have valid data
                const validResults = results.filter(r => r.klines.length > 0);
                if (validResults.length === 0) {
                    setHistoryData([]);
                    return;
                }

                // Create a Time Map: { timestamp -> { symbol: price } }
                // To support forward-fill, we actually need to iterate time chronologically.

                // 1. Gather all unique timestamps and organizing prices
                const assetPricesByTime: Record<number, Record<string, number>> = {};
                const allTimestamps = new Set<number>();

                validResults.forEach(({ symbol, klines }) => {
                    klines.forEach(k => {
                        const time = k.closeTime;
                        allTimestamps.add(time);
                        if (!assetPricesByTime[time]) assetPricesByTime[time] = {};
                        assetPricesByTime[time][symbol] = parseFloat(k.close);
                    });
                });

                const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

                // 2. Forward-Fill aggregation
                const aggregated: ChartDataPoint[] = [];
                const lastPrices: Record<string, number> = {};
                // Initialize lastPrices with current first available or 0? 
                // Better: Iterate and fill as we go.

                sortedTimestamps.forEach(time => {
                    // Update latest prices for this timestamp
                    const pricesAtTime = assetPricesByTime[time];
                    if (pricesAtTime) {
                        for (const [symbol, price] of Object.entries(pricesAtTime)) {
                            lastPrices[symbol] = price;
                        }
                    }

                    // Calculate total value using LATEST known prices for ALL assets
                    // (Forward fill: if asset B has no candle at T, use its price from T-1)
                    let totalVal = 0;
                    let hasData = false;

                    assets.forEach(asset => {
                        const price = lastPrices[asset.symbol];
                        if (price !== undefined) {
                            totalVal += price * asset.quantity;
                            hasData = true;
                        }
                    });

                    // Only add point if we have at least one price (avoids strictly zero start if misalignment)
                    if (hasData) {
                        aggregated.push({ time, value: totalVal, isLive: false });
                    }
                });

                setHistoryData(aggregated);

            } catch (err) {
                console.error("Failed to build portfolio history", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [JSON.stringify(assets), interval]); // Deep compare assets (simple generic check)

    // 2. Real-time Subscription (Combined Streams)
    useEffect(() => {
        const symbols = assets.map(a => a.symbol);
        if (symbols.length === 0) return;

        const unsubscribe = binanceService.subscribeToTicker(symbols, (data) => {
            // data.s = symbol, data.c = price
            if (data.s && data.c) {
                const cleanSymbol = data.s.replace("USDT", "");
                setLivePrices(prev => ({
                    ...prev,
                    [cleanSymbol]: parseFloat(data.c)
                }));
            }
        });

        return () => unsubscribe();
    }, [JSON.stringify(assets.map(a => a.symbol))]);

    // 3. Compute Final Data (History + Live Tail)
    const chartData = useMemo(() => {
        if (historyData.length === 0) return [];

        // Clone history
        const data = [...historyData];

        // Determine the "Live" value based on latest prices
        // If we have live prices, we calculate the CURRENT total
        const updateLiveValue = () => {
            // If no live prices yet, maybe use the last history point?
            // But we want to pulse with REAL data.
            if (Object.keys(livePrices).length === 0) return null;

            let totalLive = 0;
            let usedAssets = 0;

            assets.forEach(asset => {
                let price = livePrices[asset.symbol];
                // Fallback to history close price if live not received yet?
                if (!price && (asset.symbol === "USDT" || asset.symbol === "USD")) price = 1.0;

                if (price) {
                    totalLive += price * asset.quantity;
                    usedAssets++;
                }
            });

            // Only return if we have a representative sum (optional logic)
            return totalLive;
        };

        const liveVal = updateLiveValue();

        if (liveVal !== null) {
            // Replace or Append?
            // User spec: "Crear un punto 'vivo' al final del gráfico"
            // Usually we append "Now"
            data.push({
                time: Date.now(),
                value: liveVal,
                isLive: true
            });
        }

        return data;
    }, [historyData, livePrices, assets]);

    return { chartData, isLoading, livePrices };
}
