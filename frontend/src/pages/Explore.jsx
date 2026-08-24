import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import Toast from "../components/Toast";
import { useToast } from "../lib/useToast";
import { useCurrentUser } from "../lib/useCurrentUser";
import { useFollowState } from "../features/social/useFollowState";
import { useExploreContent } from "../features/explore/useExploreContent";
import { useExploreLikes } from "../features/explore/useExploreLikes";
import { useExploreBookmarks } from "../features/explore/useExploreBookmarks";
import { useExploreStoryMenu } from "../features/explore/useExploreStoryMenu";
import { useExploreViewTracking } from "../features/explore/useExploreViewTracking";
import ExploreGenreFilterBar from "../features/explore/ExploreGenreFilterBar";
import ExploreTopAuthorsSidebar from "../features/explore/ExploreTopAuthorsSidebar";
import ExploreStoryCard from "../features/explore/ExploreStoryCard";
import ExploreStoryCardSkeleton from "../features/explore/ExploreStoryCardSkeleton";

function StorySection({
  title,
  stories,
  isLoading,
  error,
  emptyMessage,
  currentUserId,
  onOpenStory,
  menuStoryId,
  onToggleMenu,
  onEditStory,
  onDeleteStory,
  deletingStoryId,
  followStateByUserId,
  busyFollowIds,
  onToggleFollow,
  savedStoryIds,
  onToggleSave,
  isLiked,
  getLikeCount,
  onToggleLike,
}) {
  return (
    <div className="mb-12">
      <h3 className="font-semibold text-lg mb-6 text-slate-900">{title}</h3>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4">
          {[0, 1].map((i) => (
            <ExploreStoryCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <p className="mb-4 text-sm text-rose-500">{error}</p>
      ) : null}

      {!isLoading && !error && stories.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {stories.map((story, i) => (
          <ExploreStoryCard
            key={story.id || i}
            story={story}
            currentUserId={currentUserId}
            onOpenStory={onOpenStory}
            isMenuOpen={menuStoryId === story.id}
            onToggleMenu={onToggleMenu}
            onEditStory={onEditStory}
            onDeleteStory={onDeleteStory}
            isDeleting={deletingStoryId === story.id}
            isFollowing={Boolean(followStateByUserId[story.authorId])}
            isFollowBusy={Boolean(busyFollowIds[story.authorId])}
            onToggleFollow={onToggleFollow}
            isSaved={savedStoryIds.has(story.id)}
            onToggleSave={onToggleSave}
            isLiked={isLiked(story.id)}
            likeCount={getLikeCount(story.id)}
            onToggleLike={onToggleLike}
          />
        ))}
      </div>
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const {
    toast,
    isVisible,
    isPaused,
    duration,
    showToast,
    hideToast,
    pauseToast,
    resumeToast,
  } = useToast();

  const { currentUserId } = useCurrentUser();

  const {
    topAuthorsCount,
    activeCategory,
    setActiveCategory,
    genreFilters,
    genresLoading,
    genresError,
    recommendedStories,
    setRecommendedStories,
    popularStories,
    setPopularStories,
    resolvedAuthors,
    storiesLoading,
    authorsLoading,
    recommendedError,
    popularError,
    authorsError,
    authorIdsForFollowStatus,
  } = useExploreContent({ currentUserId, showToast });

  const { followStateByUserId, busyFollowIds, toggleFollow } = useFollowState({
    currentUserId,
    authorIds: authorIdsForFollowStatus,
    notify: showToast,
    onUnauthenticated: (message) => showToast(message, "error"),
  });

  const { savedStoryIds, toggleSave } = useExploreBookmarks({
    currentUserId,
    showToast,
  });

  const { isLiked, getLikeCount, toggleLike } = useExploreLikes({
    recommendedStories,
    popularStories,
    showToast,
  });

  const {
    menuStoryId,
    toggleMenu,
    deletingStoryId,
    handleEditStory,
    handleDeleteStory,
  } = useExploreStoryMenu({
    showToast,
    onStoryDeleted: (storyId) => {
      setRecommendedStories((prev) => prev.filter((s) => s.id !== storyId));
      setPopularStories((prev) => prev.filter((s) => s.id !== storyId));
    },
  });

  useExploreViewTracking({ recommendedStories, popularStories });

  const handleOpenStory = (storyId) => {
    navigate("/", { state: { focusedPostId: storyId } });
  };

  const sharedSectionProps = {
    currentUserId,
    onOpenStory: handleOpenStory,
    menuStoryId,
    onToggleMenu: toggleMenu,
    onEditStory: handleEditStory,
    onDeleteStory: handleDeleteStory,
    deletingStoryId,
    followStateByUserId,
    busyFollowIds,
    onToggleFollow: toggleFollow,
    savedStoryIds,
    onToggleSave: toggleSave,
    isLiked,
    getLikeCount,
    onToggleLike: toggleLike,
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {toast && (
        <Toast
          toast={toast}
          isVisible={isVisible}
          isPaused={isPaused}
          durationMs={duration}
          onClose={hideToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      )}
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <Navbar title="Explore Communities" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-4 lg:gap-6 px-3 sm:px-5 lg:px-6 py-4 sm:py-5">
            <div className="min-h-0 flex flex-col overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <ExploreGenreFilterBar
                genreFilters={genreFilters}
                genresLoading={genresLoading}
                genresError={genresError}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
              />

              <StorySection
                title="Recommended for you"
                stories={recommendedStories}
                isLoading={storiesLoading}
                error={recommendedError}
                emptyMessage="No recommended stories found."
                {...sharedSectionProps}
              />

              <StorySection
                title="Most Popular"
                stories={popularStories}
                isLoading={storiesLoading}
                error={popularError}
                emptyMessage="No popular stories found."
                {...sharedSectionProps}
              />

              <SiteFooter className="hidden lg:block text-left lg:text-right" />
            </div>

            <ExploreTopAuthorsSidebar
              authorsLoading={authorsLoading}
              authorsError={authorsError}
              resolvedAuthors={resolvedAuthors}
              topAuthorsCount={topAuthorsCount}
              followStateByUserId={followStateByUserId}
              busyFollowIds={busyFollowIds}
              onToggleFollow={toggleFollow}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
