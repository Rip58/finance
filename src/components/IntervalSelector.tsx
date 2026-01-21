import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Interval = "1D" | "7D" | "30D" | "90D" | "1Y" | "ALL";

interface IntervalSelectorProps {
  value: Interval;
  onChange: (interval: Interval) => void;
}

const intervals: { value: Interval; label: string }[] = [
  { value: "1D", label: "24h" },
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
  { value: "1Y", label: "1A" },
  { value: "ALL", label: "Todo" },
];

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[110px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {intervals.map((interval) => (
          <SelectItem key={interval.value} value={interval.value} className="text-xs">
            {interval.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
