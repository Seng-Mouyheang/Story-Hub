import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Heart, MessageCircle, Bookmark, User, Loader2, X } from "lucide-react";
import {
  getMyBookmarkedStories,
  removeStoryBookmark,
  toggleStoryLike,
} from "../api/story/storyInteractionsApi";
import {
  addStoryComment,
  deleteStoryComment,
  getStoryComments,
  updateStoryComment,
} from "../api/story/storyCommentsApi";
import { getProfileByUserId } from "../api/profile";
import {
  getBookmarkedConfessions,
  removeConfessionBookmark,
} from "../api/confession/confessionBookmarkApi";
import ConfessionModalCommentItem from "./confession/ConfessionModalCommentItem";
import { useOutsideClickCloser } from "./confession/useOutsideClickCloser";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseApiResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
};

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

const getContentPreview = (content, isExpanded, maxLength = 220) => {
  const text = String(content || "").trim();

  if (text.length <= maxLength) {
    return {
      visibleContent: text,
      isLongContent: false,
    };
  }

  return {
    visibleContent: isExpanded ? text : `${text.slice(0, maxLength).trim()}...`,
    isLongContent: true,
  };
};

const PostCard = ({
  id,
  author,
  authorId,
  avatar,
  genres,
  genre,
  tags,
  time,
  title,
  content,
  isExpanded,
  likesCount,
  commentCount,
  likedByCurrentUser,
  onUnsave,
  onToggleLike,
  onOpenComments,
  onToggleExpanded,
}) => {
  const [areGenresExpanded, setAreGenresExpanded] = useState(false);
  const genreDisplayLimit = 5;
  const storyGenres =
    Array.isArray(genres) && genres.length > 0
      ? genres
      : [String(genre || "GENERAL")];
  const visibleGenres = areGenresExpanded
    ? storyGenres
    : storyGenres.slice(0, genreDisplayLimit);
  const hiddenGenreCount = Math.max(storyGenres.length - genreDisplayLimit, 0);

  const { visibleContent, isLongContent } = getContentPreview(
    content,
    isExpanded,
  );

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={authorId ? `/profile/${authorId}` : "/profile"}
            className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label={`View ${author} profile`}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} className="text-slate-400" />
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <Link
                to={authorId ? `/profile/${authorId}` : "/profile"}
                className="font-semibold text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {author}
              </Link>
              <span className="text-slate-400 text-xs">• {time}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {visibleGenres.map((storyGenre, index) => (
                <span
                  key={`${id}-genre-${String(storyGenre)}-${index}`}
                  className="inline-flex items-center gap-2"
                >
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[10px] font-semibold text-rose-400"
                    >
                      •
                    </span>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                    {storyGenre}
                  </span>
                </span>
              ))}

              {hiddenGenreCount > 0 && !areGenresExpanded && (
                <button
                  type="button"
                  onClick={() => setAreGenresExpanded(true)}
                  className="text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-rose-600 transition-colors hover:text-rose-700"
                  aria-label={`Show ${hiddenGenreCount} more genres`}
                >
                  +{hiddenGenreCount}
                </button>
              )}

              {hiddenGenreCount > 0 && areGenresExpanded && (
                <button
                  type="button"
                  onClick={() => setAreGenresExpanded(false)}
                  className="text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-slate-500 transition-colors hover:text-slate-700"
                  aria-label="Collapse genres"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
        {title}
      </h2>

      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-2">
        {visibleContent}
      </p>

      {isLongContent ? (
        <button
          type="button"
          onClick={() => onToggleExpanded(id)}
          className="mb-6 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      ) : (
        <div className="mb-6" />
      )}

      {Array.isArray(tags) && tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={`${id}-${tag}`}
              className="text-xs font-semibold tracking-wide text-rose-600"
            >
              #
              {String(tag || "")
                .trim()
                .replace(/^#/, "")
                .replaceAll(/\s+/g, "")}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-6 min-w-0">
          <button
            type="button"
            onClick={() => onToggleLike(id)}
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              likedByCurrentUser
                ? "text-rose-500"
                : "text-slate-500 hover:text-rose-500"
            }`}
          >
            <Heart
              size={20}
              fill={likedByCurrentUser ? "currentColor" : "none"}
            />
            <span className="text-sm font-medium">
              {formatCount(Number(likesCount || 0))}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenComments(id)}
            className="flex items-center gap-2 text-slate-500 cursor-pointer hover:text-sky-500 transition-colors"
          >
            <MessageCircle size={20} />
            <span className="text-sm font-medium">
              {formatCount(Number(commentCount || 0))}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onUnsave(id)}
            className="text-rose-500 cursor-pointer hover:text-rose-600 transition-colors"
            aria-label="Remove bookmark"
          >
            <Bookmark size={20} fill="currentColor" />
          </button>
          <button
            className="text-slate-500 cursor-pointer hover:text-slate-900"
            type="button"
          >
            {/* share button removed */}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfessionCard = ({
  id,
  author,
  authorId,
  avatar,
  isAnonymous,
  time,
  content,
  tags,
  isExpanded,
  likesCount,
  commentCount,
  likedByCurrentUser,
  onUnsave,
  onToggleLike,
  onOpenComments,
  onToggleExpanded,
}) => {
  const originalAuthor = author || "Unknown Author";
  const displayAuthor = isAnonymous ? "Anonymous" : originalAuthor;
  const authorSeed = String(displayAuthor || "author");
  const avatarSrc =
    !isAnonymous && avatar
      ? avatar
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorSeed)}`;
  const { visibleContent, isLongContent } = getContentPreview(
    content,
    isExpanded,
  );

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {!isAnonymous && authorId ? (
            <Link
              to={`/profile/${authorId}`}
              className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              aria-label={`View ${displayAuthor} profile`}
            >
              <img
                src={avatarSrc}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={avatarSrc}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              {!isAnonymous && authorId ? (
                <Link
                  to={`/profile/${authorId}`}
                  className="font-semibold text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  {displayAuthor}
                </Link>
              ) : (
                <h3 className="font-semibold text-slate-900 truncate">
                  {displayAuthor}
                </h3>
              )}
              <span className="text-slate-400 text-xs">• {time}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-2">
        {visibleContent}
      </p>

      {isLongContent ? (
        <button
          type="button"
          onClick={() => onToggleExpanded(id)}
          className="mb-6 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      ) : (
        <div className="mb-6" />
      )}

      {Array.isArray(tags) && tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={`${id}-${tag}`}
              className="text-xs font-semibold tracking-wide text-rose-600"
            >
              #
              {String(tag || "")
                .trim()
                .replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-6 min-w-0">
          <button
            type="button"
            onClick={() => onToggleLike(id)}
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              likedByCurrentUser
                ? "text-rose-500"
                : "text-slate-500 hover:text-rose-500"
            }`}
          >
            <Heart
              size={20}
              fill={likedByCurrentUser ? "currentColor" : "none"}
            />
            <span className="text-sm font-medium">
              {formatCount(Number(likesCount || 0))}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenComments(id)}
            className="flex items-center gap-2 text-slate-500 cursor-pointer hover:text-sky-500 transition-colors"
          >
            <MessageCircle size={20} />
            <span className="text-sm font-medium">
              {formatCount(Number(commentCount || 0))}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onUnsave(id)}
            className="text-rose-500 cursor-pointer hover:text-rose-600 transition-colors"
            aria-label="Remove bookmark"
          >
            <Bookmark size={20} fill="currentColor" />
          </button>
          <button
            className="text-slate-500 cursor-pointer hover:text-slate-900"
            type="button"
          >
            {/* share button removed */}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Bookmarks() {
  const [stories, setStories] = useState([]);
  const [expandedStoryIds, setExpandedStoryIds] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeCommentStoryId, setActiveCommentStoryId] = useState("");
  const [commentsByStory, setCommentsByStory] = useState({});
  const [activeCommentConfessionId, setActiveCommentConfessionId] =
    useState("");
  const [commentsByConfession, setCommentsByConfession] = useState({});
  const [editingStoryCommentId, setEditingStoryCommentId] = useState("");
  const [editingStoryCommentContent, setEditingStoryCommentContent] =
    useState("");
  const [savingStoryComment, setSavingStoryComment] = useState(false);
  const [deletingStoryCommentId, setDeletingStoryCommentId] = useState("");
  const [activeStoryCommentMenuId, setActiveStoryCommentMenuId] = useState("");
  const [deleteTargetStoryCommentId, setDeleteTargetStoryCommentId] =
    useState("");

  const [editingConfessionCommentId, setEditingConfessionCommentId] =
    useState("");
  const [editingConfessionCommentContent, setEditingConfessionCommentContent] =
    useState("");
  const [savingConfessionComment, setSavingConfessionComment] = useState(false);
  const [deletingConfessionCommentId, setDeletingConfessionCommentId] =
    useState("");
  const [activeConfessionCommentMenuId, setActiveConfessionCommentMenuId] =
    useState("");
  const [deleteTargetConfessionCommentId, setDeleteTargetConfessionCommentId] =
    useState("");

  const [confessions, setConfessions] = useState([]);
  const [expandedConfessionIds, setExpandedConfessionIds] = useState({});
  const [isLoadingConfessions, setIsLoadingConfessions] = useState(true);
  const [confessionError, setConfessionError] = useState("");

  const [activeTab, setActiveTab] = useState("stories");

  const currentUserId = useMemo(() => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      return normalizeId(currentUser?.id || currentUser?._id || "");
    } catch {
      return "";
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    setErrorMessage("");
    setIsLoading(true);

    const abortController = new AbortController();

    try {
      const backendResult = await getMyBookmarkedStories({
        signal: abortController.signal,
      });

      const backendStories = Array.isArray(backendResult?.data)
        ? backendResult.data
        : [];

      if (backendStories.length === 0) {
        setStories([]);
        return;
      }

      const uniqueAuthorIds = [
        ...new Set(
          backendStories
            .map((story) => normalizeId(story.authorId))
            .filter(Boolean),
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

      const mapped = backendStories.map((story) => {
        const authorId = normalizeId(story.authorId);
        const profile = profiles[authorId];

        return {
          id: String(story._id),
          authorId,
          author:
            profile?.displayName ||
            story.authorDisplayName ||
            "Anonymous Author",
          avatar: profile?.profilePicture || null,
          genres:
            Array.isArray(story.genres) && story.genres.length > 0
              ? story.genres.map((item) => String(item).toUpperCase())
              : ["GENERAL"],
          genre: story.genres?.[0]?.toUpperCase() || "GENERAL",
          tags: Array.isArray(story.tags) ? story.tags : [],
          time: getRelativeTime(story.publishedAt || story.createdAt),
          title: story.title || "Untitled Story",
          content:
            story.summary ||
            story.content ||
            "No preview is available for this story.",
          likesCount: Number(story.likesCount || 0),
          commentCount: Number(story.commentCount || 0),
          likedByCurrentUser: Boolean(story.likedByCurrentUser),
        };
      });

      setStories(mapped);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setErrorMessage("Unable to load bookmarks right now.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBookmarkedConfessions = useCallback(async () => {
    setConfessionError("");
    setIsLoadingConfessions(true);
    try {
      const result = await getBookmarkedConfessions({ limit: 20 });
      const data = Array.isArray(result?.data) ? result.data : [];
      setConfessions(
        data.map((conf) => ({
          id: String(conf._id),
          authorId: normalizeId(conf.authorId),
          author: conf.isAnonymous
            ? "Anonymous"
            : conf.authorDisplayName || conf.author || "Unknown Author",
          avatar: conf.authorProfilePicture || null,
          isAnonymous: Boolean(conf.isAnonymous),
          time: getRelativeTime(conf.publishedAt || conf.createdAt),
          content:
            conf.content || "No preview is available for this confession.",
          tags: Array.isArray(conf.tags) ? conf.tags : [],
          likesCount: Number(conf.likesCount || 0),
          commentCount: Number(conf.commentCount || 0),
          likedByCurrentUser: Boolean(conf.likedByCurrentUser),
        })),
      );
    } catch (error) {
      // Log error for debugging
      console.error("Confession bookmarks load error:", error);
      setConfessionError(
        error?.message || "Unable to load bookmarked confessions right now.",
      );
    } finally {
      setIsLoadingConfessions(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
    loadBookmarkedConfessions();
  }, [loadBookmarks, loadBookmarkedConfessions]);

  const handleUnsave = useCallback(async (storyId) => {
    try {
      await removeStoryBookmark(storyId);
      setStories((prev) => prev.filter((story) => story.id !== storyId));
      setExpandedStoryIds((prev) => {
        if (!prev[storyId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[storyId];
        return next;
      });
      setCommentsByStory((prev) => {
        if (!prev[storyId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[storyId];
        return next;
      });
      setActiveCommentStoryId((currentId) =>
        currentId === storyId ? "" : currentId,
      );
    } catch {
      setErrorMessage("Failed to remove bookmark.");
    }
  }, []);

  const loadStoryComments = useCallback(async (storyId) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...(prev[storyId] || {
          items: [],
          input: "",
          loaded: false,
          submitting: false,
        }),
        loading: true,
        error: "",
      },
    }));

    try {
      const payload = await getStoryComments(storyId, { limit: 10 });
      const comments = Array.isArray(payload?.comments) ? payload.comments : [];

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...(prev[storyId] || {
            input: "",
            submitting: false,
          }),
          loading: false,
          loaded: true,
          error: "",
          items: comments,
        },
      }));
    } catch {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...(prev[storyId] || {
            items: [],
            input: "",
            loaded: false,
            submitting: false,
          }),
          loading: false,
          error: "Unable to load comments.",
        },
      }));
    }
  }, []);

  const handleToggleLike = useCallback(async (storyId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Please login to react to stories.");
      return;
    }

    try {
      const payload = await toggleStoryLike(storyId);

      setStories((prev) =>
        prev.map((story) =>
          story.id === storyId
            ? {
                ...story,
                likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                likesCount: Number(payload?.likesCount || 0),
              }
            : story,
        ),
      );
    } catch {
      setErrorMessage("Failed to update reaction. Please try again.");
    }
  }, []);

  const handleOpenComments = useCallback(
    (storyId) => {
      setActiveCommentStoryId(storyId);

      const current = commentsByStory[storyId];
      if (!current?.loaded && !current?.loading) {
        loadStoryComments(storyId);
      }
    },
    [commentsByStory, loadStoryComments],
  );

  const handleCloseComments = useCallback(() => {
    setActiveCommentStoryId("");
    setActiveStoryCommentMenuId("");
    setEditingStoryCommentId("");
    setEditingStoryCommentContent("");
    setDeletingStoryCommentId("");
    setDeleteTargetStoryCommentId("");
  }, []);

  const handleCommentInputChange = useCallback((storyId, input) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...(prev[storyId] || {
          items: [],
          loaded: true,
          loading: false,
          error: "",
          submitting: false,
        }),
        input,
      },
    }));
  }, []);

  const handleSubmitComment = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Please login to comment.");
        return;
      }

      const currentState = commentsByStory[storyId] || {};
      const content = (currentState.input || "").trim();

      if (!content) {
        return;
      }

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...(prev[storyId] || {
            items: [],
            loaded: true,
            loading: false,
          }),
          submitting: true,
          error: "",
        },
      }));

      try {
        const payload = await addStoryComment(storyId, { content });

        let currentUsername = "You";
        let currentUserId = "";
        let currentProfilePicture = "";
        try {
          const currentUser = JSON.parse(
            localStorage.getItem("currentUser") || "null",
          );
          currentUsername =
            currentUser?.displayName ||
            currentUser?.username ||
            currentUser?.name ||
            "You";
          currentUserId = normalizeId(
            currentUser?.id || currentUser?._id || "",
          );
          currentProfilePicture = currentUser?.profilePicture || "";
        } catch {
          currentUsername = "You";
          currentUserId = "";
          currentProfilePicture = "";
        }

        const localComment = {
          _id: payload?.commentId || `${Date.now()}`,
          userId: currentUserId,
          authorDisplayName: currentUsername,
          authorProfilePicture: currentProfilePicture,
          content,
          createdAt: new Date().toISOString(),
        };

        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...(prev[storyId] || {
              items: [],
              loaded: true,
              loading: false,
            }),
            submitting: false,
            error: "",
            input: "",
            items: [localComment, ...(prev[storyId]?.items || [])],
          },
        }));

        setStories((prev) =>
          prev.map((story) =>
            story.id === storyId
              ? {
                  ...story,
                  commentCount: Number(story.commentCount || 0) + 1,
                }
              : story,
          ),
        );
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...(prev[storyId] || {
              items: [],
              loaded: true,
              loading: false,
            }),
            submitting: false,
            error: "Failed to post comment.",
          },
        }));
      }
    },
    [commentsByStory],
  );

  const activeCommentState = activeCommentStoryId
    ? commentsByStory[activeCommentStoryId] || {
        items: [],
        input: "",
        loading: false,
        loaded: false,
        error: "",
        submitting: false,
      }
    : null;

  const activeStory = stories.find(
    (story) => story.id === activeCommentStoryId,
  );

  const loadConfessionComments = useCallback(async (confessionId) => {
    setCommentsByConfession((prev) => ({
      ...prev,
      [confessionId]: {
        ...(prev[confessionId] || {
          items: [],
          input: "",
          loaded: false,
          submitting: false,
        }),
        loading: true,
        error: "",
      },
    }));

    try {
      const response = await fetch(
        `/api/confessions/${confessionId}/comments?limit=10`,
        {
          headers: getAuthHeaders(),
        },
      );

      const payload = await parseApiResponse(
        response,
        "Unable to load comments.",
      );
      const comments = Array.isArray(payload?.comments) ? payload.comments : [];

      setCommentsByConfession((prev) => ({
        ...prev,
        [confessionId]: {
          ...(prev[confessionId] || {
            input: "",
            submitting: false,
          }),
          loading: false,
          loaded: true,
          error: "",
          items: comments,
        },
      }));
    } catch (error) {
      setCommentsByConfession((prev) => ({
        ...prev,
        [confessionId]: {
          ...(prev[confessionId] || {
            items: [],
            input: "",
            loaded: false,
            submitting: false,
          }),
          loading: false,
          error: error?.message || "Unable to load comments.",
        },
      }));
    }
  }, []);

  const handleToggleLikeConfession = useCallback(async (confessionId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setConfessionError("Please login to react to confessions.");
      return;
    }

    try {
      const response = await fetch(
        `/api/confessions/${confessionId}/toggle-like`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );

      const payload = await parseApiResponse(
        response,
        "Failed to update reaction.",
      );

      setConfessions((prev) =>
        prev.map((confession) =>
          confession.id === confessionId
            ? {
                ...confession,
                likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                likesCount: Number(payload?.likesCount || 0),
              }
            : confession,
        ),
      );
    } catch (error) {
      setConfessionError(error?.message || "Failed to update reaction.");
    }
  }, []);

  const handleOpenConfessionComments = useCallback(
    (confessionId) => {
      setActiveCommentConfessionId(confessionId);

      const current = commentsByConfession[confessionId];
      if (!current?.loaded && !current?.loading) {
        loadConfessionComments(confessionId);
      }
    },
    [commentsByConfession, loadConfessionComments],
  );

  const handleCloseConfessionComments = useCallback(() => {
    setActiveCommentConfessionId("");
    setActiveConfessionCommentMenuId("");
    setEditingConfessionCommentId("");
    setEditingConfessionCommentContent("");
    setDeletingConfessionCommentId("");
    setDeleteTargetConfessionCommentId("");
  }, []);

  useOutsideClickCloser(
    Boolean(activeStoryCommentMenuId),
    () => setActiveStoryCommentMenuId(""),
    "[data-comment-menu]",
  );

  useOutsideClickCloser(
    Boolean(activeConfessionCommentMenuId),
    () => setActiveConfessionCommentMenuId(""),
    "[data-comment-menu]",
  );

  const handleToggleStoryCommentMenu = useCallback((commentId) => {
    setActiveStoryCommentMenuId((currentId) =>
      currentId === commentId ? "" : commentId,
    );
  }, []);

  const handleToggleConfessionCommentMenu = useCallback((commentId) => {
    setActiveConfessionCommentMenuId((currentId) =>
      currentId === commentId ? "" : commentId,
    );
  }, []);

  const handleConfessionCommentInputChange = useCallback(
    (confessionId, input) => {
      setCommentsByConfession((prev) => ({
        ...prev,
        [confessionId]: {
          ...(prev[confessionId] || {
            items: [],
            loaded: true,
            loading: false,
            error: "",
            submitting: false,
          }),
          input,
        },
      }));
    },
    [],
  );

  const handleSubmitConfessionComment = useCallback(
    async (confessionId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        setConfessionError("Please login to comment.");
        return;
      }

      const currentState = commentsByConfession[confessionId] || {};
      const content = (currentState.input || "").trim();

      if (!content) {
        return;
      }

      setCommentsByConfession((prev) => ({
        ...prev,
        [confessionId]: {
          ...(prev[confessionId] || {
            items: [],
            loaded: true,
            loading: false,
          }),
          submitting: true,
          error: "",
        },
      }));

      try {
        const response = await fetch(
          `/api/confessions/${confessionId}/comments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ content }),
          },
        );

        const payload = await parseApiResponse(
          response,
          "Failed to post comment.",
        );

        let currentUsername = "You";
        let currentProfilePicture = "";
        try {
          const currentUser = JSON.parse(
            localStorage.getItem("currentUser") || "null",
          );
          currentUsername =
            currentUser?.displayName ||
            currentUser?.username ||
            currentUser?.name ||
            "You";
          currentProfilePicture = currentUser?.profilePicture || "";
        } catch {
          currentUsername = "You";
          currentProfilePicture = "";
        }

        const localComment = {
          _id: payload?.commentId || `${Date.now()}`,
          authorDisplayName: currentUsername,
          authorProfilePicture: currentProfilePicture,
          content,
          createdAt: new Date().toISOString(),
        };

        setCommentsByConfession((prev) => ({
          ...prev,
          [confessionId]: {
            ...(prev[confessionId] || {
              items: [],
              loaded: true,
              loading: false,
            }),
            submitting: false,
            error: "",
            input: "",
            items: [localComment, ...(prev[confessionId]?.items || [])],
          },
        }));

        setConfessions((prev) =>
          prev.map((confession) =>
            confession.id === confessionId
              ? {
                  ...confession,
                  commentCount: Number(confession.commentCount || 0) + 1,
                }
              : confession,
          ),
        );
      } catch (error) {
        setCommentsByConfession((prev) => ({
          ...prev,
          [confessionId]: {
            ...(prev[confessionId] || {
              items: [],
              loaded: true,
              loading: false,
            }),
            submitting: false,
            error: error?.message || "Failed to post comment.",
          },
        }));
      }
    },
    [commentsByConfession],
  );

  const handleStartEditStoryComment = useCallback((comment) => {
    const commentId = String(comment?._id || comment?.id || "");
    setActiveStoryCommentMenuId("");
    setDeleteTargetStoryCommentId("");
    setEditingStoryCommentId(commentId);
    setEditingStoryCommentContent(comment?.content || "");
  }, []);

  const handleSaveStoryCommentEdit = useCallback(async () => {
    if (!editingStoryCommentId || savingStoryComment || !activeCommentStoryId) {
      return;
    }

    const content = editingStoryCommentContent.trim();
    if (!content) {
      setErrorMessage("Comment cannot be empty.");
      return;
    }

    setSavingStoryComment(true);

    try {
      await updateStoryComment(editingStoryCommentId, { content });

      setCommentsByStory((prev) => ({
        ...prev,
        [activeCommentStoryId]: {
          ...(prev[activeCommentStoryId] || {
            items: [],
            loaded: true,
            loading: false,
            input: "",
            submitting: false,
          }),
          items: (prev[activeCommentStoryId]?.items || []).map((comment) =>
            String(comment?._id || comment?.id || "") === editingStoryCommentId
              ? { ...comment, content, isEdited: true }
              : comment,
          ),
        },
      }));

      setEditingStoryCommentId("");
      setEditingStoryCommentContent("");
    } catch {
      setErrorMessage("Failed to update comment.");
    } finally {
      setSavingStoryComment(false);
    }
  }, [
    activeCommentStoryId,
    editingStoryCommentContent,
    editingStoryCommentId,
    savingStoryComment,
  ]);

  const handleDeleteStoryComment = useCallback((commentId) => {
    setActiveStoryCommentMenuId("");
    setEditingStoryCommentId("");
    setEditingStoryCommentContent("");
    setDeleteTargetStoryCommentId(commentId);
  }, []);

  const handleConfirmDeleteStoryComment = useCallback(async () => {
    if (
      !activeCommentStoryId ||
      !deleteTargetStoryCommentId ||
      deletingStoryCommentId
    ) {
      return;
    }

    const commentId = deleteTargetStoryCommentId;
    setDeletingStoryCommentId(commentId);

    try {
      await deleteStoryComment(commentId);

      setCommentsByStory((prev) => ({
        ...prev,
        [activeCommentStoryId]: {
          ...(prev[activeCommentStoryId] || {
            items: [],
            loaded: true,
            loading: false,
            input: "",
            submitting: false,
          }),
          items: (prev[activeCommentStoryId]?.items || []).filter(
            (comment) =>
              String(comment?._id || comment?.id || "") !== String(commentId),
          ),
        },
      }));

      setStories((prev) =>
        prev.map((story) =>
          story.id === activeCommentStoryId
            ? {
                ...story,
                commentCount: Math.max(0, Number(story.commentCount || 0) - 1),
              }
            : story,
        ),
      );

      if (editingStoryCommentId === String(commentId)) {
        setEditingStoryCommentId("");
        setEditingStoryCommentContent("");
      }

      setDeleteTargetStoryCommentId("");
    } catch {
      setErrorMessage("Failed to delete comment.");
    } finally {
      setDeletingStoryCommentId("");
    }
  }, [
    activeCommentStoryId,
    deleteTargetStoryCommentId,
    deletingStoryCommentId,
    editingStoryCommentId,
  ]);

  const handleStartEditConfessionComment = useCallback((comment) => {
    const commentId = String(comment?._id || comment?.id || "");
    setActiveConfessionCommentMenuId("");
    setDeleteTargetConfessionCommentId("");
    setEditingConfessionCommentId(commentId);
    setEditingConfessionCommentContent(comment?.content || "");
  }, []);

  const handleSaveConfessionCommentEdit = useCallback(async () => {
    if (
      !editingConfessionCommentId ||
      savingConfessionComment ||
      !activeCommentConfessionId
    ) {
      return;
    }

    const content = editingConfessionCommentContent.trim();
    if (!content) {
      setConfessionError("Comment cannot be empty.");
      return;
    }

    setSavingConfessionComment(true);

    try {
      const response = await fetch(
        `/api/confessions/comments/${editingConfessionCommentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ content }),
        },
      );

      const payload = await parseApiResponse(
        response,
        "Failed to update comment.",
      );
      const updatedComment = payload?.comment || null;

      setCommentsByConfession((prev) => ({
        ...prev,
        [activeCommentConfessionId]: {
          ...(prev[activeCommentConfessionId] || {
            items: [],
            loaded: true,
            loading: false,
            input: "",
            submitting: false,
          }),
          items: (prev[activeCommentConfessionId]?.items || []).map(
            (comment) => {
              const currentId = String(comment?._id || comment?.id || "");
              if (currentId !== editingConfessionCommentId) {
                return comment;
              }

              return updatedComment
                ? { ...comment, ...updatedComment }
                : { ...comment, content, isEdited: true };
            },
          ),
        },
      }));

      setEditingConfessionCommentId("");
      setEditingConfessionCommentContent("");
    } catch (error) {
      setConfessionError(error?.message || "Failed to update comment.");
    } finally {
      setSavingConfessionComment(false);
    }
  }, [
    activeCommentConfessionId,
    editingConfessionCommentContent,
    editingConfessionCommentId,
    savingConfessionComment,
  ]);

  const handleDeleteConfessionComment = useCallback((commentId) => {
    setActiveConfessionCommentMenuId("");
    setEditingConfessionCommentId("");
    setEditingConfessionCommentContent("");
    setDeleteTargetConfessionCommentId(commentId);
  }, []);

  const handleConfirmDeleteConfessionComment = useCallback(async () => {
    if (
      !activeCommentConfessionId ||
      !deleteTargetConfessionCommentId ||
      deletingConfessionCommentId
    ) {
      return;
    }

    const commentId = deleteTargetConfessionCommentId;
    setDeletingConfessionCommentId(commentId);

    try {
      const response = await fetch(`/api/confessions/comments/${commentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const payload = await parseApiResponse(
        response,
        "Failed to delete comment.",
      );
      const removedCount = Number(payload?.removedCount || 1);

      setCommentsByConfession((prev) => ({
        ...prev,
        [activeCommentConfessionId]: {
          ...(prev[activeCommentConfessionId] || {
            items: [],
            loaded: true,
            loading: false,
            input: "",
            submitting: false,
          }),
          items: (prev[activeCommentConfessionId]?.items || []).filter(
            (comment) =>
              String(comment?._id || comment?.id || "") !== String(commentId),
          ),
        },
      }));

      setConfessions((prev) =>
        prev.map((confession) =>
          confession.id === activeCommentConfessionId
            ? {
                ...confession,
                commentCount: Math.max(
                  0,
                  Number(confession.commentCount || 0) -
                    (Number.isFinite(removedCount) && removedCount > 0
                      ? removedCount
                      : 1),
                ),
              }
            : confession,
        ),
      );

      if (editingConfessionCommentId === String(commentId)) {
        setEditingConfessionCommentId("");
        setEditingConfessionCommentContent("");
      }

      setDeleteTargetConfessionCommentId("");
    } catch (error) {
      setConfessionError(error?.message || "Failed to delete comment.");
    } finally {
      setDeletingConfessionCommentId("");
    }
  }, [
    activeCommentConfessionId,
    deleteTargetConfessionCommentId,
    deletingConfessionCommentId,
    editingConfessionCommentId,
  ]);

  const activeConfessionCommentState = activeCommentConfessionId
    ? commentsByConfession[activeCommentConfessionId] || {
        items: [],
        input: "",
        loading: false,
        loaded: false,
        error: "",
        submitting: false,
      }
    : null;

  const activeConfession = confessions.find(
    (confession) => confession.id === activeCommentConfessionId,
  );

  const handleToggleExpandedStory = useCallback((storyId) => {
    setExpandedStoryIds((prev) => ({
      ...prev,
      [storyId]: !prev[storyId],
    }));
  }, []);

  const handleToggleExpandedConfession = useCallback((confessionId) => {
    setExpandedConfessionIds((prev) => ({
      ...prev,
      [confessionId]: !prev[confessionId],
    }));
  }, []);

  // Remove bookmarked confession
  const handleUnsaveConfession = useCallback(async (confessionId) => {
    try {
      await removeConfessionBookmark(confessionId);
      setConfessions((prev) => prev.filter((c) => c.id !== confessionId));
    } catch {
      setConfessionError("Failed to remove confession bookmark.");
    }
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Bookmarks" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              {/* Tab Selector */}
              <div className="flex gap-2 mb-8 sm:mb-10">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    activeTab === "stories"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-white text-rose-500 border border-rose-200 hover:bg-rose-50"
                  }`}
                  onClick={() => setActiveTab("stories")}
                  aria-selected={activeTab === "stories"}
                >
                  Stories
                </button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    activeTab === "confessions"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-white text-rose-500 border border-rose-200 hover:bg-rose-50"
                  }`}
                  onClick={() => setActiveTab("confessions")}
                  aria-selected={activeTab === "confessions"}
                >
                  Confessions
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "stories" && (
                <>
                  <header className="mb-8 sm:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Bookmarked Stories
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Stories you saved for later reading.
                    </p>
                  </header>

                  {errorMessage ? (
                    <div className="mb-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-red-200 shadow-sm text-sm text-red-500">
                      {errorMessage}
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                      Loading bookmarks...
                    </div>
                  ) : null}

                  {!isLoading && !errorMessage && stories.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                      No bookmarked stories yet.
                    </div>
                  ) : null}

                  {!isLoading &&
                    !errorMessage &&
                    stories.map((post) => (
                      <PostCard
                        key={post.id}
                        {...post}
                        isExpanded={Boolean(expandedStoryIds[post.id])}
                        onUnsave={handleUnsave}
                        onToggleLike={handleToggleLike}
                        onOpenComments={handleOpenComments}
                        onToggleExpanded={handleToggleExpandedStory}
                      />
                    ))}
                </>
              )}

              {activeTab === "confessions" && (
                <>
                  <header className="mb-8 sm:mb-10">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Bookmarked Confessions
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Confessions you saved for later reading.
                    </p>
                  </header>

                  {confessionError ? (
                    <div className="mb-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-red-200 shadow-sm text-sm text-red-500">
                      {confessionError}
                    </div>
                  ) : null}
                  {isLoadingConfessions ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                      Loading bookmarked confessions...
                    </div>
                  ) : null}
                  {!isLoadingConfessions &&
                  !confessionError &&
                  confessions.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                      No bookmarked confessions yet.
                    </div>
                  ) : null}
                  {!isLoadingConfessions &&
                    !confessionError &&
                    confessions.map((conf) => (
                      <ConfessionCard
                        key={conf.id}
                        {...conf}
                        isExpanded={Boolean(expandedConfessionIds[conf.id])}
                        onUnsave={handleUnsaveConfession}
                        onToggleLike={handleToggleLikeConfession}
                        onOpenComments={handleOpenConfessionComments}
                        onToggleExpanded={handleToggleExpandedConfession}
                      />
                    ))}
                </>
              )}
            </div>

            <SiteFooter />

            {activeCommentStoryId ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Close comments"
                  onClick={handleCloseComments}
                  className="absolute inset-0 bg-slate-900/40"
                />

                <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate pr-4">
                      Comments · {activeStory?.title || "Story"}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseComments}
                      className="inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-3">
                    {activeCommentState?.loading ? (
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Loading comments...
                      </div>
                    ) : null}

                    {activeCommentState?.error ? (
                      <div className="text-sm text-rose-600">
                        {activeCommentState.error}
                      </div>
                    ) : null}

                    {!activeCommentState?.loading &&
                    !activeCommentState?.error &&
                    (activeCommentState?.items || []).length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No comments yet. Start the conversation.
                      </div>
                    ) : null}

                    {(activeCommentState?.items || []).map((comment, index) => (
                      <ConfessionModalCommentItem
                        key={String(
                          comment?._id ||
                            comment?.id ||
                            `story-comment-${index}`,
                        )}
                        comment={comment}
                        currentUserId={currentUserId}
                        activeCommentMenuId={activeStoryCommentMenuId}
                        editingCommentId={editingStoryCommentId}
                        editCommentContent={editingStoryCommentContent}
                        isSavingEditedComment={savingStoryComment}
                        deleteTargetCommentId={deleteTargetStoryCommentId}
                        isDeletingComment={
                          deletingStoryCommentId ===
                          (comment?._id || comment?.id || "")
                        }
                        onToggleMenu={handleToggleStoryCommentMenu}
                        onStartEdit={handleStartEditStoryComment}
                        onDelete={handleDeleteStoryComment}
                        onCancelEdit={() => {
                          setEditingStoryCommentId("");
                          setEditingStoryCommentContent("");
                        }}
                        onEditContentChange={setEditingStoryCommentContent}
                        onSaveEdit={handleSaveStoryCommentEdit}
                        onCancelDelete={() => setDeleteTargetStoryCommentId("")}
                        onConfirmDelete={handleConfirmDeleteStoryComment}
                      />
                    ))}
                  </div>

                  <div className="border-t border-slate-100 px-4 py-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activeCommentState?.input || ""}
                        onChange={(event) =>
                          handleCommentInputChange(
                            activeCommentStoryId,
                            event.target.value,
                          )
                        }
                        placeholder="Write a comment..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleSubmitComment(activeCommentStoryId)
                        }
                        disabled={Boolean(activeCommentState?.submitting)}
                        className="inline-flex items-center justify-center cursor-pointer rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        {activeCommentState?.submitting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          "Post"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeCommentConfessionId ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <button
                  type="button"
                  aria-label="Close confession comments"
                  onClick={handleCloseConfessionComments}
                  className="absolute inset-0 bg-slate-900/40"
                />

                <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate pr-4">
                      Comments ·{" "}
                      {activeConfession?.isAnonymous
                        ? "Anonymous"
                        : activeConfession?.author || "Confession"}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseConfessionComments}
                      className="inline-flex h-8 w-8 items-center justify-center cursor-pointer rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-3">
                    {activeConfessionCommentState?.loading ? (
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Loading comments...
                      </div>
                    ) : null}

                    {activeConfessionCommentState?.error ? (
                      <div className="text-sm text-rose-600">
                        {activeConfessionCommentState.error}
                      </div>
                    ) : null}

                    {!activeConfessionCommentState?.loading &&
                    !activeConfessionCommentState?.error &&
                    (activeConfessionCommentState?.items || []).length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No comments yet. Start the conversation.
                      </div>
                    ) : null}

                    {(activeConfessionCommentState?.items || []).map(
                      (comment, index) => (
                        <ConfessionModalCommentItem
                          key={String(
                            comment?._id ||
                              comment?.id ||
                              `confession-comment-${index}`,
                          )}
                          comment={comment}
                          currentUserId={currentUserId}
                          activeCommentMenuId={activeConfessionCommentMenuId}
                          editingCommentId={editingConfessionCommentId}
                          editCommentContent={editingConfessionCommentContent}
                          isSavingEditedComment={savingConfessionComment}
                          deleteTargetCommentId={
                            deleteTargetConfessionCommentId
                          }
                          isDeletingComment={
                            deletingConfessionCommentId ===
                            (comment?._id || comment?.id || "")
                          }
                          onToggleMenu={handleToggleConfessionCommentMenu}
                          onStartEdit={handleStartEditConfessionComment}
                          onDelete={handleDeleteConfessionComment}
                          onCancelEdit={() => {
                            setEditingConfessionCommentId("");
                            setEditingConfessionCommentContent("");
                          }}
                          onEditContentChange={
                            setEditingConfessionCommentContent
                          }
                          onSaveEdit={handleSaveConfessionCommentEdit}
                          onCancelDelete={() =>
                            setDeleteTargetConfessionCommentId("")
                          }
                          onConfirmDelete={handleConfirmDeleteConfessionComment}
                        />
                      ),
                    )}
                  </div>

                  <div className="border-t border-slate-100 px-4 py-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activeConfessionCommentState?.input || ""}
                        onChange={(event) =>
                          handleConfessionCommentInputChange(
                            activeCommentConfessionId,
                            event.target.value,
                          )
                        }
                        placeholder="Write a comment..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleSubmitConfessionComment(
                            activeCommentConfessionId,
                          )
                        }
                        disabled={Boolean(
                          activeConfessionCommentState?.submitting,
                        )}
                        className="inline-flex items-center justify-center cursor-pointer rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        {activeConfessionCommentState?.submitting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          "Post"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
