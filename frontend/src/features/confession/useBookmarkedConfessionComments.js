import { useCallback, useEffect, useRef, useState } from "react";
import { useConfessionComments } from "./useConfessionComments";

/**
 * Wires useConfessionComments' API into the generic shape CommentSection
 * expects, and owns the comment-modal-local refs/state for the bookmarked
 * confessions tab.
 */
export function useBookmarkedConfessionComments({
  setConfessions,
  showError,
  showSuccess,
  currentUserId,
  currentUsername,
  currentUserProfilePicture,
}) {
  const confessionCommentListRef = useRef(null);
  const confessionCommentListSentinelRef = useRef(null);
  const confessionCommentInputRef = useRef(null);
  const [commentOriginalInput, setCommentOriginalInput] = useState("");

  const {
    activeCommentConfessionId,
    commentModalTitle,
    modalComments,
    newCommentContent,
    setNewCommentContent,
    isSubmittingComment,
    activeCommentMenuId,
    editingCommentId,
    editCommentContent,
    setEditCommentContent,
    isSavingEditedComment,
    isDeletingComment,
    isLoadingModalComments,
    modalCommentsError,
    modalCommentsHasMore,
    modalCommentsNextCursor,
    replyingToCommentId,
    replyingToAuthor,
    repliesByComment,
    pendingCommentLikeIds: pendingConfessionCommentLikeIds,
    commentLikePulseIds: confessionCommentLikePulseIds,
    commentActionFeedback: confessionCommentActionFeedback,
    closeCommentModal: closeConfessionModalState,
    openCommentModal: openConfessionModalState,
    handleAddComment,
    handleToggleCommentMenu,
    handleStartReply,
    handleToggleReplies,
    loadMoreModalComments,
    handleLoadMoreReplies,
    handleStartEditComment,
    handleSaveEditedComment,
    handleCancelCommentComposer,
    handleToggleCommentLike,
    handleDeleteComment: handleDeleteCommentHook,
    deleteTargetCommentId,
    setDeleteTargetCommentId,
    handleConfirmDeleteComment,
  } = useConfessionComments({
    setConfessionFeed: setConfessions,
    showError,
    showSuccess,
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
  });

  const handleStartEditCommentWithOriginal = useCallback(
    (comment) => {
      setCommentOriginalInput(comment?.content || "");
      handleStartEditComment(comment);
    },
    [handleStartEditComment],
  );

  const handleConfessionCommentInputChange = useCallback(
    (...args) => {
      const value = args[1];

      if (editingCommentId) {
        setEditCommentContent(value);
      } else {
        setNewCommentContent(value);
      }
    },
    [editingCommentId, setEditCommentContent, setNewCommentContent],
  );

  const handleSubmitConfessionComment = useCallback(() => {
    if (editingCommentId) {
      handleSaveEditedComment();
    } else {
      handleAddComment();
    }
  }, [editingCommentId, handleAddComment, handleSaveEditedComment]);

  const handleDeleteConfessionComment = useCallback(
    (_storyId, commentId) => {
      handleDeleteCommentHook(commentId);
    },
    [handleDeleteCommentHook],
  );

  const handleToggleConfessionCommentLike = useCallback(
    (_storyId, commentId) => {
      handleToggleCommentLike(commentId);
    },
    [handleToggleCommentLike],
  );

  const handleStartConfessionReply = useCallback(
    (_storyId, comment) => {
      handleStartReply(comment);
    },
    [handleStartReply],
  );

  const handleToggleConfessionReplies = useCallback(
    (_storyId, commentId) => {
      handleToggleReplies(commentId);
    },
    [handleToggleReplies],
  );

  const handleLoadMoreConfessionReplies = useCallback(
    (_storyId, commentId) => {
      handleLoadMoreReplies(commentId);
    },
    [handleLoadMoreReplies],
  );

  const closeDeleteConfessionCommentDialog = useCallback(() => {
    setDeleteTargetCommentId("");
  }, [setDeleteTargetCommentId]);

  useEffect(() => {
    const sentinel = confessionCommentListSentinelRef.current;
    const root = confessionCommentListRef.current;

    if (
      !activeCommentConfessionId ||
      !sentinel ||
      !root ||
      !modalCommentsHasMore ||
      isLoadingModalComments
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreModalComments().catch(() => {});
        }
      },
      {
        root,
        rootMargin: "0px 0px 120px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    activeCommentConfessionId,
    isLoadingModalComments,
    loadMoreModalComments,
    modalCommentsHasMore,
  ]);

  const activeConfessionCommentState = {
    open: Boolean(activeCommentConfessionId),
    loaded:
      !isLoadingModalComments &&
      (modalComments.length > 0 || Boolean(modalCommentsError)),
    loading: isLoadingModalComments,
    loadingMore: isLoadingModalComments && modalComments.length > 0,
    error: modalCommentsError,
    items: modalComments,
    nextCursor: modalCommentsNextCursor,
    hasMore: modalCommentsHasMore,
    input: editingCommentId
      ? editCommentContent || ""
      : newCommentContent || "",
    originalInput: commentOriginalInput,
    editingCommentId,
    replyingToCommentId,
    replyingToAuthor,
    submitting:
      isSubmittingComment || isSavingEditedComment || isDeletingComment,
    repliesByComment,
  };

  const activeConfessionCommentStory = activeCommentConfessionId
    ? {
        id: activeCommentConfessionId,
        title: commentModalTitle,
      }
    : null;

  const closeConfessionModal = useCallback(() => {
    closeConfessionModalState();
    setCommentOriginalInput("");
  }, [closeConfessionModalState]);

  const openConfessionModal = useCallback(
    async (...args) => {
      await openConfessionModalState(...args);
    },
    [openConfessionModalState],
  );

  return {
    activeCommentConfessionId,
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
  };
}
