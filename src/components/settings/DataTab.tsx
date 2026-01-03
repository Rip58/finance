import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeExpenseData } from "@/components/settings/IncomeExpenseData";
import { AssetsData } from "@/components/settings/AssetsData";

interface DataTabProps {
  userId: string;
}

export function DataTab({ userId }: DataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState("income");

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="income">Ingresos</TabsTrigger>
        <TabsTrigger value="expense">Gastos</TabsTrigger>
        <TabsTrigger value="assets">Activos</TabsTrigger>
      </TabsList>
      <TabsContent value="income">
        <IncomeExpenseData userId={userId} type="income" />
      </TabsContent>
      <TabsContent value="expense">
        <IncomeExpenseData userId={userId} type="expense" />
      </TabsContent>
      <TabsContent value="assets">
        <AssetsData userId={userId} />
      </TabsContent>
    </Tabs>
  );
}
