import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBankAccounts } from './useBankAccounts';
import { useTransactions } from './useTransactions';
import { useAssetTransactions } from './useAssetTransactions';
import { useTransfers } from './useTransfers';
import { useCurrentPrices } from './useCurrentPrices';
import { useAccountHoldings } from './useAccountHoldings';
import { useFxRates } from './useFxRates';
import { useDCAPortfolios } from './useDCAPortfolios';
import { useCategories } from './useCategories';
import { useCryptoMarketData } from './useCryptoMarketData';
import { isWithinInterval, subHours, subDays, subMonths, subYears, parseISO } from 'date-fns';

export type TimeRange = '24h' | '7d' | '1m' | '3m' | '6m' | '1y' | 'ALL';

export interface CapitalEvent {
    id: string;
    date: string; // ISO string
    type: 'deposit' | 'withdrawal' | 'buy' | 'sell';
    amount: number; // in EUR (or converted)
    currency: string;
    accountName: string;
    category: 'savings' | 'investment' | 'crypto' | 'general' | 'dca';
    notes?: string;
    variationPercent?: number; // Optional: % impact on total at that time
    originalTransaction?: any;
}

export interface PatrimonyMetrics {
    totalInvested: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
}

export function useCapitalFlows(userId: string | undefined, timeRange: TimeRange) {
    const { data: accounts = [] } = useBankAccounts(userId);
    const { data: transactions = [] } = useTransactions(userId);
    const { data: assetTransactions = [] } = useAssetTransactions(userId);
    const { data: transfers = [] } = useTransfers(userId);
    const { data: accountHoldings = [] } = useAccountHoldings(userId);
    const { data: portfolios = [] } = useDCAPortfolios(userId);
    const { data: categories = [] } = useCategories(userId, undefined);
    const fxRates = useFxRates();
    const cryptoAccountIds = useMemo(
        () => new Set(accountHoldings.map(h => h.bank_account_id)),
        [accountHoldings]
    );

    // 1. Identify Categories
    const categoryMap = useMemo(() => {
        const map = new Map<string, 'savings' | 'investment' | 'crypto' | 'general'>();
        categories.forEach(c => {
            const name = c.name.toLowerCase();
            if (name.includes('ahorro')) map.set(c.id, 'savings');
            else if (name.includes('inver')) map.set(c.id, 'investment');
            else if (name.includes('crypto') || name.includes('cripto')) map.set(c.id, 'crypto');
            else map.set(c.id, 'general');
        });
        return map;
    }, [categories]);

    // 1.1 Helper to get category for account
    const getAccountCategory = (accId: string): 'savings' | 'investment' | 'crypto' | 'general' => {
        const acc = accounts.find(a => a.id === accId);
        if (!acc) return 'general';
        if (cryptoAccountIds.has(acc.id)) return 'crypto';
        if (acc.currency === 'USD' || acc.currency === 'USDT') return 'crypto';
        if (!acc.category_id) return 'general';
        return categoryMap.get(acc.category_id) || 'general';
    };

    // 2. Prices & Rates
    const allSymbols = useMemo(() => {
        const s = new Set<string>();
        assetTransactions.forEach(tx => s.add(tx.symbol.toUpperCase()));
        accountHoldings.forEach(h => s.add(h.symbol.toUpperCase()));
        return Array.from(s);
    }, [assetTransactions, accountHoldings]);

    const dcaSymbols = useMemo(() => {
        const activeIds = new Set(portfolios?.map(p => p.id) || []);
        const symbols = new Set<string>();
        assetTransactions.forEach(tx => {
            if (tx.dca_portfolio_id && activeIds.has(tx.dca_portfolio_id)) {
                symbols.add(tx.symbol.toUpperCase());
            }
        });
        return Array.from(symbols);
    }, [assetTransactions, portfolios]);

    const holdingsSymbols = useMemo(
        () => Array.from(new Set(accountHoldings.map(h => h.symbol.toUpperCase()))),
        [accountHoldings]
    );

    const periodSymbols = useMemo(
        () => Array.from(new Set([...holdingsSymbols, ...dcaSymbols])),
        [holdingsSymbols, dcaSymbols]
    );

    const { data: currentPrices = {} } = useCurrentPrices(allSymbols);
    const usdtEurRate = fxRates.getLatestRate("USDT_EUR") || 1;
    const { data: marketData = {} } = useCryptoMarketData(periodSymbols);

    const cutoffDate = useMemo(() => {
        if (timeRange === "ALL") return null;
        const now = new Date();
        if (timeRange === "24h") return subHours(now, 24);
        if (timeRange === "7d") return subDays(now, 7);
        if (timeRange === "1m") return subMonths(now, 1);
        if (timeRange === "3m") return subMonths(now, 3);
        if (timeRange === "6m") return subMonths(now, 6);
        return subYears(now, 1);
    }, [timeRange]);

    const { data: periodPrices = {} } = useQuery({
        queryKey: ["capital-flow-period-prices", periodSymbols, cutoffDate?.toISOString()],
        queryFn: async (): Promise<Record<string, number>> => {
            if (!cutoffDate || periodSymbols.length === 0) return {};
            const { data, error } = await supabase
                .from("asset_prices")
                .select("symbol, close_price, price_date")
                .in("symbol", periodSymbols)
                .lte("price_date", cutoffDate.toISOString())
                .order("price_date", { ascending: false });

            if (error) throw error;

            const prices: Record<string, number> = {};
            (data || []).forEach((row) => {
                const symbol = row.symbol.toUpperCase();
                if (!prices[symbol]) {
                    prices[symbol] = row.close_price;
                }
            });
            return prices;
        },
        enabled: !!cutoffDate && periodSymbols.length > 0,
        staleTime: 60 * 1000,
    });

    // 3. Calculate "Total Invested" (Net Inflow) per Category
    // Methodology:
    // - Savings/General: Initial Balance + (Incoming Txs - Outgoing Txs) + (Incoming Transfers - Outgoing Transfers)
    //   * Note: This assumes "Invested" = "Current Balance" for simple accounts, 
    //     but to match "DCA logic", we might want "Principal" only. 
    //     However, for a normal bank account, Principal IS the Balance. Interest is usually a transaction.
    //     So for Savings, Invested ~= Balance. PnL comes from Interest transactions if tagged separately?
    //     Actually, let's stick to the simplest interpretation:
    //     Savings Invested = Current Balance (Cash is cash).
    //     Crypto Invested = Sum of Cost Basis (Buys - Sells). 
    //     Investment Invested = Sum of Cost Basis.

    const metrics = useMemo(() => {
        const res = {
            savings: { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 },
            investment: { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 },
            crypto: { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 },
            dca: { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 },
            general: { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 },
            total: { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0 }
        };

        const periodDelta = {
            savings: 0,
            investment: 0,
            crypto: 0,
            dca: 0,
            general: 0,
            total: 0,
        };

        const shouldInclude = (dateValue: string) => {
            if (!cutoffDate) return true;
            return new Date(dateValue) >= cutoffDate;
        };

        const toEur = (amount: number, currency: string) => {
            if (currency === "EUR") return amount;
            if (currency === "USD" || currency === "USDT") return amount * usdtEurRate;
            return amount;
        };

        // A. DCA: Calculate Invested & Current Value (DCA portfolios only)
        const dcaInvestedPerSymbol: Record<string, number> = {};
        const dcaQuantityPerSymbol: Record<string, number> = {};
        const activePortfolioIds = new Set(portfolios?.map(p => p.id) || []);

        assetTransactions.forEach(tx => {
            if (!tx.dca_portfolio_id || !activePortfolioIds.has(tx.dca_portfolio_id)) return;

            const sym = tx.symbol.toUpperCase();
            if (!dcaInvestedPerSymbol[sym]) {
                dcaInvestedPerSymbol[sym] = 0;
                dcaQuantityPerSymbol[sym] = 0;
            }

            const value = tx.quantity * tx.price_eur;

            if (tx.side === 'buy') {
                dcaInvestedPerSymbol[sym] += value;
                dcaQuantityPerSymbol[sym] += tx.quantity;
            } else {
                const avgCost = dcaQuantityPerSymbol[sym] > 0
                    ? dcaInvestedPerSymbol[sym] / dcaQuantityPerSymbol[sym]
                    : 0;
                dcaInvestedPerSymbol[sym] -= (tx.quantity * avgCost);
                dcaQuantityPerSymbol[sym] -= tx.quantity;
            }
        });

        Object.keys(dcaInvestedPerSymbol).forEach(sym => {
            res.dca.totalInvested += dcaInvestedPerSymbol[sym];
        });

        const cryptoPeriodQtyDelta: Record<string, number> = {};
        const dcaPeriodQtyDelta: Record<string, number> = {};

        assetTransactions.forEach(tx => {
            if (!shouldInclude(tx.transaction_date)) return;
            const sym = tx.symbol.toUpperCase();
            const qtyDelta = tx.side === "buy" ? tx.quantity : -tx.quantity;
            if (tx.dca_portfolio_id && activePortfolioIds.has(tx.dca_portfolio_id)) {
                dcaPeriodQtyDelta[sym] = (dcaPeriodQtyDelta[sym] || 0) + qtyDelta;
            } else {
                cryptoPeriodQtyDelta[sym] = (cryptoPeriodQtyDelta[sym] || 0) + qtyDelta;
            }
        });

        // B. Crypto Current Value (Holdings only)
        let cryptoHoldingsValue = 0;
        accountHoldings.forEach(h => {
            const priceData = currentPrices[h.symbol.toUpperCase()];
            const price = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
            cryptoHoldingsValue += (h.quantity * price * usdtEurRate);
        });

        res.crypto.currentValue = cryptoHoldingsValue;

        // C. DCA Current Value (Calculated from transactions linked to DCA)
        let dcaHoldingsValue = 0;

        // We need to re-calculate quantities specifically for DCA portfolios
        Object.entries(dcaQuantityPerSymbol).forEach(([sym, qty]) => {
            const priceData = currentPrices[sym];
            const price = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
            dcaHoldingsValue += (qty * price * usdtEurRate);
        });

        res.dca.currentValue = dcaHoldingsValue;

        const getStartPrice = (sym: string) => {
            if (periodPrices[sym] !== undefined) return periodPrices[sym];

            const priceData = currentPrices[sym];
            const currentPrice = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
            const change = (() => {
                if (timeRange === "24h") return marketData[sym]?.change24h;
                if (timeRange === "7d") return marketData[sym]?.change7d;
                if (timeRange === "1m") return marketData[sym]?.change30d;
                return null;
            })();

            if (change === null || change === undefined || !currentPrice) return currentPrice;
            const ratio = 1 + (change / 100);
            if (ratio <= 0) return currentPrice;
            return currentPrice / ratio;
        };
        const cryptoHoldingsQty: Record<string, number> = {};
        accountHoldings.forEach(h => {
            const sym = h.symbol.toUpperCase();
            cryptoHoldingsQty[sym] = (cryptoHoldingsQty[sym] || 0) + h.quantity;
        });

        let cryptoStartValue = 0;
        Object.entries(cryptoHoldingsQty).forEach(([sym, qty]) => {
            const startQty = qty - (cryptoPeriodQtyDelta[sym] || 0);
            const price = getStartPrice(sym);
            cryptoStartValue += (startQty * price * usdtEurRate);
        });

        let dcaStartValue = 0;
        Object.entries(dcaQuantityPerSymbol).forEach(([sym, qty]) => {
            const startQty = qty - (dcaPeriodQtyDelta[sym] || 0);
            const price = getStartPrice(sym);
            dcaStartValue += (startQty * price * usdtEurRate);
        });


        // B. Savings & Investments (Bank Accounts)
        // For these, "Invested" is tougher. 
        // Option 1: Invested = Current Balance (PnL = 0). Simple.
        // Option 2: Invested = Initial Balance + Deposits. Current = Invested + Interest.
        // Given the user wants "PnL", let's try to find "Earnings".
        // If we assume "Income" transactions are "Earnings" (Interest), then:
        // Invested = Net Transfers In.
        // Current = Balance.
        // This provides a PnL.

        // Iterating Accounts
        accounts.forEach(acc => {
            if (acc.is_archived) return;
            const cat = getAccountCategory(acc.id);

            // Get current balance of the account
            // We need to calculate it or use a hook that provides it.
            // HomePage calculates it manually. Let's duplicate that logic or trust the user wants "Live Balance".
            // Let's calc balance:
            let balance = acc.importe_inicial ? Number(acc.initial_balance) : 0;

            // Add Txs
            transactions.forEach(tx => {
                if (tx.bank_account_id === acc.id) {
                    if (tx.currency !== acc.currency) return;
                    const amount = Number(tx.amount);
                    if (tx.type === 'income') balance += amount;
                    else balance -= amount;
                }
            });

            transactions.forEach(tx => {
                if (tx.bank_account_id !== acc.id) return;
                if (!shouldInclude(tx.date)) return;
                if (tx.currency !== acc.currency) return;
                const amount = Number(tx.amount) * (tx.type === "income" ? 1 : -1);
                const amountEur = toEur(amount, tx.currency);
                periodDelta[cat] += amountEur;
                periodDelta.total += amountEur;
            });

            // Transfers
            transfers.forEach(tr => {
                if (tr.from_account_id === acc.id && tr.currency_from === acc.currency) {
                    balance -= Number(tr.amount_from);
                }
                if (tr.to_account_id === acc.id && tr.currency_to === acc.currency) {
                    balance += Number(tr.amount_to);
                }
            });

            transfers.forEach(tr => {
                if (!shouldInclude(tr.date)) return;
                if (tr.from_account_id === acc.id && tr.currency_from === acc.currency) {
                    const amountEur = toEur(-Number(tr.amount_from), tr.currency_from);
                    periodDelta[cat] += amountEur;
                    periodDelta.total += amountEur;
                }
                if (tr.to_account_id === acc.id && tr.currency_to === acc.currency) {
                    const amountEur = toEur(Number(tr.amount_to), tr.currency_to);
                    periodDelta[cat] += amountEur;
                    periodDelta.total += amountEur;
                }
            });

            // Convert to EUR
            let balanceEur = balance;
            let initialBalanceEur = acc.importe_inicial ? Number(acc.initial_balance) : 0;
            if (acc.currency !== 'EUR') {
                // Simplified conversion
                if (acc.currency === 'USD' || acc.currency === 'USDT') {
                    balanceEur = balance * usdtEurRate;
                    initialBalanceEur = (acc.importe_inicial ? Number(acc.initial_balance) : 0) * usdtEurRate;
                }
                // Other currencies ignored/1:1 for now
            }

            // Assign to metrics
            if (cat === 'crypto') {
                res.crypto.totalInvested += initialBalanceEur;
            } else if (cat === 'savings') {
                res.savings.currentValue += balanceEur;
                // Use initial_balance as "invested" to show PnL from interest/gains
                res.savings.totalInvested += initialBalanceEur;
            } else if (cat === 'investment') {
                res.investment.currentValue += balanceEur;
                res.investment.totalInvested += initialBalanceEur;
            } else {
                res.general.currentValue += balanceEur;
                res.general.totalInvested += initialBalanceEur;
            }
        });

        // C. Aggregate Totals
        res.total.totalInvested = res.savings.totalInvested + res.investment.totalInvested + res.crypto.totalInvested + res.dca.totalInvested + res.general.totalInvested;
        res.total.currentValue = res.savings.currentValue + res.investment.currentValue + res.crypto.currentValue + res.dca.currentValue + res.general.currentValue;

        // D. Calculate PnL
        const calcPnL = (m: { totalInvested: number, currentValue: number, pnl: number, pnlPercent: number }) => {
            m.pnl = m.currentValue - m.totalInvested;
            m.pnlPercent = m.totalInvested !== 0 ? (m.pnl / m.totalInvested) * 100 : 0;
        };

        // Calculate PnL for each (Note: Savings/General will be 0 based on above logic, effectively showcasing Crypto PnL)
        // To show Savings PnL, we would need to distinguish "Principal" from "Interest". 
        // Without that tag, we can't guess. 
        // EXCEPT: The user audio mentions "variation representing the change".
        // If I deposit 1000, and balance is 1000, variation is 0.
        // If I deposit 1000, and balance is 1200 (200 interest), variation is 200.
        // But how do we know 200 is interest? 
        // Maybe we look for transactions notes? Or Category?
        // Let's stick to Crypto PnL providing the main "DCA" value, and others being flat for now.

        calcPnL(res.savings);
        calcPnL(res.investment);
        calcPnL(res.crypto);
        calcPnL(res.dca);
        calcPnL(res.general);
        calcPnL(res.total);

        if (timeRange !== "ALL") {
            const savingsStart = res.savings.currentValue - periodDelta.savings;
            const investmentStart = res.investment.currentValue - periodDelta.investment;
            const generalStart = res.general.currentValue - periodDelta.general;
            const cryptoStart = cryptoStartValue;
            const dcaStart = dcaStartValue;
            const totalStart = savingsStart + investmentStart + generalStart + cryptoStart + dcaStart;

            const applyStartValue = (
                metric: { totalInvested: number; currentValue: number; pnl: number; pnlPercent: number },
                startValue: number
            ) => {
                metric.pnl = metric.currentValue - startValue;
                metric.pnlPercent = startValue !== 0 ? (metric.pnl / startValue) * 100 : 0;
            };

            applyStartValue(res.savings, savingsStart);
            applyStartValue(res.investment, investmentStart);
            applyStartValue(res.crypto, cryptoStart);
            applyStartValue(res.dca, dcaStart);
            applyStartValue(res.general, generalStart);
            applyStartValue(res.total, totalStart);
        }

        return res;
    }, [accounts, transactions, assetTransactions, transfers, currentPrices, usdtEurRate, categoryMap, portfolios, cryptoAccountIds, timeRange, periodPrices, cutoffDate, marketData]);



    // 4. Generate History (Movements Table)
    // We want to list "External Inputs/Outputs" or "Significant Changes".
    // User said: "Every time money is put in or taken out... generate a table".
    // This implies:
    // - Asset Transactions (Buys/Sells are internal swaps usually, but "Deposits/Withdrawals" of Fiat to buy crypto are relevant).
    // - Bank Transactions (Income/Expense).
    // - We filter by the selected TimeRange.

    const history = useMemo(() => {
        let events: CapitalEvent[] = [];

        // A. Asset Transactions (Crypto History)
        assetTransactions.forEach(tx => {
            events.push({
                id: tx.id,
                date: tx.transaction_date,
                type: tx.side === 'buy' ? 'deposit' : 'withdrawal', // Buy = Money In to Crypto Asset
                amount: tx.quantity * tx.price_eur, // Value in EUR
                currency: 'EUR',
                accountName: tx.symbol, // Show Symbol as "Account"
                category: tx.dca_portfolio_id ? 'dca' : 'crypto',
                notes: tx.notes || `${tx.side.toUpperCase()} ${tx.quantity} ${tx.symbol}`,
                originalTransaction: tx,
            });
        });

        // B. Bank Transactions
        transactions.forEach(tx => {
            const acc = accounts.find(a => a.id === tx.bank_account_id);
            if (!acc) return;

            events.push({
                id: tx.id,
                date: tx.date, // Correct property for useTransactions (it maps DB 'date' or 'transaction_date')
                type: tx.type === 'income' ? 'deposit' : 'withdrawal',
                amount: Number(tx.amount),
                currency: tx.currency,
                accountName: acc.name,
                category: getAccountCategory(acc.id),
                notes: tx.description || '',
                originalTransaction: tx,
            });
        });

        // Sort by Date Descending
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // C. Filter by TimeRange
        if (timeRange !== 'ALL') {
            const now = new Date();
            let cutoff = now;
            if (timeRange === '24h') cutoff = subHours(now, 24);
            if (timeRange === '7d') cutoff = subDays(now, 7);
            if (timeRange === '1m') cutoff = subMonths(now, 1);
            if (timeRange === '3m') cutoff = subMonths(now, 3);
            if (timeRange === '6m') cutoff = subMonths(now, 6);
            if (timeRange === '1y') cutoff = subYears(now, 1);

            events = events.filter(e => new Date(e.date) >= cutoff);
        }

        // Calculate "Variation" (Impact on Total at that time? Or just leave undefined?)
        // User asked "Variation representing the change...".
        // For now, let's leave straightforward.

        return events;
    }, [assetTransactions, transactions, accounts, timeRange, getAccountCategory]);

    return { metrics, history };
}
