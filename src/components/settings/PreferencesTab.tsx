import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sun, Moon, GitBranch, Palette, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeColor, ColorTheme } from "@/components/providers/ThemeColorProvider";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { useToast } from "@/hooks/use-toast";

interface PreferencesTabProps {
  userId: string;
}

export function PreferencesTab({ userId }: PreferencesTabProps) {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useThemeColor();
  const { toast } = useToast();

  const colors: { id: ColorTheme; bg: string }[] = [
    { id: "violet", bg: "bg-violet-500" },
    { id: "blue", bg: "bg-sky-500" },
    { id: "rose", bg: "bg-rose-500" },
    { id: "orange", bg: "bg-orange-500" },
    { id: "green", bg: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-6">

      {/* Version Info Card */}
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Información de Versión</p>
            <p className="text-xs text-muted-foreground">Detalles del despliegue</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Versión App</span>
            <span className="font-mono font-medium bg-secondary/50 px-2 py-0.5 rounded text-xs">v{APP_VERSION} ({import.meta.env.VITE_GIT_COMMIT_SHA?.substring(0, 7) || 'dev'})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Entorno</span>
            <span className="font-mono font-medium capitalize text-xs">{import.meta.env.VITE_VERCEL_ENV || 'local'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Rama</span>
            <span className="font-mono font-medium text-xs">{import.meta.env.VITE_GIT_BRANCH || 'main'}</span>
          </div>
          <div className="flex flex-col gap-1 pt-3 mt-1 border-t border-border/40">
            <span className="text-muted-foreground text-xs">Último Commit</span>
            <span className="font-mono text-[10px] break-all text-right text-muted-foreground/80 leading-tight">
              {import.meta.env.VITE_GIT_COMMIT_MESSAGE || 'Sin información de commit'}
            </span>
            <span className="font-mono text-[10px] text-right text-muted-foreground/50">
              {import.meta.env.VITE_GIT_COMMIT_SHA?.substring(0, 7) || '---'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7 gap-2"
              onClick={() => {
                // Intelligent Update Check
                const checkAndUpdate = async () => {
                  try {
                    const response = await fetch("/version.json?t=" + new Date().getTime());
                    if (response.ok) {
                      const data = await response.json();
                      const remoteSha = data.gitSha;
                      const localSha = import.meta.env.VITE_GIT_COMMIT_SHA;

                      // Check using Commit SHA instead of Version string
                      if (localSha && remoteSha && localSha === remoteSha) {
                        // Already up to date
                        toast({
                          title: "Sistema Actualizado",
                          description: `Ya tienes la última versión (${localSha.substring(0, 7)}).`,
                          duration: 3000,
                        });
                        return;
                      }
                    }
                  } catch (e) {
                    console.error("Error checking version", e);
                  }

                  // Proceed with Force Update (Clear Cache & Reload)
                  toast({
                    title: "Actualizando...",
                    description: "Limpiando caché y recargando.",
                  });

                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                      for (let registration of registrations) {
                        registration.unregister();
                      }
                    });
                  }
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      names.forEach(name => {
                        caches.delete(name);
                      });
                    });
                  }
                  // Redirect to root to avoid 404s on sub-routes after cache clear
                  window.location.href = '/';
                };

                checkAndUpdate();
              }}
            >
              <RefreshCw className="h-3 w-3" />
              Buscar Actualizaciones
            </Button>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  toast({
                    title: "Forzando Recarga...",
                    description: "Limpiando caché y reiniciando PWA.",
                  });
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                      for (let registration of registrations) registration.unregister();
                    });
                  }
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  window.location.href = '/';
                }}
                className="text-[10px] text-muted-foreground underline hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                ¿Problemas? Forzar recarga completa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Color Palette Card */}
      <div className="p-4 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">Color Principal</p>
            <p className="text-xs text-muted-foreground">Personaliza el acento visual</p>
          </div>
        </div>

        <div className="flex gap-3">
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => setColorTheme(c.id)}
              className={cn(
                "h-8 w-8 rounded-full transition-all border-2",
                c.bg,
                colorTheme === c.id ? "border-foreground ring-2 ring-primary/20 scale-110 shadow-md" : "border-transparent hover:scale-105"
              )}
              aria-label={`Select ${c.id} theme`}
            />
          ))}
        </div>
      </div>

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
    </div >
  );
}
