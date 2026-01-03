import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet, Activity, LogOut } from "lucide-react";
import { IntervalSelector, Interval } from "@/components/IntervalSelector";
import { MetricCard } from "@/components/MetricCard";
import { EvolutionChart } from "@/components/EvolutionChart";
import { AuthForm } from "@/components/AuthForm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const formatEUR = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const Index = () => {
  const [interval, setInterval] = useState<Interval>("1D");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics(user?.id);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Sesión cerrada" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Portfolio Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </p>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Total Activos"
            value={formatEUR(metrics?.totalAssets ?? 0)}
            change={metrics?.totalAssets === 0 ? "Sin activos" : undefined}
            changeType="neutral"
            icon={Wallet}
            variant="cyan"
          />
          <MetricCard
            title="Ingresos (Mes)"
            value={formatEUR(metrics?.monthlyIncome ?? 0)}
            change={metrics?.incomeChange !== 0 ? `${formatPercent(metrics?.incomeChange ?? 0)} vs mes anterior` : undefined}
            changeType={metrics?.incomeChange && metrics.incomeChange >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
            variant="success"
          />
          <MetricCard
            title="Gastos (Mes)"
            value={formatEUR(metrics?.monthlyExpense ?? 0)}
            change={metrics?.expenseChange !== 0 ? `${formatPercent(metrics?.expenseChange ?? 0)} vs mes anterior` : undefined}
            changeType={metrics?.expenseChange && metrics.expenseChange <= 0 ? "positive" : "negative"}
            icon={TrendingDown}
            variant="danger"
          />
          <MetricCard
            title="Balance Neto"
            value={formatEUR(metrics?.netBalance ?? 0)}
            changeType={metrics?.netBalance && metrics.netBalance >= 0 ? "positive" : "negative"}
            icon={Activity}
            variant="default"
          />
        </div>

        {/* Chart Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold">Evolución del Portfolio</h2>
              <p className="text-sm text-muted-foreground">
                Ingresos, gastos y valor total de activos
              </p>
            </div>
            <IntervalSelector value={interval} onChange={setInterval} />
          </div>
          <EvolutionChart interval={interval} userId={user.id} />
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Datos calculados en tiempo real • Precios de cierre con carry-forward
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
