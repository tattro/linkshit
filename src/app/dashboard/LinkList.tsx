"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { startTransition, useOptimistic } from "react";
import { reorderLinks } from "@/app/actions/links";
import type { Link } from "@/db/schema";
import { LinkItem, type SectionOption } from "./editor";

function SortableLink({ link, nested, sections, section }: { link: Link; nested: boolean; sections: SectionOption[]; section: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // Links under a section sit indented, so the grouping is visible
      className={`${nested ? "ml-5 border-l-2 border-stone-200 pl-3" : ""} ${isDragging ? "relative z-10 rotate-1 opacity-90 shadow-xl" : ""}`}
    >
      <LinkItem
        link={link}
        sections={sections}
        section={section}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${link.title}`}
            className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-xl leading-none text-stone-500 hover:bg-stone-100 hover:text-stone-900 active:cursor-grabbing"
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

  const sections = ordered.filter((l) => l.heading).map((l) => ({ id: l.id, title: l.title }));

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
          {ordered.map((l, i) => {
            const above = ordered.slice(0, i).findLast((x) => x.heading);
            return (
              <SortableLink
                key={l.id}
                link={l}
                nested={!l.heading && !l.offerId && Boolean(above)}
                sections={sections}
                section={above ? String(above.id) : "none"}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
