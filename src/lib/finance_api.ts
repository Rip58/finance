
export interface AssetPrice {
    symbol: string;
    name?: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number | null; // Can be null when market is closed
    volume?: number;
    timestamp: number;
    marketClosed?: boolean; // NEW: Indicates if market was closed when fetched
    lastTradingDay?: string; // NEW: YYYY-MM-DD of the price data
}

// Basic mapping for common institutional asset names/tickers to Yahoo Finance symbols
export const SYMBOL_MAP: Record<string, string> = {
    // Gold
    'XAU': 'GC=F',
    'GOLD': 'GC=F',
    // S&P 500
    'SPY': 'SPY', // ETF
    'SP500': '^GSPC', // Index
    'S&P500': '^GSPC',
    // Silver
    'XAG': 'SI=F',
    'SILVER': 'SI=F',
    // Euro
    'EUR': 'EURUSD=X',
    // Others
    'AAPL': 'AAPL',
    'GOOGL': 'GOOGL',
    'MSFT': 'MSFT',
    'NVDA': 'NVDA',
    'TSLA': 'TSLA',
};

// List of symbols that should never be fetched from Crypto APIs (Binance/CoinGecko)
// to avoid matching meme tokens with same tickers
export const INSTITUTIONAL_SYMBOLS = [
    'XAU', 'GOLD',
    'SPY', 'SP500', 'S&P500',
    'XAG', 'SILVER',
    'EUR', 'EURUSD',
    'AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX'
];

/**
 * Resolves a user-provided symbol to a Yahoo Finance symbol.
 * Defaults to the symbol itself if no mapping exists.
 */
export const resolveAssetSymbol = (symbol: string): string => {
    const upperSym = symbol.toUpperCase();
    return SYMBOL_MAP[upperSym] || upperSym;
};

import { STATIC_ASSET_MAP } from './assetMappings';

// Keep NAME_TO_SYMBOL for backward compatibility
export const NAME_TO_SYMBOL = STATIC_ASSET_MAP;

// Result type for symbol search
export interface SymbolSearchResult {
    symbol: string;
    name: string;
    source: 'local' | 'online';
}

// Helper for fetch with timeout
interface FetchOptions extends RequestInit {
    timeout?: number;
}

const fetchWithTimeout = async (resource: string, options: FetchOptions = {}) => {
    const { timeout = 8000, ...rest } = options; // 8s timeout default
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...rest,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// New function for explicit button-triggered search
export const searchSymbolOnline = async (
    nameQuery: string,
    assetType?: 'crypto' | 'institutional'
): Promise<SymbolSearchResult | null> => {
    if (!nameQuery || nameQuery.length < 3) return null;

    const upperName = nameQuery.toUpperCase().trim();

    // 1. Check local static map first (instant result)
    if (STATIC_ASSET_MAP[upperName]) {
        return {
            symbol: STATIC_ASSET_MAP[upperName],
            name: nameQuery,
            source: 'local'
        };
    }

    // 2. Partial match in static map
    const localEntry = Object.entries(STATIC_ASSET_MAP).find(([key]) =>
        upperName.includes(key) || key.includes(upperName)
    );
    if (localEntry) {
        return {
            symbol: localEntry[1],
            name: nameQuery,
            source: 'local'
        };
    }

    // 3A. If asset type is crypto, ONLY search CoinGecko
    if (assetType === 'crypto') {
        try {
            const response = await fetchWithTimeout(
                `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(nameQuery)}`,
                { timeout: 5000 }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.coins && data.coins.length > 0) {
                    const coin = data.coins[0];
                    return {
                        symbol: coin.symbol.toUpperCase(),
                        name: coin.name,
                        source: 'online'
                    };
                }
            }
        } catch (e) {
            console.warn("CoinGecko search failed:", e);
        }
        return null; // Don't try Alpha Vantage for crypto
    }

    // 3B. If asset type is institutional, ONLY search Alpha Vantage
    if (assetType === 'institutional') {
        try {
            const alphaVantageKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'HZMXGN5NP06VS6UZ';

            const response = await fetchWithTimeout(
                `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(nameQuery)}&apikey=${alphaVantageKey}`,
                { timeout: 5000 }
            );

            if (response.ok) {
                const data = await response.json();

                if (data.Information) {
                    console.warn("Alpha Vantage rate limit:", data.Information);
                    return null;
                }

                if (data.bestMatches && data.bestMatches.length > 0) {
                    const usMatch = data.bestMatches.find((match: any) => match["4. region"] === "United States");
                    const bestMatch = usMatch || data.bestMatches[0];

                    return {
                        symbol: bestMatch["1. symbol"],
                        name: bestMatch["2. name"],
                        source: 'online'
                    };
                }
            }
        } catch (e) {
            console.warn("Alpha Vantage search failed:", e);
        }
        return null; // Don't try CoinGecko for stocks
    }

    // 3C. LEGACY: If no asset type specified, try both (backwards compatibility)
    // Try CoinGecko first
    try {
        const response = await fetchWithTimeout(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(nameQuery)}`,
            { timeout: 5000 }
        );

        if (response.ok) {
            const data = await response.json();
            if (data.coins && data.coins.length > 0) {
                const coin = data.coins[0];
                return {
                    symbol: coin.symbol.toUpperCase(),
                    name: coin.name,
                    source: 'online'
                };
            }
        }
    } catch (e) {
        console.warn("CoinGecko search failed:", e);
    }

    // Try Alpha Vantage for stocks
    try {
        const alphaVantageKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'HZMXGN5NP06VS6UZ';

        const response = await fetchWithTimeout(
            `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(nameQuery)}&apikey=${alphaVantageKey}`,
            { timeout: 5000 }
        );

        if (response.ok) {
            const data = await response.json();

            if (data.Information) {
                console.warn("Alpha Vantage rate limit:", data.Information);
                return null;
            }

            if (data.bestMatches && data.bestMatches.length > 0) {
                const usMatch = data.bestMatches.find((match: any) => match["4. region"] === "United States");
                const bestMatch = usMatch || data.bestMatches[0];

                return {
                    symbol: bestMatch["1. symbol"],
                    name: bestMatch["2. name"],
                    source: 'online'
                };
            }
        }
    } catch (e) {
        console.warn("Alpha Vantage search failed:", e);
    }
    return null;
};

// Legacy function kept for backward compatibility
export const findSymbolByName = (name: string): string | null => {
    if (!name) return null;
    const upperName = name.toUpperCase().trim();
    // 1. Direct match
    if (NAME_TO_SYMBOL[upperName]) return NAME_TO_SYMBOL[upperName];

    // 2. Partial match (starts with) for common cases
    const entry = Object.entries(NAME_TO_SYMBOL).find(([key]) => upperName.includes(key));
    return entry ? entry[1] : null;
};

// Helper: Determine if a symbol is crypto based on STATIC_ASSET_MAP position
// Crypto assets are listed first (before "APPLE")
export const isCryptoSymbol = (symbol: string): boolean => {
    const upperSymbol = symbol.toUpperCase();

    // Common crypto symbols
    const knownCrypto = [
        'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'USDC', 'ADA', 'AVAX', 'DOGE',
        'TRX', 'DOT', 'LINK', 'MATIC', 'SHIB', 'LTC', 'DAI', 'BCH', 'UNI', 'ATOM',
        'XLM', 'XMR', 'ETC', 'FIL', 'NEAR', 'HBAR', 'APT', 'CRO', 'VET', 'QNT',
        'ALGO', 'GRT', 'FTM', 'SAND', 'MANA', 'RVN', 'AXS', 'THETA', 'AAVE', 'MKR',
        'RUNE', 'KAVA', 'ZEC', 'DASH', 'EOS', 'CAKE', 'ENJ', 'CHZ', 'GALA', 'LDO'
    ];

    return knownCrypto.includes(upperSymbol);
};


/**
 * Fetches asset price from Yahoo Finance via a CORS proxy.
 * @param symbol Yahoo Finance symbol (e.g., 'GC=F' for Gold, '^GSPC' for S&P 500)
 */
// Helper to get historical variation
const calculateVariation = (currentPrice: number, history: { price: number, date: string }[], days: number): number | null => {
    if (!history || history.length === 0) return null;

    // Find the price 'days' ago.
    // Since markets aren't open every day, we look for the entry closest to (today - days)
    // but NOT after that target date.
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // History is usually sorted by date desc or asc. Let's assume we sort it desc for safety.
    const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));

    // Find first entry where date <= targetDateStr
    const pastEntry = sortedHistory.find(h => h.date <= targetDateStr);

    if (pastEntry) {
        return ((currentPrice - pastEntry.price) / pastEntry.price) * 100;
    }

    return null;
};

export const fetchAssetPrice = async (symbol: string): Promise<AssetPrice & { change7d: number | null, change30d: number | null }> => {
    // 1. Try Yahoo Finance via Proxy first (Faster, less rate limited)
    try {
        const yahooSymbol = resolveAssetSymbol(symbol);
        // Fetch 3 months to be safe for 30d calculation
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=3mo`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await fetchWithTimeout(proxyUrl, { timeout: 8000 });
        if (!response.ok) throw new Error(`Yahoo Proxy Error: ${response.status}`);

        const data = await response.json();
        const result = data.chart?.result?.[0];
        if (!result) throw new Error(`No data found for ${symbol}`);

        const meta = result.meta;
        const timestamps = result.timestamp || [];
        const quotes = result.indicators?.quote?.[0] || {};
        const closes = quotes.close || [];

        const currentPrice = meta.regularMarketPrice;

        // Reconstruct history
        const history = timestamps.map((ts: number, i: number) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            price: closes[i]
        })).filter((h: any) => h.price != null); // Filter out nulls

        const change7d = calculateVariation(currentPrice, history, 7);
        const change30d = calculateVariation(currentPrice, history, 30);

        // Calculate 24h change manually if needed, or use meta
        const prevClose = meta.chartPreviousClose;
        const change24h = currentPrice - prevClose;
        const changePercent24h = (change24h / prevClose) * 100;

        // Get last trading day from Yahoo meta
        const lastTradingDay = new Date((meta.regularMarketTime || Date.now() / 1000) * 1000).toISOString().split('T')[0];

        return {
            symbol: symbol,
            name: symbol,
            price: currentPrice,
            currency: meta.currency || "USD",
            change: change24h,
            changePercent: changePercent24h,
            change7d,
            change30d,
            volume: result.indicators?.quote?.[0]?.volume?.slice(-1)[0] || 0,
            timestamp: meta.regularMarketTime || Math.floor(Date.now() / 1000),
            marketClosed: false, // You might calculate this if needed
            lastTradingDay
        };

    } catch (yahooError) {
        console.warn(`[fetchAssetPrice] Yahoo failed for ${symbol}, trying Alpha Vantage fallback...`, yahooError);

        // 2. Fallback to Alpha Vantage (Slower, rate limited)
        const alphaVantageKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'HZMXGN5NP06VS6UZ';

        try {
            // Parallel fetch: Current price (realtime/delayed) AND History
            const [quoteRec, historyRec] = await Promise.all([
                fetchWithTimeout(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${alphaVantageKey}`, { timeout: 8000 }),
                fetchWithTimeout(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${alphaVantageKey}`, { timeout: 8000 })
            ]);

            if (!quoteRec.ok) throw new Error(`Alpha Vantage Quote HTTP ${quoteRec.status}`);
            const quoteData = await quoteRec.json();

            if (quoteData["Note"]) throw new Error("Alpha Vantage rate limit");
            if (quoteData["Error Message"]) throw new Error("Alpha Vantage error");

            const quote = quoteData["Global Quote"];
            if (!quote || !quote["05. price"]) throw new Error(`No price data for ${symbol}`);

            const currentPrice = parseFloat(quote["05. price"]);
            const lastTradingDay = quote["07. latest trading day"]; // YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0];
            const marketClosed = lastTradingDay !== today;
            const volume = parseFloat(quote["06. volume"]) || 0;

            let change7d = null;
            let change30d = null;

            if (historyRec.ok) {
                const historyData = await historyRec.json();
                const timeSeries = historyData["Time Series (Daily)"];
                if (timeSeries) {
                    const history = Object.entries(timeSeries).map(([date, val]: [string, any]) => ({
                        date,
                        price: parseFloat(val["4. close"])
                    }));

                    change7d = calculateVariation(currentPrice, history, 7);
                    change30d = calculateVariation(currentPrice, history, 30);
                }
            }

            console.log(`[fetchAssetPrice] ${symbol} (AV): price=${currentPrice}, 7d=${change7d?.toFixed(2)}%, 30d=${change30d?.toFixed(2)}%`);

            return {
                symbol,
                name: symbol,
                price: currentPrice,
                currency: "USD",
                change: parseFloat(quote["09. change"]),
                changePercent: quote["10. change percent"] ? parseFloat(quote["10. change percent"].replace('%', '')) : 0,
                change7d,
                change30d,
                volume,
                timestamp: Math.floor(Date.now() / 1000),
                marketClosed,
                lastTradingDay
            };
        } catch (avError) {
            console.error(`[fetchAssetPrice] All providers failed for ${symbol}`);
            return {
                symbol,
                name: symbol,
                price: 0,
                currency: "USD",
                change: 0,
                changePercent: null,
                change7d: null,
                change30d: null,
                volume: 0,
                timestamp: Math.floor(Date.now() / 1000),
                marketClosed: true,
                lastTradingDay: new Date().toISOString().split('T')[0] // Fallback to today
            };
        }
    }
};
