import React, { useState, useRef } from "react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Loader2,
  SendHorizontal,
  X,
  CheckCircle2,
  AlertCircle,
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
import ConfessionFeedCard from "./confession/ConfessionFeedCard";
import ConfessionModalCommentItem from "./confession/ConfessionModalCommentItem";

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
  const TOAST_DURATION_MS = 3200;
  const TOAST_EXIT_MS = 220;
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
  const [toast, setToast] = useState(null);
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
  const sentinelRef = useRef(null);
  const lastTapRef = useRef({ confessionId: "", time: 0 });
  const pendingLikeIdsRef = useRef(new Set());
  const pendingBookmarkIdsRef = useRef(new Set());
  const toastTimeoutRef = useRef(null);
  const toastExitTimeoutRef = useRef(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const commentDialogTitleId = "confession-comments-dialog-title";
  const editDialogTitleId = "confession-edit-dialog-title";
  const deleteDialogTitleId = "confession-delete-dialog-title";

  const hideToast = React.useCallback(() => {
    setIsToastVisible(false);

    if (toastExitTimeoutRef.current) {
      clearTimeout(toastExitTimeoutRef.current);
    }

    toastExitTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastExitTimeoutRef.current = null;
    }, TOAST_EXIT_MS);
  }, [TOAST_EXIT_MS]);

  const dismissToast = React.useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    hideToast();
  }, [hideToast]);

  const showToast = React.useCallback(
    (type, message) => {
      if (!message) {
        return;
      }

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      if (toastExitTimeoutRef.current) {
        clearTimeout(toastExitTimeoutRef.current);
        toastExitTimeoutRef.current = null;
      }

      setToast({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        message,
      });

      setIsToastVisible(false);

      requestAnimationFrame(() => {
        setIsToastVisible(true);
      });

      toastTimeoutRef.current = setTimeout(() => {
        hideToast();
        toastTimeoutRef.current = null;
      }, TOAST_DURATION_MS);
    },
    [TOAST_DURATION_MS, hideToast],
  );

  const showError = React.useCallback(
    (message) => {
      showToast("error", message);
    },
    [showToast],
  );

  const showSuccess = React.useCallback(
    (message) => {
      showToast("success", message);
    },
    [showToast],
  );

  const currentUserId = React.useMemo(() => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      return normalizeId(currentUser?.id || currentUser?._id || "");
    } catch {
      return "";
    }
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
    deleteTargetCommentId,
    setDeleteTargetCommentId,
    isDeletingComment,
    isLoadingModalComments,
    modalCommentsError,
    closeCommentModal: closeCommentModalState,
    openCommentModal: openCommentModalState,
    handleAddComment,
    handleToggleCommentMenu,
    handleStartEditComment,
    handleCancelEditComment,
    handleSaveEditedComment,
    handleDeleteComment,
    handleConfirmDeleteComment,
  } = useConfessionComments({ setConfessionFeed });

  const closeCommentModal = React.useCallback(() => {
    closeCommentModalState();
  }, [closeCommentModalState]);

  const openCommentModal = React.useCallback(
    async (...args) => {
      await openCommentModalState(...args);
    },
    [openCommentModalState],
  );

  const loadConfessions = React.useCallback(
    async ({ cursor = "", append = false } = {}) => {
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
      setTimeout(() => {
        setPressedLikeId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
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
    setTimeout(() => {
      setPressedBookmarkId((currentId) =>
        currentId === confessionId ? null : currentId,
      );
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

      setConfessionFeed((prev) =>
        prev.map((item) =>
          item._id === confessionId || item.id === confessionId
            ? {
                ...item,
                savedByCurrentUser: Boolean(payload.savedByCurrentUser),
              }
            : item,
        ),
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
    if (!deleteTargetConfessionId) {
      return;
    }

    const confessionId = deleteTargetConfessionId;
    setDeleteTargetConfessionId("");

    const token = localStorage.getItem("token");
    if (!token) {
      showError("Please log in again to delete a confession.");
      return;
    }

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

      showSuccess("Confession deleted successfully.");
    } catch (error) {
      showError(error.message || "Failed to delete confession.");
    }
  };

  const handleCardLikeGesture = React.useCallback(
    (confessionId, likedByCurrentUser) => {
      if (likedByCurrentUser) {
        return;
      }

      setGestureLikeBurstId(confessionId);
      setTimeout(() => {
        setGestureLikeBurstId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
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
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      if (toastExitTimeoutRef.current) {
        clearTimeout(toastExitTimeoutRef.current);
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
        if (
          entries[0].isIntersecting &&
          hasMoreFeed &&
          !isLoadingMoreFeed &&
          !isLoadingFeed
        ) {
          loadConfessions({ cursor: nextCursor, append: true }).catch(() => {});
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
  ]);

  let feedContent = null;
  const isCommentModalOpen = Boolean(activeCommentConfessionId);

  if (isLoadingFeed) {
    feedContent = (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
        Loading confessions...
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
    feedContent = confessionFeed.map((item) => (
      <ConfessionFeedCard
        key={String(item?._id || item?.id || "")}
        item={item}
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
      />
    ));
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Confession Wall" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-start">
              <div className="bg-slate-900 text-white p-8 rounded-3xl sm:rounded-[40px] text-left relative overflow-hidden w-full shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-1 bg-rose-500 rounded-full mb-4"></div>
                  <textarea
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    className="bg-transparent border-none outline-none w-full h-32 text-base text-md text-slate-200 resize-none placeholder:text-slate-400"
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

                <div ref={sentinelRef} className="h-10" />
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>

        <ModalDialog
          isOpen={isCommentModalOpen}
          onClose={closeCommentModal}
          title={`Comments - ${commentModalTitle}`}
          titleId={commentDialogTitleId}
          closeLabel="Close comments modal"
          widthClassName="max-w-xl"
        >
          <div className="max-h-[65vh] overflow-y-auto px-4 py-4 space-y-3">
            {isLoadingModalComments && (
              <p className="text-sm text-slate-500">Loading comments...</p>
            )}

            {!isLoadingModalComments && modalCommentsError && (
              <p className="text-sm text-rose-600">{modalCommentsError}</p>
            )}

            {!isLoadingModalComments &&
              !modalCommentsError &&
              modalComments.length === 0 && (
                <p className="text-sm text-slate-500">No comments yet.</p>
              )}

            {!isLoadingModalComments &&
              !modalCommentsError &&
              modalComments.map((comment) => {
                return (
                  <ConfessionModalCommentItem
                    key={String(comment?._id || comment?.id || "comment")}
                    comment={comment}
                    currentUserId={currentUserId}
                    activeCommentMenuId={activeCommentMenuId}
                    editingCommentId={editingCommentId}
                    editCommentContent={editCommentContent}
                    isSavingEditedComment={isSavingEditedComment}
                    deleteTargetCommentId={deleteTargetCommentId}
                    isDeletingComment={isDeletingComment}
                    onToggleMenu={handleToggleCommentMenu}
                    onStartEdit={handleStartEditComment}
                    onDelete={handleDeleteComment}
                    onCancelEdit={handleCancelEditComment}
                    onEditContentChange={setEditCommentContent}
                    onSaveEdit={handleSaveEditedComment}
                    onCancelDelete={() => setDeleteTargetCommentId("")}
                    onConfirmDelete={handleConfirmDeleteComment}
                  />
                );
              })}
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={newCommentContent}
                onChange={(event) => setNewCommentContent(event.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 resize-none"
                rows={2}
                placeholder="Write a comment..."
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={isSubmittingComment}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSubmittingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <SendHorizontal className="h-3.5 w-3.5" />
                )}
                {isSubmittingComment ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </ModalDialog>

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
          onClose={() => setDeleteTargetConfessionId("")}
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
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteConfession}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalDialog>
      </div>

      {toast && (
        <div className="pointer-events-none fixed right-4 top-4 z-90 w-[min(92vw,360px)]">
          <div
            className={`pointer-events-auto rounded-2xl border bg-white/95 shadow-2xl backdrop-blur px-4 py-3 transition-all duration-200 ease-out ${
              isToastVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-8 opacity-0"
            } ${
              {
                success: "border-emerald-200",
                error: "border-rose-200",
              }[toast.type]
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 shrink-0 ${
                  toast.type === "success"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900">
                  {toast.type === "success" ? "Done" : "Alert"}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-slate-600 wrap-break-word">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissToast}
                className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                key={toast.id}
                className={`h-full origin-left ${
                  toast.type === "success"
                    ? "bg-emerald-500/70"
                    : "bg-rose-500/70"
                }`}
                style={{
                  animation: `toastCountDown ${TOAST_DURATION_MS}ms linear forwards`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastCountDown {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
