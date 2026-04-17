import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Heart, MessageCircle, Bookmark, Share2, User } from "lucide-react";
import {
  getMyBookmarkedStories,
  removeStoryBookmark,
} from "../api/story/storyInteractionsApi";
import { getProfileByUserId } from "../api/profile";
import { getStoryById } from "../api/story/storyApi";

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
  tags,
  avatar,
  genre,
  time,
  title,
  excerpt,
  content,
  likes,
  comments,
  likedByCurrentUser,
  savedByCurrentUser,
  commentsActive,
  isExpanded,
  onToggleLike,
  onOpenComments,
  onToggleBookmark,
  onToggleExpandedStory,
  onTagClick,
  activeTag,
}) => (
  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
    {/* Header */}
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={20} className="text-slate-400" />
          )}
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
    </div>

    {/* Content */}
    <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
      {title}
    </h2>

    <p className="text-slate-600 text-sm leading-relaxed">
      {isExpanded ? content || excerpt : excerpt}
    </p>

    {content && content.length > excerpt.length && (
      <button
        type="button"
        onClick={() => onToggleExpandedStory(id)}
        className="mt-2 mb-6 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
      >
        {isExpanded ? "Show less" : "Read more"}
      </button>
    )}

    {!(content && content.length > excerpt.length) && <div className="mb-6" />}

    {Array.isArray(tags) && tags.length > 0 && (
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {tags.slice(0, 4).map((tag) => (
          <button
            key={`${id}-${tag}`}
            type="button"
            onClick={() => onTagClick?.({ tag, storyId: id })}
            className={`text-xs font-semibold tracking-wide cursor-pointer transition-colors ${
              activeTag === tag
                ? "text-rose-700 underline underline-offset-2"
                : "text-rose-600 hover:underline hover:underline-offset-2"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>
    )}

    {/* Actions */}
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-6 min-w-0">
        <button
          onClick={() => onToggleLike(id)}
          className={`flex items-center cursor-pointer gap-2 transition-all duration-200 ${
            likedByCurrentUser
              ? "text-rose-500"
              : "text-slate-500 hover:text-rose-500"
          }`}
        >
          <Heart
            size={20}
            fill={likedByCurrentUser ? "currentColor" : "none"}
          />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        <button
          onClick={() => onOpenComments(id)}
          className={`flex items-center cursor-pointer gap-2 transition-all duration-200 ${
            commentsActive
              ? "text-sky-500"
              : "text-slate-500 hover:text-sky-500"
          }`}
        >
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{comments}</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onUnsave(id)}
          className="text-rose-500 hover:text-rose-600 transition-colors"
          aria-label="Remove bookmark"
        >
          <Bookmark size={20} fill="currentColor" />
        </button>
        <button className="text-slate-500 hover:text-slate-900" type="button">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  </div>
);

/* -------------------- Bookmarks Page -------------------- */
export default function Bookmarks() {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

    try {
      const abortController = new AbortController();
      const savedStoryIds = JSON.parse(
        localStorage.getItem("savedStoryIds") || "[]",
      );

      const backendResult = await getMyBookmarkedStories({
        signal: abortController.signal,
      });

      const backendStories = Array.isArray(backendResult?.data)
        ? backendResult.data
        : [];

      const localStories =
        backendStories.length > 0 || !Array.isArray(savedStoryIds)
          ? []
          : await Promise.allSettled(
              savedStoryIds.map((storyId) =>
                getStoryById(storyId, abortController.signal),
              ),
            ).then((results) =>
              results
                .filter(
                  (result) => result.status === "fulfilled" && result.value,
                )
                .map((result) => result.value),
            );

      const combinedStories = [...backendStories];
      localStories.forEach((story) => {
        const storyId = String(story._id);
        if (
          !combinedStories.some((existing) => String(existing._id) === storyId)
        ) {
          combinedStories.push(story);
        }
      });

      if (combinedStories.length === 0) {
        setStories([]);
        return;
      }

      const uniqueAuthorIds = [
        ...new Set(
          combinedStories.map((story) => story.authorId).filter(Boolean),
        ),
      ];

      const profiles = {};
      const profileResponses = await Promise.allSettled(
        uniqueAuthorIds.map((authorId) => getProfileByUserId(authorId)),
      );

      profileResponses.forEach((response, index) => {
        if (response.status === "fulfilled" && response.value) {
          profiles[uniqueAuthorIds[index]] = response.value;
        }
      });

      const mapped = combinedStories.map((story) => {
        const authorId = normalizeId(story.authorId);
        const profile = profiles[authorId];

        return {
          id: String(story._id),
          author:
            profile?.displayName ||
            story.authorDisplayName ||
            "Anonymous Author",
          avatar: profile?.profilePicture || null,
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

      setStories(mapped);
    } catch (error) {
      if (error.name !== "AbortError") {
        setErrorMessage("Unable to load bookmarks right now.");
        console.error(error);
      }
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

  const handleUnsave = useCallback(async (storyId) => {
    try {
      await removeStoryBookmark(storyId);
      const nextSavedIds = JSON.parse(
        localStorage.getItem("savedStoryIds") || "[]",
      ).filter((id) => String(id) !== String(storyId));
      localStorage.setItem("savedStoryIds", JSON.stringify(nextSavedIds));
      setStories((prev) => prev.filter((story) => story.id !== storyId));
    } catch (error) {
      setErrorMessage("Failed to remove bookmark.");
      console.error(error);
    }
  }, []);

  const handleOpenStoryComments = useCallback(
    (storyId) => {
      setActiveStoryCommentId(storyId);

      const current = storyCommentsById[storyId];
      if (!current?.loaded && !current?.loading) {
        loadStoryComments(storyId);
      }
    },
    [loadStoryComments, storyCommentsById],
  );

  const handleCloseStoryComments = useCallback(() => {
    setActiveStoryCommentId(null);
  }, []);

  const handleCommentInputChange = useCallback((storyId, input) => {
    setStoryCommentsById((prev) => ({
      ...prev,
      [storyId]: {
        ...(prev[storyId] || {
          loaded: true,
          loading: false,
          error: "",
          items: [],
        }),
        input,
      },
    }));
  }, []);

  const handleSubmitStoryComment = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorState((prev) => ({
          ...prev,
          stories: "Please log in to comment.",
        }));
        return;
      }

      const current = storyCommentsById[storyId];
      const content = current?.input?.trim();
      if (!content) return;

      setStoryCommentsById((prev) => ({
        ...prev,
        [storyId]: {
          ...prev[storyId],
          submitting: true,
          error: "",
        },
      }));

      try {
        const response = await fetch(`/api/stories/${storyId}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const newComment = {
          _id: payload.commentId || `${Date.now()}`,
          userId: null,
          authorDisplayName: currentUserName(),
          content,
          createdAt: new Date().toISOString(),
        };

        setStoryCommentsById((prev) => ({
          ...prev,
          [storyId]: {
            ...prev[storyId],
            submitting: false,
            input: "",
            loaded: true,
            items: [newComment, ...(prev[storyId]?.items || [])],
          },
        }));

        setStoryBookmarks((prev) =>
          prev.map((story) =>
            story.id === storyId
              ? {
                  ...story,
                  commentCount: Number(story.commentCount || 0) + 1,
                  comments: formatCount(Number(story.commentCount || 0) + 1),
                }
              : story,
          ),
        );
      } catch {
        setStoryCommentsById((prev) => ({
          ...prev,
          [storyId]: {
            ...prev[storyId],
            submitting: false,
            error: "Failed to post comment.",
          },
        }));
      }
    },
    [currentUserName, storyCommentsById],
  );

  const handleToggleStoryLike = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorState((prev) => ({
          ...prev,
          stories: "Please log in to like stories.",
        }));
        return;
      }

      const previousStory = storyBookmarks.find(
        (story) => story.id === storyId,
      );

      setStoryBookmarks((prev) =>
        prev.map((story) => {
          if (story.id !== storyId) return story;

          const likedByCurrentUser = !story.likedByCurrentUser;
          const likesCount = Math.max(
            0,
            Number(story.likesCount || 0) + (likedByCurrentUser ? 1 : -1),
          );

          return {
            ...story,
            likedByCurrentUser,
            likesCount,
            likes: formatCount(likesCount),
          };
        }),
      );

      try {
        const response = await fetch(`/api/stories/${storyId}/toggle-like`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();

        setStoryBookmarks((prev) =>
          prev.map((story) =>
            story.id === storyId
              ? {
                  ...story,
                  likedByCurrentUser: Boolean(payload.likedByCurrentUser),
                  likesCount: Number(payload.likesCount || 0),
                  likes: formatCount(Number(payload.likesCount || 0)),
                }
              : story,
          ),
        );
      } catch {
        if (previousStory) {
          setStoryBookmarks((prev) =>
            prev.map((story) =>
              story.id === storyId
                ? {
                    ...story,
                    likedByCurrentUser: previousStory.likedByCurrentUser,
                    likesCount: previousStory.likesCount,
                    likes: previousStory.likes,
                  }
                : story,
            ),
          );
        }
      }
    },
    [storyBookmarks],
  );

  const handleToggleStoryBookmark = useCallback(
    async (storyId) => {
      await handleUnsave(storyId);
    },
    [handleUnsave],
  );

  const handleOpenConfessionComments = useCallback(
    (confessionId) => {
      navigate(`/confession#confession-${confessionId}`);
    },
    [navigate],
  );

  const handleToggleConfessionLike = useCallback(
    async (confessionId) => {
      setPressedLikeId(confessionId);

      const timeoutKey = String(confessionId);
      if (timeoutRefs.current[timeoutKey]) {
        clearTimeout(timeoutRefs.current[timeoutKey]);
      }

      timeoutRefs.current[timeoutKey] = setTimeout(() => {
        setPressedLikeId((current) =>
          current === confessionId ? null : current,
        );
        delete timeoutRefs.current[timeoutKey];
      }, 170);

      const previousConfession = confessionBookmarks.find(
        (item) => String(item._id) === String(confessionId),
      );

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
        if (previousConfession) {
          setConfessionBookmarks((prev) =>
            prev.map((item) =>
              String(item._id) === String(confessionId)
                ? {
                    ...item,
                    likedByCurrentUser: previousConfession.likedByCurrentUser,
                    likesCount: previousConfession.likesCount,
                  }
                : item,
            ),
          );
        }
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
  const visibleStoryBookmarks = activeStoryTag
    ? storyBookmarks.filter((story) =>
        Array.isArray(story.tags) ? story.tags.includes(activeStoryTag) : false,
      )
    : storyBookmarks;
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
                  className={`w-full rounded-full py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 ${
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
                  className={`w-full rounded-full py-2.5 text-sm font-medium cursor-pointer transition-all duration-200 ${
                    activeType === "confessions"
                      ? "bg-white text-rose-700 shadow-md shadow-rose-200/50"
                      : "text-gray-500 hover:bg-white/60 hover:text-rose-500"
                  }`}
                >
                  💬 Confessions ({confessionBookmarks.length})
                </button>
              </div>

              {!isLoading && !errorMessage && stories.length === 0 && (
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                  No bookmarked stories yet.
                </div>
              )}

              {!isLoading &&
                !errorMessage &&
                stories.map((post) => (
                  <PostCard key={post.id} {...post} onUnsave={handleUnsave} />
                ))}
            </div>

            {activeType === "stories" && activeStoryCommentId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Close comments"
                  onClick={handleCloseStoryComments}
                  className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                />
                <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-semibold text-slate-900">Comments</h3>
                      <p className="text-xs text-slate-400 truncate max-w-65">
                        {storyBookmarks.find(
                          (story) => story.id === activeStoryCommentId,
                        )?.title || "Story comments"}
                      </p>
                    </div>
                    <button
                      onClick={handleCloseStoryComments}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {storyCommentsById[activeStoryCommentId]?.loading && (
                      <p className="text-xs text-slate-500">
                        Loading comments...
                      </p>
                    )}

                    {!storyCommentsById[activeStoryCommentId]?.loading &&
                      storyCommentsById[activeStoryCommentId]?.error && (
                        <p className="text-xs text-red-500">
                          {storyCommentsById[activeStoryCommentId]?.error}
                        </p>
                      )}

                    {!storyCommentsById[activeStoryCommentId]?.loading &&
                      !storyCommentsById[activeStoryCommentId]?.error &&
                      (storyCommentsById[activeStoryCommentId]?.items || [])
                        .length === 0 && (
                        <p className="text-xs text-gray-500">
                          No comments yet. Be the first to comment.
                        </p>
                      )}

                    {!storyCommentsById[activeStoryCommentId]?.loading &&
                      !storyCommentsById[activeStoryCommentId]?.error &&
                      (
                        storyCommentsById[activeStoryCommentId]?.items || []
                      ).map((comment) => (
                        <div
                          key={String(comment._id)}
                          className="rounded-xl bg-gray-50 px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-slate-700 mb-1">
                            {comment.authorDisplayName || "Anonymous"}
                          </p>
                          <p className="text-sm text-slate-700">
                            {comment.content}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {getRelativeTime(comment.createdAt)}
                          </p>
                        </div>
                      ))}
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmitStoryComment(activeStoryCommentId);
                    }}
                    className="px-5 py-4 border-t border-slate-100 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={
                        storyCommentsById[activeStoryCommentId]?.input || ""
                      }
                      onChange={(event) =>
                        handleCommentInputChange(
                          activeStoryCommentId,
                          event.target.value,
                        )
                      }
                      placeholder="Write a comment..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                    />
                    <button
                      type="submit"
                      disabled={
                        storyCommentsById[activeStoryCommentId]?.submitting
                      }
                      className="rounded-xl bg-rose-500 text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      {storyCommentsById[activeStoryCommentId]?.submitting
                        ? "Posting..."
                        : "Post"}
                    </button>
                  </form>
                </div>
              </div>
            )}
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
