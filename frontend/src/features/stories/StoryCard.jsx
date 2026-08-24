import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bookmark,
  FileText,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  User,
} from "lucide-react";
import { formatCount } from "../../lib/format";
import useTagWrap from "./useTagWrap";

const COLLAPSED_CONTENT_HEIGHT = 120;
const GENRE_DISPLAY_LIMIT = 5;

const getLengthBasedPreview = (content, isExpanded, maxLength) => {
  const text = String(content || "").trim();

  if (text.length <= maxLength) {
    return { visibleContent: text, isLongContent: false };
  }

  return {
    visibleContent: isExpanded ? text : `${text.slice(0, maxLength).trim()}...`,
    isLongContent: true,
  };
};

export default function StoryCard({
  id,
  author,
  authorId,
  genres,
  tags,
  time,
  title,
  excerpt,
  content,
  likesCount,
  commentCount,
  avatar,
  canManage,
  likedByCurrentUser,
  savedByCurrentUser,
  commentsActive,
  onToggleLike,
  onOpenComments,
  onToggleSave,
  onToggleMenu,
  onEditStory,
  onDeleteStory,
  onToggleFollowAuthor,
  isExpanded,
  onToggleExpanded,
  isMenuOpen,
  followingAuthor,
  followBusy,
  focused = false,
  onCardClick,
  enableDoubleTapLike = false,
  onDoubleTapLike,
  showLikeBurst = false,
  showLikePulse = false,
  showCommentCountPulse = false,
  truncationMode = "measure",
  contentPreviewMaxLength = 260,
  profileLinkState,
  editHref,
  menuItemIcons = false,
  bookmarkAriaLabel = "Save story",
}) {
  const [isContentMeasured, setIsContentMeasured] = useState(false);
  const [areGenresExpanded, setAreGenresExpanded] = useState(false);
  const [areTagsExpanded, setAreTagsExpanded] = useState(false);
  const contentRef = useRef(null);
  const storyContent = content || excerpt || "";
  const storyGenres =
    Array.isArray(genres) && genres.length > 0 ? genres : ["GENERAL"];
  const storyTags = useMemo(() => (Array.isArray(tags) ? tags : []), [tags]);
  const { tagMeasurementRef, areTagsWrapped, firstRowTagCount } =
    useTagWrap(storyTags);
  const visibleGenres = areGenresExpanded
    ? storyGenres
    : storyGenres.slice(0, GENRE_DISPLAY_LIMIT);
  const hiddenGenreCount = Math.max(
    storyGenres.length - GENRE_DISPLAY_LIMIT,
    0,
  );
  const hiddenTagCount = areTagsWrapped
    ? Math.max(storyTags.length - firstRowTagCount, 0)
    : 0;
  const canExpandTags = hiddenTagCount > 0;
  const isTagsExpanded = canExpandTags && areTagsExpanded;
  const visibleTags =
    areTagsWrapped && !isTagsExpanded
      ? storyTags.slice(0, firstRowTagCount)
      : storyTags;

  const isMeasureTruncation = truncationMode === "measure";
  const { visibleContent: lengthVisibleContent, isLongContent } =
    isMeasureTruncation
      ? { visibleContent: storyContent, isLongContent: false }
      : getLengthBasedPreview(
          storyContent,
          isExpanded,
          contentPreviewMaxLength,
        );

  useEffect(() => {
    if (!isMeasureTruncation) {
      return undefined;
    }

    const element = contentRef.current;

    if (!element) {
      return undefined;
    }

    const updateMeasurement = () => {
      setIsContentMeasured(
        element.scrollHeight > COLLAPSED_CONTENT_HEIGHT + 1,
      );
    };

    updateMeasurement();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateMeasurement();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [isMeasureTruncation, storyContent]);

  const showReadMoreToggle = isMeasureTruncation
    ? isContentMeasured
    : isLongContent;

  const profileHref = authorId ? `/profile/${authorId}` : "/profile";

  const handleContainerClick = onCardClick
    ? () => onCardClick(id)
    : undefined;
  const handleContainerKeyDown = onCardClick
    ? (event) => {
        if (event.key === "Enter") {
          onCardClick(id);
        }
      }
    : undefined;
  const handleDoubleClick =
    enableDoubleTapLike && onDoubleTapLike
      ? () => onDoubleTapLike(id)
      : undefined;

  const stopAnd = (handler) => (event) => {
    event.stopPropagation();
    handler?.(event);
  };

  return (
    <div
      onClick={handleContainerClick}
      onKeyDown={handleContainerKeyDown}
      onDoubleClick={handleDoubleClick}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      aria-label={onCardClick ? `View story: ${title}` : undefined}
      className={`relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md ${
        onCardClick ? "cursor-pointer" : ""
      } ${focused ? "ring-4 ring-rose-50 bg-rose-50/60" : ""}`}
    >
      {showLikeBurst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart
            size={54}
            className="text-red-500 animate-pulse"
            fill="currentColor"
          />
        </div>
      )}

      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to={profileHref}
            state={profileLinkState}
            className="w-10 h-10 shrink-0 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label={`View ${author} profile`}
            onClick={onCardClick ? (event) => event.stopPropagation() : undefined}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                <User size={20} />
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <Link
                to={profileHref}
                state={profileLinkState}
                className="font-semibold text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                onClick={
                  onCardClick ? (event) => event.stopPropagation() : undefined
                }
              >
                {author}
              </Link>
              <span className="text-slate-400 text-xs">• {time}</span>
            </div>

            <div className="mt-1 flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
              {visibleGenres.map((genre, index) => (
                <span
                  key={`${id}-genre-${String(genre)}-${index}`}
                  className="inline-flex max-w-full items-center gap-2"
                >
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[10px] font-semibold text-rose-400"
                    >
                      •
                    </span>
                  )}
                  <span className="max-w-full truncate text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                    {genre}
                  </span>
                </span>
              ))}

              {hiddenGenreCount > 0 && !areGenresExpanded && (
                <button
                  type="button"
                  onClick={stopAnd(() => setAreGenresExpanded(true))}
                  className="text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-rose-600 transition-colors hover:text-rose-700"
                  aria-label={`Show ${hiddenGenreCount} more genres`}
                >
                  +{hiddenGenreCount}
                </button>
              )}

              {hiddenGenreCount > 0 && areGenresExpanded && (
                <button
                  type="button"
                  onClick={stopAnd(() => setAreGenresExpanded(false))}
                  className="text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-slate-500 transition-colors hover:text-slate-700"
                  aria-label="Collapse genres"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2" data-story-menu>
          {!canManage && authorId ? (
            <button
              type="button"
              onClick={stopAnd(() => onToggleFollowAuthor(authorId))}
              disabled={followBusy}
              className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
                followingAuthor
                  ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                  : "bg-rose-500 hover:bg-rose-600 text-white"
              } ${followBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {followingAuthor ? "Following" : "Follow"}
            </button>
          ) : null}

          {canManage ? (
            <>
              <button
                type="button"
                onClick={stopAnd(() => onToggleMenu(id))}
                className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors duration-200"
                aria-label="Story actions"
              >
                <MoreHorizontal size={20} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1 overflow-hidden">
                  {editHref ? (
                    <Link
                      to={editHref}
                      onClick={stopAnd(() => onEditStory(id))}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {menuItemIcons && <FileText size={14} />}
                      Edit
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={stopAnd(() => onEditStory(id))}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                    >
                      {menuItemIcons && <FileText size={14} />}
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopAnd(() => onDeleteStory(id))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 cursor-pointer hover:bg-rose-50"
                  >
                    {menuItemIcons && <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
        {title}
      </h2>

      {isMeasureTruncation ? (
        <p
          ref={contentRef}
          className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-2"
          style={
            isExpanded
              ? undefined
              : {
                  maxHeight: `${COLLAPSED_CONTENT_HEIGHT}px`,
                  overflow: "hidden",
                }
          }
        >
          {storyContent}
        </p>
      ) : (
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-2">
          {lengthVisibleContent}
        </p>
      )}

      {showReadMoreToggle ? (
        <button
          type="button"
          onClick={stopAnd(() => onToggleExpanded(id))}
          className="mb-4 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      ) : (
        <div className="mb-4" />
      )}

      {storyTags.length > 0 && (
        <div className="relative mb-4">
          <div
            ref={tagMeasurementRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 -z-10 flex w-full flex-wrap items-center gap-x-3 gap-y-1 opacity-0"
          >
            {storyTags.map((tag, index) => (
              <span
                key={`${id}-measure-tag-${String(tag)}-${index}`}
                data-tag-chip="true"
                className="text-xs font-semibold tracking-wide text-rose-600"
              >
                #
                {String(tag || "")
                  .trim()
                  .replace(/^#/, "")
                  .replaceAll(/\s+/g, "")}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {visibleTags.map((tag, index) => (
              <span
                key={`${id}-tag-${String(tag)}-${index}`}
                className="text-xs font-semibold tracking-wide text-rose-600"
              >
                #
                {String(tag || "")
                  .trim()
                  .replace(/^#/, "")
                  .replaceAll(/\s+/g, "")}
              </span>
            ))}

            {canExpandTags && !isTagsExpanded && (
              <button
                type="button"
                onClick={stopAnd(() => setAreTagsExpanded(true))}
                className="text-xs font-semibold cursor-pointer tracking-wide text-rose-600 transition-colors hover:text-rose-700"
                aria-label={`Show ${hiddenTagCount} more tags`}
              >
                +{hiddenTagCount}
              </button>
            )}

            {canExpandTags && isTagsExpanded && (
              <button
                type="button"
                onClick={stopAnd(() => setAreTagsExpanded(false))}
                className="text-xs font-semibold cursor-pointer tracking-wide text-slate-500 transition-colors hover:text-slate-700"
                aria-label="Collapse tags"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={stopAnd(() => onToggleLike(id))}
            className={`flex items-center gap-2 transition-all cursor-pointer duration-200 ${
              likedByCurrentUser
                ? "text-rose-500"
                : "text-slate-500 hover:text-rose-500"
            }`}
          >
            <Heart
              size={20}
              className={
                showLikePulse
                  ? "scale-110 transition-transform duration-200"
                  : "transition-transform duration-200"
              }
              fill={likedByCurrentUser ? "currentColor" : "none"}
            />
            <span className="text-xs sm:text-sm font-medium">
              {formatCount(likesCount)}
            </span>
          </button>
          <button
            type="button"
            onClick={stopAnd(() => onOpenComments(id))}
            className={`flex items-center gap-2 transition-all cursor-pointer duration-200 ${
              commentsActive
                ? "text-sky-500"
                : "text-slate-500 hover:text-sky-500"
            }`}
          >
            <MessageCircle size={20} />
            <span
              className={`text-xs sm:text-sm font-medium transition-transform duration-300 ${
                showCommentCountPulse ? "scale-110" : "scale-100"
              }`}
            >
              {formatCount(commentCount)}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button
            type="button"
            onClick={stopAnd(() => onToggleSave(id))}
            className="text-rose-500 hover:text-rose-600 transition-colors duration-200 cursor-pointer"
            aria-label={bookmarkAriaLabel}
          >
            <Bookmark
              size={20}
              fill={savedByCurrentUser ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
