import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon } from "lucide-react";

interface PreferencesTabProps {
  userId: string;
}

export function PreferencesTab({ userId }: PreferencesTabProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Theme Card */}
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">Apariencia de la app</p>
          </div>
        </div>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Oscuro</SelectItem>
            <SelectItem value="light">Claro</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
