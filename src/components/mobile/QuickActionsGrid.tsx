import { Plus, ArrowRightLeft, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickActionType = "add-money" | "transfer" | "deposit" | "withdraw";

interface QuickAction {
  id: QuickActionType;
  icon: typeof Plus;
  label: string;
  color: string;
}

const actions: QuickAction[] = [
  { id: "add-money", icon: Plus, label: "Add money", color: "bg-primary/10 text-primary" },
  { id: "transfer", icon: ArrowRightLeft, label: "Transfer", color: "bg-chart-assets/10 text-chart-assets" },
  { id: "deposit", icon: Download, label: "Deposit", color: "bg-success/10 text-success" },
  { id: "withdraw", icon: Upload, label: "Withdraw", color: "bg-warning/10 text-warning" },
];

interface QuickActionsGridProps {
  onAction: (action: QuickActionType) => void;
  className?: string;
}

export function QuickActionsGrid({ onAction, className }: QuickActionsGridProps) {
  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="flex flex-col items-center gap-2 py-3 transition-transform active:scale-95"
        >
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
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
