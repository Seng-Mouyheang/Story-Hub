import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import { useToast } from "../lib/useToast";
import {
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Loader2,
  SendHorizontal,
  RefreshCcw,
  X,
} from "lucide-react";
import {
  normalizeId,
  parseResponse,
  CONFESSION_FEED_LIMIT,
  extractTagsFromContent,
  stripTagsFromContent,
} from "./confession/confessionUtils";
import { useOutsideClickCloser } from "./confession/useOutsideClickCloser";
import { useConfessionComments } from "./confession/useConfessionComments";
import { followUser, getFollowStatus, unfollowUser } from "../api/profile";
import { getProfileByUserId } from "../api/profile/profileApi";
import ConfessionFeedCard from "./confession/ConfessionFeedCard";
import CommentSection from "../components/CommentSection";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const PREFERRED_FOCUS_SELECTOR = [
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const getFocusableElements = (container) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element instanceof HTMLElement &&
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
};

const moveFocusIntoDialog = (container) => {
  const preferredFocusableElement =
    container instanceof HTMLElement
      ? container.querySelector(PREFERRED_FOCUS_SELECTOR)
      : null;

  if (preferredFocusableElement instanceof HTMLElement) {
    preferredFocusableElement.focus();
    return;
  }

  if (container instanceof HTMLElement) {
    container.focus();
  }
};

function ModalDialog({
  isOpen,
  onClose,
  title,
  titleId,
  closeLabel,
  widthClassName = "max-w-xl",
  children,
}) {
  const dialogRef = React.useRef(null);
  const previousFocusRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    requestAnimationFrame(() => {
      moveFocusIntoDialog(dialogRef.current);
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 w-full ${widthClassName} rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h4
            id={titleId}
            className="text-sm sm:text-base font-semibold text-slate-900 truncate pr-4"
          >
            {title}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label={closeLabel}
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default function Confession() {
  // NOSONAR
  const [confession, setConfession] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [visibility, setVisibility] = useState("public");
  const [confessionFeed, setConfessionFeed] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [busyFollowIds, setBusyFollowIds] = useState({});
  const [pressedLikeId, setPressedLikeId] = useState(null);
  const [pressedBookmarkId, setPressedBookmarkId] = useState(null);
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState(() => new Set());
  const [gestureLikeBurstId, setGestureLikeBurstId] = useState(null);
  const [editingConfessionId, setEditingConfessionId] = useState("");
  const [editConfessionContent, setEditConfessionContent] = useState("");
  const [editConfessionIsAnonymous, setEditConfessionIsAnonymous] =
    useState(true);
  const [editConfessionVisibility, setEditConfessionVisibility] =
    useState("public");
  const [menuConfessionId, setMenuConfessionId] = useState("");
  const [expandedConfessionIds, setExpandedConfessionIds] = useState({});
  const [deleteTargetConfessionId, setDeleteTargetConfessionId] = useState("");
  const [isDeletingConfession, setIsDeletingConfession] = useState(false);
  const sentinelRef = useRef(null);
  const feedScrollRef = useRef(null);
  const hasShownEndToastRef = useRef(false);
  const lastTapRef = useRef({ confessionId: "", time: 0 });
  const pendingLikeIdsRef = useRef(new Set());
  const pendingBookmarkIdsRef = useRef(new Set());
  const pressedLikeTimerRef = useRef(null);
  const pressedBookmarkTimerRef = useRef(null);
  const gestureLikeBurstTimerRef = useRef(null);
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
  const editDialogTitleId = "confession-edit-dialog-title";
  const deleteDialogTitleId = "confession-delete-dialog-title";

  const dismissToast = React.useCallback(() => {
    hideToast();
  }, [hideToast]);

  const showError = React.useCallback(
    (message) => {
      showToast(message, "error");
    },
    [showToast],
  );

  const showSuccess = React.useCallback(
    (message) => {
      showToast(message, "success");
    },
    [showToast],
  );

  const [currentUserId, setCurrentUserId] = React.useState("");

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

  const commentListRef = useRef(null);
  const commentListSentinelRef = useRef(null);
  const commentInputRef = useRef(null);
  const [commentOriginalInput, setCommentOriginalInput] = React.useState("");

  const location = useLocation();
  const navigate = useNavigate();

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

  React.useEffect(() => {
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
  }, [followStateByUserId, followableAuthorIds]);

  const handleToggleFollowAuthor = React.useCallback(
    async (authorId) => {
      const normalizedTargetAuthorId = normalizeId(authorId);

      if (
        !normalizedTargetAuthorId ||
        normalizedTargetAuthorId === currentUserId ||
        busyFollowIds[normalizedTargetAuthorId]
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to follow authors.");
        return;
      }

      const currentlyFollowing = Boolean(
        followStateByUserId[normalizedTargetAuthorId],
      );

      setBusyFollowIds((previous) => ({
        ...previous,
        [normalizedTargetAuthorId]: true,
      }));
      setFollowStateByUserId((previous) => ({
        ...previous,
        [normalizedTargetAuthorId]: !currentlyFollowing,
      }));

      try {
        const payload = currentlyFollowing
          ? await unfollowUser(normalizedTargetAuthorId)
          : await followUser(normalizedTargetAuthorId);

        const nextFollowState =
          typeof payload?.following === "boolean"
            ? payload.following
            : !currentlyFollowing;

        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetAuthorId]: nextFollowState,
        }));

        showSuccess(
          nextFollowState
            ? "You are now following this author."
            : "You have unfollowed this author.",
        );
      } catch (error) {
        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetAuthorId]: currentlyFollowing,
        }));
        showError(
          error.message || "Unable to update follow status. Please try again.",
        );
      } finally {
        setBusyFollowIds((previous) => {
          const next = { ...previous };
          delete next[normalizedTargetAuthorId];
          return next;
        });
      }
    },
    [busyFollowIds, currentUserId, followStateByUserId, showError, showSuccess],
  );

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

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const editId =
        params.get("editId") || location.state?.editingConfessionId;
      if (editId) {
        setEditingConfessionId(editId);
        const existing = confessionFeed.find(
          (c) => String(c._id || c.id) === String(editId),
        );
        if (existing) {
          setEditConfessionContent(existing.content || "");
          setEditConfessionIsAnonymous(existing.isAnonymous ?? true);
          setEditConfessionVisibility(existing.visibility || "public");
        } else {
          // if not found in current feed, fetch single confession from API
          (async () => {
            try {
              const res = await fetch(`/api/confessions/${editId}`);
              const data = await parseResponse(res);
              if (res.ok && data) {
                const item = data;
                setEditConfessionContent(item.content || "");
                setEditConfessionIsAnonymous(item.isAnonymous ?? true);
                setEditConfessionVisibility(item.visibility || "public");
              }
            } catch (err) {
              // ignore fetch errors here; user can still edit after loading feed
              console.error("Failed to load confession for editing", err);
            }
          })();
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

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

  const handleStartEditCommentWithOriginal = React.useCallback(
    (comment) => {
      setCommentOriginalInput(comment?.content || "");
      handleStartEditComment(comment);
    },
    [handleStartEditComment],
  );

  const handleCommentInputChange = React.useCallback(
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

  const handleSubmitComment = React.useCallback(() => {
    if (editingCommentId) {
      handleSaveEditedComment();
    } else {
      handleAddComment();
    }
  }, [editingCommentId, handleAddComment, handleSaveEditedComment]);

  const handleDeleteComment = React.useCallback(
    (_storyId, commentId) => {
      handleDeleteCommentHook(commentId);
    },
    [handleDeleteCommentHook],
  );

  const handleToggleCommentLikeWrapper = React.useCallback(
    (_storyId, commentId) => {
      handleToggleCommentLike(commentId);
    },
    [handleToggleCommentLike],
  );

  const handleStartReplyWrapper = React.useCallback(
    (_storyId, comment) => {
      handleStartReply(comment);
    },
    [handleStartReply],
  );

  const handleToggleRepliesWrapper = React.useCallback(
    (_storyId, commentId) => {
      handleToggleReplies(commentId);
    },
    [handleToggleReplies],
  );

  const handleLoadMoreRepliesWrapper = React.useCallback(
    (_storyId, commentId) => {
      handleLoadMoreReplies(commentId);
    },
    [handleLoadMoreReplies],
  );

  const closeDeleteCommentDialog = React.useCallback(() => {
    setDeleteTargetCommentId("");
  }, [setDeleteTargetCommentId]);

  React.useEffect(() => {
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

  const closeCommentModal = React.useCallback(() => {
    closeCommentModalState();
    setCommentOriginalInput("");
  }, [closeCommentModalState]);

  const openCommentModal = React.useCallback(
    async (...args) => {
      await openCommentModalState(...args);
    },
    [openCommentModalState],
  );

  const loadConfessions = React.useCallback(
    async ({ cursor = "", append = false } = {}) => {
      if (!append) {
        hasShownEndToastRef.current = false;
      }

      if (append) {
        setIsLoadingMoreFeed(true);
      } else {
        setIsLoadingFeed(true);
      }

      try {
        const params = new URLSearchParams({
          limit: String(CONFESSION_FEED_LIMIT),
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`/api/confessions?${params.toString()}`, {
          headers,
        });
        const payload = await parseResponse(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load confessions.");
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setFeedError("");
        setConfessionFeed((prev) => (append ? [...prev, ...data] : data));
        setNextCursor(payload?.nextCursor || "");
        setHasMoreFeed(Boolean(payload?.hasMore));
      } catch (error) {
        setFeedError(error.message || "Failed to load confessions.");
        showError(error.message || "Failed to load confessions.");
      } finally {
        setIsLoadingFeed(false);
        setIsLoadingMoreFeed(false);
      }
    },
    [showError],
  );

  const handleRefreshConfessions = React.useCallback(() => {
    hasShownEndToastRef.current = false;
    hideToast();
    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    loadConfessions().catch(() => {});
  }, [hideToast, loadConfessions]);

  const handleSubmit = async () => {
    dismissToast();

    const cleanedContent = stripTagsFromContent(confession);

    if (cleanedContent.length < 5) {
      showError("Write at least 5 characters before posting.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to post a confession.");
      return;
    }

    setIsSubmitting(true);

    try {
      const extractedTags = extractTagsFromContent(confession);

      const response = await fetch("/api/confessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: cleanedContent,
          isAnonymous,
          visibility,
          tags: extractedTags,
        }),
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to post confession.");
      }

      setConfession("");
      showSuccess("Confession posted successfully.");
      await loadConfessions();
    } catch (error) {
      showError(error.message || "Failed to post confession.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditedConfession = async () => {
    if (!editingConfessionId) {
      return;
    }

    dismissToast();

    const cleanedContent = stripTagsFromContent(editConfessionContent);

    if (cleanedContent.length < 5) {
      showError("Write at least 5 characters before updating.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to update a confession.");
      return;
    }

    setIsSubmitting(true);

    try {
      const extractedTags = extractTagsFromContent(editConfessionContent);

      const response = await fetch(`/api/confessions/${editingConfessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: cleanedContent,
          isAnonymous: editConfessionIsAnonymous,
          visibility: editConfessionVisibility,
          tags: extractedTags,
        }),
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to update confession.");
      }

      setEditingConfessionId("");
      setEditConfessionContent("");
      setEditConfessionIsAnonymous(true);
      setEditConfessionVisibility("public");
      setMenuConfessionId("");
      showSuccess("Confession updated successfully.");
      await loadConfessions();
    } catch (error) {
      showError(error.message || "Failed to update confession.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = React.useCallback(
    async (confessionId) => {
      if (
        pendingLikeIdsRef.current.has(confessionId) ||
        pendingLikeIds.has(confessionId)
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to like confessions.");
        return;
      }

      pendingLikeIdsRef.current.add(confessionId);
      setPendingLikeIds((prev) => {
        const next = new Set(prev);
        next.add(confessionId);
        return next;
      });

      setPressedLikeId(confessionId);
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      pressedLikeTimerRef.current = setTimeout(() => {
        setPressedLikeId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        pressedLikeTimerRef.current = null;
      }, 150);

      try {
        const response = await fetch(
          `/api/confessions/${confessionId}/toggle-like`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to toggle like.");
        }

        const payload = await parseResponse(response);

        setConfessionFeed((prev) =>
          prev.map((item) =>
            item._id === confessionId || item.id === confessionId
              ? {
                  ...item,
                  likedByCurrentUser: Boolean(payload.likedByCurrentUser),
                  likesCount: Number(payload.likesCount || 0),
                }
              : item,
          ),
        );
      } catch (error) {
        showError(error.message || "Failed to toggle like.");
      } finally {
        pendingLikeIdsRef.current.delete(confessionId);
        setPendingLikeIds((prev) => {
          const next = new Set(prev);
          next.delete(confessionId);
          return next;
        });
      }
    },
    [pendingLikeIds, showError],
  );

  const handleToggleBookmark = async (confessionId) => {
    if (
      pendingBookmarkIdsRef.current.has(confessionId) ||
      pendingBookmarkIds.has(confessionId)
    ) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in to bookmark confessions.");
      return;
    }

    pendingBookmarkIdsRef.current.add(confessionId);
    setPendingBookmarkIds((prev) => {
      const next = new Set(prev);
      next.add(confessionId);
      return next;
    });

    setPressedBookmarkId(confessionId);
    if (pressedBookmarkTimerRef.current) {
      clearTimeout(pressedBookmarkTimerRef.current);
    }

    pressedBookmarkTimerRef.current = setTimeout(() => {
      setPressedBookmarkId((currentId) =>
        currentId === confessionId ? null : currentId,
      );
      pressedBookmarkTimerRef.current = null;
    }, 150);

    try {
      const response = await fetch(
        `/api/confessions/${confessionId}/toggle-bookmark`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to toggle bookmark.");
      }

      const payload = await parseResponse(response);
      const savedByCurrentUser = Boolean(payload.savedByCurrentUser);

      setConfessionFeed((prev) =>
        prev.map((item) =>
          item._id === confessionId || item.id === confessionId
            ? {
                ...item,
                savedByCurrentUser,
              }
            : item,
        ),
      );

      showSuccess(
        savedByCurrentUser
          ? "Confession saved successfully."
          : "Confession removed from saved items.",
      );
    } catch (error) {
      showError(error.message || "Failed to toggle bookmark.");
    } finally {
      pendingBookmarkIdsRef.current.delete(confessionId);
      setPendingBookmarkIds((prev) => {
        const next = new Set(prev);
        next.delete(confessionId);
        return next;
      });
    }
  };

  const handleToggleConfessionMenu = (confessionId) => {
    setMenuConfessionId((currentId) =>
      currentId === confessionId ? "" : confessionId,
    );
  };

  const handleToggleExpandedConfession = (confessionId) => {
    setExpandedConfessionIds((prev) => ({
      ...prev,
      [confessionId]: !prev[confessionId],
    }));
  };

  const handleEditConfession = (item) => {
    const existingTags = Array.isArray(item?.tags) ? item.tags : [];
    const reconstructedEditContent = [
      item?.content || "",
      existingTags.map((tag) => `#${tag}`).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .replaceAll(/[ \t]{2,}/g, " ")
      .trim();

    setMenuConfessionId("");
    setEditingConfessionId(String(item?._id || item?.id || ""));
    setEditConfessionContent(reconstructedEditContent);
    setEditConfessionIsAnonymous(Boolean(item?.isAnonymous));
    setEditConfessionVisibility(
      item?.visibility === "private" ? "private" : "public",
    );
    dismissToast();
  };

  const handleDeleteConfession = (confessionId) => {
    setMenuConfessionId("");
    setDeleteTargetConfessionId(confessionId);
  };

  const handleCancelEditConfession = () => {
    setEditingConfessionId("");
    setEditConfessionContent("");
    setEditConfessionIsAnonymous(true);
    setEditConfessionVisibility("public");
  };

  const handleConfirmDeleteConfession = async () => {
    if (!deleteTargetConfessionId || isDeletingConfession) {
      return;
    }

    const confessionId = deleteTargetConfessionId;
    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to delete a confession.");
      return;
    }

    setIsDeletingConfession(true);

    try {
      const response = await fetch(`/api/confessions/${confessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete confession.");
      }

      setConfessionFeed((prev) =>
        prev.filter(
          (item) => String(item?._id || item?.id || "") !== confessionId,
        ),
      );

      if (editingConfessionId === confessionId) {
        handleCancelEditConfession();
      }

      setDeleteTargetConfessionId("");
      showSuccess("Confession deleted successfully.");
    } catch (error) {
      showError(error.message || "Failed to delete confession.");
    } finally {
      setIsDeletingConfession(false);
    }
  };

  const handleCardLikeGesture = React.useCallback(
    (confessionId, likedByCurrentUser) => {
      if (likedByCurrentUser) {
        return;
      }

      setGestureLikeBurstId(confessionId);
      if (gestureLikeBurstTimerRef.current) {
        clearTimeout(gestureLikeBurstTimerRef.current);
      }

      gestureLikeBurstTimerRef.current = setTimeout(() => {
        setGestureLikeBurstId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        gestureLikeBurstTimerRef.current = null;
      }, 450);

      handleToggleLike(confessionId);
    },
    [handleToggleLike],
  );

  React.useEffect(() => {
    const getCardMeta = (eventTarget) => {
      if (!(eventTarget instanceof Element) || eventTarget.closest("button")) {
        return null;
      }

      const card = eventTarget.closest("[data-confession-card-id]");
      if (!card) {
        return null;
      }

      const confessionId = card.dataset.confessionCardId;
      const likedByCurrentUser = card.dataset.likedByCurrentUser === "true";

      if (!confessionId) {
        return null;
      }

      return {
        confessionId,
        likedByCurrentUser,
      };
    };

    const handleDocumentDoubleClick = (event) => {
      const cardMeta = getCardMeta(event.target);
      if (!cardMeta) {
        return;
      }

      handleCardLikeGesture(cardMeta.confessionId, cardMeta.likedByCurrentUser);
    };

    const handleDocumentTouchEnd = (event) => {
      const cardMeta = getCardMeta(event.target);
      if (!cardMeta) {
        return;
      }

      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (
        lastTap.confessionId === cardMeta.confessionId &&
        now - lastTap.time < 300
      ) {
        lastTapRef.current = { confessionId: "", time: 0 };
        handleCardLikeGesture(
          cardMeta.confessionId,
          cardMeta.likedByCurrentUser,
        );
        return;
      }

      lastTapRef.current = {
        confessionId: cardMeta.confessionId,
        time: now,
      };
    };

    document.addEventListener("dblclick", handleDocumentDoubleClick);
    document.addEventListener("touchend", handleDocumentTouchEnd);

    return () => {
      document.removeEventListener("dblclick", handleDocumentDoubleClick);
      document.removeEventListener("touchend", handleDocumentTouchEnd);
    };
  }, [handleCardLikeGesture]);

  React.useEffect(() => {
    loadConfessions().catch(() => {});
  }, [loadConfessions]);

  React.useEffect(
    () => () => {
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      if (pressedBookmarkTimerRef.current) {
        clearTimeout(pressedBookmarkTimerRef.current);
      }

      if (gestureLikeBurstTimerRef.current) {
        clearTimeout(gestureLikeBurstTimerRef.current);
      }
    },
    [],
  );

  useOutsideClickCloser(
    Boolean(menuConfessionId),
    () => setMenuConfessionId(""),
    "[data-confession-menu]",
  );

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        if (hasMoreFeed && !isLoadingMoreFeed && !isLoadingFeed) {
          loadConfessions({ cursor: nextCursor, append: true }).catch(() => {});
          return;
        }

        if (
          !hasMoreFeed &&
          confessionFeed.length > 0 &&
          !isLoadingFeed &&
          !hasShownEndToastRef.current
        ) {
          hasShownEndToastRef.current = true;
          showToast("You're all caught up. Scroll up to refresh.", "info", {
            action: {
              label: "Back to top & refresh",
              icon: RefreshCcw,
              onClick: handleRefreshConfessions,
            },
          });
        }
      },
      { threshold: 0.1 },
    );

    const currentSentinel = sentinelRef.current;

    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [
    hasMoreFeed,
    nextCursor,
    isLoadingMoreFeed,
    isLoadingFeed,
    loadConfessions,
    confessionFeed.length,
    showToast,
    handleRefreshConfessions,
  ]);

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
              <div className="bg-slate-900 text-white p-8 rounded-3xl sm:rounded-[40px] text-left relative overflow-hidden w-full shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-1 bg-rose-500 rounded-full mb-4"></div>
                  <textarea
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    className="bg-transparent border-none outline-none w-full h-32 text-base text-slate-200 resize-none placeholder:text-slate-400"
                    placeholder="Write your confession..."
                  />
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-2">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAnonymous((prev) => !prev)}
                        aria-pressed={isAnonymous}
                        className="text-xs text-slate-400 inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-3 py-1.5 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-colors"
                      >
                        {isAnonymous ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <LockOpen className="w-3.5 h-3.5" />
                        )}
                        {isAnonymous ? "Anonymous" : "Identified"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setVisibility((prev) =>
                            prev === "public" ? "private" : "public",
                          )
                        }
                        aria-pressed={visibility === "private"}
                        className="text-xs text-slate-400 inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-3 py-1.5 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-colors"
                      >
                        {visibility === "public" ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        {visibility === "public" ? "Public" : "Private"}
                      </button>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-2 bg-rose-500 text-white font-semibold rounded-full hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                      Post
                    </button>
                  </div>
                </div>
              </div>

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
          <ModalDialog
            isOpen={Boolean(deleteTargetCommentId)}
            onClose={closeDeleteCommentDialog}
            title="Delete this comment?"
            titleId="confession-delete-comment-dialog-title"
            closeLabel="Close delete comment modal"
            widthClassName="max-w-sm"
          >
            <div className="p-5">
              <p className="text-sm text-slate-500 mb-5">
                This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteCommentDialog}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteComment}
                  disabled={isDeletingComment}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {isDeletingComment ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </ModalDialog>
        )}

        <ModalDialog
          isOpen={Boolean(editingConfessionId)}
          onClose={handleCancelEditConfession}
          title="Edit Confession"
          titleId={editDialogTitleId}
          closeLabel="Close edit confession modal"
          widthClassName="max-w-2xl"
        >
          <div className="px-4 py-4 space-y-4">
            <textarea
              value={editConfessionContent}
              onChange={(event) => setEditConfessionContent(event.target.value)}
              className="w-full min-h-50 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-300 resize-none"
              placeholder="Edit your confession..."
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditConfessionIsAnonymous((prev) => !prev)}
                aria-pressed={editConfessionIsAnonymous}
                className="text-xs text-slate-500 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 cursor-pointer hover:border-slate-400 hover:text-slate-700 transition-colors"
              >
                {editConfessionIsAnonymous ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <LockOpen className="w-3.5 h-3.5" />
                )}
                {editConfessionIsAnonymous ? "Anonymous" : "Identified"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setEditConfessionVisibility((prev) =>
                    prev === "public" ? "private" : "public",
                  )
                }
                aria-pressed={editConfessionVisibility === "private"}
                className="text-xs text-slate-500 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 cursor-pointer hover:border-slate-400 hover:text-slate-700 transition-colors"
              >
                {editConfessionVisibility === "public" ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                {editConfessionVisibility === "public" ? "Public" : "Private"}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEditConfession}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedConfession}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting ? "Updating..." : "Save changes"}
              </button>
            </div>
          </div>
        </ModalDialog>

        <ModalDialog
          isOpen={Boolean(deleteTargetConfessionId)}
          onClose={() => {
            if (isDeletingConfession) {
              return;
            }

            setDeleteTargetConfessionId("");
          }}
          title="Delete this confession?"
          titleId={deleteDialogTitleId}
          closeLabel="Close delete confession modal"
          widthClassName="max-w-sm"
        >
          <div className="p-5">
            <p className="text-sm text-slate-500 mb-5">
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetConfessionId("")}
                disabled={isDeletingConfession}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConfession}
                disabled={isDeletingConfession}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
              >
                {isDeletingConfession ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </ModalDialog>
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
