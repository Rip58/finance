import { useState } from "react";
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Account {
  id: string;
  name: string;
  currency: string;
  sort_order?: number;
  category_id?: string;
}

interface SortableAccountListProps {
  accounts: Account[];
  getDisplayValue: (account: Account) => string;
  getAccountTheme?: (account: Account) => string;
  onAccountClick: (account: Account) => void;
  onReorder: (accounts: { id: string; sort_order: number }[]) => void;
}

function SortableAccountItem({
  account,
  getDisplayValue,
  getAccountTheme,
  onClick,
}: {
  account: Account;
  getDisplayValue: (account: Account) => string;
  getAccountTheme?: (account: Account) => string;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const themeClass = getAccountTheme ? getAccountTheme(account) : "slate";
  const themeClasses: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/20",
    sky: "bg-sky-500/10 border-sky-500/20",
    amber: "bg-amber-500/10 border-amber-500/20",
    slate: "bg-card/30 border-border/30",
  };
  const activeClass = themeClasses[themeClass] || themeClasses.slate;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between w-full rounded-xl px-4 py-3 border transition-all duration-200",
        activeClass,
        isDragging
          ? "shadow-lg scale-[1.02] z-10 ring-1 ring-primary/20"
          : "hover:brightness-95 active:scale-[0.99]"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-30 hover:opacity-70 transition-opacity shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Account info */}
        <button
          onClick={onClick}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <Avatar className="h-7 w-7 border border-border/30 bg-muted/30 shrink-0">
            <AvatarImage
              src={`https://logo.clearbit.com/${account.name.toLowerCase().replace(/\s/g, "")}.com`}
              alt={account.name}
              className="object-contain p-1"
            />
            <AvatarFallback className="bg-transparent text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 opacity-40" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <span className="text-sm font-medium block leading-tight truncate">{account.name}</span>
            <span className="text-[10px] text-muted-foreground">{account.currency}</span>
          </div>
        </button>
      </div>

      {/* Balance */}
      <span className="font-semibold text-sm tracking-tight shrink-0 ml-2">{getDisplayValue(account)}</span>
    </div>
  );
}

export function SortableAccountList({
  accounts,
  getDisplayValue,
  getAccountTheme,
  onAccountClick,
  onReorder,
}: SortableAccountListProps) {
  const [items, setItems] = useState(accounts);

  if (accounts.length !== items.length || accounts.some((a, i) => a.id !== items[i]?.id)) {
    setItems(accounts);
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onReorder(newItems.map((item, index) => ({ id: item.id, sort_order: index })));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {items.map((account) => (
            <SortableAccountItem
              key={account.id}
              account={account}
              getDisplayValue={getDisplayValue}
              getAccountTheme={getAccountTheme}
              onClick={() => onAccountClick(account)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
