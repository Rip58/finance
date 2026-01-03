import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Coins } from "lucide-react";

const timezones = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

interface PreferencesTabProps {
  userId: string;
}

export function PreferencesTab({ userId }: PreferencesTabProps) {
  const { data: settings, isLoading, upsert, isUpserting } = useSettings(userId);
  const [timezone, setTimezone] = useState("Europe/Madrid");

  useEffect(() => {
    if (settings?.timezone) {
      setTimezone(settings.timezone);
    }
  }, [settings?.timezone]);

  const handleSave = async () => {
    await upsert({ base_currency: "EUR", timezone });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currency Card */}
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Moneda base</p>
            <p className="text-xs text-muted-foreground">Dashboard en EUR</p>
          </div>
        </div>
        <Select value="EUR" disabled>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timezone Card */}
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-chart-assets/10 flex items-center justify-center text-chart-assets">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Zona horaria</p>
            <p className="text-xs text-muted-foreground">Para cálculos diarios</p>
          </div>
        </div>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} disabled={isUpserting} className="w-full">
        {isUpserting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar preferencias
      </Button>
    </div>
  );
}
