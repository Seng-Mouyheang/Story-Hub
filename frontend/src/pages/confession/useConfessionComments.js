import React from "react";

import { parseResponse } from "./confessionUtils";
import { useOutsideClickCloser } from "./useOutsideClickCloser";

export const useConfessionComments = ({
  setConfessionFeed,
  showError,
  showSuccess,
  currentUserId,
  currentUsername,
  currentUserProfilePicture,
}) => {
  const [activeCommentConfessionId, setActiveCommentConfessionId] =
    React.useState("");
  const [commentModalTitle, setCommentModalTitle] = React.useState("");
  const [modalComments, setModalComments] = React.useState([]);
  const [newCommentContent, setNewCommentContent] = React.useState("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [activeCommentMenuId, setActiveCommentMenuId] = React.useState("");
  const [editingCommentId, setEditingCommentId] = React.useState("");
  const [editCommentContent, setEditCommentContent] = React.useState("");
  const [isSavingEditedComment, setIsSavingEditedComment] =
    React.useState(false);
  const [deleteTargetCommentId, setDeleteTargetCommentId] = React.useState("");
  const [isDeletingComment, setIsDeletingComment] = React.useState(false);
  const [isLoadingModalComments, setIsLoadingModalComments] =
    React.useState(false);
  const [modalCommentsError, setModalCommentsError] = React.useState("");
  const [modalCommentsNextCursor, setModalCommentsNextCursor] =
    React.useState("");
  const [modalCommentsHasMore, setModalCommentsHasMore] = React.useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = React.useState("");
  const [replyingToAuthor, setReplyingToAuthor] = React.useState("");
  const [repliesByComment, setRepliesByComment] = React.useState({});
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = React.useState({});
  const [commentLikePulseIds, setCommentLikePulseIds] = React.useState({});
  const [commentActionFeedback, setCommentActionFeedback] = React.useState({});

  const showErrorMessage = React.useCallback(
    (message) => {
      if (typeof showError === "function" && message) {
        showError(message);
      }
    },
    [showError],
  );

  const showSuccessMessage = React.useCallback(
    (message) => {
      if (typeof showSuccess === "function" && message) {
        showSuccess(message);
      }
    },
    [showSuccess],
  );

  const getCommentId = React.useCallback(
    (comment) => String(comment?._id || comment?.id || ""),
    [],
  );

  const mergeCommentsById = React.useCallback(
    (incomingComments, existingComments = []) => {
      const seenIds = new Set();
      const mergedComments = [];

      [...incomingComments, ...existingComments].forEach((comment) => {
        const commentId = getCommentId(comment);

        if (!commentId || seenIds.has(commentId)) {
          return;
        }

        seenIds.add(commentId);
        mergedComments.push(comment);
      });

      return mergedComments;
    },
    [getCommentId],
  );

  const createEmptyRepliesState = () => ({
    open: false,
    loaded: false,
    loading: false,
    loadingMore: false,
    error: "",
    items: [],
    nextCursor: null,
    hasMore: false,
  });

  const showCommentActionFeedback = React.useCallback((commentId, message) => {
    if (!commentId || !message) {
      return;
    }

    setCommentActionFeedback((prev) => ({
      ...prev,
      [commentId]: message,
    }));

    setTimeout(() => {
      setCommentActionFeedback((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }, 2600);
  }, []);

  const updateConfessionCommentCount = React.useCallback(
    (confessionId, by) => {
      setConfessionFeed((prev) =>
        prev.map((item) => {
          const itemId = String(item?._id || item?.id || "");

          if (itemId !== confessionId) {
            return item;
          }

          return {
            ...item,
            commentCount: Math.max(0, Number(item?.commentCount || 0) + by),
          };
        }),
      );
    },
    [setConfessionFeed],
  );

  const loadModalComments = React.useCallback(
    async (confessionId, cursor = "", { preservePagination = false } = {}) => {
      setModalCommentsError("");
      setIsLoadingModalComments(true);

      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const params = new URLSearchParams({ limit: "10" });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(
          `/api/confessions/${confessionId}/comments?${params.toString()}`,
          { headers },
        );
        const payload = await parseResponse(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load comments.");
        }

        const comments = Array.isArray(payload?.comments)
          ? payload.comments
          : [];
        const nextCursor = payload?.nextCursor || "";
        const hasMore = Boolean(payload?.hasMore);

        setModalComments((prev) =>
          preservePagination
            ? mergeCommentsById(comments, prev)
            : mergeCommentsById(prev, comments),
        );

        setModalCommentsNextCursor(nextCursor);
        setModalCommentsHasMore(hasMore);
      } catch (error) {
        showErrorMessage("Unable to load comments.");
        setModalCommentsError(
          error?.message === "Failed to fetch"
            ? "Unable to load comments."
            : error?.message || "Unable to load comments.",
        );
      } finally {
        setIsLoadingModalComments(false);
      }
    },
    [mergeCommentsById, showErrorMessage],
  );

  const loadMoreModalComments = React.useCallback(async () => {
    if (
      !activeCommentConfessionId ||
      !modalCommentsHasMore ||
      !modalCommentsNextCursor ||
      isLoadingModalComments
    ) {
      return;
    }

    await loadModalComments(activeCommentConfessionId, modalCommentsNextCursor);
  }, [
    activeCommentConfessionId,
    isLoadingModalComments,
    loadModalComments,
    modalCommentsHasMore,
    modalCommentsNextCursor,
  ]);

  const closeCommentModal = () => {
    setActiveCommentConfessionId("");
    setCommentModalTitle("");
    setModalComments([]);
    setModalCommentsNextCursor("");
    setModalCommentsHasMore(false);
    setNewCommentContent("");
    setActiveCommentMenuId("");
    setEditingCommentId("");
    setEditCommentContent("");
    setReplyingToCommentId("");
    setReplyingToAuthor("");
    setRepliesByComment({});
    setCommentActionFeedback({});
    setModalCommentsError("");
    setIsLoadingModalComments(false);
  };

  const openCommentModal = async (confessionId, authorName) => {
    setActiveCommentConfessionId(confessionId);
    setCommentModalTitle(authorName || "Confession");
    setModalComments([]);
    setModalCommentsNextCursor("");
    setModalCommentsHasMore(false);
    setNewCommentContent("");
    setActiveCommentMenuId("");
    setEditingCommentId("");
    setEditCommentContent("");
    setReplyingToCommentId("");
    setReplyingToAuthor("");
    setRepliesByComment({});
    setCommentActionFeedback({});
    await loadModalComments(confessionId);
  };

  const handleAddComment = async () => {
    if (!activeCommentConfessionId || isSubmittingComment) {
      return;
    }

    const cleanedContent = newCommentContent.trim();
    const token = localStorage.getItem("token");
    const hasContent = cleanedContent.length > 0;

    if (!hasContent || !token) {
      setModalCommentsError(
        hasContent
          ? "Please log in to comment."
          : "Write something before posting your comment.",
      );
      return;
    }

    setIsSubmittingComment(true);
    setModalCommentsError("");

    try {
      const response = await fetch(
        `/api/confessions/${activeCommentConfessionId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: cleanedContent,
            ...(replyingToCommentId ? { parentId: replyingToCommentId } : {}),
          }),
        },
      );
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to add comment.");
      }

      const authorDisplayName = currentUsername || "Anonymous";
      const authorProfilePicture = currentUserProfilePicture || "";

      if (replyingToCommentId) {
        const existingReplyState =
          repliesByComment[replyingToCommentId] || createEmptyRepliesState();
        const replyStateLoaded = existingReplyState.loaded === true;

        setModalComments((prev) =>
          prev.map((comment) => {
            const currentId = String(comment?._id || comment?.id || "");
            if (currentId !== replyingToCommentId) {
              return comment;
            }
            return {
              ...comment,
              replyCount: Math.max(0, Number(comment?.replyCount || 0) + 1),
            };
          }),
        );

        const newReply = {
          _id: payload?.commentId || `${Date.now()}`,
          id: payload?.commentId || `${Date.now()}`,
          userId: currentUserId || "",
          authorDisplayName,
          authorProfilePicture,
          content: cleanedContent,
          createdAt: new Date().toISOString(),
          likesCount: 0,
          likedByCurrentUser: false,
          isEdited: false,
          parentId: replyingToCommentId,
        };

        setRepliesByComment((prev) => ({
          ...prev,
          [replyingToCommentId]: {
            ...createEmptyRepliesState(),
            ...existingReplyState,
            open: true,
            loaded: replyStateLoaded,
            loading: false,
            items: [...(existingReplyState.items || []), newReply],
            error: "",
            nextCursor: existingReplyState.nextCursor,
            hasMore: existingReplyState.hasMore,
          },
        }));

        if (!replyStateLoaded) {
          await fetchReplies(replyingToCommentId);
        }
      } else {
        await loadModalComments(activeCommentConfessionId, "", {
          preservePagination: true,
        });
      }

      setNewCommentContent("");
      setReplyingToCommentId("");
      setReplyingToAuthor("");
      updateConfessionCommentCount(activeCommentConfessionId, 1);
      showSuccessMessage("Comment posted.");
    } catch {
      const message = replyingToCommentId
        ? "Failed to post reply."
        : "Failed to post comment.";
      showErrorMessage(message);
      setModalCommentsError(message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleCommentMenu = (commentId) => {
    setActiveCommentMenuId((currentId) =>
      currentId === commentId ? "" : commentId,
    );
  };

  const handleDeleteComment = React.useCallback((commentId) => {
    if (!commentId) {
      return;
    }

    setActiveCommentMenuId("");
    setEditingCommentId("");
    setDeleteTargetCommentId(commentId);
  }, []);

  const fetchReplies = React.useCallback(
    async (commentId, cursor = null, append = false) => {
      setRepliesByComment((prev) => ({
        ...prev,
        [commentId]: {
          ...createEmptyRepliesState(),
          ...(prev[commentId] || {}),
          loading: !append,
          loadingMore: append,
          error: "",
        },
      }));

      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const params = new URLSearchParams({ limit: "4" });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(
          `/api/confessions/comments/${commentId}/replies?${params.toString()}`,
          { headers },
        );
        const payload = await parseResponse(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load replies.");
        }

        const replies = Array.isArray(payload?.replies) ? payload.replies : [];

        setRepliesByComment((prev) => {
          const existingReplyState =
            prev[commentId] || createEmptyRepliesState();
          return {
            ...prev,
            [commentId]: {
              ...createEmptyRepliesState(),
              ...existingReplyState,
              loading: false,
              loadingMore: false,
              loaded: true,
              open: true,
              error: "",
              items: append
                ? [...(existingReplyState.items || []), ...replies]
                : replies,
              nextCursor: payload?.nextCursor || null,
              hasMore: Boolean(payload?.hasMore),
            },
          };
        });
      } catch (error) {
        const message = "Unable to load replies.";
        showErrorMessage(message);
        showCommentActionFeedback(commentId, error.message || message);

        setRepliesByComment((prev) => ({
          ...prev,
          [commentId]: {
            ...createEmptyRepliesState(),
            ...(prev[commentId] || {}),
            loading: false,
            loadingMore: false,
            error: error.message || "Unable to load replies.",
          },
        }));
      }
    },
    [showCommentActionFeedback, showErrorMessage],
  );

  const handleToggleReplies = React.useCallback(
    (commentId) => {
      const currentReplyState =
        repliesByComment[commentId] || createEmptyRepliesState();
      const nextOpen = !currentReplyState.open;

      setRepliesByComment((prev) => ({
        ...prev,
        [commentId]: {
          ...currentReplyState,
          open: nextOpen,
        },
      }));

      if (nextOpen && !currentReplyState.loaded && !currentReplyState.loading) {
        fetchReplies(commentId);
      }
    },
    [fetchReplies, repliesByComment],
  );

  const handleLoadMoreReplies = React.useCallback(
    (commentId) => {
      const currentReplyState =
        repliesByComment[commentId] || createEmptyRepliesState();

      if (!currentReplyState.hasMore || !currentReplyState.nextCursor) {
        return;
      }

      fetchReplies(commentId, currentReplyState.nextCursor, true);
    },
    [fetchReplies, repliesByComment],
  );

  const handleStartReply = React.useCallback((comment) => {
    setActiveCommentMenuId("");
    const commentId = String(comment?._id || comment?.id || "");
    const replyAuthor = comment?.authorDisplayName || "Anonymous";

    setEditingCommentId("");
    setNewCommentContent("");
    setReplyingToCommentId(commentId);
    setReplyingToAuthor(replyAuthor);
  }, []);

  const handleToggleCommentLike = React.useCallback(
    async (commentId) => {
      if (!commentId || pendingCommentLikeIds[commentId]) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showCommentActionFeedback(commentId, "Please log in to like comments.");
        return;
      }

      setCommentLikePulseIds((prev) => ({
        ...prev,
        [commentId]: true,
      }));
      setPendingCommentLikeIds((prev) => ({
        ...prev,
        [commentId]: true,
      }));

      try {
        const response = await fetch(
          `/api/confessions/comments/${commentId}/toggle-like`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const payload = await parseResponse(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to update comment like.");
        }

        const nextLikes = Number(payload?.likesCount || 0);
        const likedByCurrentUser = Boolean(payload?.likedByCurrentUser);

        setModalComments((prev) =>
          prev.map((comment) => {
            const currentId = String(comment?._id || comment?.id || "");
            if (currentId !== commentId) {
              return comment;
            }
            return {
              ...comment,
              likedByCurrentUser,
              likesCount: nextLikes,
            };
          }),
        );

        setRepliesByComment((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([parentId, replyState]) => [
              parentId,
              {
                ...replyState,
                items: (replyState.items || []).map((reply) => {
                  const currentId = String(reply?._id || reply?.id || "");
                  if (currentId !== commentId) {
                    return reply;
                  }
                  return {
                    ...reply,
                    likedByCurrentUser,
                    likesCount: nextLikes,
                  };
                }),
              },
            ]),
          ),
        );
      } catch (error) {
        showCommentActionFeedback(
          commentId,
          error.message || "Failed to update comment like.",
        );
      } finally {
        setPendingCommentLikeIds((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
        setTimeout(() => {
          setCommentLikePulseIds((prev) => {
            const next = { ...prev };
            delete next[commentId];
            return next;
          });
        }, 220);
      }
    },
    [pendingCommentLikeIds, showCommentActionFeedback],
  );

  const handleCancelCommentComposer = React.useCallback(() => {
    setEditingCommentId("");
    setEditCommentContent("");
    setReplyingToCommentId("");
    setReplyingToAuthor("");
    setNewCommentContent("");
  }, []);

  const handleStartEditComment = (comment) => {
    const commentId = String(comment?._id || comment?.id || "");
    setActiveCommentMenuId("");
    setEditingCommentId(commentId);
    setEditCommentContent(comment?.content || "");
  };

  const handleCancelEditComment = () => {
    setEditingCommentId("");
    setEditCommentContent("");
  };

  const handleSaveEditedComment = async () => {
    if (isSavingEditedComment) {
      return;
    }
    const targetCommentId = editingCommentId;
    const cleanedContent = editCommentContent.trim();
    const token = localStorage.getItem("token");
    const hasContent = cleanedContent.length > 0;

    if (!targetCommentId) {
      setModalCommentsError("No comment is selected for editing.");
      return;
    }

    if (!hasContent || !token) {
      setModalCommentsError(
        hasContent
          ? "Please log in to edit your comment."
          : "Comment cannot be empty.",
      );
      return;
    }

    setIsSavingEditedComment(true);
    setModalCommentsError("");

    try {
      const response = await fetch(
        `/api/confessions/comments/${targetCommentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: cleanedContent }),
        },
      );
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to edit comment.");
      }

      const updatedComment = payload?.comment;

      setModalComments((prev) =>
        prev.map((comment) => {
          const currentId = String(comment?._id || comment?.id || "");

          if (currentId !== targetCommentId) {
            return comment;
          }

          if (!updatedComment) {
            return comment;
          }

          return {
            ...comment,
            ...updatedComment,
          };
        }),
      );

      setRepliesByComment((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([parentId, replyState]) => [
            parentId,
            {
              ...replyState,
              items: (replyState.items || []).map((reply) => {
                const currentId = String(reply?._id || reply?.id || "");
                if (currentId !== targetCommentId) {
                  return reply;
                }
                return {
                  ...reply,
                  ...(updatedComment || {}),
                };
              }),
            },
          ]),
        ),
      );

      setEditingCommentId("");
      setEditCommentContent("");
      showSuccessMessage("Comment updated.");
    } catch {
      const message = "Failed to update comment.";
      showErrorMessage(message);
      setModalCommentsError(message);
    } finally {
      setIsSavingEditedComment(false);
    }
  };

  const handleConfirmDeleteComment = React.useCallback(async () => {
    if (
      !deleteTargetCommentId ||
      !activeCommentConfessionId ||
      isDeletingComment
    ) {
      return;
    }

    const commentId = deleteTargetCommentId;
    const token = localStorage.getItem("token");

    if (!token) {
      setModalCommentsError("Please log in to delete your comment.");
      return;
    }

    setActiveCommentMenuId("");
    setEditingCommentId("");
    setEditCommentContent("");
    setIsDeletingComment(true);
    setModalCommentsError("");

    try {
      const response = await fetch(`/api/confessions/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete comment.");
      }

      const removedCount = Number(payload?.removedCount);
      const commentCountDelta =
        Number.isFinite(removedCount) && removedCount > 0 ? -removedCount : -1;

      setModalComments((prev) =>
        prev.filter(
          (comment) => String(comment?._id || comment?.id || "") !== commentId,
        ),
      );

      setRepliesByComment((prev) => {
        const matchedParent = Object.entries(prev).find(([, replyState]) =>
          (replyState.items || []).some(
            (reply) => String(reply?._id || reply?.id || "") === commentId,
          ),
        );

        const next = Object.fromEntries(
          Object.entries(prev)
            .map(([parentId, replyState]) => [
              parentId,
              {
                ...replyState,
                items: (replyState.items || []).filter(
                  (reply) =>
                    String(reply?._id || reply?.id || "") !== commentId,
                ),
              },
            ])
            .filter(([parentId]) => parentId !== commentId),
        );

        if (matchedParent) {
          const parentId = matchedParent[0];
          setModalComments((commentsPrev) =>
            commentsPrev.map((comment) => {
              const currentId = String(comment?._id || comment?.id || "");
              if (currentId !== parentId) {
                return comment;
              }
              return {
                ...comment,
                replyCount: Math.max(0, Number(comment?.replyCount || 0) - 1),
              };
            }),
          );
        }

        return next;
      });

      updateConfessionCommentCount(
        activeCommentConfessionId,
        commentCountDelta,
      );
      showSuccessMessage("Comment deleted.");
    } catch {
      const message = "Failed to delete comment.";
      showErrorMessage(message);
      setModalCommentsError(message);
    } finally {
      setIsDeletingComment(false);
      setDeleteTargetCommentId("");
    }
  }, [
    activeCommentConfessionId,
    deleteTargetCommentId,
    isDeletingComment,
    showErrorMessage,
    showSuccessMessage,
    updateConfessionCommentCount,
  ]);

  const closeCommentMenu = React.useCallback(() => {
    setActiveCommentMenuId("");
  }, []);

  useOutsideClickCloser(
    Boolean(activeCommentMenuId),
    closeCommentMenu,
    "[data-comment-menu]",
  );

  return {
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
    closeCommentModal,
    openCommentModal,
    loadMoreModalComments,
    handleAddComment,
    handleToggleCommentMenu,
    handleStartReply,
    handleToggleReplies,
    handleLoadMoreReplies,
    handleStartEditComment,
    handleCancelEditComment,
    handleSaveEditedComment,
    handleCancelCommentComposer,
    handleToggleCommentLike,
    handleDeleteComment,
    deleteTargetCommentId,
    setDeleteTargetCommentId,
    handleConfirmDeleteComment,
  };
};
