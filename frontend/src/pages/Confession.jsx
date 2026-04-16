import React, { useState, useRef } from "react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Loader2,
  SendHorizontal,
  X,
} from "lucide-react";

const parseResponse = async (response) => response.json().catch(() => ({}));

const formatCount = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

const RELATIVE_TIME_STEPS = [
  { limitMinutes: 1, toLabel: () => "Just now" },
  {
    limitMinutes: 60,
    toLabel: (minutes) => `${minutes} minute${minutes > 1 ? "s" : ""} ago`,
  },
  {
    limitMinutes: 24 * 60,
    toLabel: (minutes) => {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    },
  },
  {
    limitMinutes: 7 * 24 * 60,
    toLabel: (minutes) => {
      const days = Math.floor(minutes / (24 * 60));
      return `${days} day${days > 1 ? "s" : ""} ago`;
    },
  },
  {
    limitMinutes: 5 * 7 * 24 * 60,
    toLabel: (minutes) => {
      const weeks = Math.floor(minutes / (7 * 24 * 60));
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    },
  },
  {
    limitMinutes: 12 * 30 * 24 * 60,
    toLabel: (minutes) => {
      const months = Math.floor(minutes / (30 * 24 * 60));
      return `${months} month${months > 1 ? "s" : ""} ago`;
    },
  },
];

const getRelativeTime = (dateString) => {
  const sourceDate = new Date(dateString);

  if (Number.isNaN(sourceDate.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - sourceDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  for (const step of RELATIVE_TIME_STEPS) {
    if (diffMinutes < step.limitMinutes) {
      return step.toLabel(diffMinutes);
    }
  }

  const diffYears = Math.floor(diffMinutes / (365 * 24 * 60));
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
};

const CONFESSION_FEED_LIMIT = 8;

const extractTagsFromContent = (content) => {
  const matches = content.match(/#\w+/g) || [];
  const uniqueByLowercase = new Map();

  for (const rawTag of matches) {
    const cleanedTag = rawTag.slice(1).trim();

    if (!cleanedTag) {
      continue;
    }

    const normalizedKey = cleanedTag.toLowerCase();

    if (!uniqueByLowercase.has(normalizedKey)) {
      uniqueByLowercase.set(normalizedKey, cleanedTag);
    }
  }

  return Array.from(uniqueByLowercase.values());
};

const stripTagsFromContent = (content) =>
  content
    .replaceAll(/#\w+/g, "")
    .replaceAll(/[ \t]{2,}/g, " ")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

export default function Confession() {
  const [confession, setConfession] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [visibility, setVisibility] = useState("public");
  const [confessionFeed, setConfessionFeed] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pressedLikeId, setPressedLikeId] = useState(null);
  const [pressedBookmarkId, setPressedBookmarkId] = useState(null);
  const [gestureLikeBurstId, setGestureLikeBurstId] = useState(null);
  const [activeCommentConfessionId, setActiveCommentConfessionId] =
    useState("");
  const [commentModalTitle, setCommentModalTitle] = useState("");
  const [modalComments, setModalComments] = useState([]);
  const [isLoadingModalComments, setIsLoadingModalComments] = useState(false);
  const [modalCommentsError, setModalCommentsError] = useState("");
  const sentinelRef = useRef(null);
  const lastTapRef = useRef({ confessionId: "", time: 0 });

  const loadConfessions = async ({ cursor = "", append = false } = {}) => {
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

      setConfessionFeed((prev) => (append ? [...prev, ...data] : data));
      setNextCursor(payload?.nextCursor || "");
      setHasMoreFeed(Boolean(payload?.hasMore));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load confessions.");
    } finally {
      setIsLoadingFeed(false);
      setIsLoadingMoreFeed(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const cleanedContent = stripTagsFromContent(confession);

    if (cleanedContent.length < 5) {
      setErrorMessage("Write at least 5 characters before posting.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Please log in again to post a confession.");
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
      setSuccessMessage("Confession posted successfully.");
      await loadConfessions();
    } catch (error) {
      setErrorMessage(error.message || "Failed to post confession.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = React.useCallback(async (confessionId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Please log in to like confessions.");
      return;
    }

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
      setErrorMessage(error.message || "Failed to toggle like.");
    }
  }, []);

  const handleToggleBookmark = async (confessionId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Please log in to bookmark confessions.");
      return;
    }

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
      setErrorMessage(error.message || "Failed to toggle bookmark.");
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

  const closeCommentModal = () => {
    setActiveCommentConfessionId("");
    setCommentModalTitle("");
    setModalComments([]);
    setModalCommentsError("");
    setIsLoadingModalComments(false);
  };

  const openCommentModal = async (confessionId, authorName) => {
    setActiveCommentConfessionId(confessionId);
    setCommentModalTitle(authorName || "Confession");
    setModalComments([]);
    setModalCommentsError("");
    setIsLoadingModalComments(true);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(
        `/api/confessions/${confessionId}/comments?limit=10`,
        { headers },
      );
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to load comments.");
      }

      const comments = Array.isArray(payload?.comments) ? payload.comments : [];
      setModalComments(comments);
    } catch (error) {
      setModalCommentsError(error.message || "Failed to load comments.");
    } finally {
      setIsLoadingModalComments(false);
    }
  };

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
    void loadConfessions();
  }, []);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreFeed &&
          !isLoadingMoreFeed &&
          !isLoadingFeed
        ) {
          void loadConfessions({ cursor: nextCursor, append: true });
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
  }, [hasMoreFeed, nextCursor, isLoadingMoreFeed, isLoadingFeed]);

  let feedContent = null;
  const isCommentModalOpen = Boolean(activeCommentConfessionId);

  if (isLoadingFeed) {
    feedContent = (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
        Loading confessions...
      </div>
    );
  } else if (confessionFeed.length === 0) {
    feedContent = (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
        No confessions yet. Be the first one to post.
      </div>
    );
  } else {
    feedContent = confessionFeed.map((item) => {
      const originalAuthor = item?.authorDisplayName || "Unknown Author";
      const author = item?.isAnonymous ? "Anonymous" : originalAuthor;
      const authorSeed = String(author || "author");
      const avatarSrc =
        !item?.isAnonymous && item?.authorProfilePicture
          ? item.authorProfilePicture
          : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
              authorSeed,
            )}`;
      const tags =
        Array.isArray(item?.tags) && item.tags.length > 0 ? item.tags : [];
      const confessionId = String(item?._id || item?.id || authorSeed);

      return (
        <div
          key={confessionId}
          data-confession-card-id={confessionId}
          data-liked-by-current-user={Boolean(item?.likedByCurrentUser)}
          className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md"
        >
          {gestureLikeBurstId === confessionId && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <Heart
                size={56}
                className="text-rose-500/90 animate-pulse"
                fill="currentColor"
              />
            </div>
          )}

          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                <img src={avatarSrc} alt="avatar" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {author}
                  </h3>
                  <span className="text-slate-400 text-xs">
                    • {getRelativeTime(item?.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {item?.content || "No confession content"}
          </p>

          {tags.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              {tags.slice(0, 4).map((tag) => (
                <button
                  key={`${confessionId}-${tag}`}
                  type="button"
                  className="text-xs font-semibold tracking-wide text-rose-600 hover:underline cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="relative">
                <button
                  onClick={() => handleToggleLike(confessionId)}
                  className={`flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                    item?.likedByCurrentUser
                      ? "text-rose-500"
                      : "text-slate-500 hover:text-rose-500"
                  } ${pressedLikeId === confessionId ? "scale-95" : "scale-100"}`}
                >
                  <Heart
                    size={20}
                    fill={item?.likedByCurrentUser ? "currentColor" : "none"}
                  />
                  <span className="text-xs sm:text-sm font-medium">
                    {formatCount(Number(item?.likesCount || 0))}
                  </span>
                </button>
              </div>

              <button
                onClick={() => openCommentModal(confessionId, author)}
                className="flex items-center gap-2 text-slate-500 transition-all duration-200 hover:text-sky-500 cursor-pointer"
              >
                <MessageCircle size={20} />
                <span className="text-xs sm:text-sm font-medium">
                  {formatCount(Number(item?.commentCount || 0))}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleToggleBookmark(confessionId)}
                className={`transition-colors cursor-pointer ${
                  item?.savedByCurrentUser
                    ? "text-rose-500"
                    : "text-slate-500 hover:text-rose-500"
                } ${pressedBookmarkId === confessionId ? "scale-95" : "scale-100"}`}
              >
                <Bookmark
                  size={20}
                  fill={item?.savedByCurrentUser ? "currentColor" : "none"}
                />
              </button>
              <button className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>
      );
    });
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Confession Wall" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-4xl flex flex-col items-center justify-start">
              {errorMessage && (
                <div className="w-full mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="w-full mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <div className="bg-slate-900 text-white sm:p-8 rounded-3xl sm:rounded-[40px] text-left relative overflow-hidden w-full shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-1 bg-rose-500 rounded-full mb-4"></div>
                  <textarea
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    className="bg-transparent border-none outline-none w-full h-36 sm:h-32 text-base lg:text-md sm:text-lg text-slate-200 resize-none placeholder:text-slate-400"
                    placeholder="Write your confession..."
                  />
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-4">
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
                      {isSubmitting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 w-full">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900">
                    Confession Feed
                  </h3>
                </div>

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

        {isCommentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 truncate pr-4">
                  Comments - {commentModalTitle}
                </h4>
                <button
                  type="button"
                  onClick={closeCommentModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                  aria-label="Close comments"
                >
                  <X size={18} />
                </button>
              </div>

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
                    const commentId = String(
                      comment?._id || comment?.id || "comment",
                    );
                    const commentAuthor =
                      comment?.authorDisplayName || "Anonymous";
                    const commentAvatarSrc =
                      comment?.authorProfilePicture ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        commentAuthor,
                      )}`;

                    return (
                      <div
                        key={commentId}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="mb-2 flex items-start gap-3">
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200 shrink-0">
                            <img
                              src={commentAvatarSrc}
                              alt="commenter avatar"
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold text-slate-700 truncate">
                                {commentAuthor}
                              </span>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                {getRelativeTime(comment?.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                              {comment?.content || "No comment content"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
