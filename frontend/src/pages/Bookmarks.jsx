import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import CommentSection from "../components/CommentSection";
import Toast from "../components/Toast";
import DeleteConfirmModal from "../features/stories/DeleteConfirmModal";
import { useStoryComments } from "../features/stories/useStoryComments";
import { useStoryInteractions } from "../features/stories/useStoryInteractions";
import { useBookmarkedStories } from "../features/stories/useBookmarkedStories";
import BookmarkedStoriesTab from "../features/stories/BookmarkedStoriesTab";
import { useBookmarkedConfessions } from "../features/confession/useBookmarkedConfessions";
import { useBookmarkedConfessionComments } from "../features/confession/useBookmarkedConfessionComments";
import BookmarkedConfessionsTab from "../features/confession/BookmarkedConfessionsTab";
import { useToast } from "../lib/useToast";
import { useCurrentUser } from "../lib/useCurrentUser";
import { normalizeId } from "../lib/format";
import { getProfileByUserId, getFollowStatus } from "../api/profile";

export default function Bookmarks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stories");

  const { currentUser, currentUserId } = useCurrentUser();
  const currentUsername =
    currentUser?.displayName ||
    currentUser?.username ||
    currentUser?.name ||
    "You";
  const [currentUserProfilePicture, setCurrentUserProfilePicture] = useState(
    currentUser?.profilePicture || "",
  );

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
    toast,
    isVisible: isToastVisible,
    isPaused: isToastPaused,
    duration,
    showToast,
    hideToast,
    pauseToast,
    resumeToast,
  } = useToast();

  const showError = useCallback(
    (message) => {
      showToast(message, "error");
    },
    [showToast],
  );

  const showSuccess = useCallback(
    (message) => {
      showToast(message, "success");
    },
    [showToast],
  );

  const dismissToast = useCallback(() => {
    hideToast();
  }, [hideToast]);

  const {
    stories,
    setStories,
    isLoadingStories,
    storyError,
    expandedStoryIds,
    setExpandedStoryIds,
    handleToggleExpandedStory,
    menuStoryId,
    handleToggleStoryMenu,
    handleEditStory,
    handleDeleteStory,
    handleConfirmDeleteStory,
    deleteTargetStoryId,
    setDeleteTargetStoryId,
    isDeletingStory,
  } = useBookmarkedStories({
    showError,
    showSuccess,
    navigate,
    currentUserId,
  });

  const {
    confessions,
    setConfessions,
    isLoadingConfessions,
    confessionError,
    expandedConfessionIds,
    handleToggleExpandedConfession,
    menuConfessionId,
    handleToggleConfessionMenu,
    handleEditConfession,
    handleDeleteConfession,
    handleConfirmDeleteConfession,
    deleteTargetConfessionId,
    setDeleteTargetConfessionId,
    isDeletingConfession,
    pressedLikeId,
    pressedBookmarkId,
    handleToggleConfessionLike,
    handleUnsaveConfession,
  } = useBookmarkedConfessions({
    showError,
    showSuccess,
    navigate,
    currentUserId,
  });

  const gestureLikeBurstId = null;

  const {
    activeCommentStoryId,
    setActiveCommentStoryId,
    activeCommentState: activeStoryCommentState,
    menuCommentId: activeMenuCommentId,
    deleteTargetComment,
    setDeleteTargetComment,
    commentActionFeedback,
    pendingCommentLikeIds,
    commentLikePulseIds,
    commentInputRef: storyCommentInputRef,
    commentListRef: storyCommentListRef,
    commentListSentinelRef: storyCommentListSentinelRef,
    handleOpenComments: handleOpenStoryComments,
    handleToggleReplies: handleToggleStoryReplies,
    handleLoadMoreReplies: handleLoadMoreStoryReplies,
    handleCommentInputChange: handleStoryCommentInputChange,
    handleSubmitComment: handleSubmitStoryComment,
    handleToggleCommentMenu: handleToggleStoryCommentMenu,
    handleToggleCommentLike: handleToggleStoryCommentLike,
    handleStartReply: handleStartStoryReply,
    handleEditComment: handleEditStoryComment,
    handleDeleteComment: handleDeleteStoryComment,
    handleCancelCommentComposer: handleCancelStoryComposer,
    handleConfirmDeleteComment: handleConfirmDeleteStoryComment,
    removeStoryComments,
  } = useStoryComments({
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
    notify: showToast,
    onUnauthenticated: (message) => showError(message),
    onCommentCountChange: (storyId, delta) => {
      setStories((prev) =>
        prev.map((story) =>
          story.id === storyId
            ? {
                ...story,
                commentCount: Math.max(
                  0,
                  Number(story.commentCount || 0) + delta,
                ),
              }
            : story,
        ),
      );
    },
    closeModalOnReopen: false,
    commentFeedbackDurationMs: 2200,
  });

  const activeCommentStory = useMemo(
    () => stories.find((story) => story.id === activeCommentStoryId) || null,
    [stories, activeCommentStoryId],
  );

  const {
    followStateByUserId,
    setFollowStateByUserId,
    busyFollowIds,
    handleToggleLike: handleToggleStoryLike,
    handleToggleSave: handleUnsaveStory,
    handleToggleFollowAuthor,
  } = useStoryInteractions({
    currentUserId,
    setItems: setStories,
    notify: showToast,
    onUnauthenticated: (message) => showError(message),
    requireAuthForSave: false,
    onUnsaved: (storyId) => {
      setStories((prev) => prev.filter((story) => story.id !== storyId));
      setExpandedStoryIds((prev) => {
        const next = { ...prev };
        delete next[storyId];
        return next;
      });
      removeStoryComments(storyId);
    },
  });

  const followableAuthorIds = useMemo(() => {
    const storyAuthorIds = stories
      .map((story) => normalizeId(story.authorId))
      .filter((authorId) => Boolean(authorId) && authorId !== currentUserId);

    const confessionAuthorIds = confessions
      .filter((item) => !item?.isAnonymous)
      .map((item) => normalizeId(item?.authorId))
      .filter((authorId) => Boolean(authorId) && authorId !== currentUserId);

    return [...new Set([...storyAuthorIds, ...confessionAuthorIds])];
  }, [stories, confessions, currentUserId]);

  useEffect(() => {
    let isMounted = true;

    const unresolvedAuthorIds = followableAuthorIds.filter(
      (authorId) => typeof followStateByUserId[authorId] !== "boolean",
    );

    if (unresolvedAuthorIds.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    const resolveFollowStatuses = async () => {
      const statusEntries = await Promise.all(
        unresolvedAuthorIds.map(async (authorId) => {
          try {
            const payload = await getFollowStatus(authorId);
            return [authorId, Boolean(payload?.following)];
          } catch {
            return [authorId, false];
          }
        }),
      );

      if (!isMounted) {
        return;
      }

      setFollowStateByUserId((previous) => ({
        ...previous,
        ...Object.fromEntries(statusEntries),
      }));
    };

    resolveFollowStatuses().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [followStateByUserId, followableAuthorIds, setFollowStateByUserId]);

  const {
    activeConfessionCommentState,
    activeConfessionCommentStory,
    activeCommentMenuId,
    confessionCommentActionFeedback,
    pendingConfessionCommentLikeIds,
    confessionCommentLikePulseIds,
    confessionCommentListRef,
    confessionCommentListSentinelRef,
    confessionCommentInputRef,
    closeConfessionModal,
    openConfessionModal,
    handleToggleConfessionCommentLike,
    handleToggleCommentMenu,
    handleStartEditCommentWithOriginal,
    handleDeleteConfessionComment,
    handleStartConfessionReply,
    handleToggleConfessionReplies,
    handleLoadMoreConfessionReplies,
    handleCancelCommentComposer,
    handleConfessionCommentInputChange,
    handleSubmitConfessionComment,
    deleteTargetCommentId,
    closeDeleteConfessionCommentDialog,
    handleConfirmDeleteComment,
  } = useBookmarkedConfessionComments({
    setConfessions,
    showError,
    showSuccess,
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Bookmarks" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              <div className="flex gap-2 mb-8 sm:mb-10">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    activeTab === "stories"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-white text-rose-500 border border-rose-200 hover:bg-rose-50"
                  }`}
                  onClick={() => setActiveTab("stories")}
                  aria-pressed={activeTab === "stories"}
                >
                  Stories
                </button>

                <button
                  className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    activeTab === "confessions"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-white text-rose-500 border border-rose-200 hover:bg-rose-50"
                  }`}
                  onClick={() => setActiveTab("confessions")}
                  aria-pressed={activeTab === "confessions"}
                >
                  Confessions
                </button>
              </div>

              {activeTab === "stories" && (
                <BookmarkedStoriesTab
                  stories={stories}
                  isLoadingStories={isLoadingStories}
                  storyError={storyError}
                  currentUserId={currentUserId}
                  expandedStoryIds={expandedStoryIds}
                  activeCommentStoryId={activeCommentStoryId}
                  followStateByUserId={followStateByUserId}
                  busyFollowIds={busyFollowIds}
                  menuStoryId={menuStoryId}
                  onToggleStoryMenu={handleToggleStoryMenu}
                  onEditStory={handleEditStory}
                  onDeleteStory={handleDeleteStory}
                  onToggleStoryLike={handleToggleStoryLike}
                  onOpenStoryComments={handleOpenStoryComments}
                  onUnsaveStory={handleUnsaveStory}
                  onToggleExpandedStory={handleToggleExpandedStory}
                  onToggleFollowAuthor={handleToggleFollowAuthor}
                  onCardClick={(storyId) =>
                    navigate("/", { state: { focusedPostId: storyId } })
                  }
                />
              )}

              {activeTab === "confessions" && (
                <BookmarkedConfessionsTab
                  confessions={confessions}
                  isLoadingConfessions={isLoadingConfessions}
                  confessionError={confessionError}
                  currentUserId={currentUserId}
                  expandedConfessionIds={expandedConfessionIds}
                  menuConfessionId={menuConfessionId}
                  gestureLikeBurstId={gestureLikeBurstId}
                  pressedLikeId={pressedLikeId}
                  pressedBookmarkId={pressedBookmarkId}
                  followStateByUserId={followStateByUserId}
                  busyFollowIds={busyFollowIds}
                  onToggleConfessionMenu={handleToggleConfessionMenu}
                  onEditConfession={handleEditConfession}
                  onDeleteConfession={handleDeleteConfession}
                  onToggleExpandedConfession={handleToggleExpandedConfession}
                  onToggleConfessionLike={handleToggleConfessionLike}
                  onOpenCommentModal={openConfessionModal}
                  onUnsaveConfession={handleUnsaveConfession}
                  onToggleFollowAuthor={handleToggleFollowAuthor}
                />
              )}

              <SiteFooter />
            </div>
          </div>
        </main>
      </div>

      <CommentSection
        story={activeCommentStory}
        commentState={activeStoryCommentState}
        activeMenuCommentId={activeMenuCommentId}
        currentUserId={currentUserId}
        commentActionFeedback={commentActionFeedback}
        pendingCommentLikeIds={pendingCommentLikeIds}
        commentLikePulseIds={commentLikePulseIds}
        commentListRef={storyCommentListRef}
        commentListSentinelRef={storyCommentListSentinelRef}
        commentInputRef={storyCommentInputRef}
        onClose={() => setActiveCommentStoryId(null)}
        onToggleCommentLike={handleToggleStoryCommentLike}
        onToggleCommentMenu={handleToggleStoryCommentMenu}
        onEditComment={handleEditStoryComment}
        onDeleteComment={handleDeleteStoryComment}
        onStartReply={handleStartStoryReply}
        onToggleReplies={handleToggleStoryReplies}
        onLoadMoreReplies={handleLoadMoreStoryReplies}
        onCancelCommentComposer={handleCancelStoryComposer}
        onCommentInputChange={handleStoryCommentInputChange}
        onSubmitComment={handleSubmitStoryComment}
      />

      <CommentSection
        story={activeConfessionCommentStory}
        commentState={activeConfessionCommentState}
        activeMenuCommentId={activeCommentMenuId}
        currentUserId={currentUserId}
        commentActionFeedback={confessionCommentActionFeedback}
        pendingCommentLikeIds={pendingConfessionCommentLikeIds}
        commentLikePulseIds={confessionCommentLikePulseIds}
        commentListRef={confessionCommentListRef}
        commentListSentinelRef={confessionCommentListSentinelRef}
        commentInputRef={confessionCommentInputRef}
        onClose={closeConfessionModal}
        onToggleCommentLike={handleToggleConfessionCommentLike}
        onToggleCommentMenu={handleToggleCommentMenu}
        onEditComment={(_, comment) =>
          handleStartEditCommentWithOriginal(comment)
        }
        onDeleteComment={handleDeleteConfessionComment}
        onStartReply={handleStartConfessionReply}
        onToggleReplies={handleToggleConfessionReplies}
        onLoadMoreReplies={handleLoadMoreConfessionReplies}
        onCancelCommentComposer={handleCancelCommentComposer}
        onCommentInputChange={handleConfessionCommentInputChange}
        onSubmitComment={handleSubmitConfessionComment}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetStoryId)}
        title="Delete this story?"
        titleId="story-delete-dialog-title"
        onCancel={() => setDeleteTargetStoryId("")}
        onConfirm={handleConfirmDeleteStory}
        isBusy={isDeletingStory}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetConfessionId)}
        title="Delete this confession?"
        titleId="confession-delete-dialog-title"
        onCancel={() => setDeleteTargetConfessionId("")}
        onConfirm={handleConfirmDeleteConfession}
        isBusy={isDeletingConfession}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetComment)}
        title="Delete this comment?"
        titleId="story-comment-delete-dialog-title"
        onCancel={() => setDeleteTargetComment(null)}
        onConfirm={handleConfirmDeleteStoryComment}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetCommentId)}
        title="Delete this comment?"
        titleId="confession-comment-delete-dialog-title"
        onCancel={closeDeleteConfessionCommentDialog}
        onConfirm={handleConfirmDeleteComment}
      />

      {toast && (
        <Toast
          toast={toast}
          isVisible={isToastVisible}
          isPaused={isToastPaused}
          durationMs={duration}
          onClose={dismissToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      )}
    </div>
  );
}
