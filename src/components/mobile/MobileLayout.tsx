import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  hideNav?: boolean;
}

export function MobileLayout({ children, className, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn("max-w-md mx-auto min-h-screen pb-20 safe-area-pt", className)}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
