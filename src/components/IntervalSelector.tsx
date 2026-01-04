import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Interval = "7D" | "15D" | "1M" | "3M" | "1Y";

interface IntervalSelectorProps {
  value: Interval;
  onChange: (interval: Interval) => void;
}

const intervals: { value: Interval; label: string }[] = [
  { value: "7D", label: "7 días" },
  { value: "15D", label: "15 días" },
  { value: "1M", label: "1 mes" },
  { value: "3M", label: "3 meses" },
  { value: "1Y", label: "1 año" },
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
