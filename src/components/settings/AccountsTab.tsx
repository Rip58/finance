import { useState, useEffect } from "react";
import { useBankAccounts, BankAccount } from "@/hooks/useBankAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Archive, CreditCard } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AccountsTabProps {
  userId: string;
}

export function AccountsTab({ userId }: AccountsTabProps) {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading, create, update, delete: deleteAccount, isCreating, isUpdating } = useBankAccounts(userId);
  const { data: categories, create: createCategory, isCreating: isCreatingCategory } = useCategories(userId, "account");
  const { currencies, addCurrency, isAdding: isAddingCurrency } = useCurrencies();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCurrencyCode, setNewCurrencyCode] = useState("");

  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    currency: "EUR",
    category_id: "none",
    is_archived: false,
    initial_balance: "0",
  });

  const DEFAULT_ACCOUNT_CATEGORIES = ["Corriente", "Ahorros", "Inversiones", "Crypto"];

  useEffect(() => {
    if (!userId || !categories || categories.length > 0 || isCreatingCategory) return;

    const initializeDefaults = async () => {
      try {
        const categoriesToInsert = DEFAULT_ACCOUNT_CATEGORIES.map((catName, index) => ({
          name: catName,
          scope: "account",
          sort_order: index,
          is_archived: false,
          user_id: userId
        }));

        const { error } = await supabase
          .from("categories")
          .insert(categoriesToInsert);

        if (error) throw error;

        // Invalidate once after all inserts
        queryClient.invalidateQueries({ queryKey: ["categories", userId] });
      } catch (error) {
        console.error("Error creating default categories:", error);
      }
    };

    initializeDefaults();
  }, [categories, userId, isCreatingCategory]);

  useEffect(() => {
    if (categories && categories.length > 0 && formData.category_id === "none") {
      const corrienteCat = categories.find(c => c.name === "Corriente");
      if (corrienteCat) {
        setFormData(prev => ({ ...prev, category_id: corrienteCat.id }));
      } else {
        setFormData(prev => ({ ...prev, category_id: categories[0].id }));
      }
    }
  }, [categories, formData.category_id]);

  const handleSubmit = async () => {
    if (formData.category_id === "none") return;
    const dataToSave = {
      name: formData.name,
      currency: formData.currency,
      category_id: formData.category_id,
      is_archived: formData.is_archived,
      initial_balance: 0,
      importe_inicial: true,
    };
    if (editingAccount) {
      await update({ id: editingAccount.id, ...dataToSave });
    } else {
      await create(dataToSave);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newId = await createCategory({
        name: newCategoryName,
        scope: "account",
        sort_order: categories ? categories.length : 0,
        is_archived: false
      });
      setFormData(prev => ({ ...prev, category_id: newId }));
      setIsCategoryDialogOpen(false);
      setNewCategoryName("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateCurrency = async () => {
    if (!newCurrencyCode.trim()) return;
    try {
      const code = newCurrencyCode.trim().toUpperCase();
      await addCurrency(code);
      setFormData(prev => ({ ...prev, currency: code }));
      setIsCurrencyDialogOpen(false);
      setNewCurrencyCode("");
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    let defaultCatId = "none";
    if (categories && categories.length > 0) {
      const corrienteCat = categories.find(c => c.name === "Corriente");
      defaultCatId = corrienteCat ? corrienteCat.id : categories[0].id;
    }
    setFormData({ name: "", currency: "EUR", category_id: defaultCatId, is_archived: false, initial_balance: "0" });
    setEditingAccount(null);
  };

  const openEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      currency: account.currency,
      category_id: account.category_id || "none",
      is_archived: account.is_archived,
      initial_balance: account.initial_balance?.toString() || "0",
    });
    setIsDialogOpen(true);
  };
  // ... (rest of the component until Dialog content)
  // In the Dialog Content:
  <div className="space-y-2">
    <Label>Moneda</Label>
    <Select
      value={formData.currency}
      onValueChange={(v) => {
        if (v === "_new") {
          setIsCurrencyDialogOpen(true);
        } else {
          setFormData({ ...formData, currency: v });
        }
      }}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((curr) => (
          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
        ))}
        <div className="border-t border-border my-1" />
        <SelectItem value="_new" className="font-medium text-primary">
          + Nueva divisa
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
  // ... (rest of form)

  // After Create/Edit Dialog, add Currency Dialog:
  {/* New Currency Dialog */ }
  <Dialog open={isCurrencyDialogOpen} onOpenChange={setIsCurrencyDialogOpen}>
    <DialogContent className="max-w-sm mx-4">
      <DialogHeader>
        <DialogTitle>Nueva Divisa</DialogTitle>
        <DialogDescription>
          Añade el código de la divisa (ej. JPY, GBP)
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <div className="space-y-2">
          <Label>Código</Label>
          <Input
            value={newCurrencyCode}
            onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
            placeholder="GBP"
            maxLength={4}
            autoFocus
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsCurrencyDialogOpen(false)}>
          Cancelar
        </Button>
        <Button onClick={handleCreateCurrency} disabled={isAddingCurrency || !newCurrencyCode.trim()}>
          {isAddingCurrency && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Añadir
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  // ...

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Cuentas bancarias</h3>
          <p className="text-sm text-muted-foreground">Gestiona tus cuentas</p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      {/* Accounts List */}
      {accounts?.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
          <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No hay cuentas creadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts?.map((account) => (
            <div
              key={account.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50",
                account.is_archived && "opacity-50"
              )}
            >
              <Avatar className="h-10 w-10 border border-border/50">
                <AvatarImage
                  src={`https://logo.clearbit.com/${account.name.toLowerCase().replace(/\s/g, "")}.com`}
                  alt={account.name}
                  className="object-contain p-1"
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{account.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{account.currency}</Badge>
                  {account.is_archived && (
                    <Badge variant="secondary" className="text-xs">Archivada</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                  <Pencil className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteAccount(account.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
            <DialogDescription>
              {editingAccount ? "Modifica los datos" : "Añade una cuenta bancaria"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder="MI CUENTA PRINCIPAL"
              />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={formData.currency} onValueChange={(v) => {
                if (v === "_new") {
                  setIsCurrencyDialogOpen(true);
                } else {
                  setFormData({ ...formData, currency: v });
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  {currencies.filter(c => c !== "EUR" && c !== "USD" && c !== "USDT").map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                  <div className="border-t border-border my-1" />
                  <SelectItem value="_new" className="font-medium text-primary">
                    + Nueva divisa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => {
                  if (v === "_new") {
                    setIsCategoryDialogOpen(true);
                  } else {
                    setFormData({ ...formData, category_id: v });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.filter(c => !c.is_archived && !["crypto", "cryptocoin"].includes(c.name.toLowerCase())).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                  <div className="border-t border-border my-1" />
                  <SelectItem value="_new" className="font-medium text-primary">
                    + Nueva categoría
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating || !formData.name}>
              {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAccount ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Crea una nueva categoría para organizar tus cuentas
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Nombre de la categoría</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ej. Ahorros, Inversiones..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()}>
              {isCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
