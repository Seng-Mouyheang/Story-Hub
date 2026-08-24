import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { getProfileByUserId } from "../api/profile";
import { deleteStory } from "../api/story/storyApi";
import CommentSection from "../components/CommentSection";
import Toast from "../components/Toast";
import { useToast } from "../lib/useToast";
import { useCurrentUser } from "../lib/useCurrentUser";
import StoryCard from "../features/stories/StoryCard";
import DeleteConfirmModal from "../features/stories/DeleteConfirmModal";
import FollowingAccountsStrip from "../features/stories/FollowingAccountsStrip";
import TopAuthorsSidebar from "../features/stories/TopAuthorsSidebar";
import { useStoryFeed } from "../features/stories/useStoryFeed";
import { useStoryComments } from "../features/stories/useStoryComments";
import { useStoryInteractions } from "../features/stories/useStoryInteractions";
import { useTopAuthors } from "../features/stories/useTopAuthors";
import { useFollowingAccounts } from "../features/stories/useFollowingAccounts";
import { useSavedStoryIds } from "../features/stories/useSavedStoryIds";

/* -------------------- Home Page -------------------- */
export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserId, currentUsername } = useCurrentUser();
  const [likeBurstStoryId, setLikeBurstStoryId] = useState(null);
  const [likePulseStoryId, setLikePulseStoryId] = useState(null);
  const [commentCountPulseStoryId, setCommentCountPulseStoryId] =
    useState(null);
  const [menuStoryId, setMenuStoryId] = useState(null);
  const [deleteTargetStoryId, setDeleteTargetStoryId] = useState(null);
  const [expandedStoryIds, setExpandedStoryIds] = useState({});
  const [followingAccountsRefreshToken, setFollowingAccountsRefreshToken] =
    useState(0);

  const {
    toast: feedToast,
    isVisible: isFeedToastVisible,
    isPaused: isFeedToastPaused,
    duration,
    showToast: showFeedToast,
    hideToast: hideFeedToast,
    pauseToast: pauseFeedToast,
    resumeToast: resumeFeedToast,
  } = useToast();

  const resizeCommentTextarea = useCallback((textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const [currentUserProfilePicture, setCurrentUserProfilePicture] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserProfile = async () => {
      if (!currentUserId) {
        if (isMounted) setCurrentUserProfilePicture("");
        return;
      }

      try {
        const profilePayload = await getProfileByUserId(currentUserId);
        if (isMounted) {
          setCurrentUserProfilePicture(profilePayload?.profilePicture || "");
        }
      } catch {
        if (isMounted) {
          setCurrentUserProfilePicture("");
        }
      }
    };

    loadCurrentUserProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const {
    posts,
    setPosts,
    hasMore,
    isLoadingPosts,
    postsError,
    setPostsError,
    isLoadingMore,
    isEndOfFeedVisible,
    endOfFeedRef,
    feedScrollRef,
    loadStories,
  } = useStoryFeed({
    currentUserId,
    showToast: showFeedToast,
    hideToast: hideFeedToast,
    onStoriesLoaded: (mappedStories) => {
      const derivedFollowState = Object.fromEntries(
        mappedStories
          .filter(
            (story) =>
              Boolean(story.authorId) && story.authorId !== currentUserId,
          )
          .map((story) => [story.authorId, Boolean(story.followingAuthor)]),
      );

      setFollowStateByUserId((previous) => ({
        ...previous,
        ...derivedFollowState,
      }));
    },
  });

  const { savedStoryIds, setSavedStoryIds } = useSavedStoryIds({
    currentUserId,
  });

  const {
    followStateByUserId,
    setFollowStateByUserId,
    busyFollowIds,
    handleToggleLike: toggleLikeCore,
    handleToggleSave,
    handleToggleFollowAuthor,
  } = useStoryInteractions({
    currentUserId,
    setItems: setPosts,
    notify: showFeedToast,
    onUnauthenticated: () => navigate("/login", { replace: true }),
    onLikeError: setPostsError,
    savedStoryIds,
    setSavedStoryIds,
    onExternalFollowUpdate: () => {
      setFollowingAccountsRefreshToken((previous) => previous + 1);
    },
  });

  const { topAuthors, topAuthorsLoading, topAuthorsError } = useTopAuthors({
    currentUserId,
    refreshToken: followingAccountsRefreshToken,
    setFollowStateByUserId,
  });

  const { followingAccounts, followingAccountsLoading } =
    useFollowingAccounts({
      currentUserId,
      refreshToken: followingAccountsRefreshToken,
    });

  const {
    activeCommentStoryId,
    setActiveCommentStoryId,
    activeCommentState,
    menuCommentId,
    deleteTargetComment,
    setDeleteTargetComment,
    commentActionFeedback,
    pendingCommentLikeIds,
    commentLikePulseIds,
    commentInputRef,
    commentListRef,
    commentListSentinelRef,
    handleOpenComments,
    handleToggleReplies,
    handleLoadMoreReplies,
    handleCommentInputChange,
    handleSubmitComment,
    handleToggleCommentMenu,
    handleToggleCommentLike,
    handleStartReply,
    handleEditComment,
    handleDeleteComment,
    handleCancelCommentComposer,
    handleConfirmDeleteComment,
  } = useStoryComments({
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
    notify: showFeedToast,
    onUnauthenticated: () => navigate("/login", { replace: true }),
    onCommentCountChange: (storyId, delta) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === storyId
            ? {
                ...post,
                commentCount: Math.max(
                  0,
                  Number(post.commentCount || 0) + delta,
                ),
              }
            : post,
        ),
      );

      if (delta > 0) {
        setCommentCountPulseStoryId(storyId);
        setTimeout(() => {
          setCommentCountPulseStoryId((currentId) =>
            currentId === storyId ? null : currentId,
          );
        }, 260);
      }
    },
    closeModalOnReopen: true,
    commentFeedbackDurationMs: 1800,
  });

  useEffect(() => {
    if (!activeCommentStoryId) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveCommentStoryId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCommentStoryId, setActiveCommentStoryId]);

  useEffect(() => {
    if (!menuStoryId && !menuCommentId) {
      return undefined;
    }

    const handlePointerDownOutsideMenu = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-story-menu],[data-comment-menu]")) {
        return;
      }

      setMenuStoryId(null);
    };

    document.addEventListener("mousedown", handlePointerDownOutsideMenu);
    document.addEventListener("touchstart", handlePointerDownOutsideMenu);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutsideMenu);
      document.removeEventListener("touchstart", handlePointerDownOutsideMenu);
    };
  }, [menuCommentId, menuStoryId]);

  useEffect(() => {
    const initialFocused = location?.state?.focusedPostId;
    if (!initialFocused) return;

    const tryScroll = () => {
      const el = document.getElementById(`post-${initialFocused}`);
      if (!el) {
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      navigate(location.pathname, { replace: true, state: {} });
    };

    requestAnimationFrame(tryScroll);
    const t = setTimeout(tryScroll, 500);

    return () => clearTimeout(t);
  }, [location, posts, navigate]);

  const handleToggleLike = useCallback(
    (storyId) => {
      setLikePulseStoryId(storyId);
      setTimeout(() => {
        setLikePulseStoryId((currentId) =>
          currentId === storyId ? null : currentId,
        );
      }, 220);

      toggleLikeCore(storyId);
    },
    [toggleLikeCore],
  );

  const handleDoubleTapLike = useCallback(
    (storyId) => {
      setLikeBurstStoryId(storyId);
      setTimeout(() => {
        setLikeBurstStoryId((currentId) =>
          currentId === storyId ? null : currentId,
        );
      }, 600);

      const post = posts.find((item) => item.id === storyId);
      if (post && !post.likedByCurrentUser) {
        handleToggleLike(storyId);
      }
    },
    [posts, handleToggleLike],
  );

  const handleToggleMenu = useCallback((storyId) => {
    setMenuStoryId((currentId) => (currentId === storyId ? null : storyId));
  }, []);

  const handleToggleExpandedStory = useCallback((storyId) => {
    setExpandedStoryIds((previous) => ({
      ...previous,
      [storyId]: !previous[storyId],
    }));
  }, []);

  const handleEditStory = useCallback(
    (storyId) => {
      setMenuStoryId(null);
      navigate(`/write?storyId=${storyId}&returnTo=home`);
    },
    [navigate],
  );

  const handleDeleteStory = useCallback((storyId) => {
    setMenuStoryId(null);
    setDeleteTargetStoryId(storyId);
  }, []);

  const handleConfirmDeleteStory = useCallback(async () => {
    if (!deleteTargetStoryId) {
      return;
    }

    const storyId = deleteTargetStoryId;
    setDeleteTargetStoryId(null);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      await deleteStory(storyId);

      setPosts((prev) => prev.filter((post) => post.id !== storyId));
      if (activeCommentStoryId === storyId) {
        setActiveCommentStoryId(null);
      }
    } catch (error) {
      const errorMessage = error.message || "Failed to delete story.";
      setPostsError(errorMessage);
      showFeedToast(errorMessage, "error");
    }
  }, [
    activeCommentStoryId,
    deleteTargetStoryId,
    navigate,
    setActiveCommentStoryId,
    setPosts,
    setPostsError,
    showFeedToast,
  ]);

  const activeCommentStory = posts.find(
    (post) => post.id === activeCommentStoryId,
  );

  useEffect(() => {
    if (!activeCommentStoryId || !commentInputRef.current) {
      return;
    }

    resizeCommentTextarea(commentInputRef.current);
  }, [
    activeCommentStoryId,
    activeCommentState?.input,
    resizeCommentTextarea,
    commentInputRef,
  ]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <Navbar title="Home Feed" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-4 lg:gap-6 px-3 sm:px-5 lg:px-6 py-5 sm:py-6">
            <div
              ref={feedScrollRef}
              className="min-h-0 flex flex-col overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <FollowingAccountsStrip
                accounts={followingAccounts}
                isLoading={followingAccountsLoading}
              />

              <section className="flex-1 min-h-0 flex flex-col py-4">
                {isLoadingPosts && (
                  <div className="space-y-5">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={index}
                        className="rounded-2xl bg-slate-100 p-5 sm:p-6 animate-pulse"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-slate-200" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-1/3 rounded-full bg-slate-200" />
                            <div className="h-3 w-1/4 rounded-full bg-slate-200" />
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
                    ))}
                  </div>
                )}

                {!isLoadingPosts && postsError && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm">
                    <p className="text-sm text-rose-600 mb-3">{postsError}</p>
                    <button
                      className="text-xs font-semibold text-rose-600 hover:underline"
                      onClick={() =>
                        loadStories(new AbortController().signal, null)
                      }
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoadingPosts && !postsError && posts.length === 0 && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                    No published stories yet.
                  </div>
                )}

                {!isLoadingPosts && !postsError && (
                  <>
                    {posts.map((post) => {
                      const isFocused =
                        location &&
                        location.state &&
                        location.state.focusedPostId === post.id;
                      return (
                        <div
                          id={`post-${post.id}`}
                          key={post.id}
                          className={`w-full max-w-full ${
                            location &&
                            location.state &&
                            location.state.focusedPostId
                              ? isFocused
                                ? ""
                                : "opacity-70"
                              : ""
                          }`}
                        >
                          <StoryCard
                            {...post}
                            focused={isFocused}
                            savedByCurrentUser={savedStoryIds.has(post.id)}
                            isExpanded={Boolean(expandedStoryIds[post.id])}
                            commentsActive={activeCommentStoryId === post.id}
                            onToggleLike={handleToggleLike}
                            onOpenComments={handleOpenComments}
                            onToggleSave={handleToggleSave}
                            enableDoubleTapLike
                            onDoubleTapLike={handleDoubleTapLike}
                            onToggleMenu={handleToggleMenu}
                            onEditStory={handleEditStory}
                            onDeleteStory={handleDeleteStory}
                            onToggleFollowAuthor={handleToggleFollowAuthor}
                            onToggleExpanded={handleToggleExpandedStory}
                            isMenuOpen={menuStoryId === post.id}
                            showLikeBurst={likeBurstStoryId === post.id}
                            showLikePulse={likePulseStoryId === post.id}
                            followingAuthor={Boolean(
                              followStateByUserId[post.authorId],
                            )}
                            followBusy={Boolean(busyFollowIds[post.authorId])}
                            showCommentCountPulse={
                              commentCountPulseStoryId === post.id
                            }
                            truncationMode="measure"
                            profileLinkState={{ from: "/" }}
                            bookmarkAriaLabel="Save story"
                          />
                        </div>
                      );
                    })}
                    {isLoadingMore && (
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500 text-center">
                        Loading more stories...
                      </div>
                    )}
                    {!hasMore && posts.length > 0 && (
                      <div className="flex items-center justify-center py-4">
                        <div
                          className="h-3 w-3 rounded-full bg-slate-300 shadow-sm ring-4 ring-slate-100"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </>
                )}

                <div ref={endOfFeedRef} className="h-1" />
              </section>
            </div>

            <TopAuthorsSidebar
              topAuthors={topAuthors}
              topAuthorsLoading={topAuthorsLoading}
              topAuthorsError={topAuthorsError}
              followStateByUserId={followStateByUserId}
              busyFollowIds={busyFollowIds}
              onToggleFollow={handleToggleFollowAuthor}
            />
          </div>
        </main>
        {feedToast && (isEndOfFeedVisible || isFeedToastVisible) && (
          <Toast
            toast={feedToast}
            isVisible={isFeedToastVisible}
            isPaused={isFeedToastPaused}
            durationMs={duration}
            onClose={hideFeedToast}
            onPause={pauseFeedToast}
            onResume={resumeFeedToast}
          />
        )}
        <CommentSection
          story={activeCommentStory}
          commentState={activeCommentState}
          activeMenuCommentId={menuCommentId}
          currentUserId={currentUserId}
          commentActionFeedback={commentActionFeedback}
          pendingCommentLikeIds={pendingCommentLikeIds}
          commentLikePulseIds={commentLikePulseIds}
          commentListRef={commentListRef}
          commentListSentinelRef={commentListSentinelRef}
          commentInputRef={commentInputRef}
          onClose={() => setActiveCommentStoryId(null)}
          onToggleCommentLike={handleToggleCommentLike}
          onToggleCommentMenu={handleToggleCommentMenu}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onReportComment={(commentId) =>
            showFeedToast(`Report submitted for ${commentId}`, "success")
          }
          onStartReply={handleStartReply}
          onToggleReplies={handleToggleReplies}
          onLoadMoreReplies={handleLoadMoreReplies}
          onCancelCommentComposer={handleCancelCommentComposer}
          onCommentInputChange={handleCommentInputChange}
          onSubmitComment={handleSubmitComment}
        />

        <DeleteConfirmModal
          isOpen={Boolean(deleteTargetStoryId)}
          title="Delete this story?"
          titleId="story-delete-dialog-title"
          onCancel={() => setDeleteTargetStoryId(null)}
          onConfirm={handleConfirmDeleteStory}
        />

        <DeleteConfirmModal
          isOpen={Boolean(deleteTargetComment)}
          title="Delete this comment?"
          titleId="comment-delete-dialog-title"
          onCancel={() => setDeleteTargetComment(null)}
          onConfirm={handleConfirmDeleteComment}
        />
      </div>
    </div>
  );
}
