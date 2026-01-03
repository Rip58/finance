import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";
import { IntervalSelector, Interval } from "@/components/IntervalSelector";
import { MetricCard } from "@/components/MetricCard";
import { EvolutionChart } from "@/components/EvolutionChart";

const Index = () => {
  const [interval, setInterval] = useState<Interval>("1D");

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
            <p className="text-sm text-muted-foreground font-mono">
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Total Activos"
            value="€67,432.50"
            change="+12.5% vs mes anterior"
            changeType="positive"
            icon={Wallet}
            variant="cyan"
          />
          <MetricCard
            title="Ingresos (Mes)"
            value="€4,250.00"
            change="+8.2% vs mes anterior"
            changeType="positive"
            icon={TrendingUp}
            variant="success"
          />
          <MetricCard
            title="Gastos (Mes)"
            value="€2,180.00"
            change="-3.1% vs mes anterior"
            changeType="positive"
            icon={TrendingDown}
            variant="danger"
          />
          <MetricCard
            title="Balance Neto"
            value="€2,070.00"
            change="+€520 vs mes anterior"
            changeType="positive"
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
          <EvolutionChart interval={interval} />
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Datos actualizados en tiempo real • Precios de cierre con carry-forward
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
