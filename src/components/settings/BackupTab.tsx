import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportBackup, importBackup, downloadBackup, validateBackupStructure } from "@/lib/backupUtils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BackupTabProps {
    userId: string;
}

export function BackupTab({ userId }: BackupTabProps) {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [lastBackup, setLastBackup] = useState<string | null>(
        localStorage.getItem("lastBackupDate")
    );

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const backup = await exportBackup(userId);
            downloadBackup(backup);
            const now = new Date().toISOString();
            localStorage.setItem("lastBackupDate", now);
            setLastBackup(now);
            toast({
                title: "Backup creado",
                description: "El archivo de backup se ha descargado correctamente",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo crear el backup",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPendingFile(file);
            setShowRestoreConfirm(true);
        }
    };

    const handleRestore = async () => {
        if (!pendingFile) return;

        setIsImporting(true);
        setShowRestoreConfirm(false);

        try {
            const text = await pendingFile.text();
            const backupData = JSON.parse(text);

            if (!validateBackupStructure(backupData)) {
                throw new Error("Invalid backup file");
            }

            await importBackup(userId, backupData);

            toast({
                title: "Restauración completa",
                description: "Los datos se han restaurado correctamente. Recarga la página para ver los cambios.",
            });

            // Reload page after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo restaurar el backup. Verifica que el archivo sea válido.",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
            setPendingFile(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Export Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Exportar Backup
                    </CardTitle>
                    <CardDescription>
                        Descarga una copia de seguridad de todos tus datos
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {lastBackup && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Último backup: {new Date(lastBackup).toLocaleString("es-ES")}
                        </div>
                    )}
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full"
                    >
                        {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Download className="mr-2 h-4 w-4" />
                        Crear Backup
                    </Button>
                </CardContent>
            </Card>

            {/* Import Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Restaurar Backup
                    </CardTitle>
                    <CardDescription>
                        Importa datos desde un archivo de backup
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">
                            <strong>Advertencia:</strong> La restauración agregará los datos del backup a tu cuenta actual. No se eliminarán los datos existentes.
                        </p>
                    </div>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            disabled={isImporting}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Button
                            variant="outline"
                            disabled={isImporting}
                            className="w-full"
                        >
                            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Upload className="mr-2 h-4 w-4" />
                            Seleccionar archivo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Restore Confirmation Dialog */}
            <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Restaurar backup?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción importará todos los datos del archivo de backup. Los datos existentes no se eliminarán, pero podrían crearse duplicados.
                            <br /><br />
                            <strong>Archivo:</strong> {pendingFile?.name}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingFile(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore}>
                            Restaurar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
