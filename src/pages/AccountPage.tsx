import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings, CreditCard, Tag, Repeat, Database, ChevronRight, TrendingUp, Coins, ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { AccountsTab } from "@/components/settings/AccountsTab";
import { CategoriesTab } from "@/components/settings/CategoriesTab";

import { CryptoAssetsTab } from "@/components/settings/CryptoAssetsTab";
import { CurrenciesTab } from "@/components/settings/CurrenciesTab";
import { BackupTab } from "@/components/settings/BackupTab";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

type TabId = "preferences" | "accounts" | "categories" | "dcas" | "assets" | "currencies" | "backup";

interface AccountPageProps {
  user: User;
}

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "preferences", label: "Preferencias", icon: Settings },
  { id: "accounts", label: "Cuentas Bancarias", icon: CreditCard },
  { id: "categories", label: "Categorías", icon: Tag },
  { id: "assets", label: "Activos Digitales", icon: Coins },
  { id: "currencies", label: "Divisas", icon: Coins },
  { id: "backup", label: "Backup & Restore", icon: Database },
];

export function AccountPage({ user }: AccountPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get("tab") as TabId) || null;

  const handleTabClick = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleBack = () => {
    setSearchParams({});
  };

  // If no tab selected, show menu
  if (!currentTab) {
    return (
      <MobileLayout>
        <div className="p-4 space-y-6 pb-20 fade-in safe-area-pt">
          <PageHeader title="Preferencias" description="Configuración de tu cuenta y aplicación" />

          <div className="px-0 py-4">
            <div className="space-y-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card/40 border border-border/40 transition-all duration-200 hover:bg-card/70 active:scale-[0.99] group"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200 shrink-0">
                    <tab.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left text-sm font-semibold">{tab.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const activeTab = tabs.find((t) => t.id === currentTab);

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-6 pb-20 fade-in safe-area-pt">

        {/* Header with back arrow */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-base">{activeTab?.label || "Preferencias"}</h1>
        </div>

        <div className="px-0">
          {currentTab === "preferences" && <PreferencesTab userId={user.id} />}
          {currentTab === "accounts" && <AccountsTab userId={user.id} />}
          {currentTab === "categories" && <CategoriesTab userId={user.id} />}
          {currentTab === "assets" && <CryptoAssetsTab userId={user.id} />}
          {currentTab === "currencies" && <CurrenciesTab />}
          {currentTab === "backup" && <BackupTab userId={user.id} />}
        </div>
      </div>
    </MobileLayout>
  );
}
