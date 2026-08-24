import { useCallback, useEffect, useRef, useState } from "react";

import { useConfessionComments } from "./useConfessionComments";

/**
 * Bridges useConfessionComments's confession-shaped API
 * (`openCommentModal(confessionId, author)`, `handleToggleCommentLike(commentId)`, ...)
 * to CommentSection's generic `(storyId, commentId)`-shaped props, and owns
 * the comment list's own infinite-scroll + delete-confirm state.
 */
export function useConfessionCommentModal({
  setConfessionFeed,
  showError,
  showSuccess,
  currentUserId,
  currentUsername,
  currentUserProfilePicture,
}) {
  const commentListRef = useRef(null);
  const commentListSentinelRef = useRef(null);
  const commentInputRef = useRef(null);
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
    pendingCommentLikeIds,
    commentLikePulseIds,
    commentActionFeedback,
    closeCommentModal: closeCommentModalState,
    openCommentModal: openCommentModalState,
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
    setConfessionFeed,
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

  const handleCommentInputChange = useCallback(
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

  const handleSubmitComment = useCallback(() => {
    if (editingCommentId) {
      handleSaveEditedComment();
    } else {
      handleAddComment();
    }
  }, [editingCommentId, handleAddComment, handleSaveEditedComment]);

  const handleDeleteComment = useCallback(
    (_storyId, commentId) => {
      handleDeleteCommentHook(commentId);
    },
    [handleDeleteCommentHook],
  );

  const handleToggleCommentLikeWrapper = useCallback(
    (_storyId, commentId) => {
      handleToggleCommentLike(commentId);
    },
    [handleToggleCommentLike],
  );

  const handleStartReplyWrapper = useCallback(
    (_storyId, comment) => {
      handleStartReply(comment);
    },
    [handleStartReply],
  );

  const handleToggleRepliesWrapper = useCallback(
    (_storyId, commentId) => {
      handleToggleReplies(commentId);
    },
    [handleToggleReplies],
  );

  const handleLoadMoreRepliesWrapper = useCallback(
    (_storyId, commentId) => {
      handleLoadMoreReplies(commentId);
    },
    [handleLoadMoreReplies],
  );

  const closeDeleteCommentDialog = useCallback(() => {
    setDeleteTargetCommentId("");
  }, [setDeleteTargetCommentId]);

  useEffect(() => {
    const sentinel = commentListSentinelRef.current;
    const root = commentListRef.current;

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

  const activeCommentState = {
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

  const activeCommentStory = activeCommentConfessionId
    ? {
        id: activeCommentConfessionId,
        title: commentModalTitle,
      }
    : null;

  const closeCommentModal = useCallback(() => {
    closeCommentModalState();
    setCommentOriginalInput("");
  }, [closeCommentModalState]);

  const openCommentModal = useCallback(
    async (...args) => {
      await openCommentModalState(...args);
    },
    [openCommentModalState],
  );

  return {
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
  };
}
