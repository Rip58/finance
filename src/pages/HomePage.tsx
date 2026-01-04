import { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MobileLayout,
  BalanceCard,
  QuickActionsGrid,
  TransactionList,
  type QuickActionType,
  type TransactionItem,
} from "@/components/mobile";
import { IntervalSelector, type Interval } from "@/components/IntervalSelector";
import { EvolutionChart } from "@/components/EvolutionChart";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useTransactions } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface HomePageProps {
  user: User;
}

export function HomePage({ user }: HomePageProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [interval, setInterval] = useState<Interval>("1M");

  const { data: metrics } = useDashboardMetrics(user.id);
  const { data: transactions = [] } = useTransactions(user.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Sesión cerrada" });
  };

  const handleQuickAction = (action: QuickActionType) => {
    switch (action) {
      case "income":
        navigate("/add-income");
        break;
      case "expense":
        navigate("/add-expense");
        break;
      case "transfer":
        navigate("/add-transfer");
        break;
      case "pending-payments":
        navigate("/pending-payments");
        break;
    }
  };

  const handleEditTransaction = (tx: TransactionItem) => {
    if (tx.type === "income") {
      navigate(`/add-income?edit=${tx.id}`);
    } else if (tx.type === "expense") {
      navigate(`/add-expense?edit=${tx.id}`);
    } else if (tx.type === "transfer") {
      navigate(`/add-transfer?edit=${tx.id}`);
    }
  };

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

  const userName = user.email?.split("@")[0] || "Usuario";
  const greeting = getGreeting();
  
  // Balance = savings + investments
  const totalBalance = (metrics?.savingsBalance ?? 0) + (metrics?.investmentsBalance ?? 0);

  return (
    <MobileLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">{greeting}</p>
            <p className="font-semibold capitalize">{userName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="px-4 py-4">
        <BalanceCard
          balance={totalBalance}
          subtitle="Total patrimonio"
          savingsTotal={metrics?.savingsBalance ?? 0}
          investmentsTotal={metrics?.investmentsBalance ?? 0}
        />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2">
        <QuickActionsGrid onAction={handleQuickAction} />
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
          <div className="h-56 overflow-hidden">
            <EvolutionChart interval={interval} userId={user.id} />
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 py-4">
        <TransactionList
          transactions={recentTransactions}
          onSeeAll={() => navigate("/account?tab=data")}
          onEdit={handleEditTransaction}
        />
      </div>
    </MobileLayout>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días!";
  if (hour < 18) return "Buenas tardes!";
  return "Buenas noches!";
}
