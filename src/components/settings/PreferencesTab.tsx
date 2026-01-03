import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Preferencias de cuenta</CardTitle>
        <CardDescription>Configura los ajustes generales de tu cuenta</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Moneda base</Label>
          <Select value="EUR" disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Todos los valores del dashboard se muestran en EUR
          </p>
        </div>

        <div className="space-y-2">
          <Label>Zona horaria</Label>
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

        <Button onClick={handleSave} disabled={isUpserting}>
          {isUpserting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar preferencias
        </Button>
      </CardContent>
    </Card>
  );
}
