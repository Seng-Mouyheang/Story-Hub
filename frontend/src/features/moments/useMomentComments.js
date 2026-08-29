import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMomentComment,
  deleteMomentComment,
  getMomentCommentReplies,
  getMomentComments,
  updateMomentComment,
} from "../../api/moment/momentCommentsApi";
import { toggleMomentCommentLike } from "../../api/moment/momentInteractionsApi";
import {
  createEmptyCommentState,
  createEmptyRepliesState,
} from "../../lib/format";

/**
 * Comment/reply CRUD state machine for the moment (24h story) viewer.
 *
 * Unlike `useStoryComments` (which keys state by story id because a feed
 * page can have many open comment sections), the moment viewer only ever
 * shows one moment's comments at a time, so state is scoped to a single
 * `activeMomentId` instead of a map.
 */
export function useMomentComments({
  currentUserId,
  currentUsername,
  currentUserProfilePicture,
  notify,
  onUnauthenticated,
  onCommentCountChange,
  commentFeedbackDurationMs = 1800,
}) {
  const [activeMomentId, setActiveMomentId] = useState(null);
  const [commentState, setCommentState] = useState(createEmptyCommentState());
  const [menuCommentId, setMenuCommentId] = useState(null);
  const [commentActionFeedback, setCommentActionFeedback] = useState({});
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState({});
  const [commentLikePulseIds, setCommentLikePulseIds] = useState({});

  const commentInputRef = useRef(null);
  const commentListRef = useRef(null);
  const commentListSentinelRef = useRef(null);
  // Mirrors activeMomentId synchronously (state updates are async), so an
  // in-flight fetch can tell — once it resolves — whether the panel has
  // since switched to a different moment and its result should be dropped.
  const activeMomentIdRef = useRef(null);

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
    async (momentId, cursor = null, append = false) => {
      setCommentState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: "",
      }));

      try {
        const payload = await getMomentComments(momentId, {
          limit: 10,
          cursor,
        });

        if (activeMomentIdRef.current !== momentId) {
          return;
        }

        const comments = Array.isArray(payload?.comments)
          ? payload.comments
          : [];

        setCommentState((prev) => {
          const mergedItems = append
            ? [...(prev.items || []), ...comments]
            : comments;

          return {
            ...prev,
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
          };
        });
      } catch {
        if (activeMomentIdRef.current !== momentId) {
          return;
        }

        setCommentState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: "Unable to load comments.",
        }));
      }
    },
    [],
  );

  const handleLoadMoreComments = useCallback(
    (momentId) => {
      if (!commentState.hasMore || !commentState.nextCursor) {
        return;
      }

      fetchComments(momentId, commentState.nextCursor, true);
    },
    [commentState.hasMore, commentState.nextCursor, fetchComments],
  );

  const handleOpenComments = useCallback(
    (momentId) => {
      const isSwitchingMoment = activeMomentId !== momentId;
      activeMomentIdRef.current = momentId;
      setActiveMomentId(momentId);

      if (isSwitchingMoment) {
        setCommentState(createEmptyCommentState());
        setMenuCommentId(null);
        fetchComments(momentId);
        return;
      }

      if (!commentState.loaded && !commentState.loading) {
        fetchComments(momentId);
      }
    },
    [activeMomentId, commentState.loaded, commentState.loading, fetchComments],
  );

  const handleCloseComments = useCallback(() => {
    activeMomentIdRef.current = null;
    setActiveMomentId(null);
    setMenuCommentId(null);
  }, []);

  useEffect(() => {
    if (!activeMomentId) {
      return undefined;
    }

    const sentinel = commentListSentinelRef.current;
    const root = commentListRef.current;

    if (
      !sentinel ||
      !root ||
      !commentState.hasMore ||
      commentState.loading ||
      commentState.loadingMore
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMoreComments(activeMomentId);
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
  }, [
    activeMomentId,
    commentState.hasMore,
    commentState.loading,
    commentState.loadingMore,
    handleLoadMoreComments,
  ]);

  const fetchReplies = useCallback(
    async (commentId, cursor = null, append = false) => {
      const requestMomentId = activeMomentIdRef.current;

      setCommentState((prev) => ({
        ...prev,
        repliesByComment: {
          ...(prev.repliesByComment || {}),
          [commentId]: {
            ...createEmptyRepliesState(),
            ...(prev.repliesByComment?.[commentId] || {}),
            loading: !append,
            loadingMore: append,
            error: "",
          },
        },
      }));

      try {
        const payload = await getMomentCommentReplies(commentId, {
          limit: 4,
          cursor,
        });

        if (activeMomentIdRef.current !== requestMomentId) {
          return;
        }

        const replies = Array.isArray(payload?.replies) ? payload.replies : [];

        setCommentState((prev) => {
          const existingReplyState =
            prev.repliesByComment?.[commentId] || createEmptyRepliesState();
          const mergedItems = append
            ? [...(existingReplyState.items || []), ...replies]
            : replies;

          return {
            ...prev,
            repliesByComment: {
              ...(prev.repliesByComment || {}),
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
          };
        });
      } catch {
        if (activeMomentIdRef.current !== requestMomentId) {
          return;
        }

        notify?.("Unable to load replies.", "error");

        setCommentState((prev) => ({
          ...prev,
          repliesByComment: {
            ...(prev.repliesByComment || {}),
            [commentId]: {
              ...createEmptyRepliesState(),
              ...(prev.repliesByComment?.[commentId] || {}),
              loading: false,
              error: "Unable to load replies.",
            },
          },
        }));
      }
    },
    [notify],
  );

  const handleToggleReplies = useCallback(
    (commentId) => {
      const currentReplyState =
        commentState.repliesByComment?.[commentId] || createEmptyRepliesState();
      const nextOpen = !currentReplyState.open;

      setCommentState((prev) => ({
        ...prev,
        repliesByComment: {
          ...(prev.repliesByComment || {}),
          [commentId]: {
            ...currentReplyState,
            open: nextOpen,
          },
        },
      }));

      if (nextOpen && !currentReplyState.loaded && !currentReplyState.loading) {
        fetchReplies(commentId);
      }
    },
    [commentState.repliesByComment, fetchReplies],
  );

  const handleLoadMoreReplies = useCallback(
    (commentId) => {
      const currentReplyState =
        commentState.repliesByComment?.[commentId] || createEmptyRepliesState();

      if (!currentReplyState.hasMore || !currentReplyState.nextCursor) {
        return;
      }

      fetchReplies(commentId, currentReplyState.nextCursor, true);
    },
    [commentState.repliesByComment, fetchReplies],
  );

  const handleCommentInputChange = useCallback((input) => {
    setCommentState((prev) => ({ ...prev, input }));
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
    async (momentId) => {
      if (!requireToken("Please log in to comment.")) {
        return;
      }

      const content = commentState.input?.trim();
      const editingCommentId = commentState.editingCommentId || null;
      const replyingToCommentId = commentState.replyingToCommentId || null;
      if (!content) return;

      setCommentState((prev) => ({ ...prev, submitting: true, error: "" }));

      try {
        if (editingCommentId) {
          await updateMomentComment(editingCommentId, { content });

          setCommentState((prev) => ({
            ...prev,
            submitting: false,
            input: "",
            editingCommentId: null,
            replyingToCommentId: null,
            replyingToAuthor: "",
            items: (prev.items || []).map((item) =>
              String(item._id) === String(editingCommentId)
                ? { ...item, content, isEdited: true }
                : item,
            ),
            repliesByComment: Object.fromEntries(
              Object.entries(prev.repliesByComment || {}).map(
                ([parentId, replyState]) => [
                  parentId,
                  {
                    ...replyState,
                    items: (replyState?.items || []).map((item) =>
                      String(item?._id || item?.id) === String(editingCommentId)
                        ? { ...item, content, isEdited: true }
                        : item,
                    ),
                  },
                ],
              ),
            ),
          }));

          showCommentActionFeedback(editingCommentId, "Comment updated");
          notify?.("Comment updated.", "success");
        } else {
          const payload = await addMomentComment(momentId, {
            content,
            parentId: replyingToCommentId,
          });
          const previousReplyState =
            commentState.repliesByComment?.[replyingToCommentId] ||
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

          setCommentState((prev) => {
            const existingReplyState =
              prev.repliesByComment?.[replyingToCommentId] || {};
            const replyStateLoaded = existingReplyState.loaded === true;

            return {
              ...prev,
              submitting: false,
              input: "",
              editingCommentId: null,
              replyingToCommentId: null,
              replyingToAuthor: "",
              loaded: true,
              items: replyingToCommentId
                ? (prev.items || []).map((item) =>
                    String(item?._id || item?.id) ===
                    String(replyingToCommentId)
                      ? {
                          ...item,
                          replyCount: Number(item?.replyCount || 0) + 1,
                        }
                      : item,
                  )
                : [newComment, ...(prev.items || [])],
              repliesByComment: replyingToCommentId
                ? {
                    ...(prev.repliesByComment || {}),
                    [replyingToCommentId]: {
                      ...createEmptyRepliesState(),
                      ...existingReplyState,
                      open: true,
                      loaded: replyStateLoaded,
                      loading: false,
                      error: "",
                      items: [...(existingReplyState?.items || []), newComment],
                    },
                  }
                : prev.repliesByComment || {},
            };
          });

          if (replyingToCommentId && !didLoadReplies) {
            fetchReplies(replyingToCommentId);
          }

          onCommentCountChange?.(momentId, 1);
          notify?.("Comment posted.", "success");
        }
      } catch {
        setCommentState((prev) => ({
          ...prev,
          submitting: false,
          error: editingCommentId
            ? "Failed to update comment."
            : replyingToCommentId
              ? "Failed to post reply."
              : "Failed to post comment.",
        }));
      }
    },
    [
      commentState.input,
      commentState.editingCommentId,
      commentState.replyingToCommentId,
      commentState.repliesByComment,
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

  useEffect(() => {
    if (!menuCommentId) return undefined;

    const handlePointerDown = (event) => {
      if (!event.target.closest("[data-comment-menu]")) {
        setMenuCommentId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuCommentId]);

  const handleToggleCommentLike = useCallback(
    async (momentId, commentId) => {
      if (!commentId || pendingCommentLikeIds[commentId]) {
        return;
      }

      if (!requireToken("Please log in to react to comments.")) {
        return;
      }

      setCommentLikePulseIds((prev) => ({ ...prev, [commentId]: true }));
      setPendingCommentLikeIds((prev) => ({ ...prev, [commentId]: true }));

      try {
        const payload = await toggleMomentCommentLike(commentId);

        setCommentState((prev) => ({
          ...prev,
          items: (prev.items || []).map((item) =>
            String(item?._id || item?.id) === String(commentId)
              ? {
                  ...item,
                  likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                  likesCount: Number(payload?.likesCount || 0),
                }
              : item,
          ),
          repliesByComment: Object.fromEntries(
            Object.entries(prev.repliesByComment || {}).map(
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

  const handleStartReply = useCallback((momentId, comment) => {
    setMenuCommentId(null);

    const replyCommentId = String(comment?._id || comment?.id || "");
    const replyAuthor = comment?.authorDisplayName || "Anonymous";

    setCommentState((prev) => ({
      ...prev,
      input: "",
      editingCommentId: null,
      replyingToCommentId: replyCommentId,
      replyingToAuthor: replyAuthor,
    }));

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  }, []);

  const handleEditComment = useCallback((momentId, comment) => {
    setMenuCommentId(null);

    const commentId = String(comment._id || comment.id);

    setCommentState((prev) => ({
      ...prev,
      input: comment.content || "",
      originalInput: comment.content || "",
      editingCommentId: commentId,
      replyingToCommentId: null,
      replyingToAuthor: "",
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

  const handleCancelCommentComposer = useCallback(() => {
    setCommentState((prev) => ({
      ...prev,
      input: "",
      originalInput: "",
      editingCommentId: null,
      replyingToCommentId: null,
      replyingToAuthor: "",
    }));
  }, []);

  const handleDeleteComment = useCallback(
    async (momentId, commentId) => {
      setMenuCommentId(null);

      if (!requireToken("Please log in to delete comments.")) {
        return;
      }

      const topLevelComment = (commentState.items || []).find(
        (item) => String(item?._id || item?.id) === String(commentId),
      );
      const replyParentEntry = Object.entries(
        commentState.repliesByComment || {},
      ).find(([, replyState]) =>
        (replyState?.items || []).some(
          (item) => String(item?._id || item?.id) === String(commentId),
        ),
      );
      const parentId = replyParentEntry?.[0] || null;
      const replyCount = Number(topLevelComment?.replyCount || 0);

      try {
        await deleteMomentComment(commentId);

        setCommentState((prev) => ({
          ...prev,
          editingCommentId:
            String(prev.editingCommentId || "") === String(commentId)
              ? null
              : prev.editingCommentId || null,
          input:
            String(prev.editingCommentId || "") === String(commentId) ||
            String(prev.replyingToCommentId || "") === String(commentId)
              ? ""
              : prev.input || "",
          replyingToCommentId:
            String(prev.replyingToCommentId || "") === String(commentId)
              ? null
              : prev.replyingToCommentId || null,
          replyingToAuthor:
            String(prev.replyingToCommentId || "") === String(commentId)
              ? ""
              : prev.replyingToAuthor || "",
          items: (prev.items || []).filter(
            (item) => String(item?._id || item?.id) !== String(commentId),
          ),
          repliesByComment: Object.fromEntries(
            Object.entries(prev.repliesByComment || {})
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
        }));

        if (parentId) {
          setCommentState((prev) => ({
            ...prev,
            items: (prev.items || []).map((item) =>
              String(item?._id || item?.id) === String(parentId)
                ? {
                    ...item,
                    replyCount: Math.max(0, Number(item?.replyCount || 0) - 1),
                  }
                : item,
            ),
          }));
        }

        onCommentCountChange?.(
          momentId,
          -(parentId ? 1 : 1 + Number(replyCount || 0)),
        );

        notify?.("Comment deleted.", "success");
      } catch (error) {
        showCommentActionFeedback(
          commentId,
          error.message || "Failed to delete comment.",
        );
      }
    },
    [
      commentState.items,
      commentState.repliesByComment,
      requireToken,
      showCommentActionFeedback,
      notify,
      onCommentCountChange,
    ],
  );

  return {
    activeMomentId,
    commentState,
    menuCommentId,
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
  };
}
