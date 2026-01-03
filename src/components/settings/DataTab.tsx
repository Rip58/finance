import { useState } from "react";
import { IncomeExpenseData } from "@/components/settings/IncomeExpenseData";
import { AssetsData } from "@/components/settings/AssetsData";
import { TransfersTab } from "@/components/settings/TransfersTab";
import { Button } from "@/components/ui/button";

type SubTab = "income" | "expense" | "transfers" | "assets";

interface DataTabProps {
  userId: string;
}

export function DataTab({ userId }: DataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("income");

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeSubTab === "income" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("income")}
        >
          Ingresos
        </Button>
        <Button
          variant={activeSubTab === "expense" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("expense")}
        >
          Gastos
        </Button>
        <Button
          variant={activeSubTab === "transfers" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("transfers")}
        >
          Transferencias
        </Button>
        <Button
          variant={activeSubTab === "assets" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("assets")}
        >
          Activos
        </Button>
      </div>

      {/* Content */}
      {activeSubTab === "income" && <IncomeExpenseData userId={userId} type="income" />}
      {activeSubTab === "expense" && <IncomeExpenseData userId={userId} type="expense" />}
      {activeSubTab === "transfers" && <TransfersTab userId={userId} />}
      {activeSubTab === "assets" && <AssetsData userId={userId} />}
    </div>
  );
}
