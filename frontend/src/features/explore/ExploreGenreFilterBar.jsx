import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ExploreGenreFilterBar({
  genreFilters,
  genresLoading,
  genresError,
  activeCategory,
  onSelectCategory,
}) {
  const genresRef = useRef(null);

  const scrollByDirection = (direction) => {
    if (!genresRef.current) return;
    const width = genresRef.current.clientWidth || 240;
    genresRef.current.scrollBy({
      left: direction * Math.round(width * 0.7),
      behavior: "smooth",
    });
  };

  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 sm:gap-3 px-1 py-1">
        <button
          type="button"
          aria-label="Scroll genres left"
          onClick={() => scrollByDirection(-1)}
          className="inline-flex h-10 w-10 items-center justify-center text-slate-600 hover:text-slate-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={genresRef}
          className="flex-1 flex items-center gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-1"
        >
          {genresLoading ? (
            <span className="h-10 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center border border-slate-200 text-slate-400">
              Loading genres...
            </span>
          ) : null}

          {!genresLoading && genresError ? (
            <span className="h-10 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center border border-rose-200 text-rose-500">
              {genresError}
            </span>
          ) : null}

          {!genresLoading &&
            !genresError &&
            genreFilters.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className={`h-10 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap inline-flex items-center ${
                  activeCategory === category
                    ? "bg-rose-500 text-white"
                    : "border border-slate-300 text-slate-600"
                }`}
              >
                {category}
              </button>
            ))}
        </div>

        <button
          type="button"
          aria-label="Scroll genres right"
          onClick={() => scrollByDirection(1)}
          className="inline-flex h-10 w-10 items-center justify-center text-slate-600 hover:text-slate-800"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
