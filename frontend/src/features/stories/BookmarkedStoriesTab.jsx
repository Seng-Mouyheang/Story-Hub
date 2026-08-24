import { AlertTriangle } from "lucide-react";
import StoryCard from "./StoryCard";
import { normalizeId } from "../../lib/format";

function StoryBookmarkCardSkeleton() {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-100 p-5 sm:p-6 animate-pulse shadow-sm border border-slate-200">
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="h-4 w-32 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded-full bg-slate-200" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="h-3 w-16 rounded-full bg-slate-200" />
              <div className="h-3 w-20 rounded-full bg-slate-200" />
              <div className="h-3 w-12 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="h-8 w-20 rounded-full bg-slate-200" />
      </div>

      <div className="space-y-3">
        <div className="h-6 w-3/4 rounded-full bg-slate-200" />
        <div className="h-5 w-full rounded-full bg-slate-200" />
        <div className="h-5 w-2/3 rounded-full bg-slate-200" />
      </div>

      <div className="flex items-center gap-4 pt-4 mt-4 border-t border-slate-200">
        <div className="h-8 w-16 rounded-full bg-slate-200" />
        <div className="h-8 w-14 rounded-full bg-slate-200" />
        <div className="ml-auto h-8 w-8 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export default function BookmarkedStoriesTab({
  stories,
  isLoadingStories,
  storyError,
  currentUserId,
  expandedStoryIds,
  activeCommentStoryId,
  followStateByUserId,
  busyFollowIds,
  menuStoryId,
  onToggleStoryMenu,
  onEditStory,
  onDeleteStory,
  onToggleStoryLike,
  onOpenStoryComments,
  onUnsaveStory,
  onToggleExpandedStory,
  onToggleFollowAuthor,
  onCardClick,
}) {
  return (
    <>
      <header className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          Bookmarked Stories
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Stories you saved for later reading.
        </p>
      </header>

      {storyError ? (
        <div className="mb-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm text-sm text-rose-700">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{storyError}</span>
          </div>
        </div>
      ) : null}

      {isLoadingStories ? (
        <div className="space-y-5">
          {[...Array(3)].map((_, index) => (
            <StoryBookmarkCardSkeleton
              key={`story-bookmark-skeleton-${index}`}
            />
          ))}
        </div>
      ) : null}

      {!isLoadingStories && !storyError && stories.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
          No bookmarked stories yet.
        </div>
      ) : null}

      {!isLoadingStories &&
        !storyError &&
        stories.map((story) => (
          <StoryCard
            key={story.id}
            {...story}
            canManage={
              Boolean(currentUserId) && story.authorId === currentUserId
            }
            savedByCurrentUser
            isExpanded={Boolean(expandedStoryIds[story.id])}
            commentsActive={activeCommentStoryId === story.id}
            followingAuthor={Boolean(
              followStateByUserId[normalizeId(story.authorId)],
            )}
            followBusy={Boolean(busyFollowIds[normalizeId(story.authorId)])}
            isMenuOpen={menuStoryId === story.id}
            onToggleMenu={onToggleStoryMenu}
            onEditStory={onEditStory}
            onDeleteStory={onDeleteStory}
            onToggleLike={onToggleStoryLike}
            onOpenComments={onOpenStoryComments}
            onToggleSave={onUnsaveStory}
            onToggleExpanded={onToggleExpandedStory}
            onToggleFollowAuthor={onToggleFollowAuthor}
            onCardClick={onCardClick}
            truncationMode="length"
            contentPreviewMaxLength={260}
            profileLinkState={{ from: "/bookmarks" }}
            editHref={`/write?storyId=${story.id}&returnTo=/bookmarks`}
            menuItemIcons
            bookmarkAriaLabel="Remove bookmark"
          />
        ))}
    </>
  );
}
