"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { startTransition, useOptimistic } from "react";
import { reorderLinks } from "@/app/actions/links";
import type { Link } from "@/db/schema";
import { LinkItem } from "./editor";

function SortableLink({ link }: { link: Link }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 rotate-1 opacity-90 shadow-xl" : undefined}
    >
      <LinkItem
        link={link}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${link.title}`}
            className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-xl leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-900 active:cursor-grabbing"
          >
            ⠿
          </button>
        }
      />
    </li>
  );
}

/** The dashboard's link list, reorderable by dragging (mouse, touch or keyboard). */
export function LinkList({ links }: { links: Link[] }) {
  const [ordered, setOrdered] = useOptimistic(links);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ordered.findIndex((l) => l.id === active.id);
    const to = ordered.findIndex((l) => l.id === over.id);
    const next = arrayMove(ordered, from, to);
    startTransition(async () => {
      setOrdered(next);
      await reorderLinks(next.map((l) => l.id));
    });
  }

  return (
    <DndContext id="links" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ordered.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {ordered.map((l) => <SortableLink key={l.id} link={l} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
