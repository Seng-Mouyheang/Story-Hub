import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  getProfileByUserId,
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowing,
} from "../api/profile";
import { getStories, deleteStory } from "../api/story/storyApi";
import { getAuthorRecommendations } from "../api/recommendation";
import {
  getStoryComments,
  addStoryComment,
  updateStoryComment,
  deleteStoryComment,
} from "../api/story/storyCommentsApi";
import {
  toggleStoryLike,
  toggleStoryBookmark,
  removeStoryBookmark,
  getMyBookmarkedStories,
} from "../api/story/storyInteractionsApi";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  User,
  Plus,
  RefreshCcw,
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

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.toString === "function") return value.toString();
  }

  return String(value);
};

/* -------------------- Story Circle -------------------- */
const StoryCircle = ({ name, authorId, isAdd = false, image }) => {
  const content = (
    <>
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${
          isAdd ? "border-slate-300 border-dashed p-1" : "border-rose-300 p-1"
        } relative`}
      >
        <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
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

      <span className="text-[11px] mx-auto sm:text-xs font-medium text-slate-700 whitespace-nowrap rounded-md px-1.5 py-0.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
        {name}
      </span>
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group transition-transform duration-300 hover:-translate-y-0.5">
      {isAdd ? (
        content
      ) : (
        <Link to={authorId ? `/profile/${authorId}` : "/profile"}>
          {content}
        </Link>
      )}
    </div>
  );
};

/* -------------------- Post Card -------------------- */
const PostCard = ({
  id,
  author,
  authorId,
  genres,
  tags,
  time,
  title,
  excerpt,
  content,
  likesCount,
  commentCount,
  avatar,
  canManage,
  likedByCurrentUser,
  savedByCurrentUser,
  commentsActive,
  shareStatus,
  onToggleLike,
  onOpenComments,
  onToggleSave,
  onShare,
  onDoubleTapLike,
  onToggleMenu,
  onReportStory,
  onEditStory,
  onDeleteStory,
  onToggleFollowAuthor,
  isExpanded,
  onToggleExpanded,
  isMenuOpen,
  showLikeBurst,
  showLikePulse,
  showCommentCountPulse,
  followingAuthor,
  followBusy,
}) => {
  const [isContentMeasured, setIsContentMeasured] = useState(false);
  const contentRef = useRef(null);
  const collapsedContentHeight = 120;
  const storyContent = content || excerpt || "";

  useEffect(() => {
    const element = contentRef.current;

    if (!element) {
      return undefined;
    }

    const updateMeasurement = () => {
      setIsContentMeasured(element.scrollHeight > collapsedContentHeight + 1);
    };

    updateMeasurement();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateMeasurement();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [collapsedContentHeight, storyContent]);

  return (
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
          <Link
            to={authorId ? `/profile/${authorId}` : "/profile"}
            className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label={`View ${author} profile`}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                <User size={20} />
              </div>
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
              {(Array.isArray(genres) && genres.length > 0
                ? genres
                : ["GENERAL"]
              ).join(" • ")}
            </span>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          {!canManage && authorId ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFollowAuthor(authorId);
              }}
              disabled={followBusy}
              className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
                followingAuthor
                  ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                  : "bg-rose-500 hover:bg-rose-600 text-white"
              } ${followBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {followingAuthor ? "Following" : "Follow"}
            </button>
          ) : null}

          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleMenu(id);
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
            aria-label="Story actions"
          >
            <MoreHorizontal size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
              {canManage ? (
                <>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditStory(id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteStory(id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onReportStory(id);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                >
                  Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
        {title}
      </h2>
      <p
        ref={contentRef}
        className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-2"
        style={
          isExpanded
            ? undefined
            : {
                maxHeight: `${collapsedContentHeight}px`,
                overflow: "hidden",
              }
        }
      >
        {storyContent}
      </p>

      {isContentMeasured && (
        <button
          type="button"
          onClick={() => onToggleExpanded(id)}
          className="mb-4 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}

      {!isContentMeasured && <div className="mb-4" />}

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

      <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-4 ml-auto">
          <button
            onClick={() => onToggleSave(id)}
            className="text-rose-500 hover:text-rose-600 transition-colors duration-200"
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
};

/* -------------------- Author Row -------------------- */
const AuthorRow = ({
  name,
  role,
  authorId,
  avatar,
  isFollowing,
  isBusy,
  onToggleFollow,
}) => (
  <div className="flex items-center justify-between gap-3 py-3">
    <div className="flex items-center gap-3 min-w-0">
      <Link
        to={authorId ? `/profile/${authorId}` : "/profile"}
        className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden block"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
            alt={name}
            className="w-full h-full object-cover"
          />
        )}
      </Link>

      <div className="min-w-0">
        <Link
          to={authorId ? `/profile/${authorId}` : "/profile"}
          className="font-semibold text-sm text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {name}
        </Link>
        <p className="text-[10px] text-rose-500 font-medium">{role}</p>
      </div>
    </div>

    <button
      type="button"
      onClick={onToggleFollow}
      disabled={isBusy}
      className={`text-[10px] font-semibold px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
        isFollowing
          ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
          : "bg-rose-500 hover:bg-rose-600 text-white"
      } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  </div>
);

/* -------------------- Home Page -------------------- */
export default function Home() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [topAuthors, setTopAuthors] = useState([]);
  const [topAuthorsLoading, setTopAuthorsLoading] = useState(true);
  const [topAuthorsError, setTopAuthorsError] = useState("");
  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [busyFollowIds, setBusyFollowIds] = useState({});
  const [followingAccounts, setFollowingAccounts] = useState([]);
  const [followingAccountsLoading, setFollowingAccountsLoading] =
    useState(true);
  const [followingAccountsRefreshToken, setFollowingAccountsRefreshToken] =
    useState(0);
  const [savedStoryIds, setSavedStoryIds] = useState(new Set());
  const [shareFeedback, setShareFeedback] = useState({});
  const [commentsByStory, setCommentsByStory] = useState({});
  const [activeCommentStoryId, setActiveCommentStoryId] = useState(null);
  const [likeBurstStoryId, setLikeBurstStoryId] = useState(null);
  const [likePulseStoryId, setLikePulseStoryId] = useState(null);
  const [commentCountPulseStoryId, setCommentCountPulseStoryId] =
    useState(null);
  const [menuStoryId, setMenuStoryId] = useState(null);
  const [deleteTargetStoryId, setDeleteTargetStoryId] = useState(null);
  const [menuCommentId, setMenuCommentId] = useState(null);
  const [deleteTargetComment, setDeleteTargetComment] = useState(null);
  const [commentActionFeedback, setCommentActionFeedback] = useState({});
  const [expandedStoryIds, setExpandedStoryIds] = useState({});
  const [feedToast, setFeedToast] = useState(null);
  const [isFeedToastVisible, setIsFeedToastVisible] = useState(false);
  const [isEndOfFeedVisible, setIsEndOfFeedVisible] = useState(false);
  const endOfFeedRef = useRef(null);
  const feedScrollRef = useRef(null);
  const commentInputRef = useRef(null);
  const feedToastTimeoutRef = useRef(null);
  const feedToastExitTimeoutRef = useRef(null);
  const hasShownEndToastRef = useRef(false);

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

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadTopAuthors = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setTopAuthors([]);
          setTopAuthorsError("");
          setTopAuthorsLoading(false);
        }
        return;
      }

      setTopAuthorsLoading(true);
      setTopAuthorsError("");

      try {
        const payload = await getAuthorRecommendations({
          limit: 4,
          minLikes: 10,
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const resolvedAuthors = (
          Array.isArray(payload?.data) ? payload.data : []
        )
          .map((author) => {
            const authorId = normalizeId(author?.authorId || "");

            return {
              authorId,
              name: author?.displayName || author?.username || "Unknown author",
              role: `Top ${String(
                payload?.category ||
                  author?.authorInterests?.[0] ||
                  "recommended",
              ).toLowerCase()} author`,
              avatar: author?.profilePicture || "",
            };
          })
          .filter(
            (author) =>
              Boolean(author.authorId) && author.authorId !== currentUserId,
          );

        const followStatusEntries = await Promise.all(
          resolvedAuthors.map(async (author) => {
            try {
              const statusPayload = await getFollowStatus(author.authorId);
              return [author.authorId, Boolean(statusPayload?.following)];
            } catch {
              return [author.authorId, false];
            }
          }),
        );

        if (!isMounted) {
          return;
        }

        const followStatusMap = new Map(followStatusEntries);

        setTopAuthors(resolvedAuthors);
        setFollowStateByUserId((previous) => ({
          ...previous,
          ...Object.fromEntries(followStatusMap),
        }));
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        setTopAuthors([]);
        setTopAuthorsError(
          error?.message || "Failed to load recommended authors.",
        );
      } finally {
        if (isMounted) {
          setTopAuthorsLoading(false);
        }
      }
    };

    loadTopAuthors();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId, followingAccountsRefreshToken]);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadFollowingAccounts = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setFollowingAccounts([]);
          setFollowingAccountsLoading(false);
        }
        return;
      }

      setFollowingAccountsLoading(true);

      try {
        const payload = await getFollowing(currentUserId, {
          limit: 6,
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const followingIds = Array.isArray(payload?.following)
          ? payload.following
          : [];
        const uniqueIds = [
          ...new Set(followingIds.map(normalizeId).filter(Boolean)),
        ].filter((userId) => userId !== currentUserId);

        const accountRows = await Promise.all(
          uniqueIds.map(async (userId) => {
            try {
              const profilePayload = await getProfileByUserId(userId);
              return {
                userId,
                authorId: userId,
                name:
                  profilePayload?.displayName ||
                  `Author ${userId.slice(-4).toUpperCase()}`,
                image: profilePayload?.profilePicture || "",
              };
            } catch {
              return {
                userId,
                authorId: userId,
                name: `Author ${userId.slice(-4).toUpperCase()}`,
                image: "",
              };
            }
          }),
        );

        setFollowingAccounts(accountRows);
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        console.error("Failed to load following accounts:", error);
        setFollowingAccounts([]);
      } finally {
        if (isMounted) {
          setFollowingAccountsLoading(false);
        }
      }
    };

    loadFollowingAccounts();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId]);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadSavedStories = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setSavedStoryIds(new Set());
        }
        return;
      }

      try {
        const payload = await getMyBookmarkedStories({
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const bookmarkedIds = Array.isArray(payload?.data)
          ? payload.data
              .map((story) => normalizeId(story?._id || story?.id || ""))
              .filter(Boolean)
          : [];

        setSavedStoryIds(new Set(bookmarkedIds));
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        console.error("Failed to load bookmarked stories:", error);
        setSavedStoryIds(new Set());
      }
    };

    loadSavedStories();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId]);

  const currentUsername = useMemo(() => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      return currentUser?.username || "You";
    } catch {
      return "You";
    }
  }, []);

  const hideFeedToast = useCallback(() => {
    setIsFeedToastVisible(false);

    if (feedToastExitTimeoutRef.current) {
      clearTimeout(feedToastExitTimeoutRef.current);
    }

    feedToastExitTimeoutRef.current = setTimeout(() => {
      setFeedToast(null);
      feedToastExitTimeoutRef.current = null;
    }, 220);
  }, []);

  const showFeedToast = useCallback(
    (message) => {
      if (!message) {
        return;
      }

      if (feedToastTimeoutRef.current) {
        clearTimeout(feedToastTimeoutRef.current);
      }

      if (feedToastExitTimeoutRef.current) {
        clearTimeout(feedToastExitTimeoutRef.current);
        feedToastExitTimeoutRef.current = null;
      }

      setFeedToast({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        message,
      });

      setIsFeedToastVisible(false);

      requestAnimationFrame(() => {
        setIsFeedToastVisible(true);
      });

      feedToastTimeoutRef.current = setTimeout(() => {
        hideFeedToast();
        feedToastTimeoutRef.current = null;
      }, 3200);
    },
    [hideFeedToast],
  );

  useEffect(() => {
    const handleFollowUpdated = (event) => {
      const followerId = normalizeId(event?.detail?.followerId || "");
      const followingId = normalizeId(event?.detail?.followingId || "");
      const following = Boolean(event?.detail?.following);

      if (!followingId || followerId !== currentUserId) {
        return;
      }

      setFollowStateByUserId((previous) => ({
        ...previous,
        [followingId]: following,
      }));

      setBusyFollowIds((previous) => ({
        ...previous,
        [followingId]: false,
      }));

      setFollowingAccountsRefreshToken((previous) => previous + 1);
    };

    window.addEventListener("storyhub:follow-updated", handleFollowUpdated);

    return () => {
      window.removeEventListener(
        "storyhub:follow-updated",
        handleFollowUpdated,
      );
    };
  }, [currentUserId]);

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

  const loadStories = useCallback(
    async (signal, paginationCursor = null) => {
      const isInitial = paginationCursor === null;
      if (isInitial) {
        setIsLoadingPosts(true);
        setPostsError("");
        setPosts([]);
        setCursor(null);
        setHasMore(true);
        setIsEndOfFeedVisible(false);
        hasShownEndToastRef.current = false;
      } else {
        setIsLoadingMore(true);
      }

      try {
        const payload = await getStories({
          limit: 10,
          cursor: paginationCursor,
          signal,
        });
        const rawStories = Array.isArray(payload?.data) ? payload.data : [];
        const nextCursor = payload?.nextCursor || null;
        const hasMoreStories = payload?.hasMore || false;
        const uniqueAuthorIds = [
          ...new Set(
            rawStories
              .map((story) => normalizeId(story.authorId))
              .filter(Boolean),
          ),
        ];

        const authorProfiles = await Promise.all(
          uniqueAuthorIds.map(async (authorId) => {
            try {
              const profile = await getProfileByUserId(authorId);
              return [authorId, profile?.profilePicture || ""];
            } catch {
              return [authorId, ""];
            }
          }),
        );

        const authorAvatarMap = new Map(authorProfiles);

        const mappedStories = rawStories.map((story) => {
          const authorId = normalizeId(story.authorId);
          const authorSeed = String(
            authorId || story.authorDisplayName || story.authorName || "author",
          );

          return {
            id: String(story._id),
            authorId,
            author:
              story.authorDisplayName ||
              `Author ${authorSeed.slice(-4).toUpperCase()}`,
            genres:
              Array.isArray(story.genres) && story.genres.length > 0
                ? story.genres.map((item) => String(item).toUpperCase())
                : ["GENERAL"],
            tags: Array.isArray(story.tags)
              ? story.tags
                  .map((item) => String(item || "").trim())
                  .filter(Boolean)
              : [],
            time: getRelativeTime(story.publishedAt || story.createdAt),
            title: story.title || "Untitled Story",
            content: story.content || story.summary || "",
            excerpt:
              story.summary ||
              story.content?.slice(0, 180) ||
              "No preview is available for this story.",
            likesCount: Number(story.likesCount || 0),
            commentCount: Number(story.commentCount || 0),
            canManage: Boolean(currentUserId) && authorId === currentUserId,
            likedByCurrentUser: Boolean(story.likedByCurrentUser),
            followingAuthor: Boolean(story.followedByCurrentUser), // ensure correct mapping
            followBusy: false,
            avatar: authorAvatarMap.get(authorId) || "",
          };
        });

        if (isInitial) {
          setPosts(mappedStories);
        } else {
          setPosts((prev) => [...prev, ...mappedStories]);
        }

        const derivedFollowState = Object.fromEntries(
          mappedStories
            .filter(
              (story) =>
                Boolean(story.authorId) && story.authorId !== currentUserId,
            )
            .map((story) => [story.authorId, Boolean(story.followingAuthor)]),
        );

        setFollowStateByUserId((previous) => ({
          ...previous,
          ...derivedFollowState,
        }));

        setCursor(nextCursor);
        setHasMore(hasMoreStories);
      } catch (error) {
        if (error.name !== "AbortError") {
          if (isInitial) {
            setPostsError(
              "Unable to load stories right now. Please try again.",
            );
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
    },
    [currentUserId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadStories(controller.signal, null);

    return () => controller.abort();
  }, [loadStories]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = Boolean(entries[0]?.isIntersecting);
        setIsEndOfFeedVisible(isIntersecting);

        if (!isIntersecting) {
          return;
        }

        if (hasMore && cursor) {
          loadStories(new AbortController().signal, cursor);
          return;
        }

        if (!hasShownEndToastRef.current && posts.length > 0) {
          hasShownEndToastRef.current = true;
          showFeedToast("You're all caught up. Scroll up to refresh.");
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
  }, [cursor, hasMore, loadStories, posts.length, showFeedToast]);

  useEffect(
    () => () => {
      if (feedToastTimeoutRef.current) {
        clearTimeout(feedToastTimeoutRef.current);
      }

      if (feedToastExitTimeoutRef.current) {
        clearTimeout(feedToastExitTimeoutRef.current);
      }
    },
    [],
  );

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
      const payload = await getStoryComments(storyId, { limit: 10 });
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
      const payload = await toggleStoryLike(storyId);
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
        editingCommentId: null,
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
          editingCommentId: null,
          submitting: false,
        }),
        input,
      },
    }));
  }, []);

  const showCommentActionFeedback = useCallback((commentId, message) => {
    setCommentActionFeedback((prev) => ({ ...prev, [commentId]: message }));

    setTimeout(() => {
      setCommentActionFeedback((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }, 1800);
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
      const editingCommentId = current?.editingCommentId || null;
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
        if (editingCommentId) {
          await updateStoryComment(editingCommentId, { content });

          setCommentsByStory((prev) => ({
            ...prev,
            [storyId]: {
              ...prev[storyId],
              submitting: false,
              input: "",
              editingCommentId: null,
              loaded: true,
              items: (prev[storyId]?.items || []).map((item) =>
                String(item._id) === String(editingCommentId)
                  ? { ...item, content, isEdited: true }
                  : item,
              ),
            },
          }));

          showCommentActionFeedback(editingCommentId, "Comment updated");
        } else {
          const payload = await addStoryComment(storyId, { content });
          const newComment = {
            _id: payload.commentId || `${Date.now()}`,
            userId: currentUserId,
            authorDisplayName: currentUsername,
            content,
            createdAt: new Date().toISOString(),
          };

          setCommentsByStory((prev) => ({
            ...prev,
            [storyId]: {
              ...prev[storyId],
              submitting: false,
              input: "",
              editingCommentId: null,
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
        }
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...prev[storyId],
            submitting: false,
            error: editingCommentId
              ? "Failed to update comment."
              : "Failed to post comment.",
          },
        }));
      }
    },
    [
      commentsByStory,
      currentUserId,
      currentUsername,
      showCommentActionFeedback,
    ],
  );

  const handleToggleSave = useCallback(
    async (storyId) => {
      try {
        const isAlreadySaved = savedStoryIds.has(storyId);

        if (isAlreadySaved) {
          await removeStoryBookmark(storyId);
        } else {
          await toggleStoryBookmark(storyId);
        }

        setSavedStoryIds((prev) => {
          const next = new Set(prev);

          if (next.has(storyId)) {
            next.delete(storyId);
          } else {
            next.add(storyId);
          }

          return next;
        });
      } catch (error) {
        console.error("Failed to toggle bookmark:", error);
      }
    },
    [savedStoryIds],
  );

  const handleToggleMenu = useCallback((storyId) => {
    setMenuStoryId((currentId) => (currentId === storyId ? null : storyId));
  }, []);

  const handleToggleExpandedStory = useCallback((storyId) => {
    setExpandedStoryIds((previous) => ({
      ...previous,
      [storyId]: !previous[storyId],
    }));
  }, []);

  const handleRefreshFeed = useCallback(() => {
    hasShownEndToastRef.current = false;

    if (feedToastTimeoutRef.current) {
      clearTimeout(feedToastTimeoutRef.current);
      feedToastTimeoutRef.current = null;
    }

    if (feedToastExitTimeoutRef.current) {
      clearTimeout(feedToastExitTimeoutRef.current);
      feedToastExitTimeoutRef.current = null;
    }

    setFeedToast(null);
    setIsFeedToastVisible(false);
    setIsEndOfFeedVisible(false);

    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    const controller = new AbortController();
    loadStories(controller.signal, null);
  }, [loadStories]);

  const handleToggleFollowAuthor = useCallback(
    async (authorId) => {
      const normalizedTargetUserId = normalizeId(authorId);

      if (
        !normalizedTargetUserId ||
        !currentUserId ||
        normalizedTargetUserId === currentUserId
      ) {
        return;
      }

      setBusyFollowIds((previous) => ({
        ...previous,
        [normalizedTargetUserId]: true,
      }));

      try {
        const isFollowing = Boolean(
          followStateByUserId[normalizedTargetUserId],
        );
        let followResult;

        if (isFollowing) {
          followResult = await unfollowUser(normalizedTargetUserId);
        } else {
          followResult = await followUser(normalizedTargetUserId);
        }

        const confirmedFollowing =
          typeof followResult?.following === "boolean"
            ? followResult.following
            : !isFollowing;
        const eventFollowerId =
          normalizeId(followResult?.followerId) || currentUserId;
        const eventFollowingId =
          normalizeId(followResult?.followingId) || normalizedTargetUserId;

        window.dispatchEvent(
          new CustomEvent("storyhub:follow-updated", {
            detail: {
              followerId: eventFollowerId,
              followingId: eventFollowingId,
              following: confirmedFollowing,
            },
          }),
        );

        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetUserId]: confirmedFollowing,
        }));
      } catch {
        // Keep current state when request fails.
      } finally {
        setBusyFollowIds((previous) => ({
          ...previous,
          [normalizedTargetUserId]: false,
        }));
      }
    },
    [currentUserId, followStateByUserId],
  );

  const handleReportStory = useCallback((storyId) => {
    setMenuStoryId(null);

    setShareFeedback((prev) => ({
      ...prev,
      [storyId]: "Report submitted",
    }));

    setTimeout(() => {
      setShareFeedback((prev) => {
        const next = { ...prev };
        delete next[storyId];
        return next;
      });
    }, 1800);
  }, []);

  const handleEditStory = useCallback(
    (storyId) => {
      setMenuStoryId(null);
      navigate(`/write?storyId=${storyId}&returnTo=home`);
    },
    [navigate],
  );

  const handleDeleteStory = useCallback((storyId) => {
    setMenuStoryId(null);
    setDeleteTargetStoryId(storyId);
  }, []);

  const handleConfirmDeleteStory = useCallback(async () => {
    if (!deleteTargetStoryId) {
      return;
    }

    const storyId = deleteTargetStoryId;
    setDeleteTargetStoryId(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setPostsError("Please login to delete stories.");
      return;
    }

    try {
      await deleteStory(storyId);

      setPosts((prev) => prev.filter((post) => post.id !== storyId));
      if (activeCommentStoryId === storyId) {
        setActiveCommentStoryId(null);
      }
    } catch (error) {
      setPostsError(error.message || "Failed to delete story.");
    }
  }, [activeCommentStoryId, deleteTargetStoryId]);

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

  const handleToggleCommentMenu = useCallback((commentId) => {
    setMenuCommentId((currentId) =>
      currentId === commentId ? null : commentId,
    );
  }, []);

  const handleReportComment = useCallback(
    (commentId) => {
      setMenuCommentId(null);
      showCommentActionFeedback(commentId, "Comment reported");
    },
    [showCommentActionFeedback],
  );

  const handleEditComment = useCallback((storyId, comment) => {
    setMenuCommentId(null);

    const commentId = String(comment._id);

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
        input: comment.content || "",
        editingCommentId: commentId,
      },
    }));

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(
          (comment.content || "").length,
          (comment.content || "").length,
        );
      }
    }, 0);
  }, []);

  const handleDeleteComment = useCallback((storyId, commentId) => {
    setMenuCommentId(null);
    setDeleteTargetComment({ storyId, commentId });
  }, []);

  const handleConfirmDeleteComment = useCallback(async () => {
    if (!deleteTargetComment) {
      return;
    }

    const { storyId, commentId } = deleteTargetComment;
    setDeleteTargetComment(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setPostsError("Please login to delete comments.");
      return;
    }

    try {
      await deleteStoryComment(commentId);

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...prev[storyId],
          editingCommentId:
            String(prev[storyId]?.editingCommentId || "") === String(commentId)
              ? null
              : prev[storyId]?.editingCommentId || null,
          input:
            String(prev[storyId]?.editingCommentId || "") === String(commentId)
              ? ""
              : prev[storyId]?.input || "",
          items: (prev[storyId]?.items || []).filter(
            (item) => item._id !== commentId,
          ),
        },
      }));

      setPosts((prev) =>
        prev.map((post) =>
          post.id === storyId
            ? {
                ...post,
                commentCount: Math.max(0, Number(post.commentCount || 0) - 1),
              }
            : post,
        ),
      );
    } catch (error) {
      setPostsError(error.message || "Failed to delete comment.");
    }
  }, [deleteTargetComment]);

  const accountCircles = useMemo(() => followingAccounts, [followingAccounts]);

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
        editingCommentId: null,
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
            <div
              ref={feedScrollRef}
              className="min-h-0 flex flex-col overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <section className="bg-white/95 border border-slate-200 rounded-xl lg:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 px-1 sm:px-2 text-slate-900">
                  Following accounts
                </h2>

                <div className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {followingAccountsLoading ? (
                    <div className="text-sm text-slate-500 px-2 py-4">
                      Loading accounts...
                    </div>
                  ) : accountCircles.length > 0 ? (
                    accountCircles.map((account, i) => (
                      <div key={i} className="snap-start">
                        <StoryCircle {...account} />
                      </div>
                    ))
                  ) : (
                    <Link
                      to="/explore"
                      className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-slate-300 border-dashed p-1 relative bg-slate-50/80">
                        <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400">
                          <Plus size={20} />
                        </div>
                      </div>
                      <span className="text-[11px] mx-auto sm:text-xs font-medium text-slate-700 whitespace-nowrap rounded-md px-1.5 py-0.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
                        Add
                      </span>
                    </Link>
                  )}
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

                {!isLoadingPosts && !postsError && (
                  <>
                    {posts.map((post) => {
                      return (
                        <div key={post.id} className="w-full max-w-full">
                          <PostCard
                            {...post}
                            savedByCurrentUser={savedStoryIds.has(post.id)}
                            isExpanded={Boolean(expandedStoryIds[post.id])}
                            commentsActive={activeCommentStoryId === post.id}
                            shareStatus={shareFeedback[post.id]}
                            onToggleLike={handleToggleLike}
                            onOpenComments={handleOpenCommentsModal}
                            onToggleSave={handleToggleSave}
                            onShare={handleShare}
                            onDoubleTapLike={handleDoubleTapLike}
                            onToggleMenu={handleToggleMenu}
                            onReportStory={handleReportStory}
                            onEditStory={handleEditStory}
                            onDeleteStory={handleDeleteStory}
                            onToggleFollowAuthor={handleToggleFollowAuthor}
                            onToggleExpanded={handleToggleExpandedStory}
                            isMenuOpen={menuStoryId === post.id}
                            showLikeBurst={likeBurstStoryId === post.id}
                            showLikePulse={likePulseStoryId === post.id}
                            followingAuthor={Boolean(
                              followStateByUserId[post.authorId],
                            )}
                            followBusy={Boolean(busyFollowIds[post.authorId])}
                            showCommentCountPulse={
                              commentCountPulseStoryId === post.id
                            }
                          />
                        </div>
                      );
                    })}
                    {isLoadingMore && (
                      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500 text-center">
                        Loading more stories...
                      </div>
                    )}
                    {!hasMore && posts.length > 0 && (
                      <div className="flex items-center justify-center py-4">
                        <div
                          className="h-3 w-3 rounded-full bg-slate-300 shadow-sm ring-4 ring-slate-100"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </>
                )}

                <div ref={endOfFeedRef} className="h-1" />
              </section>
            </div>

            <aside className="hidden lg:block w-64 shrink-0 h-full">
              <div className="sticky top-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-900">
                  Top Authors
                </h2>

                <div className="space-y-2">
                  {topAuthorsLoading ? (
                    <div className="text-sm text-slate-500 py-3">
                      Loading top authors...
                    </div>
                  ) : topAuthorsError ? (
                    <div className="text-sm text-rose-600 py-3">
                      {topAuthorsError}
                    </div>
                  ) : topAuthors.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-rose-50/60 px-4 py-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-rose-500 shadow-sm ring-1 ring-rose-100">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            No author recommendations at the moment!
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Add more genre to your interests or like more
                            author's stories to help them surface in the
                            top-author list here!
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    topAuthors.map((author) => (
                      <AuthorRow
                        key={author.authorId}
                        {...author}
                        isFollowing={Boolean(
                          followStateByUserId[author.authorId],
                        )}
                        isBusy={Boolean(busyFollowIds[author.authorId])}
                        onToggleFollow={() =>
                          handleToggleFollowAuthor(author.authorId)
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>
        {feedToast && (isEndOfFeedVisible || isFeedToastVisible) && (
          <div className="pointer-events-none fixed right-4 bottom-4 z-50 w-[min(92vw,360px)]">
            <div
              className={`pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur px-4 py-3 transition-all duration-200 ease-out ${
                isFeedToastVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-slate-500">
                  <RefreshCcw size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-900">
                    Feed updated
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-slate-600">
                    {feedToast.message}
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshFeed}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    <RefreshCcw size={12} />
                    Back to top & refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
                  activeCommentState.items.map((comment) => {
                    const commentId = String(comment._id);
                    const commentOwnerId = normalizeId(comment.userId);
                    const canManageComment =
                      Boolean(currentUserId) &&
                      commentOwnerId === currentUserId;

                    return (
                      <div
                        key={comment._id}
                        className="rounded-xl bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          {commentOwnerId ? (
                            <Link
                              to={`/profile/${commentOwnerId}`}
                              className="text-xs font-semibold text-slate-700 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                            >
                              {comment.authorDisplayName || "Anonymous"}
                            </Link>
                          ) : (
                            <p className="text-xs font-semibold text-slate-700">
                              {comment.authorDisplayName || "Anonymous"}
                            </p>
                          )}

                          <div className="relative">
                            <button
                              onClick={() => handleToggleCommentMenu(commentId)}
                              className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
                              aria-label="Comment actions"
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {menuCommentId === commentId && (
                              <div className="absolute right-0 top-6 z-10 w-28 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                                {canManageComment ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditComment(
                                          activeCommentStory.id,
                                          comment,
                                        )
                                      }
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteComment(
                                          activeCommentStory.id,
                                          commentId,
                                        )
                                      }
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleReportComment(commentId)
                                    }
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                                  >
                                    Report
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-slate-700">
                          {comment.content}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {getRelativeTime(comment.createdAt)}
                        </p>

                        {commentActionFeedback[commentId] && (
                          <p className="text-[11px] text-emerald-600 mt-1">
                            {commentActionFeedback[commentId]}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmitComment(activeCommentStory.id);
                }}
                className="px-5 py-4 border-t border-slate-100 flex items-center gap-2"
              >
                {activeCommentState.editingCommentId && (
                  <p className="text-xs text-sky-600 whitespace-nowrap">
                    Editing comment
                  </p>
                )}
                <input
                  ref={commentInputRef}
                  type="text"
                  value={activeCommentState.input || ""}
                  onChange={(event) =>
                    handleCommentInputChange(
                      activeCommentStory.id,
                      event.target.value,
                    )
                  }
                  placeholder={
                    activeCommentState.editingCommentId
                      ? "Edit your comment..."
                      : "Write a comment..."
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
                {activeCommentState.editingCommentId && (
                  <button
                    type="button"
                    onClick={() => {
                      setCommentsByStory((prev) => ({
                        ...prev,
                        [activeCommentStory.id]: {
                          ...prev[activeCommentStory.id],
                          input: "",
                          editingCommentId: null,
                        },
                      }));
                    }}
                    className="rounded-xl border border-slate-200 text-slate-600 px-3 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={activeCommentState.submitting}
                  className="rounded-xl bg-rose-500 text-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  {activeCommentState.submitting
                    ? activeCommentState.editingCommentId
                      ? "Updating..."
                      : "Posting..."
                    : activeCommentState.editingCommentId
                      ? "Update"
                      : "Post"}
                </button>
              </form>
            </div>
          </div>
        )}

        {deleteTargetStoryId && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setDeleteTargetStoryId(null)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Delete this story?
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteTargetStoryId(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStory}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteTargetComment && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setDeleteTargetComment(null)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Delete this comment?
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteTargetComment(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteComment}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
