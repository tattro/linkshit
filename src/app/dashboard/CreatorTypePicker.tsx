import { setCreatorType } from "@/app/actions/creator";
import { CREATOR_TYPES } from "@/lib/creatorTypes";

/** One-tap "What do you do?" chips. Server-rendered forms, so no JS needed. */
export function CreatorTypePicker({ current, compact = false }: { current?: string; compact?: boolean }) {
  return (
    <div>
      {!compact && (
        <>
          <h2 className="text-lg font-black">What do you do?</h2>
          <p className="mb-3 text-sm text-stone-700">We&apos;ll suggest the right categories and features. Nothing gets locked, and you can change it any time.</p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CREATOR_TYPES).filter(([id]) => id !== "other").map(([id, t]) => (
          <form key={id} action={setCreatorType}>
            <input type="hidden" name="creatorType" value={id} />
            <button
              aria-pressed={current === id}
              className={`rounded-full border-2 border-stone-900 px-3 py-1.5 text-sm font-bold ${current === id ? "bg-stone-900 text-white" : "bg-white hover:bg-lime-300"}`}
            >
              {t.label}
            </button>
          </form>
        ))}
        <form action={setCreatorType}>
          <input type="hidden" name="creatorType" value={compact ? "other" : "skip"} />
          <button
            aria-pressed={compact && current === "other"}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${compact && current === "other" ? "bg-stone-900 text-white" : "text-stone-600 underline"}`}
          >
            {compact ? CREATOR_TYPES.other.label : "Skip"}
          </button>
        </form>
      </div>
    </div>
  );
}
