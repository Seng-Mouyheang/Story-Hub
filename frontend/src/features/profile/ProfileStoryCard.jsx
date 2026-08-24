import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COLLAPSED_CONTENT_HEIGHT } from "./profileUtils";

export default function ProfileStoryCard({ story, actionLabel, actionHref }) {
  const navigate = useNavigate();
  const [areGenresExpanded, setAreGenresExpanded] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isContentOverflowing, setIsContentOverflowing] = useState(false);
  const contentRef = useRef(null);

  const genreDisplayLimit = 5;
  const storyGenres =
    Array.isArray(story.genres) && story.genres.length > 0
      ? story.genres
      : story.genre
        ? [String(story.genre).toUpperCase()]
        : ["GENERAL"];
  const visibleGenres = areGenresExpanded
    ? storyGenres
    : storyGenres.slice(0, genreDisplayLimit);
  const hiddenGenreCount = Math.max(storyGenres.length - genreDisplayLimit, 0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () =>
      setIsContentOverflowing(el.scrollHeight > COLLAPSED_CONTENT_HEIGHT + 1);

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [story.fullContent]);

  const handleCardClick = () => {
    if (!story || !story.id) return;
    navigate("/", { state: { focusedPostId: story.id, from: "/profile" } });
  };

  const handleKeyDownCard = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onKeyDown={handleKeyDownCard}
      onClick={handleCardClick}
      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            {story.title}
          </h3>
          {story.author && (
            <p className="text-xs text-slate-400 mt-0.5">
              by{" "}
              {story.authorId ? (
                <Link
                  to={`/profile/${story.authorId}`}
                  state={{ from: "/profile" }}
                  className="hover:text-rose-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {story.author}
                </Link>
              ) : (
                story.author
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
          {visibleGenres.map((genre, idx) => (
            <span
              key={`${story.id}-genre-${genre}-${idx}`}
              className="inline-flex items-center gap-2"
            >
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  className="text-[10px] font-semibold text-rose-400"
                >
                  •
                </span>
              )}
              <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
                {genre}
              </span>
            </span>
          ))}

          {hiddenGenreCount > 0 && !areGenresExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAreGenresExpanded(true);
              }}
              className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 transition-colors hover:text-rose-700"
              aria-label={`Show ${hiddenGenreCount} more genres`}
            >
              +{hiddenGenreCount}
            </button>
          )}

          {hiddenGenreCount > 0 && areGenresExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAreGenresExpanded(false);
              }}
              className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-700"
              aria-label="Collapse genres"
            >
              Show less
            </button>
          )}
        </div>
      </div>

      <p
        ref={contentRef}
        className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-2"
        style={
          isContentExpanded
            ? undefined
            : { maxHeight: `${COLLAPSED_CONTENT_HEIGHT}px`, overflow: "hidden" }
        }
      >
        {story.fullContent || "No preview is available for this story."}
      </p>

      {isContentOverflowing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsContentExpanded((v) => !v);
          }}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 mb-4"
        >
          {isContentExpanded ? "Show less" : "Read more"}
        </button>
      )}

      <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6 text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
        <div className="flex items-center gap-1">
          <span>{story.likes} likes</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{story.savesLabel || `${story.saves} Saves`}</span>
        </div>
        <div>{story.date}</div>
      </div>

      {actionHref && actionLabel ? (
        <div className="mt-4 flex justify-end">
          <Link
            to={actionHref}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600"
            onClick={(e) => e.stopPropagation()}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
