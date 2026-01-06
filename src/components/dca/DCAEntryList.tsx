import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Wallet } from "lucide-react";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";
import { CryptoLogo } from "./CryptoLogo";
import { formatCurrency } from "@/lib/utils";

interface BankAccount {
  id: string;
  name: string;
}

interface DCAEntryListProps {
  transactions: AssetTransaction[] | undefined;
  bankAccounts?: BankAccount[];
  onEdit: (tx: AssetTransaction) => void;
  onDelete: (id: string) => void;
}

export function DCAEntryList({ transactions, bankAccounts = [], onEdit, onDelete }: DCAEntryListProps) {

  // Filter only buys and sort by date descending
  const dcaEntries = (transactions || [])
    .filter((tx) => tx.side === "buy")
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  if (dcaEntries.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground">
        <p>No hay entradas de DCA todavía.</p>
        <p className="text-sm">Pulsa el botón + para añadir tu primera compra.</p>
      </div>
    );
  }

  const getAccountName = (id: string | null) => {
    if (!id) return null;
    return bankAccounts.find((acc) => acc.id === id)?.name;
  };

  return (
    <div className="space-y-3 px-4">
      {dcaEntries.map((tx) => {
        const accountName = getAccountName((tx as any).bank_account_id);

        return (
          <Card key={tx.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <CryptoLogo symbol={tx.symbol} size={40} />
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(tx.transaction_date), "dd MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tx.quantity} × {formatCurrency(tx.price_eur, "USDT")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <p className="font-bold text-foreground">
                    {formatCurrency(tx.quantity * tx.price_eur, "USDT")}
                  </p>
                  <p className="text-xs text-muted-foreground">Inversión</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onEdit(tx)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(tx.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {(tx.notes || accountName) && (
              <div className="mt-2 text-sm text-muted-foreground border-t border-border pt-2 flex flex-col gap-1">
                {accountName && (
                  <div className="flex items-center gap-1.5 text-xs text-primary/80">
                    <Wallet className="h-3 w-3" />
                    <span>{accountName}</span>
                  </div>
                )}
                {tx.notes && (
                  <p>{tx.notes}</p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
