import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  User,
  Plus,
} from "lucide-react";

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

/* -------------------- Story Circle -------------------- */
const StoryCircle = ({ name, isAdd = false, image }) => (
  <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group transition-transform duration-300 hover:-translate-y-0.5">
    <div
      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${
        isAdd ? "border-slate-300 border-dashed p-1" : "border-rose-300 p-1"
      } relative`}
    >
      <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            <User size={30} />
          </div>
        )}
      </div>

      {isAdd && (
        <div className="absolute bottom-0 right-0 bg-slate-900 text-white rounded-full p-1 border-2 border-white shadow-sm">
          <Plus size={12} />
        </div>
      )}
    </div>

    <span className="text-[11px] sm:text-xs font-medium text-slate-700 whitespace-nowrap">
      {name}
    </span>
  </div>
);

/* -------------------- Post Card -------------------- */
const PostCard = ({
  id,
  author,
  genre,
  time,
  title,
  excerpt,
  likesCount,
  commentCount,
  avatar,
  likedByCurrentUser,
  savedByCurrentUser,
  commentsActive,
  shareStatus,
  onToggleLike,
  onOpenComments,
  onToggleSave,
  onShare,
  onDoubleTapLike,
  showLikeBurst,
  showLikePulse,
  showCommentCountPulse,
}) => (
  <div
    onDoubleClick={() => onDoubleTapLike(id)}
    className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md"
  >
    {showLikeBurst && (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Heart
          size={54}
          className="text-red-500 animate-pulse"
          fill="currentColor"
        />
      </div>
    )}

    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
          <img
            src={
              avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${author}`
            }
            alt="avatar"
          />
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

      <button className="text-slate-400 hover:text-slate-600 transition-colors duration-200">
        <MoreHorizontal size={20} />
      </button>
    </div>

    <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
      {title}
    </h2>
    <p className="text-slate-600 text-sm leading-relaxed mb-6">{excerpt}</p>

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <button
          onClick={() => onToggleLike(id)}
          className={`flex items-center gap-2 transition-all duration-200 ${
            likedByCurrentUser
              ? "text-rose-500"
              : "text-slate-500 hover:text-rose-500"
          }`}
        >
          <Heart
            size={20}
            className={
              showLikePulse
                ? "scale-110 transition-transform duration-200"
                : "transition-transform duration-200"
            }
            fill={likedByCurrentUser ? "currentColor" : "none"}
          />
          <span className="text-xs sm:text-sm font-medium">
            {formatCount(likesCount)}
          </span>
        </button>

        <button
          onClick={() => onOpenComments(id)}
          className={`flex items-center gap-2 transition-all duration-200 ${
            commentsActive
              ? "text-sky-500"
              : "text-slate-500 hover:text-sky-500"
          }`}
        >
          <MessageCircle size={20} />
          <span
            className={`text-xs sm:text-sm font-medium transition-transform duration-300 ${
              showCommentCountPulse ? "scale-110" : "scale-100"
            }`}
          >
            {formatCount(commentCount)}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-4 sm:ml-auto">
        <button
          onClick={() => onToggleSave(id)}
          className={`transition-colors duration-200 ${
            savedByCurrentUser
              ? "text-slate-900"
              : "text-slate-500 hover:text-slate-900"
          }`}
          aria-label="Save story"
        >
          <Bookmark
            size={20}
            fill={savedByCurrentUser ? "currentColor" : "none"}
          />
        </button>
        <button
          onClick={() => onShare(id, title)}
          className="text-slate-500 hover:text-slate-900 transition-colors duration-200"
          aria-label="Share story"
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>

    {shareStatus && (
      <p className="mt-3 text-xs text-emerald-600">{shareStatus}</p>
    )}
  </div>
);

/* -------------------- Author Row -------------------- */
const AuthorRow = ({ name, role }) => (
  <div className="flex items-center justify-between gap-3 py-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
          alt={name}
        />
      </div>

      <div className="min-w-0">
        <h4 className="font-semibold text-sm text-slate-900 truncate">
          {name}
        </h4>
        <p className="text-[10px] text-rose-500 font-medium">{role}</p>
      </div>
    </div>

    <button className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-semibold px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap">
      Follow
    </button>
  </div>
);

/* -------------------- Home Page -------------------- */
export default function Home() {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [savedStoryIds, setSavedStoryIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("savedStoryIds") || "[]");
      return new Set(saved);
    } catch {
      return new Set();
    }
  });
  const [shareFeedback, setShareFeedback] = useState({});
  const [commentsByStory, setCommentsByStory] = useState({});
  const [activeCommentStoryId, setActiveCommentStoryId] = useState(null);
  const [likeBurstStoryId, setLikeBurstStoryId] = useState(null);
  const [likePulseStoryId, setLikePulseStoryId] = useState(null);
  const [commentCountPulseStoryId, setCommentCountPulseStoryId] =
    useState(null);
  const endOfFeedRef = useRef(null);

  useEffect(() => {
    if (!activeCommentStoryId) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveCommentStoryId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCommentStoryId]);

  useEffect(() => {
    localStorage.setItem("savedStoryIds", JSON.stringify([...savedStoryIds]));
  }, [savedStoryIds]);

  const loadStories = useCallback(async (signal, paginationCursor = null) => {
    const isInitial = paginationCursor === null;
    if (isInitial) {
      setIsLoadingPosts(true);
      setPostsError("");
      setPosts([]);
      setCursor(null);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const cursorParam = paginationCursor ? `&cursor=${paginationCursor}` : "";
      const response = await fetch(`/api/stories?limit=10${cursorParam}`, {
        signal,
        headers,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const rawStories = Array.isArray(payload?.data) ? payload.data : [];
      const nextCursor = payload?.nextCursor || null;
      const hasMoreStories = payload?.hasMore || false;

      const mappedStories = rawStories.map((story) => {
        const authorSeed = String(story.authorId || story._id || "author");

        return {
          id: String(story._id),
          author:
            story.authorName || `Author ${authorSeed.slice(-4).toUpperCase()}`,
          genre: story.genres?.[0]?.toUpperCase() || "GENERAL",
          time: getRelativeTime(story.publishedAt || story.createdAt),
          title: story.title || "Untitled Story",
          excerpt:
            story.summary ||
            story.content?.slice(0, 180) ||
            "No preview is available for this story.",
          likesCount: Number(story.likesCount || 0),
          commentCount: Number(story.commentCount || 0),
          likedByCurrentUser: Boolean(story.likedByCurrentUser),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorSeed}`,
        };
      });

      if (isInitial) {
        setPosts(mappedStories);
      } else {
        setPosts((prev) => [...prev, ...mappedStories]);
      }
      setCursor(nextCursor);
      setHasMore(hasMoreStories);
    } catch (error) {
      if (error.name !== "AbortError") {
        if (isInitial) {
          setPostsError("Unable to load stories right now. Please try again.");
        }
      }
    } finally {
      if (!signal?.aborted) {
        if (isInitial) {
          setIsLoadingPosts(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadStories(controller.signal, null);

    return () => controller.abort();
  }, [loadStories]);

  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoadingPosts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor) {
          loadStories(new AbortController().signal, cursor);
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    const currentEndOfFeedRef = endOfFeedRef.current;

    if (currentEndOfFeedRef) {
      observer.observe(currentEndOfFeedRef);
    }

    return () => {
      if (currentEndOfFeedRef) {
        observer.unobserve(currentEndOfFeedRef);
      }
    };
  }, [cursor, hasMore, isLoadingMore, isLoadingPosts, loadStories]);

  const fetchComments = useCallback(async (storyId) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...prev[storyId],
        loading: true,
        error: "",
      },
    }));

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(
        `/api/stories/${storyId}/comments?limit=10`,
        {
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const comments = Array.isArray(payload?.comments) ? payload.comments : [];

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...prev[storyId],
          loading: false,
          error: "",
          loaded: true,
          items: comments,
        },
      }));
    } catch {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...prev[storyId],
          loading: false,
          error: "Unable to load comments.",
        },
      }));
    }
  }, []);

  const handleToggleLike = useCallback(async (storyId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setPostsError("Please login to react to stories.");
      return;
    }

    setLikePulseStoryId(storyId);
    setTimeout(() => {
      setLikePulseStoryId((currentId) =>
        currentId === storyId ? null : currentId,
      );
    }, 220);

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
      setPosts((prev) =>
        prev.map((post) =>
          post.id === storyId
            ? {
                ...post,
                likedByCurrentUser: Boolean(payload.likedByCurrentUser),
                likesCount: Number(payload.likesCount || 0),
              }
            : post,
        ),
      );
    } catch {
      setPostsError("Failed to update reaction. Please try again.");
    }
  }, []);

  const handleToggleComments = useCallback(
    (storyId) => {
      const current = commentsByStory[storyId] || {
        open: false,
        loaded: false,
        loading: false,
        error: "",
        items: [],
        input: "",
        submitting: false,
      };

      const nextOpen = !current.open;

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...current,
          open: nextOpen,
        },
      }));

      if (nextOpen && !current.loaded && !current.loading) {
        fetchComments(storyId);
      }
    },
    [commentsByStory, fetchComments],
  );

  const handleOpenCommentsModal = useCallback(
    (storyId) => {
      if (activeCommentStoryId === storyId) {
        setActiveCommentStoryId(null);
        return;
      }

      setActiveCommentStoryId(storyId);
      handleToggleComments(storyId);
    },
    [activeCommentStoryId, handleToggleComments],
  );

  const handleDoubleTapLike = useCallback(
    (storyId) => {
      setLikeBurstStoryId(storyId);
      setTimeout(() => {
        setLikeBurstStoryId((currentId) =>
          currentId === storyId ? null : currentId,
        );
      }, 600);

      const post = posts.find((item) => item.id === storyId);
      if (post && !post.likedByCurrentUser) {
        handleToggleLike(storyId);
      }
    },
    [posts, handleToggleLike],
  );

  const handleCommentInputChange = useCallback((storyId, input) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...(prev[storyId] || {
          open: true,
          loaded: true,
          loading: false,
          error: "",
          items: [],
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
        setPostsError("Please login to comment.");
        return;
      }

      const current = commentsByStory[storyId];
      const content = current?.input?.trim();
      if (!content) return;

      setCommentsByStory((prev) => ({
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
          content,
          createdAt: new Date().toISOString(),
        };

        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...prev[storyId],
            submitting: false,
            input: "",
            loaded: true,
            items: [newComment, ...(prev[storyId]?.items || [])],
          },
        }));

        setCommentCountPulseStoryId(storyId);
        setTimeout(() => {
          setCommentCountPulseStoryId((currentId) =>
            currentId === storyId ? null : currentId,
          );
        }, 260);

        setPosts((prev) =>
          prev.map((post) =>
            post.id === storyId
              ? { ...post, commentCount: Number(post.commentCount || 0) + 1 }
              : post,
          ),
        );
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...prev[storyId],
            submitting: false,
            error: "Failed to post comment.",
          },
        }));
      }
    },
    [commentsByStory],
  );

  const handleToggleSave = useCallback((storyId) => {
    setSavedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  }, []);

  const handleShare = useCallback(async (storyId, storyTitle) => {
    const url = `${window.location.origin}/stories/${storyId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: storyTitle,
          text: "Check out this story on Story-Hub",
          url,
        });
        setShareFeedback((prev) => ({
          ...prev,
          [storyId]: "Shared successfully",
        }));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareFeedback((prev) => ({ ...prev, [storyId]: "Link copied" }));
      } else {
        setShareFeedback((prev) => ({
          ...prev,
          [storyId]: "Share not supported",
        }));
      }

      setTimeout(() => {
        setShareFeedback((prev) => {
          const next = { ...prev };
          delete next[storyId];
          return next;
        });
      }, 1800);
    } catch {
      setShareFeedback((prev) => ({ ...prev, [storyId]: "Share cancelled" }));
      setTimeout(() => {
        setShareFeedback((prev) => {
          const next = { ...prev };
          delete next[storyId];
          return next;
        });
      }, 1800);
    }
  }, []);

  const stories = useMemo(() => {
    const circles = [{ name: "Add Story", isAdd: true }];
    const seenAuthors = new Set();

    posts.forEach((post) => {
      if (seenAuthors.has(post.author)) {
        return;
      }

      seenAuthors.add(post.author);
      circles.push({
        name: post.author,
        image: post.avatar,
      });
    });

    return circles;
  }, [posts]);

  const topAuthors = [
    { name: "Hannah Rose", role: "Top Mystery Writer" },
    { name: "Emily Foster", role: "Top Lifestyle Author" },
    { name: "David Chen", role: "Top Tech Writer" },
    { name: "Lisa Park", role: "Top Romance Author" },
  ];

  const activeCommentStory = posts.find(
    (post) => post.id === activeCommentStoryId,
  );
  const activeCommentState = activeCommentStoryId
    ? commentsByStory[activeCommentStoryId] || {
        open: true,
        loaded: false,
        loading: false,
        error: "",
        items: [],
        input: "",
        submitting: false,
      }
    : null;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <Navbar title="Home Feed" />

        <main className="h-[calc(100vh-64px)] overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-4 lg:gap-6 px-3 sm:px-5 lg:px-6 py-5 sm:py-6">
            <div className="min-h-0 flex flex-col overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <section className="bg-white/95 border border-slate-200 rounded-xl lg:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 px-1 sm:px-2 text-slate-900">
                  Stories
                </h2>

                <div className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {stories.map((story, i) => (
                    <div key={i} className="snap-start">
                      <StoryCircle {...story} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex-1 min-h-0 flex flex-col py-4">
                {isLoadingPosts && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                    Loading stories...
                  </div>
                )}

                {!isLoadingPosts && postsError && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm">
                    <p className="text-sm text-rose-600 mb-3">{postsError}</p>
                    <button
                      className="text-xs font-semibold text-rose-600 hover:underline"
                      onClick={() =>
                        loadStories(new AbortController().signal, null)
                      }
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoadingPosts && !postsError && posts.length === 0 && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                    No published stories yet.
                  </div>
                )}

                {!isLoadingPosts &&
                  !postsError &&
                  posts.map((post) => {
                    return (
                      <PostCard
                        key={post.id}
                        {...post}
                        savedByCurrentUser={savedStoryIds.has(post.id)}
                        commentsActive={activeCommentStoryId === post.id}
                        shareStatus={shareFeedback[post.id]}
                        onToggleLike={handleToggleLike}
                        onOpenComments={handleOpenCommentsModal}
                        onToggleSave={handleToggleSave}
                        onShare={handleShare}
                        onDoubleTapLike={handleDoubleTapLike}
                        showLikeBurst={likeBurstStoryId === post.id}
                        showLikePulse={likePulseStoryId === post.id}
                        showCommentCountPulse={
                          commentCountPulseStoryId === post.id
                        }
                      />
                    );
                  })}

                {isLoadingMore && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500 text-center">
                    Loading more stories...
                  </div>
                )}

                {!hasMore && posts.length > 0 && (
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-400 text-center">
                    No more stories to load
                  </div>
                )}

                <div ref={endOfFeedRef} className="h-1" />
              </section>
            </div>

            <aside className="hidden lg:block w-64 shrink-0 h-full">
              <div className="sticky top-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-lg sm:text-xl font-semibold mb-5 sm:mb-6 text-slate-900">
                  Top Authors
                </h2>

                <div className="space-y-4 mb-8">
                  {topAuthors.map((author, i) => (
                    <AuthorRow key={i} {...author} />
                  ))}
                </div>

                <button className="w-full text-rose-500 text-xs font-semibold hover:underline py-2">
                  Show more
                </button>
              </div>
            </aside>
          </div>
        </main>

        <SiteFooter className="text-left lg:text-right" />
      </div>

      {activeCommentStory && activeCommentState && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setActiveCommentStoryId(null)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 max-h-[85vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Comments</h3>
                <p className="text-xs text-slate-400 truncate max-w-[260px]">
                  {activeCommentStory.title}
                </p>
              </div>
              <button
                onClick={() => setActiveCommentStoryId(null)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {activeCommentState.loading && (
                <p className="text-xs text-slate-500">Loading comments...</p>
              )}

              {!activeCommentState.loading && activeCommentState.error && (
                <p className="text-xs text-red-500">
                  {activeCommentState.error}
                </p>
              )}

              {!activeCommentState.loading &&
                !activeCommentState.error &&
                activeCommentState.items.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No comments yet. Be the first to comment.
                  </p>
                )}

              {!activeCommentState.loading &&
                !activeCommentState.error &&
                activeCommentState.items.map((comment) => (
                  <div
                    key={comment._id}
                    className="rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      Anonymous
                    </p>
                    <p className="text-sm text-slate-700">{comment.content}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {getRelativeTime(comment.createdAt)}
                    </p>
                  </div>
                ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmitComment(activeCommentStory.id);
              }}
              className="px-5 py-4 border-t border-slate-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={activeCommentState.input || ""}
                onChange={(event) =>
                  handleCommentInputChange(
                    activeCommentStory.id,
                    event.target.value,
                  )
                }
                placeholder="Write a comment..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
              />
              <button
                type="submit"
                disabled={activeCommentState.submitting}
                className="rounded-xl bg-rose-500 text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                {activeCommentState.submitting ? "Posting..." : "Post"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
