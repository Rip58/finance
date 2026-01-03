import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Wallet, ArrowLeftRight, Tag, CreditCard, Database } from "lucide-react";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { AccountsTab } from "@/components/settings/AccountsTab";
import { TransfersTab } from "@/components/settings/TransfersTab";
import { CategoriesTab } from "@/components/settings/CategoriesTab";
import { SubscriptionsTab } from "@/components/settings/SubscriptionsTab";
import { DataTab } from "@/components/settings/DataTab";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tabs = [
  { id: "preferences", label: "Preferencias", icon: Settings },
  { id: "accounts", label: "Cuentas", icon: Wallet },
  { id: "transfers", label: "Transferencias", icon: ArrowLeftRight },
  { id: "categories", label: "Categorías", icon: Tag },
  { id: "subscriptions", label: "Suscripciones", icon: CreditCard },
  { id: "data", label: "Datos", icon: Database },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("preferences");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isMobile ? (
          <div className="space-y-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="pt-2">
              {activeTab === "preferences" && <PreferencesTab userId={user.id} />}
              {activeTab === "accounts" && <AccountsTab userId={user.id} />}
              {activeTab === "transfers" && <TransfersTab userId={user.id} />}
              {activeTab === "categories" && <CategoriesTab userId={user.id} />}
              {activeTab === "subscriptions" && <SubscriptionsTab userId={user.id} />}
              {activeTab === "data" && <DataTab userId={user.id} />}
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 bg-muted p-1 h-auto">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 data-[state=active]:bg-background"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="preferences">
              <PreferencesTab userId={user.id} />
            </TabsContent>
            <TabsContent value="accounts">
              <AccountsTab userId={user.id} />
            </TabsContent>
            <TabsContent value="transfers">
              <TransfersTab userId={user.id} />
            </TabsContent>
            <TabsContent value="categories">
              <CategoriesTab userId={user.id} />
            </TabsContent>
            <TabsContent value="subscriptions">
              <SubscriptionsTab userId={user.id} />
            </TabsContent>
            <TabsContent value="data">
              <DataTab userId={user.id} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
