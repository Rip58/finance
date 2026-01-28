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
                className="w-full flex items-center gap-4 p-5 rounded-3xl bg-card/60 border border-border/40 transition-all duration-200 hover:bg-accent/50 active:scale-[0.98] shadow-sm backdrop-blur-sm group"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <tab.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-lg block">{tab.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
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
