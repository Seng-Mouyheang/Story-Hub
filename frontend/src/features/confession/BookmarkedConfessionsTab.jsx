import { AlertTriangle } from "lucide-react";
import ConfessionFeedCard from "./ConfessionFeedCard";
import { normalizeId } from "../../lib/format";

function ConfessionBookmarkCardSkeleton() {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-100 p-5 sm:p-6 animate-pulse shadow-sm border border-slate-200">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-1/3 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-1/4 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-5 rounded-full bg-slate-200 w-5/6" />
        <div className="h-5 rounded-full bg-slate-200 w-full" />
        <div className="h-5 rounded-full bg-slate-200 w-2/3" />
        <div className="flex items-center gap-3 pt-4">
          <div className="h-9 w-20 rounded-full bg-slate-200" />
          <div className="h-9 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function BookmarkedConfessionsTab({
  confessions,
  isLoadingConfessions,
  confessionError,
  currentUserId,
  expandedConfessionIds,
  menuConfessionId,
  gestureLikeBurstId,
  pressedLikeId,
  pressedBookmarkId,
  followStateByUserId,
  busyFollowIds,
  onToggleConfessionMenu,
  onEditConfession,
  onDeleteConfession,
  onToggleExpandedConfession,
  onToggleConfessionLike,
  onOpenCommentModal,
  onUnsaveConfession,
  onToggleFollowAuthor,
}) {
  return (
    <>
      <header className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          Bookmarked Confessions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Confessions you saved for later reading.
        </p>
      </header>

      {confessionError ? (
        <div className="mb-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm text-sm text-rose-700">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{confessionError}</span>
          </div>
        </div>
      ) : null}

      {isLoadingConfessions ? (
        <div className="space-y-5">
          {[...Array(3)].map((_, index) => (
            <ConfessionBookmarkCardSkeleton
              key={`confession-bookmark-skeleton-${index}`}
            />
          ))}
        </div>
      ) : null}

      {!isLoadingConfessions &&
      !confessionError &&
      confessions.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
          No bookmarked confessions yet.
        </div>
      ) : null}

      {!isLoadingConfessions &&
        !confessionError &&
        confessions.map((item, index) => (
          <ConfessionFeedCard
            key={String(
              item?._id || item?.id || `bookmarked-conf-${index}`,
            )}
            item={item}
            index={index}
            currentUserId={currentUserId}
            expandedConfessionIds={expandedConfessionIds}
            menuConfessionId={menuConfessionId}
            gestureLikeBurstId={gestureLikeBurstId}
            pressedLikeId={pressedLikeId}
            pressedBookmarkId={pressedBookmarkId}
            onToggleConfessionMenu={onToggleConfessionMenu}
            onEditConfession={onEditConfession}
            onDeleteConfession={onDeleteConfession}
            onToggleExpandedConfession={onToggleExpandedConfession}
            onToggleLike={onToggleConfessionLike}
            onOpenCommentModal={onOpenCommentModal}
            onToggleBookmark={onUnsaveConfession}
            onToggleFollowAuthor={onToggleFollowAuthor}
            followingAuthor={Boolean(
              followStateByUserId[normalizeId(item?.authorId)],
            )}
            followBusy={Boolean(busyFollowIds[normalizeId(item?.authorId)])}
          />
        ))}
    </>
  );
}
