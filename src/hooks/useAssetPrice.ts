import { useQuery } from '@tanstack/react-query';
import { fetchAssetPrice, AssetPrice } from '../lib/finance_api';

export const useAssetPrice = (symbol: string) => {
    return useQuery<AssetPrice, Error>({
        queryKey: ['assetPrice', symbol],
        queryFn: () => fetchAssetPrice(symbol),
        refetchInterval: 60000 * 5, // Refresh every 5 minutes
        staleTime: 60000, // Data considered fresh for 1 minute
        retry: 2,
        enabled: !!symbol,
    });
};

export const ASSET_SYMBOLS = {
    GOLD: 'GC=F',
    SP500: '^GSPC',
    EURUSD: 'EURUSD=X',
    BTC: 'BTC-USD',
};
