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
                const remoteSha = data.gitSha;
                const localSha = import.meta.env.VITE_GIT_COMMIT_SHA;

                // Check mismatch only if both SHAs are valid and not in local dev mode
                if (remoteSha && localSha && localSha !== remoteSha && localSha !== 'local-dev') {
                    console.log(`Version mismatch: Local SHA ${localSha} vs Remote SHA ${remoteSha}`);
                    toast("Nueva actualización disponible", {
                        description: `Nueva versión disponible (${remoteSha.substring(0, 7)}).`,
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
