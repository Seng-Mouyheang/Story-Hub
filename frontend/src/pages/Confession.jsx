import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import CommentSection from "../components/CommentSection";
import DeleteConfirmModal from "../features/stories/DeleteConfirmModal";
import { useToast } from "../lib/useToast";
import { normalizeId } from "../features/confession/confessionUtils";
import { useConfessionCommentModal } from "../features/confession/useConfessionCommentModal";
import { useConfessionFeed } from "../features/confession/useConfessionFeed";
import { useConfessionCrud } from "../features/confession/useConfessionCrud";
import { useConfessionLikeBookmark } from "../features/confession/useConfessionLikeBookmark";
import { useFollowState } from "../features/social/useFollowState";
import { getProfileByUserId } from "../api/profile/profileApi";
import ConfessionFeedCard from "../features/confession/ConfessionFeedCard";
import ConfessionComposer from "../features/confession/ConfessionComposer";
import ConfessionEditDialog from "../features/confession/ConfessionEditDialog";
import ConfessionDeleteDialog from "../features/confession/ConfessionDeleteDialog";

export default function Confession() {
  const editDialogTitleId = "confession-edit-dialog-title";
  const deleteDialogTitleId = "confession-delete-dialog-title";

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

  const dismissToast = React.useCallback(() => {
    hideToast();
  }, [hideToast]);

  const showError = React.useCallback(
    (message) => showToast(message, "error"),
    [showToast],
  );

  const showSuccess = React.useCallback(
    (message) => showToast(message, "success"),
    [showToast],
  );

  const [currentUserId, setCurrentUserId] = React.useState("");

  const currentUsername = React.useMemo(() => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      return currentUser?.username || "You";
    } catch {
      return "You";
    }
  }, []);

  const [currentUserProfilePicture, setCurrentUserProfilePicture] =
    React.useState(() => {
      try {
        const currentUser = JSON.parse(
          localStorage.getItem("currentUser") || "null",
        );
        return currentUser?.profilePicture || "";
      } catch {
        return "";
      }
    });

  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const syncCurrentUserId = () => {
      try {
        const currentUser = JSON.parse(
          localStorage.getItem("currentUser") || "null",
        );

        setCurrentUserId(
          normalizeId(currentUser?.id || currentUser?._id || ""),
        );
      } catch {
        setCurrentUserId("");
      }
    };

    const handleStorage = (event) => {
      if (event.key && event.key !== "currentUser") {
        return;
      }

      syncCurrentUserId();
    };

    syncCurrentUserId();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncCurrentUserId);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncCurrentUserId);
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    if (!currentUserId) {
      setCurrentUserProfilePicture("");
      return () => {
        isMounted = false;
      };
    }

    const loadCurrentUserProfile = async () => {
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
    confessionFeed,
    setConfessionFeed,
    hasMoreFeed,
    isLoadingFeed,
    isLoadingMoreFeed,
    feedError,
    sentinelRef,
    feedScrollRef,
    loadConfessions,
  } = useConfessionFeed({ showError, showToast, hideToast });

  React.useEffect(() => {
    const initialFocused = location?.state?.focusedConfessionId;
    if (!initialFocused) return;

    const tryScroll = () => {
      const el = document.getElementById(`confession-${initialFocused}`);
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
    };

    requestAnimationFrame(tryScroll);
    const t = setTimeout(tryScroll, 500);
    return () => clearTimeout(t);
  }, [location, confessionFeed, navigate]);

  const {
    confession,
    setConfession,
    isAnonymous,
    setIsAnonymous,
    visibility,
    setVisibility,
    isSubmitting,
    handleSubmit,
    editingConfessionId,
    editConfessionContent,
    setEditConfessionContent,
    editConfessionIsAnonymous,
    setEditConfessionIsAnonymous,
    editConfessionVisibility,
    setEditConfessionVisibility,
    handleSaveEditedConfession,
    handleCancelEditConfession,
    menuConfessionId,
    handleToggleConfessionMenu,
    expandedConfessionIds,
    handleToggleExpandedConfession,
    handleEditConfession,
    handleDeleteConfession,
    deleteTargetConfessionId,
    setDeleteTargetConfessionId,
    isDeletingConfession,
    handleConfirmDeleteConfession,
  } = useConfessionCrud({
    confessionFeed,
    setConfessionFeed,
    loadConfessions,
    location,
    showError,
    showSuccess,
    dismissToast,
  });

  const { pressedLikeId, pressedBookmarkId, gestureLikeBurstId, handleToggleLike, handleToggleBookmark } =
    useConfessionLikeBookmark({ setConfessionFeed, showError, showSuccess });

  const followableAuthorIds = React.useMemo(() => {
    const authorIds = confessionFeed
      .filter(
        (item) =>
          !item?.isAnonymous &&
          item?.visibility === "public" &&
          normalizeId(item?.authorId) !== currentUserId,
      )
      .map((item) => normalizeId(item?.authorId))
      .filter(Boolean);

    return [...new Set(authorIds)];
  }, [confessionFeed, currentUserId]);

  const {
    followStateByUserId,
    busyFollowIds,
    toggleFollow: handleToggleFollowAuthor,
  } = useFollowState({
    currentUserId,
    authorIds: followableAuthorIds,
    notify: (message, type) => showToast(message, type),
    onUnauthenticated: showError,
  });

  const {
    commentListRef,
    commentListSentinelRef,
    commentInputRef,
    activeCommentMenuId,
    activeCommentState,
    activeCommentStory,
    commentActionFeedback,
    pendingCommentLikeIds,
    commentLikePulseIds,
    isDeletingComment,
    deleteTargetCommentId,
    closeCommentModal,
    openCommentModal,
    closeDeleteCommentDialog,
    handleToggleCommentMenu,
    handleStartEditCommentWithOriginal,
    handleDeleteComment,
    handleStartReplyWrapper,
    handleToggleRepliesWrapper,
    handleLoadMoreRepliesWrapper,
    handleCancelCommentComposer,
    handleCommentInputChange,
    handleSubmitComment,
    handleToggleCommentLikeWrapper,
    handleConfirmDeleteComment,
  } = useConfessionCommentModal({
    setConfessionFeed,
    showError,
    showSuccess,
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
  });

  let feedContent = null;
  if (isLoadingFeed) {
    feedContent = (
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
    );
  } else if (feedError) {
    feedContent = (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm">
        <div className="text-sm text-rose-700">{feedError}</div>
        <button
          type="button"
          onClick={() => {
            loadConfessions().catch(() => {});
          }}
          className="mt-4 inline-flex items-center rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
        >
          Retry
        </button>
      </div>
    );
  } else if (confessionFeed.length === 0) {
    feedContent = (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
        No confessions yet. Be the first one to post.
      </div>
    );
  } else {
    feedContent = confessionFeed.map((item, index) => (
      <ConfessionFeedCard
        key={String(item?._id || item?.id || `feed-${index}`)}
        item={item}
        index={index}
        currentUserId={currentUserId}
        expandedConfessionIds={expandedConfessionIds}
        menuConfessionId={menuConfessionId}
        gestureLikeBurstId={gestureLikeBurstId}
        pressedLikeId={pressedLikeId}
        pressedBookmarkId={pressedBookmarkId}
        onToggleConfessionMenu={handleToggleConfessionMenu}
        onEditConfession={handleEditConfession}
        onDeleteConfession={handleDeleteConfession}
        onToggleExpandedConfession={handleToggleExpandedConfession}
        onToggleLike={handleToggleLike}
        onOpenCommentModal={openCommentModal}
        onToggleBookmark={handleToggleBookmark}
        onToggleFollowAuthor={handleToggleFollowAuthor}
        followingAuthor={Boolean(
          followStateByUserId[normalizeId(item?.authorId)],
        )}
        followBusy={Boolean(busyFollowIds[normalizeId(item?.authorId)])}
        enableCardNavigation={false}
      />
    ));
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Confession Wall" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div
            ref={feedScrollRef}
            className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-4 sm:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-start">
              <ConfessionComposer
                value={confession}
                onChange={setConfession}
                isAnonymous={isAnonymous}
                onToggleAnonymous={() => setIsAnonymous((prev) => !prev)}
                visibility={visibility}
                onToggleVisibility={() =>
                  setVisibility((prev) =>
                    prev === "public" ? "private" : "public",
                  )
                }
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />

              <div className="mt-8 w-full pt-4 border-t border-gray-300">
                {feedContent}

                {isLoadingMoreFeed && (
                  <div className="mt-4 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                )}

                {!hasMoreFeed && confessionFeed.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <div
                      className="h-3 w-3 rounded-full bg-slate-300 shadow-sm ring-4 ring-slate-100"
                      aria-hidden="true"
                    />
                  </div>
                )}

                <div ref={sentinelRef} className="h-1" />
              </div>
            </div>
          </div>
        </main>

        <CommentSection
          story={activeCommentStory}
          commentState={activeCommentState}
          activeMenuCommentId={activeCommentMenuId}
          currentUserId={currentUserId}
          commentActionFeedback={commentActionFeedback}
          pendingCommentLikeIds={pendingCommentLikeIds}
          commentLikePulseIds={commentLikePulseIds}
          commentListRef={commentListRef}
          commentListSentinelRef={commentListSentinelRef}
          commentInputRef={commentInputRef}
          onClose={closeCommentModal}
          onToggleCommentLike={handleToggleCommentLikeWrapper}
          onToggleCommentMenu={handleToggleCommentMenu}
          onEditComment={(_, comment) =>
            handleStartEditCommentWithOriginal(comment)
          }
          onDeleteComment={handleDeleteComment}
          onStartReply={handleStartReplyWrapper}
          onToggleReplies={handleToggleRepliesWrapper}
          onLoadMoreReplies={handleLoadMoreRepliesWrapper}
          onCancelCommentComposer={handleCancelCommentComposer}
          onCommentInputChange={handleCommentInputChange}
          onSubmitComment={handleSubmitComment}
        />

        {deleteTargetCommentId && (
          <DeleteConfirmModal
            isOpen={Boolean(deleteTargetCommentId)}
            title="Delete this comment?"
            titleId="confession-delete-comment-dialog-title"
            onCancel={closeDeleteCommentDialog}
            onConfirm={handleConfirmDeleteComment}
            isBusy={isDeletingComment}
          />
        )}

        <ConfessionEditDialog
          isOpen={Boolean(editingConfessionId)}
          titleId={editDialogTitleId}
          content={editConfessionContent}
          onChangeContent={setEditConfessionContent}
          isAnonymous={editConfessionIsAnonymous}
          onToggleAnonymous={() =>
            setEditConfessionIsAnonymous((prev) => !prev)
          }
          visibility={editConfessionVisibility}
          onToggleVisibility={() =>
            setEditConfessionVisibility((prev) =>
              prev === "public" ? "private" : "public",
            )
          }
          isSubmitting={isSubmitting}
          onCancel={handleCancelEditConfession}
          onSave={handleSaveEditedConfession}
        />

        <ConfessionDeleteDialog
          isOpen={Boolean(deleteTargetConfessionId)}
          titleId={deleteDialogTitleId}
          isDeleting={isDeletingConfession}
          onCancel={() => setDeleteTargetConfessionId("")}
          onConfirm={handleConfirmDeleteConfession}
        />
      </div>

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
