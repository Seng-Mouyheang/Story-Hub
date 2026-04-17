import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
} from "lucide-react";

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
  onTagClick,
  onShare,
}) {
  const originalAuthor = item?.authorDisplayName || "Unknown Author";
  const author = item?.isAnonymous ? "Anonymous" : originalAuthor;
  const authorSeed = String(author || "author");
  const avatarSrc =
    !item?.isAnonymous && item?.authorProfilePicture
      ? item.authorProfilePicture
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          authorSeed,
        )}`;
  const tags =
    Array.isArray(item?.tags) && item.tags.length > 0 ? item.tags : [];
  const confessionId = String(item?._id || item?.id || `fallback-${index}`);
  const canManageConfession =
    Boolean(currentUserId) && normalizeId(item?.authorId) === currentUserId;
  const isExpanded = Boolean(expandedConfessionIds[confessionId]);
  const { visibleContent, isLongContent } = getConfessionContentPreview(
    item?.content,
    isExpanded,
  );
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}#confession-${confessionId}`;

  const handleShare = async () => {
    const shareTitle =
      author === "Anonymous" ? "Confession" : `${author}'s confession`;
    const shareText = (item?.content || "Read this confession on Story Hub.")
      .slice(0, 160)
      .trim();

    const emitShare = async (method) => {
      if (typeof onShare === "function") {
        await onShare({
          confessionId,
          item,
          shareUrl,
          method,
        });
      }
    };

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        await emitShare("web-share");
        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareUrl);
        await emitShare("clipboard");
        return;
      }
    } catch {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareUrl);
        await emitShare("clipboard");
        return;
      }
    }

    if (typeof window !== "undefined") {
      window.open(
        `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(
          `${shareText}\n\n${shareUrl}`,
        )}`,
        "_self",
      );
      await emitShare("mailto");
    }
  };

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
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
            <img src={avatarSrc} alt="avatar" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h3 className="font-semibold text-slate-900 truncate">
                {author}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>• {getRelativeTime(item?.createdAt)}</span>
                {item?.isEdited && <span>• Edited</span>}
              </div>
            </div>
          </div>
        </div>
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
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          {tags.slice(0, 4).map((tag) => (
            <button
              key={`${confessionId}-${tag}`}
              type="button"
              onClick={() => onTagClick?.({ tag, confessionId, item })}
              className="text-xs font-semibold tracking-wide text-rose-600 hover:underline cursor-pointer"
            >
              #{tag}
            </button>
          ))}
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
          <button
            type="button"
            onClick={handleShare}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Share confession"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
