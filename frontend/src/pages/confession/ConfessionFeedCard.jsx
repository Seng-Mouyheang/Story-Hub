import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import {
  formatCount,
  getRelativeTime,
  getConfessionContentPreview,
  normalizeId,
} from "./confessionUtils";

/**
 * @typedef {Object} ConfessionFeedItem
 * @property {string | object} [_id]
 * @property {string | object} [id]
 * @property {string | object} [authorId]
 * @property {string} [authorDisplayName]
 * @property {string} [authorProfilePicture]
 * @property {boolean} [isAnonymous]
 * @property {string[]} [tags]
 * @property {string} [content]
 * @property {string} [createdAt]
 * @property {boolean} [isEdited]
 * @property {boolean} [likedByCurrentUser]
 * @property {boolean} [savedByCurrentUser]
 * @property {number} [likesCount]
 * @property {number} [commentCount]
 */

/**
 * @typedef {Object} ConfessionFeedCardProps
 * @property {ConfessionFeedItem} item
 * @property {string} [currentUserId]
 * @property {Record<string, boolean>} [expandedConfessionIds]
 * @property {string} [menuConfessionId]
 * @property {string | null} [gestureLikeBurstId]
 * @property {string | null} [pressedLikeId]
 * @property {string | null} [pressedBookmarkId]
 * @property {number} [index]
 * @property {(confessionId: string) => void} onToggleConfessionMenu
 * @property {(item: ConfessionFeedItem) => void} onEditConfession
 * @property {(confessionId: string) => void} onDeleteConfession
 * @property {(confessionId: string) => void} onToggleExpandedConfession
 * @property {(confessionId: string) => void} onToggleLike
 * @property {(confessionId: string, author: string) => void} onOpenCommentModal
 * @property {(confessionId: string) => void} onToggleBookmark
 * @property {(authorId: string) => void} [onToggleFollowAuthor]
 * @property {boolean} [followingAuthor]
 * @property {boolean} [followBusy]
 * @property {(payload: { tag: string, confessionId: string, item: ConfessionFeedItem }) => void} [onTagClick]
 * @property {(payload: { confessionId: string, item: ConfessionFeedItem, shareUrl: string, method: string }) => void | Promise<void>} [onShare]
 */

/**
 * @param {ConfessionFeedCardProps} props
 */
export default function ConfessionFeedCard({
  item,
  currentUserId = "",
  expandedConfessionIds = {},
  menuConfessionId = "",
  gestureLikeBurstId = null,
  pressedLikeId = null,
  pressedBookmarkId = null,
  index = 0,
  onToggleConfessionMenu,
  onEditConfession,
  onDeleteConfession,
  onToggleExpandedConfession,
  onToggleLike,
  onOpenCommentModal,
  onToggleBookmark,
  onToggleFollowAuthor,
  followingAuthor = false,
  followBusy = false,
  onTagClick,
}) {
  const originalAuthor = item?.authorDisplayName || "Unknown Author";
  const author = item?.isAnonymous ? "Anonymous" : originalAuthor;
  const authorId = normalizeId(item?.authorId);
  const authorSeed = String(author || "author");
  const avatarSrc =
    !item?.isAnonymous && item?.authorProfilePicture
      ? item.authorProfilePicture
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          authorSeed,
        )}`;
  const [areTagsExpanded, setAreTagsExpanded] = useState(false);
  const [areTagsWrapped, setAreTagsWrapped] = useState(false);
  const [firstRowTagCount, setFirstRowTagCount] = useState(4);
  const tagMeasurementRef = useRef(null);
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const hiddenTagCount = areTagsWrapped
    ? Math.max(tags.length - firstRowTagCount, 0)
    : 0;
  const canExpandTags = hiddenTagCount > 0;
  const visibleTags =
    areTagsWrapped && !areTagsExpanded ? tags.slice(0, firstRowTagCount) : tags;
  const confessionId = String(item?._id || item?.id || `fallback-${index}`);
  const canManageConfession =
    Boolean(currentUserId) && normalizeId(item?.authorId) === currentUserId;
  const canFollowAuthor =
    !item?.isAnonymous &&
    item?.visibility === "public" &&
    Boolean(authorId) &&
    authorId !== currentUserId &&
    typeof onToggleFollowAuthor === "function";
  const isExpanded = Boolean(expandedConfessionIds[confessionId]);
  const { visibleContent, isLongContent } = getConfessionContentPreview(
    item?.content,
    isExpanded,
  );

  useEffect(() => {
    const measurementElement = tagMeasurementRef.current;

    if (!measurementElement) {
      return undefined;
    }

    const updateTagWrapState = () => {
      const tagElements = Array.from(
        measurementElement.querySelectorAll('[data-tag-chip="true"]'),
      );

      if (tagElements.length === 0) {
        setAreTagsWrapped(false);
        setFirstRowTagCount(4);
        return;
      }

      const firstRowTop = tagElements[0].offsetTop;
      const calculatedFirstRowCount = tagElements.filter(
        (tagElement) => tagElement.offsetTop <= firstRowTop + 1,
      ).length;
      const safeFirstRowCount = Math.max(calculatedFirstRowCount, 1);

      setFirstRowTagCount(safeFirstRowCount);
      setAreTagsWrapped(safeFirstRowCount < tagElements.length);
    };

    const frameId = requestAnimationFrame(updateTagWrapState);

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => {
      updateTagWrapState();
    });

    observer.observe(measurementElement);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [tags]);

  return (
    <div
      data-confession-card-id={confessionId}
      data-liked-by-current-user={Boolean(item?.likedByCurrentUser)}
      className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md"
    >
      {canManageConfession && (
        <div className="absolute right-4 top-4 z-20" data-confession-menu>
          <button
            type="button"
            onClick={() => onToggleConfessionMenu(confessionId)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Confession actions"
          >
            <MoreHorizontal size={18} />
          </button>

          {menuConfessionId === confessionId && (
            <div className="absolute right-0 top-10 w-28 rounded-xl border border-slate-200 bg-white shadow-lg py-1 overflow-hidden">
              <button
                type="button"
                onClick={() => onEditConfession(item)}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDeleteConfession(confessionId)}
                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {gestureLikeBurstId === confessionId && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Heart
            size={56}
            className="text-rose-500/90 animate-pulse"
            fill="currentColor"
          />
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {!item?.isAnonymous && authorId ? (
            <Link
              to={`/profile/${authorId}`}
              className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              aria-label={`View ${author} profile`}
            >
              <img
                src={avatarSrc}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              <img
                src={avatarSrc}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              {!item?.isAnonymous && authorId ? (
                <Link
                  to={`/profile/${authorId}`}
                  className="font-semibold text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  {author}
                </Link>
              ) : (
                <h3 className="font-semibold text-slate-900 truncate">
                  {author}
                </h3>
              )}
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>• {getRelativeTime(item?.createdAt)}</span>
                {item?.isEdited && <span>• Edited</span>}
              </div>
            </div>
          </div>
        </div>

        {canFollowAuthor ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFollowAuthor(authorId);
            }}
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
      </div>

      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
        {visibleContent}
      </p>

      {isLongContent && (
        <button
          type="button"
          onClick={() => onToggleExpandedConfession(confessionId)}
          className="mt-2 mb-6 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      {!isLongContent && <div className="mb-6" />}

      {tags.length > 0 && (
        <div className="relative mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div
            ref={tagMeasurementRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 -z-10 flex w-full flex-wrap items-center gap-x-3 gap-y-1 opacity-0"
          >
            {tags.map((tag, index) => (
              <span
                key={`${confessionId}-measure-tag-${String(tag)}-${index}`}
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

          {visibleTags.map((tag, index) => {
            const normalizedTag = String(tag || "")
              .trim()
              .replace(/^#/, "")
              .replaceAll(/\s+/g, "");

            return onTagClick ? (
              <button
                key={`${confessionId}-tag-${normalizedTag}-${index}`}
                type="button"
                onClick={() =>
                  onTagClick?.({ tag: normalizedTag, confessionId, item })
                }
                className="text-xs font-semibold tracking-wide text-rose-600"
              >
                #{normalizedTag}
              </button>
            ) : (
              <span
                key={`${confessionId}-tag-${normalizedTag}-${index}`}
                className="text-xs font-semibold tracking-wide text-rose-600"
              >
                #{normalizedTag}
              </span>
            );
          })}

          {!areTagsExpanded && canExpandTags && (
            <button
              type="button"
              onClick={() => setAreTagsExpanded(true)}
              className="text-xs font-semibold cursor-pointer tracking-wide text-rose-600 transition-colors hover:text-rose-700"
            >
              +{hiddenTagCount}
            </button>
          )}

          {areTagsExpanded && canExpandTags && (
            <button
              type="button"
              onClick={() => setAreTagsExpanded(false)}
              className="text-xs font-semibold cursor-pointer tracking-wide text-slate-500 transition-colors hover:text-slate-700"
            >
              Show less
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-6 min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => onToggleLike(confessionId)}
              className={`flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                item?.likedByCurrentUser
                  ? "text-rose-500"
                  : "text-slate-500 hover:text-rose-500"
              } ${pressedLikeId === confessionId ? "scale-95" : "scale-100"}`}
            >
              <Heart
                size={20}
                fill={item?.likedByCurrentUser ? "currentColor" : "none"}
              />
              <span className="text-xs sm:text-sm font-medium">
                {formatCount(Number(item?.likesCount || 0))}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenCommentModal(confessionId, author)}
            className="flex items-center gap-2 text-slate-500 transition-all duration-200 hover:text-sky-500 cursor-pointer"
          >
            <MessageCircle size={20} />
            <span className="text-xs sm:text-sm font-medium">
              {formatCount(Number(item?.commentCount || 0))}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <button
            type="button"
            onClick={() => onToggleBookmark(confessionId)}
            className={`transition-colors cursor-pointer ${
              item?.savedByCurrentUser
                ? "text-rose-500"
                : "text-slate-500 hover:text-rose-500"
            } ${pressedBookmarkId === confessionId ? "scale-95" : "scale-100"}`}
          >
            <Bookmark
              size={20}
              fill={item?.savedByCurrentUser ? "currentColor" : "none"}
            />
          </button>
          {/* share button removed */}
        </div>
      </div>
    </div>
  );
}
