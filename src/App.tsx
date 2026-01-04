import { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { SplashScreen } from "@/components/SplashScreen";
import { HomePage } from "@/pages/HomePage";
import { ReportPage } from "@/pages/ReportPage";
import { AccountPage } from "@/pages/AccountPage";
import { AddIncomePage } from "@/pages/AddIncomePage";
import { AddExpensePage } from "@/pages/AddExpensePage";
import { AddTransferPage } from "@/pages/AddTransferPage";
import { PendingPaymentsPage } from "@/pages/PendingPaymentsPage";
import { DCAPage } from "@/pages/DCAPage";
import NotFound from "./pages/NotFound";
import type { User } from "@supabase/supabase-js";

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
    return <AuthForm onSuccess={() => {}} />;
  }

  // Show splash after login
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage user={user} />} />
      <Route path="/dca" element={<DCAPage user={user} />} />
      <Route path="/report" element={<ReportPage user={user} />} />
      <Route path="/account" element={<AccountPage user={user} />} />
      <Route path="/add-income" element={<AddIncomePage user={user} />} />
      <Route path="/add-expense" element={<AddExpensePage user={user} />} />
      <Route path="/add-transfer" element={<AddTransferPage user={user} />} />
      <Route path="/pending-payments" element={<PendingPaymentsPage user={user} />} />
      {/* Legacy route redirect */}
      <Route path="/settings" element={<Navigate to="/account" replace />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
