import { ReactNode } from "react";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  className?: string;
}

export function MobilePageHeader({
  title,
  showBack = false,
  rightAction,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={cn("flex items-center justify-between h-14 px-4", className)}>
      <div className="w-10">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="w-10 flex justify-end">
        {rightAction || (
          <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 pointer-events-none">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
