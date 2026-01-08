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
}

interface SortableAccountListProps {
  accounts: Account[];
  getDisplayValue: (account: Account) => string;
  onAccountClick: (account: Account) => void;
  onReorder: (accounts: { id: string; sort_order: number }[]) => void;
}

function SortableAccountItem({
  account,
  getDisplayValue,
  onClick,
}: {
  account: Account;
  getDisplayValue: (account: Account) => string;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between w-full rounded-2xl p-2 -mx-2 transition-colors",
        isDragging ? "bg-muted shadow-lg z-10" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onClick}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Avatar className="h-5 w-5 mr-2">
            <AvatarImage
              src={`https://logo.clearbit.com/${account.name.toLowerCase().replace(/\s/g, "")}.com`}
              alt={account.name}
              className="object-contain"
            />
            <AvatarFallback className="bg-transparent">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{account.name}</span>
        </button>
      </div>
      <span className="font-medium text-sm">{getDisplayValue(account)}</span>
    </div>
  );
}

export function SortableAccountList({
  accounts,
  getDisplayValue,
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
              onClick={() => onAccountClick(account)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
