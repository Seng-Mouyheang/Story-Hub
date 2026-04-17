import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Sparkles,
  BookOpenText,
  MessageSquareQuote,
} from "lucide-react";
import ConfessionFeedCard from "./confession/ConfessionFeedCard";

const formatCount = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

const getRelativeTime = (dateString) => {
  const sourceDate = new Date(dateString);

  if (Number.isNaN(sourceDate.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - sourceDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
};

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.toString === "function") return value.toString();
  }

  return String(value);
};

/* -------------------- Post Card -------------------- */
const PostCard = ({
  id,
  author,
  avatar,
  genre,
  time,
  title,
  excerpt,
  likes,
  comments,
  onUnsave,
}) => (
  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
    {/* Header */}
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
          <img src={avatar} alt="avatar" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{author}</h3>
            <span className="text-slate-400 text-xs">• {time}</span>
          </div>

          <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
            {genre}
          </span>
        </div>
      </div>

      <button
        onClick={() => onUnsave(id)}
        className="text-rose-500 hover:text-rose-600 transition-colors"
        aria-label="Remove bookmark"
      >
        <Bookmark size={20} fill="currentColor" />
      </button>
    </div>

    {/* Content */}
    <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
      {title}
    </h2>

    <p className="text-slate-600 text-sm leading-relaxed mb-6">{excerpt}</p>

    {/* Actions */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 text-slate-500 hover:text-rose-500 transition">
          <Heart size={20} />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        <button className="flex items-center gap-2 text-slate-500 hover:text-sky-500 transition">
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{comments}</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-rose-500">
          <Bookmark size={20} fill="currentColor" />
        </button>
        <button className="text-slate-500 hover:text-slate-900">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  </div>
);

/* -------------------- Bookmarks Page -------------------- */
export default function Bookmarks() {
  const [activeType, setActiveType] = useState("stories");
  const [storyBookmarks, setStoryBookmarks] = useState([]);
  const [confessionBookmarks, setConfessionBookmarks] = useState([]);
  const [expandedConfessionIds, setExpandedConfessionIds] = useState({});
  const [pressedLikeId, setPressedLikeId] = useState(null);
  const [pressedBookmarkId, setPressedBookmarkId] = useState(null);
  const [loadingState, setLoadingState] = useState({
    stories: true,
    confessions: true,
  });
  const [errorState, setErrorState] = useState({
    stories: "",
    confessions: "",
  });

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const getBookmarkData = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    return [];
  };

  const mapStoryBookmarks = useCallback((stories) => {
    return stories.map((story) => {
      const authorId = normalizeId(story.authorId);
      const authorSeed = String(
        authorId || story.authorDisplayName || story.authorName || "author",
      );

      return {
        id: String(story._id),
        author:
          story.authorDisplayName ||
          `Author ${authorSeed.slice(-4).toUpperCase()}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorSeed)}`,
        genre: story.genres?.[0]?.toUpperCase() || "GENERAL",
        time: getRelativeTime(story.publishedAt || story.createdAt),
        title: story.title || "Untitled Story",
        excerpt:
          story.summary ||
          story.content?.slice(0, 180) ||
          "No preview is available for this story.",
        likes: formatCount(Number(story.likesCount || 0)),
        comments: formatCount(Number(story.commentCount || 0)),
      };
    });
  }, []);

  const mapConfessionBookmarks = useCallback((confessions) => {
    return confessions.map((confession) => {
      return {
        id: String(confession._id),
        _id: String(confession._id),
        authorId: confession.authorId,
        authorDisplayName: confession.authorDisplayName || "Anonymous",
        authorProfilePicture: confession.authorProfilePicture || "",
        isAnonymous: Boolean(confession.isAnonymous),
        tags: Array.isArray(confession.tags) ? confession.tags : [],
        content: confession.content || "",
        createdAt: confession.createdAt,
        isEdited: Boolean(confession.updatedAt),
        likedByCurrentUser: Boolean(confession.likedByCurrentUser),
        savedByCurrentUser: true,
        likesCount: Number(confession.likesCount || 0),
        commentCount: Number(confession.commentCount || 0),
      };
    });
  }, []);

  const loadStoryBookmarks = useCallback(async () => {
    setErrorState((prev) => ({ ...prev, stories: "" }));
    setLoadingState((prev) => ({ ...prev, stories: true }));

    try {
      const response = await fetch("/api/stories/bookmarks/me?limit=50", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to load stories");
      }

      const payload = await response.json();
      const stories = getBookmarkData(payload);
      setStoryBookmarks(mapStoryBookmarks(stories));
    } catch {
      setErrorState((prev) => ({
        ...prev,
        stories: "Unable to load story bookmarks right now.",
      }));
      setStoryBookmarks([]);
    } finally {
      setLoadingState((prev) => ({ ...prev, stories: false }));
    }
  }, [getAuthHeaders, mapStoryBookmarks]);

  const loadConfessionBookmarks = useCallback(async () => {
    setErrorState((prev) => ({ ...prev, confessions: "" }));
    setLoadingState((prev) => ({ ...prev, confessions: true }));

    try {
      const response = await fetch("/api/confessions/bookmarks/me?limit=50", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to load confessions");
      }

      const payload = await response.json();
      const confessions = getBookmarkData(payload);
      setConfessionBookmarks(mapConfessionBookmarks(confessions));
    } catch {
      setErrorState((prev) => ({
        ...prev,
        confessions: "Unable to load confession bookmarks right now.",
      }));
      setConfessionBookmarks([]);
    } finally {
      setLoadingState((prev) => ({ ...prev, confessions: false }));
    }
  }, [getAuthHeaders, mapConfessionBookmarks]);

  const loadBookmarks = useCallback(async () => {
    await Promise.all([loadStoryBookmarks(), loadConfessionBookmarks()]);
  }, [loadStoryBookmarks, loadConfessionBookmarks]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleUnsave = useCallback(
    async (itemId) => {
      const itemIdText = String(itemId);

      const previousStoryBookmarks = storyBookmarks;
      const previousConfessionBookmarks = confessionBookmarks;

      if (activeType === "stories") {
        setStoryBookmarks((prev) =>
          prev.filter((story) => String(story.id) !== itemIdText),
        );
      } else {
        setConfessionBookmarks((prev) =>
          prev.filter((confession) => {
            const confessionId = String(confession.id || confession._id || "");
            return confessionId !== itemIdText;
          }),
        );
      }

      try {
        const endpoint =
          activeType === "stories"
            ? `/api/stories/${itemId}/bookmark`
            : `/api/confessions/${itemId}/bookmark`;

        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to remove bookmark");
        }
      } catch {
        if (activeType === "stories") {
          setStoryBookmarks(previousStoryBookmarks);
        } else {
          setConfessionBookmarks(previousConfessionBookmarks);
        }

        setErrorState((prev) => ({
          ...prev,
          [activeType]: "Unable to update bookmarks.",
        }));
      }
    },
    [activeType, confessionBookmarks, getAuthHeaders, storyBookmarks],
  );

  const handleToggleExpandedConfession = useCallback((confessionId) => {
    setExpandedConfessionIds((prev) => ({
      ...prev,
      [confessionId]: !prev[confessionId],
    }));
  }, []);

  const handleOpenConfessionComments = useCallback((confessionId) => {
    globalThis.location.href = `/confession#confession-${confessionId}`;
  }, []);

  const handleToggleConfessionLike = useCallback(
    async (confessionId) => {
      setPressedLikeId(confessionId);
      setTimeout(() => {
        setPressedLikeId((current) =>
          current === confessionId ? null : current,
        );
      }, 170);

      const previousConfessions = confessionBookmarks;

      setConfessionBookmarks((prev) =>
        prev.map((item) => {
          if (String(item._id) !== String(confessionId)) {
            return item;
          }

          const likedByCurrentUser = !item.likedByCurrentUser;
          const likesCount = Math.max(
            0,
            Number(item.likesCount || 0) + (likedByCurrentUser ? 1 : -1),
          );

          return {
            ...item,
            likedByCurrentUser,
            likesCount,
          };
        }),
      );

      try {
        const response = await fetch(
          `/api/confessions/${confessionId}/toggle-like`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to toggle confession like");
        }

        const payload = await response.json();

        setConfessionBookmarks((prev) =>
          prev.map((item) => {
            if (String(item._id) !== String(confessionId)) {
              return item;
            }

            return {
              ...item,
              likedByCurrentUser: Boolean(payload.likedByCurrentUser),
              likesCount: Number(payload.likesCount || item.likesCount || 0),
            };
          }),
        );
      } catch {
        setConfessionBookmarks(previousConfessions);
      }
    },
    [confessionBookmarks, getAuthHeaders],
  );

  const handleToggleConfessionBookmark = useCallback(
    async (confessionId) => {
      setPressedBookmarkId(confessionId);
      setTimeout(() => {
        setPressedBookmarkId((current) =>
          current === confessionId ? null : current,
        );
      }, 170);

      await handleUnsave(confessionId);
    },
    [handleUnsave],
  );

  const activeBookmarks =
    activeType === "stories" ? storyBookmarks : confessionBookmarks;
  const isLoading = loadingState[activeType];
  const errorMessage = errorState[activeType];

  const handleRetry = useCallback(() => {
    if (activeType === "stories") {
      loadStoryBookmarks();
      return;
    }

    loadConfessionBookmarks();
  }, [activeType, loadStoryBookmarks, loadConfessionBookmarks]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Navbar */}
        <Navbar title="Saved Items" />

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  {activeType === "stories"
                    ? "Saved Stories"
                    : "Saved Confessions"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {activeType === "stories"
                    ? "Your bookmarked reads in one focused view."
                    : "Your bookmarked confessions in one focused view."}
                </p>
              </div>

              <div className="mb-6 flex w-full gap-3 rounded-full bg-linear-to-r from-indigo-50 to-pink-50 p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setActiveType("stories")}
                  className={`w-full rounded-full py-2.5 text-sm font-medium transition-all duration-200 ${
                    activeType === "stories"
                      ? "bg-white text-indigo-700 shadow-md shadow-indigo-200/50"
                      : "text-gray-500 hover:bg-white/60 hover:text-indigo-500"
                  }`}
                >
                  📖 Stories ({storyBookmarks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType("confessions")}
                  className={`w-full rounded-full py-2.5 text-sm font-medium transition-all duration-200 ${
                    activeType === "confessions"
                      ? "bg-white text-rose-700 shadow-md shadow-rose-200/50"
                      : "text-gray-500 hover:bg-white/60 hover:text-rose-500"
                  }`}
                >
                  💬 Confessions ({confessionBookmarks.length})
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                {isLoading && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                    Loading {activeType} bookmarks...
                  </div>
                )}

                {!isLoading && errorMessage && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm">
                    <p className="text-sm text-rose-600 mb-3">{errorMessage}</p>
                    <button
                      className="text-xs font-semibold text-rose-600 hover:underline"
                      onClick={handleRetry}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoading &&
                  !errorMessage &&
                  activeBookmarks.length === 0 && (
                    <div className="relative flex-1 min-h-70 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-rose-100/80 blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-100/80 blur-2xl" />

                      <div className="relative h-full flex items-center justify-center px-6 py-10 sm:px-10">
                        <div className="w-full max-w-xl text-center flex flex-col items-center">
                          <div className="mb-4 inline-flex items-center justify-center">
                            {activeType === "stories" ? (
                              <BookOpenText
                                size={56}
                                className="text-rose-500"
                              />
                            ) : (
                              <MessageSquareQuote
                                size={56}
                                className="text-rose-500"
                              />
                            )}
                          </div>

                          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            <Sparkles size={12} className="text-amber-500" />
                            Your Collection Is Waiting
                          </p>

                          <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                            {activeType === "stories"
                              ? "No bookmarked stories yet"
                              : "No bookmarked confessions yet"}
                          </h3>

                          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                            {activeType === "stories"
                              ? "Every story that catches your eye deserves a place to wait for you. We’ll save it right here! Neatly, waiting, and ready for your return."
                              : "Some secrets ask to be kept. This is where they wait."}
                          </p>

                          <div className="mt-5">
                            <a
                              href={
                                activeType === "stories"
                                  ? "/home"
                                  : "/confession"
                              }
                              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                            >
                              {activeType === "stories"
                                ? "Explore Stories"
                                : "Explore Confessions"}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {!isLoading &&
                  !errorMessage &&
                  (activeType === "stories"
                    ? activeBookmarks.map((post) => (
                        <PostCard
                          key={post.id}
                          {...post}
                          onUnsave={handleUnsave}
                        />
                      ))
                    : activeBookmarks.map((item, index) => (
                        <ConfessionFeedCard
                          key={String(item._id)}
                          item={item}
                          index={index}
                          expandedConfessionIds={expandedConfessionIds}
                          pressedLikeId={pressedLikeId}
                          pressedBookmarkId={pressedBookmarkId}
                          onToggleExpandedConfession={
                            handleToggleExpandedConfession
                          }
                          onToggleLike={handleToggleConfessionLike}
                          onOpenCommentModal={handleOpenConfessionComments}
                          onToggleBookmark={handleToggleConfessionBookmark}
                        />
                      )))}
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
