import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MobileLayout,
  MobilePageHeader,
  BalanceCard,
  TransactionList,
  type TransactionItem,
} from "@/components/mobile";
import { IntervalSelector, type Interval } from "@/components/IntervalSelector";
import { EvolutionChart } from "@/components/EvolutionChart";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useTransactions } from "@/hooks/useTransactions";
import type { User } from "@supabase/supabase-js";

interface WalletPageProps {
  user: User;
}

export function WalletPage({ user }: WalletPageProps) {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<Interval>("1M");

  const { data: metrics } = useDashboardMetrics(user.id);
  const { data: transactions = [] } = useTransactions(user.id);

  const recentTransactions: TransactionItem[] = transactions
    .slice(0, 5)
    .map((tx) => ({
      id: tx.id,
      description: tx.description || "",
      amount: tx.amount,
      currency: tx.currency,
      type: tx.type as "income" | "expense",
      date: tx.date,
    }));

  return (
    <MobileLayout>
      <MobilePageHeader
        title="Wallet"
        showBack
        rightAction={
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        }
      />

      {/* Balance Card */}
      <div className="px-4 py-2">
        <BalanceCard
          balance={metrics?.netBalance ?? 0}
          subtitle="Total balance"
        />
      </div>

      {/* Chart Section */}
      <div className="px-4 py-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Transaction</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat("es-ES", {
                  style: "currency",
                  currency: "EUR",
                }).format(metrics?.totalAssets ?? 0)}
              </p>
            </div>
            <IntervalSelector value={interval} onChange={setInterval} />
          </div>
          <div className="h-48">
            <EvolutionChart interval={interval} userId={user.id} />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 py-4">
        <TransactionList
          transactions={recentTransactions}
          title="Recent Transaction"
          onSeeAll={() => navigate("/account?tab=data")}
        />
      </div>
    </MobileLayout>
  );
}
