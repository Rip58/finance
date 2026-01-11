import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export function VersionChecker() {
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch("/version.json?t=" + new Date().getTime());
                if (!response.ok) return;

                const data = await response.json();
                const remoteVersion = data.version;

                if (remoteVersion && remoteVersion !== APP_VERSION) {
                    console.log(`Version mismatch: Local ${APP_VERSION} vs Remote ${remoteVersion}`);
                    toast("Nueva actualización disponible", {
                        description: `Versión ${remoteVersion} lista para instalar.`,
                        duration: Infinity,
                        action: {
                            label: "Actualizar",
                            onClick: () => handleForceUpdate(),
                        },
                        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
                    });
                }
            } catch (error) {
                console.error("Error checking version:", error);
            }
        };

        // Check immediately on mount
        checkVersion();

        // Optional: Check every hour and on visibility change
        const interval = setInterval(checkVersion, 60 * 60 * 1000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return null;
}

function handleForceUpdate() {
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
    window.location.reload();
}
