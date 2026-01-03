import { cn } from "@/lib/utils";

export type Interval = "1D" | "7D" | "1M";

interface IntervalSelectorProps {
  value: Interval;
  onChange: (interval: Interval) => void;
}

const intervals: { value: Interval; label: string }[] = [
  { value: "1D", label: "1D" },
  { value: "7D", label: "7D" },
  { value: "1M", label: "1M" },
];

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
      {intervals.map((interval) => (
        <button
          key={interval.value}
          onClick={() => onChange(interval.value)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
            value === interval.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {interval.label}
        </button>
      ))}
    </div>
  );
}
