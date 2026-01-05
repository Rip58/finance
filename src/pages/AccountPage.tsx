import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings, CreditCard, Tag, Repeat, Database, ChevronRight, TrendingUp, Coins } from "lucide-react";
import { MobileLayout, MobilePageHeader } from "@/components/mobile";
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
        <MobilePageHeader title="Cuenta" />

        <div className="px-4 py-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 transition-colors hover:bg-accent/50"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <tab.icon className="h-5 w-5" />
                </div>
                <span className="flex-1 text-left font-medium">{tab.label}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  const activeTab = tabs.find((t) => t.id === currentTab);

  return (
    <MobileLayout>
      <MobilePageHeader
        title={activeTab?.label || "Cuenta"}
        showBack
      />

      <div className="px-4 py-4">
        {currentTab === "preferences" && <PreferencesTab userId={user.id} />}
        {currentTab === "accounts" && <AccountsTab userId={user.id} />}
        {currentTab === "categories" && <CategoriesTab userId={user.id} />}
        {currentTab === "assets" && <CryptoAssetsTab userId={user.id} />}
        {currentTab === "currencies" && <CurrenciesTab />}
        {currentTab === "backup" && <BackupTab userId={user.id} />}
      </div>
    </MobileLayout>
  );
}
