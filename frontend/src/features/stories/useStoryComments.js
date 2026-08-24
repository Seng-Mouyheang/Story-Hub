import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addStoryComment,
  deleteStoryComment,
  getCommentReplies,
  getStoryComments,
  updateStoryComment,
} from "../../api/story/storyCommentsApi";
import { toggleCommentLike } from "../../api/story/storyInteractionsApi";
import {
  createEmptyCommentState,
  createEmptyRepliesState,
  normalizeId,
} from "../../lib/format";

/**
 * Shared comment/reply CRUD state machine used by Home.jsx and Bookmarks.jsx.
 *
 * Auth-gating and error/success messaging are intentionally left to the
 * caller via `onUnauthenticated`/`notify` so each page can keep its own
 * distinct behavior (Home redirects to /login, Bookmarks shows a toast).
 */
export function useStoryComments({
  currentUserId,
  currentUsername,
  currentUserProfilePicture,
  notify,
  onUnauthenticated,
  onCommentCountChange,
  closeModalOnReopen = true,
  commentFeedbackDurationMs = 1800,
}) {
  const [commentsByStory, setCommentsByStory] = useState({});
  const [activeCommentStoryId, setActiveCommentStoryId] = useState(null);
  const [menuCommentId, setMenuCommentId] = useState(null);
  const [deleteTargetComment, setDeleteTargetComment] = useState(null);
  const [commentActionFeedback, setCommentActionFeedback] = useState({});
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState({});
  const [commentLikePulseIds, setCommentLikePulseIds] = useState({});

  const commentInputRef = useRef(null);
  const commentListRef = useRef(null);
  const commentListSentinelRef = useRef(null);

  const requireToken = useCallback(
    (defaultMessage) => {
      const token = localStorage.getItem("token");
      if (!token) {
        onUnauthenticated?.(defaultMessage);
        return false;
      }
      return true;
    },
    [onUnauthenticated],
  );

  const fetchComments = useCallback(
    async (storyId, cursor = null, append = false) => {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          loading: !append,
          loadingMore: append,
          error: "",
        },
      }));

      try {
        const payload = await getStoryComments(storyId, { limit: 10, cursor });
        const comments = Array.isArray(payload?.comments)
          ? payload.comments
          : [];

        setCommentsByStory((prev) => {
          const existingState = prev[storyId] || createEmptyCommentState();
          const mergedItems = append
            ? [...(existingState.items || []), ...comments]
            : comments;

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...existingState,
              open: true,
              loading: false,
              loadingMore: false,
              error: "",
              loaded: true,
              items: mergedItems.map((comment) => ({
                ...comment,
                replyCount: Number(comment?.replyCount || 0),
              })),
              nextCursor: payload?.nextCursor || null,
              hasMore: Boolean(payload?.hasMore),
            },
          };
        });
      } catch {
        setCommentsByStory((prev) => {
          const existingState = prev[storyId] || createEmptyCommentState();
          const shouldShowInlineError = Boolean(existingState.loaded);

          if (!shouldShowInlineError) {
            notify?.("Unable to load comments.", "error");
          }

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...existingState,
              loading: false,
              loadingMore: false,
              error: "Unable to load comments.",
            },
          };
        });
      }
    },
    [notify],
  );

  const handleLoadMoreComments = useCallback(
    (storyId) => {
      const current = commentsByStory[storyId] || createEmptyCommentState();
      if (!current.hasMore || !current.nextCursor) {
        return;
      }

      fetchComments(storyId, current.nextCursor, true);
    },
    [commentsByStory, fetchComments],
  );

  const handleOpenComments = useCallback(
    (storyId) => {
      if (closeModalOnReopen && activeCommentStoryId === storyId) {
        setActiveCommentStoryId(null);
        return;
      }

      setActiveCommentStoryId(storyId);

      const current = commentsByStory[storyId] || createEmptyCommentState();
      if (!current.loaded && !current.loading) {
        fetchComments(storyId);
      }
    },
    [activeCommentStoryId, closeModalOnReopen, commentsByStory, fetchComments],
  );

  const handleCloseComments = useCallback(() => {
    setActiveCommentStoryId(null);
    setMenuCommentId(null);
  }, []);

  useEffect(() => {
    if (!activeCommentStoryId) {
      return undefined;
    }

    const activeCommentState =
      commentsByStory[activeCommentStoryId] || createEmptyCommentState();
    const sentinel = commentListSentinelRef.current;
    const root = commentListRef.current;

    if (
      !sentinel ||
      !root ||
      !activeCommentState.hasMore ||
      activeCommentState.loading ||
      activeCommentState.loadingMore
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMoreComments(activeCommentStoryId);
        }
      },
      {
        root,
        rootMargin: "0px 0px 120px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeCommentStoryId, commentsByStory, handleLoadMoreComments]);

  const fetchReplies = useCallback(
    async (storyId, commentId, cursor = null, append = false) => {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          repliesByComment: {
            ...(prev[storyId]?.repliesByComment || {}),
            [commentId]: {
              ...createEmptyRepliesState(),
              ...(prev[storyId]?.repliesByComment?.[commentId] || {}),
              loading: !append,
              loadingMore: append,
              error: "",
            },
          },
        },
      }));

      try {
        const payload = await getCommentReplies(commentId, {
          limit: 4,
          cursor,
        });
        const replies = Array.isArray(payload?.replies) ? payload.replies : [];

        setCommentsByStory((prev) => {
          const existingReplyState =
            prev[storyId]?.repliesByComment?.[commentId] ||
            createEmptyRepliesState();
          const mergedItems = append
            ? [...(existingReplyState.items || []), ...replies]
            : replies;

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...prev[storyId],
              repliesByComment: {
                ...(prev[storyId]?.repliesByComment || {}),
                [commentId]: {
                  ...createEmptyRepliesState(),
                  ...existingReplyState,
                  loading: false,
                  loadingMore: false,
                  loaded: true,
                  open: true,
                  error: "",
                  items: mergedItems,
                  nextCursor: payload?.nextCursor || null,
                  hasMore: Boolean(payload?.hasMore),
                },
              },
            },
          };
        });
      } catch {
        notify?.("Unable to load replies.", "error");

        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...prev[storyId],
            repliesByComment: {
              ...(prev[storyId]?.repliesByComment || {}),
              [commentId]: {
                ...createEmptyRepliesState(),
                ...(prev[storyId]?.repliesByComment?.[commentId] || {}),
                loading: false,
                error: "Unable to load replies.",
              },
            },
          },
        }));
      }
    },
    [notify],
  );

  const handleToggleReplies = useCallback(
    (storyId, commentId) => {
      const currentReplyState =
        commentsByStory[storyId]?.repliesByComment?.[commentId] ||
        createEmptyRepliesState();
      const nextOpen = !currentReplyState.open;

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          repliesByComment: {
            ...(prev[storyId]?.repliesByComment || {}),
            [commentId]: {
              ...currentReplyState,
              open: nextOpen,
            },
          },
        },
      }));

      if (nextOpen && !currentReplyState.loaded && !currentReplyState.loading) {
        fetchReplies(storyId, commentId);
      }
    },
    [commentsByStory, fetchReplies],
  );

  const handleLoadMoreReplies = useCallback(
    (storyId, commentId) => {
      const currentReplyState =
        commentsByStory[storyId]?.repliesByComment?.[commentId] ||
        createEmptyRepliesState();

      if (!currentReplyState.hasMore || !currentReplyState.nextCursor) {
        return;
      }

      fetchReplies(storyId, commentId, currentReplyState.nextCursor, true);
    },
    [commentsByStory, fetchReplies],
  );

  const handleCommentInputChange = useCallback((storyId, input) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input,
      },
    }));
  }, []);

  const showCommentActionFeedback = useCallback(
    (commentId, message) => {
      setCommentActionFeedback((prev) => ({ ...prev, [commentId]: message }));

      setTimeout(() => {
        setCommentActionFeedback((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      }, commentFeedbackDurationMs);
    },
    [commentFeedbackDurationMs],
  );

  const handleSubmitComment = useCallback(
    async (storyId) => {
      if (!requireToken("Please log in to comment.")) {
        return;
      }

      const current = commentsByStory[storyId];
      const content = current?.input?.trim();
      const editingCommentId = current?.editingCommentId || null;
      const replyingToCommentId = current?.replyingToCommentId || null;
      if (!content) return;

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...prev[storyId],
          submitting: true,
          error: "",
        },
      }));

      try {
        if (editingCommentId) {
          await updateStoryComment(editingCommentId, { content });

          setCommentsByStory((prev) => ({
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...prev[storyId],
              submitting: false,
              input: "",
              editingCommentId: null,
              replyingToCommentId: null,
              replyingToAuthor: "",
              loaded: true,
              items: (prev[storyId]?.items || []).map((item) =>
                String(item._id) === String(editingCommentId)
                  ? { ...item, content, isEdited: true }
                  : item,
              ),
              repliesByComment: Object.fromEntries(
                Object.entries(prev[storyId]?.repliesByComment || {}).map(
                  ([parentId, replyState]) => [
                    parentId,
                    {
                      ...replyState,
                      items: (replyState?.items || []).map((item) =>
                        String(item?._id || item?.id) ===
                        String(editingCommentId)
                          ? { ...item, content, isEdited: true }
                          : item,
                      ),
                    },
                  ],
                ),
              ),
            },
          }));

          showCommentActionFeedback(editingCommentId, "Comment updated");
          notify?.("Comment updated.", "success");
        } else {
          const payload = await addStoryComment(storyId, {
            content,
            parentId: replyingToCommentId,
          });
          const previousReplyState =
            current?.repliesByComment?.[replyingToCommentId] ||
            createEmptyRepliesState();
          const didLoadReplies = Boolean(previousReplyState.loaded);

          const newComment = {
            _id: payload.commentId || `${Date.now()}`,
            userId: currentUserId,
            authorDisplayName: currentUsername,
            authorProfilePicture: currentUserProfilePicture,
            content,
            createdAt: new Date().toISOString(),
            likesCount: 0,
            likedByCurrentUser: false,
            isEdited: false,
            parentId: replyingToCommentId,
            replyCount: 0,
          };

          setCommentsByStory((prev) => {
            const existingReplyState =
              prev[storyId]?.repliesByComment?.[replyingToCommentId] || {};
            const replyStateLoaded = existingReplyState.loaded === true;

            return {
              ...prev,
              [storyId]: {
                ...createEmptyCommentState(),
                ...prev[storyId],
                submitting: false,
                input: "",
                editingCommentId: null,
                replyingToCommentId: null,
                replyingToAuthor: "",
                loaded: true,
                items: replyingToCommentId
                  ? (prev[storyId]?.items || []).map((item) =>
                      String(item?._id || item?.id) ===
                      String(replyingToCommentId)
                        ? {
                            ...item,
                            replyCount: Number(item?.replyCount || 0) + 1,
                          }
                        : item,
                    )
                  : [newComment, ...(prev[storyId]?.items || [])],
                repliesByComment: replyingToCommentId
                  ? {
                      ...(prev[storyId]?.repliesByComment || {}),
                      [replyingToCommentId]: {
                        ...createEmptyRepliesState(),
                        ...existingReplyState,
                        open: true,
                        loaded: replyStateLoaded,
                        loading: false,
                        error: "",
                        items: [
                          ...(existingReplyState?.items || []),
                          newComment,
                        ],
                      },
                    }
                  : prev[storyId]?.repliesByComment || {},
              },
            };
          });

          if (replyingToCommentId && !didLoadReplies) {
            fetchReplies(storyId, replyingToCommentId);
          }

          onCommentCountChange?.(storyId, 1);

          notify?.("Comment posted.", "success");
        }
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...prev[storyId],
            submitting: false,
            error: editingCommentId
              ? "Failed to update comment."
              : replyingToCommentId
                ? "Failed to post reply."
                : "Failed to post comment.",
          },
        }));
      }
    },
    [
      commentsByStory,
      currentUserId,
      currentUsername,
      currentUserProfilePicture,
      requireToken,
      showCommentActionFeedback,
      notify,
      fetchReplies,
      onCommentCountChange,
    ],
  );

  const handleToggleCommentMenu = useCallback((commentId) => {
    setMenuCommentId((currentId) =>
      currentId === commentId ? null : commentId,
    );
  }, []);

  const handleToggleCommentLike = useCallback(
    async (storyId, commentId) => {
      if (!storyId || !commentId || pendingCommentLikeIds[commentId]) {
        return;
      }

      if (!requireToken("Please log in to react to comments.")) {
        return;
      }

      setCommentLikePulseIds((prev) => ({ ...prev, [commentId]: true }));
      setPendingCommentLikeIds((prev) => ({ ...prev, [commentId]: true }));

      try {
        const payload = await toggleCommentLike(commentId);

        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...(prev[storyId] || {}),
            items: (prev[storyId]?.items || []).map((item) =>
              String(item?._id || item?.id) === String(commentId)
                ? {
                    ...item,
                    likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                    likesCount: Number(payload?.likesCount || 0),
                  }
                : item,
            ),
            repliesByComment: Object.fromEntries(
              Object.entries(prev[storyId]?.repliesByComment || {}).map(
                ([parentId, replyState]) => [
                  parentId,
                  {
                    ...replyState,
                    items: (replyState?.items || []).map((item) =>
                      String(item?._id || item?.id) === String(commentId)
                        ? {
                            ...item,
                            likedByCurrentUser: Boolean(
                              payload?.likedByCurrentUser,
                            ),
                            likesCount: Number(payload?.likesCount || 0),
                          }
                        : item,
                    ),
                  },
                ],
              ),
            ),
          },
        }));
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
    [pendingCommentLikeIds, requireToken, showCommentActionFeedback],
  );

  const handleStartReply = useCallback((storyId, comment) => {
    setMenuCommentId(null);

    const replyCommentId = String(comment?._id || comment?.id || "");
    const replyAuthor = comment?.authorDisplayName || "Anonymous";

    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: "",
        editingCommentId: null,
        replyingToCommentId: replyCommentId,
        replyingToAuthor: replyAuthor,
      },
    }));

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  }, []);

  const handleEditComment = useCallback((storyId, comment) => {
    setMenuCommentId(null);

    const commentId = String(comment._id || comment.id);

    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: comment.content || "",
        originalInput: comment.content || "",
        editingCommentId: commentId,
        replyingToCommentId: null,
        replyingToAuthor: "",
      },
    }));

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(
          (comment.content || "").length,
          (comment.content || "").length,
        );
      }
    }, 0);
  }, []);

  const handleDeleteComment = useCallback(
    (storyId, commentId) => {
      setMenuCommentId(null);
      const storyState = commentsByStory[storyId] || createEmptyCommentState();
      const topLevelComment = (storyState.items || []).find(
        (item) => String(item?._id || item?.id) === String(commentId),
      );
      const replyParentEntry = Object.entries(
        storyState.repliesByComment || {},
      ).find(([, replyState]) =>
        (replyState?.items || []).some(
          (item) => String(item?._id || item?.id) === String(commentId),
        ),
      );

      setDeleteTargetComment({
        storyId,
        commentId,
        replyCount: Number(topLevelComment?.replyCount || 0),
        parentId:
          normalizeId(topLevelComment?.parentId) ||
          String(replyParentEntry?.[0] || ""),
      });
    },
    [commentsByStory],
  );

  const handleCancelCommentComposer = useCallback((storyId) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: "",
        originalInput: "",
        editingCommentId: null,
        replyingToCommentId: null,
        replyingToAuthor: "",
      },
    }));
  }, []);

  const handleConfirmDeleteComment = useCallback(async () => {
    if (!deleteTargetComment) {
      return;
    }

    const { storyId, commentId, parentId, replyCount = 0 } =
      deleteTargetComment;
    setDeleteTargetComment(null);

    if (!requireToken("Please log in to delete comments.")) {
      return;
    }

    try {
      await deleteStoryComment(commentId);

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          editingCommentId:
            String(prev[storyId]?.editingCommentId || "") === String(commentId)
              ? null
              : prev[storyId]?.editingCommentId || null,
          input:
            String(prev[storyId]?.editingCommentId || "") ===
              String(commentId) ||
            String(prev[storyId]?.replyingToCommentId || "") ===
              String(commentId)
              ? ""
              : prev[storyId]?.input || "",
          replyingToCommentId:
            String(prev[storyId]?.replyingToCommentId || "") ===
            String(commentId)
              ? null
              : prev[storyId]?.replyingToCommentId || null,
          replyingToAuthor:
            String(prev[storyId]?.replyingToCommentId || "") ===
            String(commentId)
              ? ""
              : prev[storyId]?.replyingToAuthor || "",
          items: (prev[storyId]?.items || []).filter(
            (item) => String(item?._id || item?.id) !== String(commentId),
          ),
          repliesByComment: Object.fromEntries(
            Object.entries(prev[storyId]?.repliesByComment || {})
              .map(([replyParentId, replyState]) => [
                replyParentId,
                {
                  ...replyState,
                  items: (replyState?.items || []).filter(
                    (item) =>
                      String(item?._id || item?.id) !== String(commentId),
                  ),
                },
              ])
              .filter(
                ([replyParentId]) =>
                  String(replyParentId) !== String(commentId),
              ),
          ),
        },
      }));

      if (parentId) {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...(prev[storyId] || {}),
            items: (prev[storyId]?.items || []).map((item) =>
              String(item?._id || item?.id) === String(parentId)
                ? {
                    ...item,
                    replyCount: Math.max(0, Number(item?.replyCount || 0) - 1),
                  }
                : item,
            ),
          },
        }));
      }

      onCommentCountChange?.(
        storyId,
        -(parentId ? 1 : 1 + Number(replyCount || 0)),
      );

      notify?.("Comment deleted.", "success");
    } catch (error) {
      showCommentActionFeedback(
        commentId,
        error.message || "Failed to delete comment.",
      );
    }
  }, [
    deleteTargetComment,
    requireToken,
    showCommentActionFeedback,
    notify,
    onCommentCountChange,
  ]);

  const removeStoryComments = useCallback((storyId) => {
    setCommentsByStory((prev) => {
      const next = { ...prev };
      delete next[storyId];
      return next;
    });

    setActiveCommentStoryId((currentId) =>
      currentId === storyId ? null : currentId,
    );
  }, []);

  const activeCommentState = useMemo(
    () =>
      activeCommentStoryId
        ? commentsByStory[activeCommentStoryId] || {
            ...createEmptyCommentState(),
            open: true,
          }
        : null,
    [activeCommentStoryId, commentsByStory],
  );

  return {
    commentsByStory,
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
    fetchComments,
    handleLoadMoreComments,
    handleOpenComments,
    handleCloseComments,
    fetchReplies,
    handleToggleReplies,
    handleLoadMoreReplies,
    handleCommentInputChange,
    handleSubmitComment,
    handleToggleCommentMenu,
    handleToggleCommentLike,
    handleStartReply,
    handleEditComment,
    handleDeleteComment,
    removeStoryComments,
    handleCancelCommentComposer,
    handleConfirmDeleteComment,
  };
}
