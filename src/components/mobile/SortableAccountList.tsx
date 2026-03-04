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
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100",
    sky: "bg-sky-500/10 border-sky-500/20 text-sky-950 dark:text-sky-100",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100",
    slate: "bg-card/50 border-border/50 text-foreground",
  };
  const activeClass = themeClasses[themeClass] || themeClasses.slate;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between w-full rounded-3xl p-4 mb-3 transition-all duration-200 border backdrop-blur-sm shadow-sm",
        activeClass,
        isDragging ? "shadow-xl scale-105 z-10 ring-1 ring-primary/20 bg-accent" : "hover:brightness-95 active:scale-[0.98]"
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 opacity-50 hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <button
          onClick={onClick}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <Avatar className="h-10 w-10 border border-black/10 dark:border-white/10 shadow-sm bg-white/50 dark:bg-black/50">
            <AvatarImage
              src={`https://logo.clearbit.com/${account.name.toLowerCase().replace(/\s/g, "")}.com`}
              alt={account.name}
              className="object-contain p-1"
            />
            <AvatarFallback className="bg-transparent">
              <Building2 className="h-5 w-5 opacity-50" />
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-base font-semibold block leading-none mb-1">{account.name}</span>
            <span className="text-xs font-medium opacity-70 px-1.5 py-0.5 rounded-md mix-blend-multiply dark:mix-blend-screen">{account.currency}</span>
          </div>
        </button>
      </div>
      <span className="font-bold text-base tracking-tight">{getDisplayValue(account)}</span>
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

  // Update items when accounts prop changes
  if (accounts.length !== items.length || accounts.some((a, i) => a.id !== items[i]?.id)) {
    setItems(accounts);
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // Save new order to database
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));
      onReorder(updates);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
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
