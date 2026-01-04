import { TrendingUp, TrendingDown, ArrowRightLeft, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickActionType = "income" | "expense" | "transfer" | "pending-payments" | "data";

interface QuickAction {
  id: QuickActionType;
  icon: typeof TrendingUp;
  label: string;
  color: string;
}

const actions: QuickAction[] = [
  { id: "income", icon: TrendingUp, label: "Ingreso", color: "bg-success/10 text-success" },
  { id: "expense", icon: TrendingDown, label: "Gasto", color: "bg-destructive/10 text-destructive" },
  { id: "transfer", icon: ArrowRightLeft, label: "Transfer", color: "bg-chart-assets/10 text-chart-assets" },
  { id: "pending-payments", icon: Clock, label: "Pagos", color: "bg-warning/10 text-warning" },
  { id: "data", icon: Database, label: "Datos", color: "bg-primary/10 text-primary" },
];

interface QuickActionsGridProps {
  onAction: (action: QuickActionType) => void;
  className?: string;
}

export function QuickActionsGrid({ onAction, className }: QuickActionsGridProps) {
  return (
    <div className={cn("grid grid-cols-5 gap-2", className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="flex flex-col items-center gap-2 py-3 transition-transform active:scale-95"
        >
          <div
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center",
              action.color
            )}
          >
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
