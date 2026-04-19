import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import {
  getBookmarkedConfessions,
  removeConfessionBookmark,
} from "../api/confession/confessionBookmarkApi";

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

const PostCard = ({
  id,
  author,
  authorId,
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
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={authorId ? `/profile/${authorId}` : "/profile"}
          className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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

          <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
            {genre}
          </span>
        </div>
      </div>
    </div>

    <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
      {title}
    </h2>

    <p className="text-slate-600 text-sm leading-relaxed mb-6">{excerpt}</p>

    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex items-center gap-2 text-slate-500">
          <Heart size={20} />
          <span className="text-sm font-medium">{likes}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{comments}</span>
        </div>
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

const ConfessionCard = ({
  id,
  author,
  authorId,
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
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={authorId ? `/profile/${authorId}` : "/profile"}
          className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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

          <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
            {genre}
          </span>
        </div>
      </div>
    </div>
    <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
      {title}
    </h2>
    <p className="text-slate-600 text-sm leading-relaxed mb-6">{excerpt}</p>
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex items-center gap-2 text-slate-500">
          <Heart size={20} />
          <span className="text-sm font-medium">{likes}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{comments}</span>
        </div>
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

export default function Bookmarks() {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [confessions, setConfessions] = useState([]);
  const [isLoadingConfessions, setIsLoadingConfessions] = useState(true);
  const [confessionError, setConfessionError] = useState("");

  const [activeTab, setActiveTab] = useState("stories");

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
          author: conf.authorDisplayName || conf.author || "Anonymous",
          avatar: conf.authorProfilePicture || null,
          genre:
            Array.isArray(conf.genres) && conf.genres.length > 0
              ? String(conf.genres[0]).toUpperCase()
              : "GENERAL",
          time: getRelativeTime(conf.publishedAt || conf.createdAt),
          title: conf.title || "Untitled Confession",
          excerpt:
            conf.content?.slice(0, 180) ||
            "No preview is available for this confession.",
          likes: formatCount(Number(conf.likesCount || 0)),
          comments: formatCount(Number(conf.commentCount || 0)),
        })),
      );
    } catch (error) {
      // Log error for debugging
      // eslint-disable-next-line no-console
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
    } catch {
      setErrorMessage("Failed to remove bookmark.");
    }
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
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
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
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
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
                        onUnsave={handleUnsave}
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
                        onUnsave={handleUnsaveConfession}
                      />
                    ))}
                </>
              )}
            </div>

            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
