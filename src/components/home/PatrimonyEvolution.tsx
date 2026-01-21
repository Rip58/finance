import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCapitalFlows, type TimeRange, type CapitalEvent } from "@/hooks/useCapitalFlows";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Wallet, PiggyBank, TrendingUp, Bitcoin, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionEditDialog } from "@/components/settings/TransactionEditDialog";
import { DCAFormDialog } from "@/components/dca/DCAFormDialog";
import { useTransactions } from "@/hooks/useTransactions";
import { useAssetTransactions } from "@/hooks/useAssetTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useAccountHoldings } from "@/hooks/useAccountHoldings";
import { useDCAPortfolios } from "@/hooks/useDCAPortfolios";

interface PatrimonyEvolutionProps {
    userId: string | undefined;
}

export function PatrimonyEvolution({ userId }: PatrimonyEvolutionProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("ALL");
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingBankTx, setEditingBankTx] = useState<any | null>(null);
    const [editingAssetTx, setEditingAssetTx] = useState<any | null>(null);

    const [activeTab, setActiveTab] = useState("total");
    const { metrics, history } = useCapitalFlows(userId, timeRange);
    const { data: accounts = [] } = useBankAccounts(userId);
    const { data: categories = [] } = useCategories(userId, undefined);
    const { data: accountHoldings = [] } = useAccountHoldings(userId);
    const { data: portfolios = [] } = useDCAPortfolios(userId);

    const filteredHistory = history.filter(item => {
        if (activeTab === "total") return true;
        if (activeTab === "crypto") return item.category === "crypto" || item.category === "dca";
        return item.category === activeTab;
    });

    const { delete: deleteTransaction } = useTransactions(userId);
    const { delete: deleteAssetTransaction, update: updateAssetTransaction } = useAssetTransactions(userId);

    const ranges: { value: TimeRange; label: string }[] = [
        { value: "24h", label: "24h" },
        { value: "7d", label: "7 días" },
        { value: "1m", label: "1 mes" },
        { value: "3m", label: "3 meses" },
        { value: "6m", label: "6 meses" },
        { value: "1y", label: "1 año" },
        { value: "ALL", label: "Todo" },
    ];
    const savingsCategoryIds = useMemo(
        () => categories.filter(c => c.name.toLowerCase().includes("ahorro")).map(c => c.id),
        [categories]
    );
    const investmentCategoryIds = useMemo(
        () => categories.filter(c => c.name.toLowerCase().includes("inver")).map(c => c.id),
        [categories]
    );
    const cryptoCategoryIds = useMemo(
        () => categories.filter(c => c.name.toLowerCase().includes("crypto") || c.name.toLowerCase().includes("cripto")).map(c => c.id),
        [categories]
    );

    const hasSavings = accounts.some(acc => acc.category_id && savingsCategoryIds.includes(acc.category_id));
    const hasInvestment = accounts.some(acc => acc.category_id && investmentCategoryIds.includes(acc.category_id));
    const hasCrypto = accountHoldings.length > 0
        || accounts.some(acc =>
            acc.currency === "USD"
            || acc.currency === "USDT"
            || (acc.category_id && cryptoCategoryIds.includes(acc.category_id))
        );
    const hasDca = portfolios.length > 0;

    const tabs = useMemo(() => ([
        { id: "total", label: "General", icon: Wallet, show: true },
        { id: "savings", label: "Ahorro", icon: PiggyBank, show: hasSavings },
        { id: "investment", label: "Inversión", icon: TrendingUp, show: hasInvestment },
        { id: "dca", label: "DCA", icon: RefreshCw, show: hasDca },
        { id: "crypto", label: "Crypto", icon: Bitcoin, show: hasCrypto },
    ].filter(tab => tab.show)), [hasSavings, hasInvestment, hasDca, hasCrypto]);

    useEffect(() => {
        if (tabs.length === 0) return;
        if (!tabs.some(tab => tab.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabs, activeTab]);

    const handleEdit = (item: CapitalEvent) => {
        if (item.category === 'crypto') {
            // Re-construct basic asset transaction object for the form
            // Note: CapitalEvent doesn't store all fields, we rely on the ID.
            // Ideally we fetch the full object or pass enough data. 
            // For now, let's pass what we have and let the Dialog handle fetching or defaults if needed.
            // Actually DCAFormDialog expects a specific shape.

            // Since we don't have the full object here, we might need to fetch it or store it in useCapitalFlows?
            // Let's try to find it in the "raw" lists if we had access. 
            // Simpler approach: construct a partial object matching interface
            const tx = {
                id: item.id,
                symbol: item.accountName, // mapped from symbol
                quantity: 0, // Unknown here without raw data...
                price_eur: 0, // Unknown
                transaction_date: item.date,
                notes: item.notes,
                bank_account_id: null, // Unknown
            };
            // Wait, this is risky. DCAFormDialog needs quantity/price.
            // I should probably expose the raw transaction in CapitalEvent or useCapitalFlows
            // For now, I'll update useCapitalFlows to include 'originalTransaction' in the event.
            setEditingAssetTx(item); // Placeholder until hook update
        } else {
            // Bank Transaction
            // Same issue, need full object for TransactionEditDialog
            setEditingBankTx(item);
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {/* Header & Filter */}
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-semibold">Evolución</h2>
                    <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                        <SelectTrigger className="w-[100px] h-8 text-xs bg-muted/50 border-none rounded-lg">
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent align="end">
                            {ranges.map((range) => (
                                <SelectItem key={range.value} value={range.value} className="text-xs">
                                    {range.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Tabs & Summary Cards */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full h-auto p-1 bg-muted/50 flex gap-1 mb-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="flex flex-col items-center gap-1 py-2 text-xs flex-1"
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="text-[10px] leading-none text-muted-foreground">{tab.label}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {tabs.map((tab) => {
                        const data = metrics[tab.id as keyof typeof metrics];
                        return (
                            <TabsContent key={tab.id} value={tab.id} className="mt-0">
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {/* Card 1: Invested */}
                                    <Card className="bg-gradient-to-br from-background to-muted/50 border-muted">
                                        <CardContent className="p-4">
                                            <p className="text-xs text-muted-foreground mb-1">Total Invertido</p>
                                            <p className="text-lg font-bold">{formatCurrency(data.totalInvested, "EUR")}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Card 2: Current Value */}
                                    <Card className="bg-gradient-to-br from-background to-muted/50 border-muted">
                                        <CardContent className="p-4">
                                            <p className="text-xs text-muted-foreground mb-1">Valor Actual</p>
                                            <p className="text-lg font-bold">{formatCurrency(data.currentValue, "EUR")}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Card 3: PnL */}
                                    <Card className="col-span-2 bg-gradient-to-br from-background to-muted/50 border-muted">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Ganancia/Pérdida (PnL)</p>
                                                <div className="flex items-center gap-2">
                                                    <p className={cn("text-2xl font-bold", data.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                                                        {data.pnl >= 0 ? "+" : ""}{formatCurrency(data.pnl, "EUR")}
                                                    </p>
                                                    <span className={cn(
                                                        "text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5",
                                                        data.pnl >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                                    )}>
                                                        {data.pnl >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                        {formatPercent(data.pnlPercent)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        );
                    })}
                </Tabs>

                {/* Transaction History Table */}
                <Card className="border-muted/50 overflow-hidden">
                    <div
                        className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            Historial de Movimientos
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{filteredHistory.length} movimientos</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="overflow-x-auto max-h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-[80px] text-xs">Fecha</TableHead>
                                        <TableHead className="text-xs">Cuenta / Activo</TableHead>
                                        <TableHead className="text-right text-xs">Importe</TableHead>
                                        <TableHead className="text-right text-xs w-[70px]">Tipo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                                                No hay movimientos en este periodo ({timeRange})
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredHistory.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-muted/30 border-border/50 cursor-pointer active:bg-muted/50 transition-colors"
                                                onClick={() => handleEdit(item)}
                                            >
                                                <TableCell className="text-xs font-medium align-top py-3">
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(item.date), "dd MMM", { locale: es })}</span>
                                                        <span className="text-[10px] text-muted-foreground">{format(new Date(item.date), "HH:mm")}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs align-top py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium truncate max-w-[120px]">{item.accountName}</span>
                                                        <span className="text-[10px] text-muted-foreground capitalize">{item.category}</span>
                                                        {item.notes && <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{item.notes}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-xs font-medium align-top py-3">
                                                    {formatCurrency(item.amount, item.currency)}
                                                </TableCell>
                                                <TableCell className="text-right align-top py-3">
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded border capitalize block w-fit ml-auto",
                                                        item.type === 'deposit' || item.type === 'buy'
                                                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                            : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}>
                                                        {item.type === 'buy' ? 'Compra' :
                                                            item.type === 'sell' ? 'Venta' :
                                                                item.type === 'deposit' ? 'Ingreso' : 'Retiro'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            </div>

            {editingBankTx && editingBankTx.originalTransaction && (
                <TransactionEditDialog
                    userId={userId || ''}
                    transaction={editingBankTx.originalTransaction}
                    onClose={() => setEditingBankTx(null)}
                />
            )}

            {editingAssetTx && (
                <DCAFormDialog
                    open={!!editingAssetTx}
                    onOpenChange={(open) => !open && setEditingAssetTx(null)}
                    symbol={editingAssetTx.accountName}
                    editingTx={editingAssetTx.originalTransaction}
                    onSubmit={async (data) => {
                        if (!editingAssetTx.originalTransaction) return; // Should not happen
                        await updateAssetTransaction({
                            id: editingAssetTx.id,
                            ...data
                        });
                    }}
                    onDelete={async () => {
                        if (!editingAssetTx.originalTransaction) return;
                        await deleteAssetTransaction(editingAssetTx.id);
                        setEditingAssetTx(null);
                    }}
                />
            )}
        </div>
    );
}
