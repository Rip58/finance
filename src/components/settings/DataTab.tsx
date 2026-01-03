import { useState } from "react";
import { IncomeExpenseData } from "@/components/settings/IncomeExpenseData";
import { AssetsData } from "@/components/settings/AssetsData";
import { TransfersTab } from "@/components/settings/TransfersTab";
import { RecurringTab } from "@/components/settings/RecurringTab";
import { Button } from "@/components/ui/button";

type SubTab = "recurring" | "income" | "expense" | "assets" | "transfers";

interface DataTabProps {
  userId: string;
}

export function DataTab({ userId }: DataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("recurring");

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeSubTab === "recurring" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("recurring")}
        >
          Recurrentes
        </Button>
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
          variant={activeSubTab === "assets" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("assets")}
        >
          Activos
        </Button>
        <Button
          variant={activeSubTab === "transfers" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSubTab("transfers")}
        >
          Transferencias
        </Button>
      </div>

      {/* Content */}
      {activeSubTab === "recurring" && <RecurringTab userId={userId} />}
      {activeSubTab === "income" && <IncomeExpenseData userId={userId} type="income" />}
      {activeSubTab === "expense" && <IncomeExpenseData userId={userId} type="expense" />}
      {activeSubTab === "assets" && <AssetsData userId={userId} />}
      {activeSubTab === "transfers" && <TransfersTab userId={userId} />}
    </div>
  );
}
