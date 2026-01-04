import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function SafeAreaHeader({ children, className, sticky = false }: SafeAreaHeaderProps) {
  return (
    <div className={cn(
      "bg-background safe-area-pt",
      sticky && "sticky top-0 z-40",
      className
    )}>
      {children}
    </div>
  );
}
