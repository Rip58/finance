import { Trade } from "@/hooks/useTrades";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TradeHistoryTableProps {
    trades: Trade[];
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
    if (trades.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                No hay historial de operaciones
            </div>
        );
    }

    return (
        <div className="border border-border/50 rounded-xl overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Par</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead className="text-right">Entrada</TableHead>
                        <TableHead className="text-right">Salida</TableHead>
                        <TableHead className="text-right">PnL</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {trades.map((trade) => {
                        const isLong = trade.direction === "LONG";
                        const pnl = trade.exit_price
                            ? (trade.exit_price - trade.entry_price) * trade.quantity * (isLong ? 1 : -1)
                            : 0;
                        const pnlPercent = trade.exit_price
                            ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * (isLong ? 1 : -1) * trade.leverage
                            : 0;

                        return (
                            <TableRow key={trade.id}>
                                <TableCell className="whitespace-nowrap font-medium text-xs text-muted-foreground">
                                    {format(new Date(trade.entry_date), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell className="font-bold">{trade.symbol}</TableCell>
                                <TableCell>
                                    <Badge variant={isLong ? "outline" : "destructive"} className={`text-[10px] ${isLong ? "border-green-500 text-green-500" : ""}`}>
                                        {trade.direction}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                    {trade.entry_price.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                    {trade.exit_price?.toLocaleString() || "-"}
                                </TableCell>
                                <TableCell className={`text-right font-mono font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}$
                                    <span className="text-[10px] ml-1 opacity-70">
                                        ({pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="secondary" className="text-[10px]">
                                        {trade.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
