import { supabase } from "@/integrations/supabase/client";

export interface BackupData {
    version: string;
    timestamp: string;
    userId: string;
    data: {
        bank_accounts: any[];
        asset_transactions: any[];
        categories: any[];
        crypto_assets: any[];
        currencies: string[];
        dca_portfolios: any[];
    };
}

export async function exportBackup(userId: string): Promise<BackupData> {
    try {
        // Fetch all user data from Supabase
        const [
            { data: bankAccounts },
            { data: assetTransactions },
            { data: categories },
            { data: cryptoAssets },
            { data: dcaPortfolios },
        ] = await Promise.all([
            supabase.from("bank_accounts").select("*").eq("user_id", userId),
            supabase.from("asset_transactions").select("*").eq("user_id", userId),
            supabase.from("categories").select("*").eq("user_id", userId),
            supabase.from("crypto_assets").select("*").eq("user_id", userId),
            supabase.from("dca_portfolios").select("*").eq("user_id", userId),
        ]);

        // Get currencies from localStorage
        const currencies = JSON.parse(localStorage.getItem("currencies") || "[]");

        const backup: BackupData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            userId,
            data: {
                bank_accounts: bankAccounts || [],
                asset_transactions: assetTransactions || [],
                categories: categories || [],
                crypto_assets: cryptoAssets || [],
                currencies: currencies || [],
                dca_portfolios: dcaPortfolios || [],
            },
        };

        return backup;
    } catch (error) {
        console.error("Error exporting backup:", error);
        throw new Error("Failed to export backup");
    }
}

export async function importBackup(
    userId: string,
    backupData: BackupData
): Promise<void> {
    try {
        // Validate backup structure
        if (!validateBackupStructure(backupData)) {
            throw new Error("Invalid backup file structure");
        }

        const { data } = backupData;

        // Import data in order (respecting foreign key constraints)
        // 1. Categories (no dependencies)
        if (data.categories && data.categories.length > 0) {
            const categoriesWithUserId = data.categories.map((cat) => ({
                ...cat,
                user_id: userId,
                id: undefined, // Let Supabase generate new IDs
            }));
            await supabase.from("categories").insert(categoriesWithUserId);
        }

        // 2. Crypto assets (no dependencies)
        if (data.crypto_assets && data.crypto_assets.length > 0) {
            const assetsWithUserId = data.crypto_assets.map((asset) => ({
                ...asset,
                user_id: userId,
                id: undefined,
            }));
            await supabase.from("crypto_assets").insert(assetsWithUserId);
        }

        // 3. Bank accounts (no dependencies)
        if (data.bank_accounts && data.bank_accounts.length > 0) {
            const accountsWithUserId = data.bank_accounts.map((acc) => ({
                ...acc,
                user_id: userId,
                id: undefined,
            }));
            await supabase.from("bank_accounts").insert(accountsWithUserId);
        }

        // 4. DCA portfolios (no dependencies)
        if (data.dca_portfolios && data.dca_portfolios.length > 0) {
            const portfoliosWithUserId = data.dca_portfolios.map((portfolio) => ({
                ...portfolio,
                user_id: userId,
                id: undefined,
            }));
            await supabase.from("dca_portfolios").insert(portfoliosWithUserId);
        }

        // 5. Asset transactions (depends on dca_portfolios)
        if (data.asset_transactions && data.asset_transactions.length > 0) {
            const transactionsWithUserId = data.asset_transactions.map((tx) => ({
                ...tx,
                user_id: userId,
                id: undefined,
                dca_portfolio_id: null, // Clear foreign keys as we can't map old IDs to new ones
            }));
            await supabase.from("asset_transactions").insert(transactionsWithUserId);
        }

        // 6. Currencies (localStorage)
        if (data.currencies && data.currencies.length > 0) {
            localStorage.setItem("currencies", JSON.stringify(data.currencies));
        }
    } catch (error) {
        console.error("Error importing backup:", error);
        throw new Error("Failed to import backup");
    }
}

export function validateBackupStructure(data: any): data is BackupData {
    if (!data || typeof data !== "object") return false;
    if (!data.version || !data.timestamp || !data.userId) return false;
    if (!data.data || typeof data.data !== "object") return false;

    const requiredFields = [
        "bank_accounts",
        "asset_transactions",
        "categories",
        "crypto_assets",
        "currencies",
        "dca_portfolios",
    ];

    return requiredFields.every((field) => Array.isArray(data.data[field]));
}

export function downloadBackup(backup: BackupData, filename?: string) {
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
        filename || `finance-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
