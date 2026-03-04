import { Home, BarChart3, User, TrendingUp, Bitcoin, LineChart } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/crypto", icon: Bitcoin, label: "Crypto" },
  { to: "/dca", icon: TrendingUp, label: "DCA" },
  { to: "/trading", icon: LineChart, label: "Trading" },
  { to: "/report", icon: BarChart3, label: "Report" },
  { to: "/account", icon: User, label: "Cuenta" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="rounded-full bg-white dark:bg-black/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:border dark:border-white/10 dark:shadow-2xl dark:shadow-black/40 px-2 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "relative flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-full transition-all duration-300",
                isActive
                  ? "text-primary bg-primary/5 dark:bg-white/10 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary animate-fade-in" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
