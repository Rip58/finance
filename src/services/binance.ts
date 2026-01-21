
export interface Kline {
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: number;
}

export class BinanceService {
    // 1. Fuente de Datos (Binance Vision)
    private static BASE_URL = "https://data-api.binance.vision/api/v3";
    private static WS_BASE_URL = "wss://data-stream.binance.vision:9443";

    private activeWs: WebSocket | null = null;

    // Map App Interval -> Binance Interval & Limit
    static getBinanceConfig(interval: string) {
        switch (interval) {
            case "1D": return { interval: "5m", limit: 288 }; // 24h / 5m = 288 points
            case "7D": return { interval: "1h", limit: 168 }; // 7d * 24h = 168 points
            case "30D": return { interval: "4h", limit: 180 }; // 30d * 6 = 180 points
            case "1Y": return { interval: "1d", limit: 365 };
            default: return { interval: "1h", limit: 168 };
        }
    }

    /**
     * Fetch Historical K-lines for a single symbol
     */
    async getKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
        const upperSymbol = symbol.toUpperCase();
        // Handle Stablecoins: Artificial flat line History
        if (upperSymbol === "USDT" || upperSymbol === "USD") {
            return this.generateStablecoinHistory(limit, interval);
        }

        const pair = upperSymbol.endsWith("USDT") ? upperSymbol : `${upperSymbol}USDT`;

        try {
            const response = await fetch(
                `${BinanceService.BASE_URL}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`
            );

            if (!response.ok) {
                // Return empty if symbol not found or error (graceful degradation)
                console.warn(`BinanceService: Failed to fetch klines for ${pair}`);
                return [];
            }

            const data = await response.json();
            // Data format: [ [openTime, open, high, low, close, volume, closeTime, ...], ... ]
            return data.map((d: any[]) => ({
                openTime: d[0],
                open: d[1],
                high: d[2],
                low: d[3],
                close: d[4],
                volume: d[5],
                closeTime: d[6]
            }));

        } catch (error) {
            console.error(`BinanceService: Network error for ${pair}`, error);
            return [];
        }
    }

    /**
     * Subscribe to Real-time Ticker for MULTIPLE symbols (Combined Streams)
     */
    subscribeToTicker(symbols: string[], onData: (data: any) => void): () => void {
        if (this.activeWs) {
            this.activeWs.close();
        }

        // Filter valid symbols
        const validSymbols = symbols.filter(s => s !== "USDT" && s !== "USD");
        if (validSymbols.length === 0) return () => { };

        // Format streams: <symbol>usdt@ticker
        // joined by '/' for Combined Streams
        const streams = validSymbols.map(s => {
            const pair = s.toLowerCase().endsWith("usdt") ? s.toLowerCase() : `${s.toLowerCase()}usdt`;
            return `${pair}@ticker`;
        }).join("/");

        const url = `${BinanceService.WS_BASE_URL}/stream?streams=${streams}`;

        console.log(`BinanceService: Connecting WS to ${url}`);
        this.activeWs = new WebSocket(url);

        this.activeWs.onopen = () => console.log("BinanceService: WS Connected");

        this.activeWs.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Combined stream format: { stream: "btcusdt@ticker", data: { s: "BTCUSDT", c: "..." } }
                if (message && message.data) {
                    onData(message.data);
                }
            } catch (e) { /* ignore parse errors */ }
        };

        this.activeWs.onerror = (e) => console.error("BinanceService: WS Error", e);

        return () => {
            if (this.activeWs) {
                this.activeWs.close();
                this.activeWs = null;
            }
        };
    }

    // Helper: Generate flat line for stablecoins
    private generateStablecoinHistory(limit: number, interval: string): Kline[] {
        const arr: Kline[] = [];
        const now = Date.now();
        // Approximation of time step
        let stepMs = 3600000;
        if (interval === "5m") stepMs = 300000;
        else if (interval === "4h") stepMs = 14400000;
        else if (interval === "1d") stepMs = 86400000;

        for (let i = limit; i > 0; i--) {
            arr.push({
                openTime: now - (i * stepMs),
                closeTime: now - ((i - 1) * stepMs),
                open: "1.0",
                high: "1.0",
                low: "1.0",
                close: "1.0",
                volume: "0"
            });
        }
        return arr;
    }
}

export const binanceService = new BinanceService();
