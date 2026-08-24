import { useState } from "react";

export default function ExpandableChipList({
  idPrefix,
  items,
  limit = 5,
  chipClassName = "text-[10px] font-semibold uppercase tracking-wider text-rose-500",
  separatorClassName = "text-[10px] font-semibold text-rose-400",
  showMoreClassName = "text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-rose-600 transition-colors hover:text-rose-700",
  showLessClassName = "text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-700",
  showMoreLabel = "more",
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const safeItems = Array.isArray(items) ? items : [];
  const visibleItems = isExpanded ? safeItems : safeItems.slice(0, limit);
  const hiddenCount = Math.max(safeItems.length - limit, 0);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {visibleItems.map((item, index) => (
        <span
          key={`${idPrefix}-${String(item)}-${index}`}
          className="inline-flex items-center gap-2"
        >
          {index > 0 && (
            <span aria-hidden="true" className={separatorClassName}>
              •
            </span>
          )}
          <span className={chipClassName}>{String(item)}</span>
        </span>
      ))}

      {hiddenCount > 0 && !isExpanded && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded(true);
          }}
          className={showMoreClassName}
          aria-label={`Show ${hiddenCount} ${showMoreLabel}`}
        >
          +{hiddenCount}
        </button>
      )}

      {hiddenCount > 0 && isExpanded && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded(false);
          }}
          className={showLessClassName}
          aria-label="Show less"
        >
          Show less
        </button>
      )}
    </div>
  );
}
