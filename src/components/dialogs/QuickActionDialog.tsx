import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransfers } from "@/hooks/useTransfers";
import type { QuickActionType } from "@/components/mobile";

interface QuickActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: QuickActionType | null;
  userId: string;
}

const formSchema = z.object({
  amount: z.coerce.number().positive("El importe debe ser mayor a 0"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  to_account_id: z.string().optional(),
  date: z.date(),
});

type FormData = z.infer<typeof formSchema>;

export function QuickActionDialog({
  open,
  onOpenChange,
  action,
  userId,
}: QuickActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: accounts = [] } = useBankAccounts(userId);
  const { data: incomeCategories = [] } = useCategories(userId, "income");
  const { data: expenseCategories = [] } = useCategories(userId, "expense");
  const { create: createTransaction } = useTransactions(userId);
  const { create: createTransfer } = useTransfers(userId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      category_id: undefined,
      bank_account_id: undefined,
      to_account_id: undefined,
      date: new Date(),
    },
  });

  const getTitle = () => {
    switch (action) {
      case "add-money":
        return "Add Money";
      case "transfer":
        return "Transfer";
      case "deposit":
        return "Deposit (Income)";
      case "withdraw":
        return "Withdraw (Expense)";
      default:
        return "";
    }
  };

  const categories = action === "withdraw" ? expenseCategories : incomeCategories;
  const isTransfer = action === "transfer";

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (isTransfer) {
        if (!data.bank_account_id || !data.to_account_id) {
          throw new Error("Selecciona origen y destino");
        }
        const fromAccount = accounts.find((a) => a.id === data.bank_account_id);
        const toAccount = accounts.find((a) => a.id === data.to_account_id);

        await createTransfer({
          from_account_id: data.bank_account_id,
          to_account_id: data.to_account_id,
          amount_from: data.amount,
          currency_from: fromAccount?.currency || "EUR",
          amount_to: data.amount,
          currency_to: toAccount?.currency || "EUR",
          fx_rate: 1,
          date: data.date.toISOString(),
          value_date: null,
          description: data.description || null,
        });
      } else {
        const type = action === "withdraw" ? "expense" : "income";
        const account = accounts.find((a) => a.id === data.bank_account_id);

        await createTransaction({
          type,
          amount: data.amount,
          currency: account?.currency || "EUR",
          category_id: data.category_id || null,
          bank_account_id: data.bank_account_id || null,
          description: data.description || null,
          date: data.date.toISOString(),
          value_date: null,
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importe</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* From Account */}
            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isTransfer ? "Origen" : "Cuenta"}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cuenta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* To Account (for transfers) */}
            {isTransfer && (
              <FormField
                control={form.control}
                name="to_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destino</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts
                          .filter((a) => a.id !== form.getValues("bank_account_id"))
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.currency})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Category (not for transfers) */}
            {!isTransfer && (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Opcional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Selecciona fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
