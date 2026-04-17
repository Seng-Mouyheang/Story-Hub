import React from "react";

import { parseResponse } from "./confessionUtils";
import { useOutsideClickCloser } from "./useOutsideClickCloser";

export const useConfessionComments = ({ setConfessionFeed }) => {
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
          throw new Error(payload?.message || "Failed to load comments.");
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

        if (!preservePagination) {
          setModalCommentsNextCursor(nextCursor);
          setModalCommentsHasMore(hasMore);
        }
      } catch (error) {
        setModalCommentsError(error.message || "Failed to load comments.");
      } finally {
        setIsLoadingModalComments(false);
      }
    },
    [mergeCommentsById],
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
    setDeleteTargetCommentId("");
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
    setDeleteTargetCommentId("");
    await loadModalComments(confessionId);
  };

  const handleAddComment = async () => {
    if (!activeCommentConfessionId) {
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
          body: JSON.stringify({ content: cleanedContent }),
        },
      );
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to add comment.");
      }

      setNewCommentContent("");
      await loadModalComments(activeCommentConfessionId, "", {
        preservePagination: true,
      });
      updateConfessionCommentCount(activeCommentConfessionId, 1);
    } catch (error) {
      setModalCommentsError(error.message || "Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleCommentMenu = (commentId) => {
    setActiveCommentMenuId((currentId) =>
      currentId === commentId ? "" : commentId,
    );
  };

  const handleStartEditComment = (comment) => {
    const commentId = String(comment?._id || comment?.id || "");
    setActiveCommentMenuId("");
    setDeleteTargetCommentId("");
    setEditingCommentId(commentId);
    setEditCommentContent(comment?.content || "");
  };

  const handleCancelEditComment = () => {
    setEditingCommentId("");
    setEditCommentContent("");
  };

  const handleSaveEditedComment = async () => {
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

      setEditingCommentId("");
      setEditCommentContent("");
    } catch (error) {
      setModalCommentsError(error.message || "Failed to edit comment.");
    } finally {
      setIsSavingEditedComment(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setActiveCommentMenuId("");
    setEditingCommentId("");
    setEditCommentContent("");
    setDeleteTargetCommentId(commentId);
  };

  const handleConfirmDeleteComment = async () => {
    if (!deleteTargetCommentId || !activeCommentConfessionId) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setModalCommentsError("Please log in to delete your comment.");
      return;
    }

    setIsDeletingComment(true);
    setModalCommentsError("");

    try {
      const response = await fetch(
        `/api/confessions/comments/${deleteTargetCommentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete comment.");
      }

      const deletedId = deleteTargetCommentId;
      const removedCount = Number(payload?.removedCount);
      const commentCountDelta =
        Number.isFinite(removedCount) && removedCount > 0 ? -removedCount : -1;
      setDeleteTargetCommentId("");
      setModalComments((prev) =>
        prev.filter(
          (comment) => String(comment?._id || comment?.id || "") !== deletedId,
        ),
      );
      updateConfessionCommentCount(
        activeCommentConfessionId,
        commentCountDelta,
      );
    } catch (error) {
      setModalCommentsError(error.message || "Failed to delete comment.");
    } finally {
      setIsDeletingComment(false);
    }
  };

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
    deleteTargetCommentId,
    setDeleteTargetCommentId,
    isDeletingComment,
    isLoadingModalComments,
    modalCommentsError,
    modalCommentsHasMore,
    closeCommentModal,
    openCommentModal,
    loadMoreModalComments,
    handleAddComment,
    handleToggleCommentMenu,
    handleStartEditComment,
    handleCancelEditComment,
    handleSaveEditedComment,
    handleDeleteComment,
    handleConfirmDeleteComment,
  };
};
