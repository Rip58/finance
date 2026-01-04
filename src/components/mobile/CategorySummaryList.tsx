import { ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface CategorySummary {
  id: string;
  name: string;
  count: number;
  total: number;
  currency: string;
}

interface CategorySummaryListProps {
  categories: CategorySummary[];
  title?: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
  onCategoryClick?: (categoryId: string) => void;
  className?: string;
}

const categoryColors = [
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
  "bg-chart-assets/10 text-chart-assets",
  "bg-destructive/10 text-destructive",
  "bg-muted text-muted-foreground",
];

export function CategorySummaryList({
  categories,
  title = "Variable Expenses",
  showSeeAll = true,
  onSeeAll,
  onCategoryClick,
  className,
}: CategorySummaryListProps) {
  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {showSeeAll && onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay categorías
          </p>
        ) : (
          categories.map((cat, index) => (
            <button
              key={cat.id}
              onClick={() => onCategoryClick?.(cat.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 transition-colors hover:bg-accent/50"
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-lg",
                  categoryColors[index % categoryColors.length]
                )}
              >
                {cat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cat.count} {cat.count === 1 ? "Transaction" : "Transactions"}
                </p>
              </div>
              <span className="font-semibold tabular-nums">
                {formatCurrency(cat.total, cat.currency)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
