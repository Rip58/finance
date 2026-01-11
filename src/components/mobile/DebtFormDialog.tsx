import { useState, useEffect } from "react";
import { Loader2, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatCurrency } from "@/lib/utils";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";

interface DebtFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'pay' | 'receive' | null; // 'pay' = Deuda A Pagar (Expense), 'receive' = Deuda A Cobrar (Income)
    userId: string;
}

export function DebtFormDialog({ isOpen, onClose, type, userId }: DebtFormDialogProps) {
    const { create: createRecurring } = useRecurringTransactions(userId);

    const [personName, setPersonName] = useState("");
    const [description, setDescription] = useState("");
    const [totalAmount, setTotalAmount] = useState("");

    // Contributions State: List of { amount: string, date: Date }
    const [contributions, setContributions] = useState<{ amount: string, date: Date }[]>([]);
    const [newContrib, setNewContrib] = useState<{ amount: string, date: Date }>({ amount: "", date: new Date() });
    const [editingContribIndex, setEditingContribIndex] = useState<number | null>(null);

    // Derived values
    const amountPaid = contributions.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
    const paymentsMade = contributions.length;
    // Start Date defaults to earliest contribution or today
    const effectiveStartDate = contributions.length > 0
        ? contributions.sort((a, b) => a.date.getTime() - b.date.getTime())[0].date
        : new Date();

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setPersonName("");
            setDescription("");
            setTotalAmount("");
            setContributions([]);
            setNewContrib({ amount: "", date: new Date() });
        }
    }, [isOpen, type]);

    const addContribution = () => {
        if (!newContrib.amount) return;

        const list = [...contributions];
        if (editingContribIndex !== null) {
            list[editingContribIndex] = newContrib;
            setEditingContribIndex(null);
        } else {
            list.push(newContrib);
        }
        // Optional sort
        list.sort((a, b) => a.date.getTime() - b.date.getTime());

        setContributions(list);
        setNewContrib({ amount: "", date: new Date() });
    };

    const removeContribution = (index: number) => {
        setContributions(contributions.filter((_, i) => i !== index));
    };

    const editContribution = (index: number) => {
        setNewContrib(contributions[index]);
        setEditingContribIndex(index);
    };

    // For manual debts, installment amount is undefined/irrelevant for recurrence
    const installmentAmount = 0;

    const handleSubmit = async () => {
        if (!type || !totalAmount || !personName) return;
        setIsSubmitting(true);
        try {
            const payload = {
                type: type === 'pay' ? 'expense' : 'income',
                name: description || (type === 'pay' ? `Deuda con ${personName}` : `Deuda de ${personName}`),
                amount: installmentAmount,
                currency: 'EUR', // Default currency
                category_id: null,
                bank_account_id: null,
                cadence: 'manual', // Force manual
                start_date: format(effectiveStartDate, 'yyyy-MM-dd'),
                next_occurrence_date: format(effectiveStartDate, 'yyyy-MM-dd'),
                is_active: true,
                person: personName,
                loan_total_amount: parseFloat(totalAmount),
                loan_total_payments: null, // Unknown or irrelevant for manual
                loan_payments_made: paymentsMade,
                loan_amount_paid: amountPaid,
                contributions: contributions.map(c => ({
                    amount: c.amount,
                    date: c.date.toISOString().split('T')[0]
                })), // Save standardized date strings
            };

            await createRecurring(payload as any);
            onClose();
        } catch (error) {
            console.error("Error creating debt:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = type === 'pay' ? 'Nueva Deuda' : 'Nuevo Cobro';
    const personLabel = type === 'pay' ? 'Acreedor (A quién debes)' : 'Deudor (Quién te debe)';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Person Name */}
                    <div className="space-y-2">
                        <Label>{personLabel}</Label>
                        <Input
                            placeholder="Ej: Juan, Empresa X..."
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                        />
                    </div>

                    {/* Description (Optional) */}
                    <div className="space-y-2">
                        <Label>Concepto (Opcional)</Label>
                        <Input
                            placeholder="Ej: Préstamo Coche..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Total Amount */}
                    <div className="space-y-2">
                        <Label>Importe Total Deuda</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                        />
                    </div>

                    {/* Contributions Section */}
                    <div className="pt-2 border-t border-border/50">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1 mb-2 block">
                            Aportaciones Realizadas
                        </Label>

                        {contributions.length > 0 && (
                            <div className="flex flex-col gap-2 mb-3">
                                {contributions.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-secondary/30 rounded-lg">
                                        <span>{new Intl.DateTimeFormat('es-ES').format(c.date)}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{formatCurrency(parseFloat(c.amount))}</span>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => editContribution(i)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive/80"
                                                    onClick={() => removeContribution(i)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input Row */}
                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-muted-foreground ml-1 uppercase">Fecha</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-10 rounded-xl justify-start text-left font-normal border-input/50 bg-background/50 px-3",
                                                !newContrib.date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                            {newContrib.date ? format(newContrib.date, "dd/MM/yyyy", { locale: es }) : <span>Fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={newContrib.date}
                                            onSelect={(d) => d && setNewContrib({ ...newContrib, date: d })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-muted-foreground ml-1 uppercase">Importe</span>
                                <Input
                                    type="number"
                                    className="h-10 rounded-xl bg-background/50"
                                    placeholder="0.00"
                                    value={newContrib.amount}
                                    onChange={(e) => setNewContrib({ ...newContrib, amount: e.target.value })}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={addContribution}
                                className="h-10 px-4 rounded-xl ml-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                                disabled={!newContrib.amount}
                            >
                                <span className="text-sm font-medium">Añadir</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        className="w-full h-12 rounded-xl text-base font-medium"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !totalAmount || !personName}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Deuda
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
