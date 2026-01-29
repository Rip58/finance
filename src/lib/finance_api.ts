
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
            const response = await fetch(
                `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(nameQuery)}`
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

            const response = await fetch(
                `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(nameQuery)}&apikey=${alphaVantageKey}`
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
        const response = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(nameQuery)}`
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

        const response = await fetch(
            `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(nameQuery)}&apikey=${alphaVantageKey}`
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
/**
 * Fetches asset price from Alpha Vantage for institutional assets.
 * Includes market closed detection based on latest trading day.
 * @param symbol Stock symbol (e.g., 'TSLA', 'AAPL', 'SPY')
 */
export const fetchAssetPrice = async (symbol: string): Promise<AssetPrice> => {
    const alphaVantageKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'HZMXGN5NP06VS6UZ';

    // Use Alpha Vantage GLOBAL_QUOTE for institutional assets
    try {
        const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${alphaVantageKey}`
        );

        if (!response.ok) {
            throw new Error(`Alpha Vantage HTTP ${response.status}`);
        }

        const data = await response.json();

        // Check for rate limit or error
        if (data["Note"]) {
            console.warn(`Alpha Vantage rate limit hit: ${data["Note"]}`);
            throw new Error("Alpha Vantage rate limit exceeded");
        }

        if (data["Error Message"]) {
            throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
        }

        const quote = data["Global Quote"];

        if (!quote || !quote["05. price"]) {
            throw new Error(`No price data returned for ${symbol}`);
        }

        // Detect if market is closed by comparing latest trading day with today
        const lastTradingDay = quote["07. latest trading day"]; // Format: "YYYY-MM-DD"
        const today = new Date().toISOString().split('T')[0];
        const marketClosed = lastTradingDay !== today;

        // Parse the data
        const price = parseFloat(quote["05. price"]);
        const change = parseFloat(quote["09. change"]);
        const changePercent = parseFloat(quote["10. change percent"].replace('%', ''));
        const volume = parseFloat(quote["06. volume"]) || 0;

        console.log(`[fetchAssetPrice] ${symbol}: price=${price}, changePercent=${changePercent}, marketClosed=${marketClosed}`);

        return {
            symbol,
            name: symbol,
            price,
            currency: "USD",
            change: marketClosed ? 0 : change,
            changePercent: marketClosed ? null : changePercent, // Don't show change % when market is closed
            volume,
            timestamp: Math.floor(Date.now() / 1000),
            marketClosed
        };

    } catch (error) {
        console.error(`[fetchAssetPrice] Failed to fetch ${symbol} from Alpha Vantage:`, error);

        // Fallback to Yahoo Finance (for commodities like XAU or if Alpha Vantage fails)
        try {
            const yahooSymbol = resolveAssetSymbol(symbol);
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

            console.log(`[fetchAssetPrice] Trying Yahoo Finance fallback for ${symbol} (${yahooSymbol})`);

            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`Yahoo Proxy Error: ${response.status}`);
            }

            const data = await response.json();
            const result = data.chart?.result?.[0];

            if (!result) throw new Error(`No data found for symbol ${symbol}`);

            const quote = result.meta;
            const price = quote.regularMarketPrice;
            const prevClose = quote.chartPreviousClose;
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;

            console.log(`[fetchAssetPrice] Yahoo Finance success for ${symbol}: price=${price}`);

            return {
                symbol: symbol,
                name: symbol,
                price: price,
                currency: quote.currency || "USD",
                change: change,
                changePercent: changePercent,
                volume: result.indicators?.quote?.[0]?.volume?.[0] || 0,
                timestamp: quote.regularMarketTime || Math.floor(Date.now() / 1000),
                marketClosed: false // Yahoo doesn't provide this info reliably
            };

        } catch (yahooError) {
            console.error(`[fetchAssetPrice] Yahoo Finance also failed for ${symbol}:`, yahooError);

            // Final fallback: Return placeholder
            return {
                symbol,
                name: symbol,
                price: 0,
                currency: "USD",
                change: 0,
                changePercent: null,
                volume: 0,
                timestamp: Math.floor(Date.now() / 1000),
                marketClosed: true
            };
        }
    }
};
