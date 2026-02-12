import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { SplashScreen } from "@/components/SplashScreen";
import { HomePage } from "@/pages/HomePage";
import NotFound from "./pages/NotFound";
import type { User } from "@supabase/supabase-js";
import { ThemeColorProvider } from "@/components/providers/ThemeColorProvider";
import { VersionChecker } from "@/components/VersionChecker";
import { BottomNav } from "@/components/mobile/BottomNav";

const ReportPage = lazy(() => import("@/pages/ReportPage").then((m) => ({ default: m.ReportPage })));
const AccountPage = lazy(() => import("@/pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const AddIncomePage = lazy(() => import("@/pages/AddIncomePage").then((m) => ({ default: m.AddIncomePage })));
const AddExpensePage = lazy(() => import("@/pages/AddExpensePage").then((m) => ({ default: m.AddExpensePage })));
const AddTransferPage = lazy(() => import("@/pages/AddTransferPage").then((m) => ({ default: m.AddTransferPage })));
const PendingPaymentsPage = lazy(() => import("@/pages/PendingPaymentsPage").then((m) => ({ default: m.PendingPaymentsPage })));
const DCAPage = lazy(() => import("@/pages/DCAPage").then((m) => ({ default: m.DCAPage })));
const CryptoPage = lazy(() => import("@/pages/CryptoPage").then((m) => ({ default: m.CryptoPage })));
const TradingPage = lazy(() => import("@/pages/TradingPage").then((m) => ({ default: m.default })));
const DebugHistory = lazy(() => import("@/components/DebugHistory").then((m) => ({ default: m.DebugHistory })));

const queryClient = new QueryClient();

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const previousUserRef = useRef<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      previousUserRef.current = session?.user ?? null;
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;

      // Detect new login (previously no user, now there is one)
      if (!previousUserRef.current && newUser) {
        setShowSplash(true);
      }

      previousUserRef.current = newUser;
      setUser(newUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => { }} />;
  }

  // Show splash after login
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route path="/crypto" element={<CryptoPage user={user} />} />
        <Route path="/dca" element={<DCAPage user={user} />} />
        <Route path="/trading" element={<TradingPage user={user} />} />
        <Route path="/report" element={<ReportPage user={user} />} />
        <Route path="/account" element={<AccountPage user={user} />} />
        <Route path="/add-income" element={<AddIncomePage user={user} />} />
        <Route path="/add-expense" element={<AddExpensePage user={user} />} />
        <Route path="/add-transfer" element={<AddTransferPage user={user} />} />
        <Route path="/pending-payments" element={<PendingPaymentsPage user={user} />} />
        <Route path="/debug" element={<DebugHistory />} />
        {/* Legacy route redirect */}
        <Route path="/settings" element={<Navigate to="/account" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <BottomNav />
        </div>
      </div>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeColorProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="bottom-center" />
          <BrowserRouter>
            <AppContent />
            <VersionChecker />
            <SpeedInsights />
            <Analytics />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeColorProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
