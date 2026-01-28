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
    <header className={cn("sticky top-0 z-40 safe-area-pt bg-background/80 backdrop-blur-md border-b border-border/40 transition-all", className)}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left Action */}
        <div className="w-10 flex justify-start">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 -ml-2 rounded-full hover:bg-background/80 active:scale-90 transition-transform"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold tracking-tight text-center truncate px-2 flex-1">{title}</h1>

        {/* Right Action */}
        <div className="w-10 flex justify-end">
          {rightAction ? rightAction : <div className="w-10" />}
        </div>
      </div>
    </header>
  );
}
