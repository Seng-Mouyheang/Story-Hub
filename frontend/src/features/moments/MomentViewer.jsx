import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Trash2,
  Plus,
  MoreVertical,
  Heart,
  MessageCircle,
  Eye,
} from "lucide-react";
import {
  markMomentViewed,
  deleteMoment as deleteMomentApi,
} from "../../api/moment/momentApi";
import { toggleMomentLike } from "../../api/moment/momentInteractionsApi";
import { useMomentComments } from "./useMomentComments";
import { useMomentViewers } from "./useMomentViewers";
import MomentCommentPanel from "./MomentCommentPanel";
import MomentViewersPanel from "./MomentViewersPanel";

const MOMENT_DURATION_MS = 5000;
const TRANSITION_MS = 220;
const PANEL_TRANSITION_MS = 300;

const formatShortAge = (dateString) => {
  const sourceMs = new Date(dateString).getTime();
  if (Number.isNaN(sourceMs)) return "";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - sourceMs) / 60000));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

export default function MomentViewer({
  authorSequence,
  initialAuthorId,
  momentGroups,
  currentUserId,
  currentUsername,
  currentUserProfilePicture,
  notify,
  onUnauthenticated,
  onClose,
  onMomentDeleted,
  onMomentsViewed,
  onMomentLikeToggled,
  onMomentCommentCountChanged,
  onAddMore,
}) {
  // The parent (Home.jsx) already fetches every author's full moment list
  // via useMomentsFeed, so read from that instead of a per-author network
  // round trip.
  const deriveGroup = useCallback(
    (id) => {
      if (!id) return null;
      const sourceGroup = momentGroups.find(
        (candidate) => candidate.authorId === id,
      );
      return sourceGroup ?? { authorId: id, name: "", image: "", moments: [] };
    },
    [momentGroups],
  );

  // Tracked by author id rather than an index into authorSequence: the
  // sequence can shrink (e.g. an author's last moment is deleted) between
  // the moment we navigate and the moment the parent re-renders with the
  // updated list, which would otherwise leave a stale index pointing past
  // the end of the new array.
  const [authorId, setAuthorId] = useState(initialAuthorId);
  const [group, setGroup] = useState(() => deriveGroup(initialAuthorId));
  const [momentIndex, setMomentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [entered, setEntered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [likePulse, setLikePulse] = useState(false);
  const [isCommentPanelClosing, setIsCommentPanelClosing] = useState(false);
  const [isViewersPanelClosing, setIsViewersPanelClosing] = useState(false);

  const startRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const rafRef = useRef(null);
  const viewedIdsRef = useRef(new Set());
  const pendingLikeMomentIdsRef = useRef(new Set());
  const menuRef = useRef(null);
  const commentPanelCloseTimeoutRef = useRef(null);
  const viewersPanelCloseTimeoutRef = useRef(null);

  const {
    activeMomentId: activeCommentMomentId,
    commentState,
    menuCommentId,
    commentActionFeedback,
    pendingCommentLikeIds,
    commentLikePulseIds,
    commentInputRef,
    commentListRef,
    commentListSentinelRef,
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
  } = useMomentComments({
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
    notify,
    onUnauthenticated,
    onCommentCountChange: (momentId, delta) => {
      setGroup((currentGroup) => {
        if (!currentGroup) return currentGroup;
        return {
          ...currentGroup,
          moments: currentGroup.moments.map((moment) =>
            moment.id === momentId
              ? {
                  ...moment,
                  commentCount: Math.max(
                    0,
                    Number(moment.commentCount || 0) + delta,
                  ),
                }
              : moment,
          ),
        };
      });
      onMomentCommentCountChanged?.(momentId, delta);
    },
  });

  const {
    activeMomentId: activeViewersMomentId,
    viewersState,
    totalCount: viewersTotalCount,
    viewersListRef,
    viewersListSentinelRef,
    handleOpenViewers,
    handleCloseViewers,
  } = useMomentViewers();

  const requestClose = useCallback(() => {
    setIsClosing(true);
    onMomentsViewed?.(viewedIdsRef.current);
    setTimeout(onClose, TRANSITION_MS);
  }, [onClose, onMomentsViewed]);

  // Plays the panel's slide-out transition before actually unmounting it —
  // used by every close trigger (X button, backdrop click, Escape) so the
  // animation is consistent no matter how the user closes it.
  const requestCloseComments = useCallback(() => {
    if (commentPanelCloseTimeoutRef.current) return;

    setIsCommentPanelClosing(true);
    commentPanelCloseTimeoutRef.current = setTimeout(() => {
      commentPanelCloseTimeoutRef.current = null;
      setIsCommentPanelClosing(false);
      handleCloseComments();
    }, PANEL_TRANSITION_MS);
  }, [handleCloseComments]);

  // Reopening while the previous close is still mid-animation would
  // otherwise leave that timeout pending — it'd fire ~300ms later and
  // immediately close the panel the user just reopened.
  const cancelPendingCommentPanelClose = useCallback(() => {
    if (commentPanelCloseTimeoutRef.current) {
      clearTimeout(commentPanelCloseTimeoutRef.current);
      commentPanelCloseTimeoutRef.current = null;
      setIsCommentPanelClosing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (commentPanelCloseTimeoutRef.current) {
        clearTimeout(commentPanelCloseTimeoutRef.current);
      }
    };
  }, []);

  const requestCloseViewers = useCallback(() => {
    if (viewersPanelCloseTimeoutRef.current) return;

    setIsViewersPanelClosing(true);
    viewersPanelCloseTimeoutRef.current = setTimeout(() => {
      viewersPanelCloseTimeoutRef.current = null;
      setIsViewersPanelClosing(false);
      handleCloseViewers();
    }, PANEL_TRANSITION_MS);
  }, [handleCloseViewers]);

  const cancelPendingViewersPanelClose = useCallback(() => {
    if (viewersPanelCloseTimeoutRef.current) {
      clearTimeout(viewersPanelCloseTimeoutRef.current);
      viewersPanelCloseTimeoutRef.current = null;
      setIsViewersPanelClosing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (viewersPanelCloseTimeoutRef.current) {
        clearTimeout(viewersPanelCloseTimeoutRef.current);
      }
    };
  }, []);

  const requireToken = useCallback(
    (message) => {
      const token = localStorage.getItem("token");
      if (!token) {
        onUnauthenticated?.(message);
        return false;
      }
      return true;
    },
    [onUnauthenticated],
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const goToNextAuthor = useCallback(() => {
    const index = authorSequence.indexOf(authorId);
    if (index === -1 || index >= authorSequence.length - 1) {
      requestClose();
      return;
    }
    const nextAuthorId = authorSequence[index + 1];
    setAuthorId(nextAuthorId);
    setGroup(deriveGroup(nextAuthorId));
    setMomentIndex(0);
  }, [authorSequence, authorId, requestClose, deriveGroup]);

  const goToPreviousAuthor = useCallback(() => {
    const index = authorSequence.indexOf(authorId);
    if (index <= 0) return;
    const previousAuthorId = authorSequence[index - 1];
    setAuthorId(previousAuthorId);
    setGroup(deriveGroup(previousAuthorId));
    setMomentIndex(0);
  }, [authorSequence, authorId, deriveGroup]);

  const currentMoment = group?.moments?.[momentIndex];
  const isCommentPanelOpen =
    Boolean(currentMoment) && activeCommentMomentId === currentMoment.id;
  const isViewersPanelOpen =
    Boolean(currentMoment) && activeViewersMomentId === currentMoment.id;

  useEffect(() => {
    if (!currentMoment || currentMoment.viewed) {
      return;
    }

    const momentId = currentMoment.id;
    viewedIdsRef.current.add(momentId);

    const markLocallyViewed = () => {
      setGroup((currentGroup) => {
        if (!currentGroup) return currentGroup;
        return {
          ...currentGroup,
          moments: currentGroup.moments.map((moment) =>
            moment.id === momentId ? { ...moment, viewed: true } : moment,
          ),
        };
      });
    };
    markLocallyViewed();

    markMomentViewed(momentId).catch(() => {});
  }, [currentMoment]);

  const advance = useCallback(() => {
    if (!group) return;

    if (momentIndex >= group.moments.length - 1) {
      goToNextAuthor();
      return;
    }

    setMomentIndex(momentIndex + 1);
  }, [group, momentIndex, goToNextAuthor]);

  const goBack = useCallback(() => {
    if (momentIndex === 0) {
      goToPreviousAuthor();
      return;
    }

    setMomentIndex(momentIndex - 1);
  }, [momentIndex, goToPreviousAuthor]);

  useEffect(() => {
    const resetProgress = () => {
      pausedElapsedRef.current = 0;
      setProgress(0);
    };

    resetProgress();
    handleCloseComments();
    handleCloseViewers();
  }, [authorId, momentIndex, handleCloseComments, handleCloseViewers]);

  useEffect(() => {
    if (
      !currentMoment ||
      isPaused ||
      isCommentPanelOpen ||
      isViewersPanelOpen
    ) {
      return undefined;
    }

    startRef.current = performance.now() - pausedElapsedRef.current;

    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const ratio = Math.min(1, elapsed / MOMENT_DURATION_MS);
      setProgress(ratio * 100);

      if (ratio >= 1) {
        advance();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      pausedElapsedRef.current = performance.now() - startRef.current;
    };
  }, [
    currentMoment,
    isPaused,
    isCommentPanelOpen,
    isViewersPanelOpen,
    advance,
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (isViewersPanelOpen) {
          requestCloseViewers();
          return;
        }
        if (isCommentPanelOpen) {
          requestCloseComments();
          return;
        }
        if (isConfirmingDelete) {
          setIsConfirmingDelete(false);
          setIsPaused(false);
          return;
        }
        if (isMenuOpen) {
          setIsMenuOpen(false);
          return;
        }
        requestClose();
      }
      if (isConfirmingDelete || isCommentPanelOpen || isViewersPanelOpen)
        return;
      if (event.key === "ArrowRight") advance();
      if (event.key === "ArrowLeft") goBack();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isMenuOpen,
    isConfirmingDelete,
    isCommentPanelOpen,
    isViewersPanelOpen,
    requestCloseComments,
    requestCloseViewers,
    requestClose,
    advance,
    goBack,
  ]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isMenuOpen]);

  const requestDelete = () => {
    setIsMenuOpen(false);
    setIsConfirmingDelete(true);
    setIsPaused(true);
  };

  const cancelDelete = () => {
    setIsConfirmingDelete(false);
    setIsPaused(false);
  };

  const confirmDelete = async () => {
    if (!currentMoment || !group) return;

    setIsConfirmingDelete(false);

    try {
      await deleteMomentApi(currentMoment.id);
      onMomentDeleted?.(currentMoment.id);

      const remaining = group.moments.filter((m) => m.id !== currentMoment.id);

      if (remaining.length === 0) {
        goToNextAuthor();
        return;
      }

      setGroup({ ...group, moments: remaining });
      setMomentIndex((index) => Math.min(index, remaining.length - 1));
      setIsPaused(false);
    } catch {
      // best-effort; keep viewer open on failure
      setIsPaused(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentMoment) return;
    if (!requireToken("Please log in to react to stories.")) return;

    const momentId = currentMoment.id;
    if (pendingLikeMomentIdsRef.current.has(momentId)) return;
    pendingLikeMomentIdsRef.current.add(momentId);

    const wasLiked = currentMoment.likedByCurrentUser;

    setLikePulse(true);
    setTimeout(() => setLikePulse(false), 220);

    setGroup((currentGroup) => {
      if (!currentGroup) return currentGroup;
      return {
        ...currentGroup,
        moments: currentGroup.moments.map((moment) =>
          moment.id === momentId
            ? {
                ...moment,
                likedByCurrentUser: !wasLiked,
                likesCount: Math.max(
                  0,
                  Number(moment.likesCount || 0) + (wasLiked ? -1 : 1),
                ),
              }
            : moment,
        ),
      };
    });

    try {
      const result = await toggleMomentLike(momentId);
      const likedByCurrentUser = Boolean(result.likedByCurrentUser);
      const likesCount = Number(result.likesCount || 0);

      setGroup((currentGroup) => {
        if (!currentGroup) return currentGroup;
        return {
          ...currentGroup,
          moments: currentGroup.moments.map((moment) =>
            moment.id === momentId
              ? { ...moment, likedByCurrentUser, likesCount }
              : moment,
          ),
        };
      });
      onMomentLikeToggled?.(momentId, { likedByCurrentUser, likesCount });
    } catch {
      setGroup((currentGroup) => {
        if (!currentGroup) return currentGroup;
        return {
          ...currentGroup,
          moments: currentGroup.moments.map((moment) =>
            moment.id === momentId
              ? {
                  ...moment,
                  likedByCurrentUser: wasLiked,
                  likesCount: Math.max(
                    0,
                    Number(moment.likesCount || 0) + (wasLiked ? 1 : -1),
                  ),
                }
              : moment,
          ),
        };
      });
      notify?.("Failed to update reaction. Please try again.", "error");
    } finally {
      pendingLikeMomentIdsRef.current.delete(momentId);
    }
  };

  const openCommentComposer = () => {
    if (!currentMoment) return;
    if (!requireToken("Please log in to comment.")) return;

    cancelPendingCommentPanelClose();
    handleOpenComments(currentMoment.id);
    setTimeout(() => commentInputRef.current?.focus(), 50);
  };

  const openCommentPanel = () => {
    if (!currentMoment) return;

    if (isCommentPanelOpen && !isCommentPanelClosing) {
      requestCloseComments();
      return;
    }

    cancelPendingCommentPanelClose();
    handleOpenComments(currentMoment.id);
  };

  const openViewersPanel = () => {
    if (!currentMoment) return;

    if (isViewersPanelOpen && !isViewersPanelClosing) {
      requestCloseViewers();
      return;
    }

    cancelPendingViewersPanelClose();
    handleOpenViewers(currentMoment.id);
  };

  if (!authorId) return null;

  const isEntered = entered && !isClosing;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-all duration-200 ease-out ${
        isEntered
          ? "bg-black/70 backdrop-blur-md"
          : "bg-black/0 backdrop-blur-none"
      }`}
      onClick={requestClose}
    >
      <div
        className={`relative w-full h-full sm:w-[420px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-slate-900 transition-all duration-200 ease-out ${
          isEntered ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {!group ? (
          <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
            Loading...
          </div>
        ) : group.moments.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
            No active story.
          </div>
        ) : (
          <>
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
              {group.moments.map((moment, index) => (
                <div
                  key={moment.id}
                  className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white"
                    style={{
                      width:
                        index < momentIndex
                          ? "100%"
                          : index === momentIndex
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="absolute top-8 left-0 right-0 px-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <Link
                    to={`/profile/${authorId}`}
                    state={{ from: "/" }}
                    className="block w-9 h-9 rounded-full overflow-hidden bg-slate-700"
                  >
                    {group.image ? (
                      <img
                        src={group.image}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </Link>

                  {authorId === currentUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddMore?.();
                        requestClose();
                      }}
                      aria-label="Add to your story"
                      className="absolute -bottom-0.5 -right-0.5 bg-rose-600 text-white rounded-full p-0.5 border border-white shadow-sm hover:bg-rose-700 transition-colors"
                    >
                      <Plus size={8} />
                    </button>
                  )}
                </div>

                <Link
                  to={`/profile/${authorId}`}
                  state={{ from: "/" }}
                  className="flex items-center gap-2 min-w-0"
                >
                  <span className="text-white text-sm font-medium truncate">
                    {group.name}
                  </span>
                  {currentMoment && (
                    <span className="text-white/60 text-xs shrink-0">
                      {formatShortAge(currentMoment.createdAt)}
                    </span>
                  )}
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {authorId === currentUserId && (
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen((open) => !open)}
                      className="p-1.5 rounded-full text-white/80 hover:bg-white/10"
                      aria-label="Story options"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-white/10 bg-slate-800 shadow-lg py-1 overflow-hidden">
                        <button
                          type="button"
                          onClick={requestDelete}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-400 hover:bg-white/5"
                        >
                          <Trash2 size={14} />
                          Delete story
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={requestClose}
                  className="p-1.5 rounded-full text-white/80 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="w-full h-full flex items-center justify-center">
              {currentMoment.type === "image" ? (
                <img
                  src={currentMoment.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center p-8"
                  style={{
                    background:
                      currentMoment.backgroundColor ||
                      "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)",
                  }}
                >
                  <p className="text-white text-2xl font-semibold text-center whitespace-pre-wrap">
                    {currentMoment.text}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label="Previous story"
              className="absolute left-0 top-0 bottom-16 w-1/3"
              onPointerDown={() => setIsPaused(true)}
              onPointerUp={() => setIsPaused(false)}
              onClick={goBack}
              disabled={isConfirmingDelete}
            />
            <button
              type="button"
              aria-label="Next story"
              className="absolute right-0 top-0 bottom-16 w-1/3"
              onPointerDown={() => setIsPaused(true)}
              onPointerUp={() => setIsPaused(false)}
              onClick={advance}
              disabled={isConfirmingDelete}
            />

            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 p-3">
              {authorId === currentUserId ? (
                <>
                  <button
                    type="button"
                    onClick={openViewersPanel}
                    aria-label="View story viewers"
                    className="shrink-0 p-2 rounded-full text-white hover:bg-white/10"
                  >
                    <Eye size={24} />
                  </button>
                  <div className="flex-1" />
                </>
              ) : (
                <button
                  type="button"
                  onClick={openCommentComposer}
                  className="flex-1 min-w-0 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-left text-sm text-white/70 backdrop-blur-sm hover:bg-white/15 transition-colors truncate"
                >
                  Send message...
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleLike}
                aria-label={
                  currentMoment.likedByCurrentUser
                    ? "Unlike story"
                    : "Like story"
                }
                className={`shrink-0 p-2 rounded-full transition-colors ${
                  currentMoment.likedByCurrentUser
                    ? "text-rose-500"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Heart
                  size={24}
                  fill={
                    currentMoment.likedByCurrentUser ? "currentColor" : "none"
                  }
                  className={`transition-transform duration-200 ${
                    likePulse ? "scale-110" : "scale-100"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={openCommentPanel}
                aria-label="View comments"
                className="shrink-0 flex items-center gap-1 p-2 rounded-full text-white hover:bg-white/10"
              >
                <MessageCircle size={24} />
              </button>
            </div>

            {isCommentPanelOpen && (
              <MomentCommentPanel
                momentId={currentMoment.id}
                isDimmed={isConfirmingDelete}
                isClosing={isCommentPanelClosing || isClosing}
                commentState={commentState}
                activeMenuCommentId={menuCommentId}
                currentUserId={currentUserId}
                commentActionFeedback={commentActionFeedback}
                pendingCommentLikeIds={pendingCommentLikeIds}
                commentLikePulseIds={commentLikePulseIds}
                commentListRef={commentListRef}
                commentListSentinelRef={commentListSentinelRef}
                commentInputRef={commentInputRef}
                onClose={requestCloseComments}
                onToggleCommentLike={handleToggleCommentLike}
                onToggleCommentMenu={handleToggleCommentMenu}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onStartReply={handleStartReply}
                onToggleReplies={handleToggleReplies}
                onLoadMoreReplies={handleLoadMoreReplies}
                onCancelCommentComposer={handleCancelCommentComposer}
                onCommentInputChange={handleCommentInputChange}
                onSubmitComment={handleSubmitComment}
              />
            )}

            {isViewersPanelOpen && (
              <MomentViewersPanel
                isDimmed={isConfirmingDelete}
                isClosing={isViewersPanelClosing || isClosing}
                viewersState={viewersState}
                totalCount={viewersTotalCount}
                viewersListRef={viewersListRef}
                viewersListSentinelRef={viewersListSentinelRef}
                onClose={requestCloseViewers}
              />
            )}

            {isConfirmingDelete && (
              <div
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="text-sm font-medium text-slate-900">
                    Delete this story?
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    This action cannot be undone.
                  </p>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
