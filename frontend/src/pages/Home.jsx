import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  getCommentReplies,
} from "../api/story/storyCommentsApi";
import {
  toggleStoryLike,
  toggleCommentLike,
  toggleStoryBookmark,
  removeStoryBookmark,
  getMyBookmarkedStories,
} from "../api/story/storyInteractionsApi";
import CommentSection from "../components/CommentSection";
import Toast from "../components/Toast";
import { useToast } from "../lib/useToast";
import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  User,
  Plus,
  RefreshCcw,
  X,
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

const createEmptyRepliesState = () => ({
  open: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: "",
  items: [],
  nextCursor: null,
  hasMore: false,
});

const createEmptyCommentState = () => ({
  open: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: "",
  items: [],
  nextCursor: null,
  hasMore: false,
  input: "",
  originalInput: "",
  editingCommentId: null,
  replyingToCommentId: null,
  replyingToAuthor: "",
  submitting: false,
  repliesByComment: {},
});

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

      <span className="block w-full max-w-16 sm:max-w-20 text-center text-[11px] sm:text-xs font-medium text-slate-700 truncate rounded-md px-1.5 py-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
        {name}
      </span>
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 p-2 cursor-pointer group transition duration-300 ease-out hover:scale-[1.04]">
      {isAdd ? (
        content
      ) : (
        <Link
          to={authorId ? `/profile/${authorId}` : "/profile"}
          state={{ from: "/" }}
        >
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
  onToggleLike,
  onOpenComments,
  onToggleSave,
  onDoubleTapLike,
  onToggleMenu,
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
  focused,
}) => {
  const [isContentMeasured, setIsContentMeasured] = useState(false);
  const [areGenresExpanded, setAreGenresExpanded] = useState(false);
  const [areTagsExpanded, setAreTagsExpanded] = useState(false);
  const [areTagsWrapped, setAreTagsWrapped] = useState(false);
  const [firstRowTagCount, setFirstRowTagCount] = useState(4);
  const contentRef = useRef(null);
  const tagMeasurementRef = useRef(null);
  const collapsedContentHeight = 120;
  const genreDisplayLimit = 5;
  const storyContent = content || excerpt || "";
  const storyGenres =
    Array.isArray(genres) && genres.length > 0 ? genres : ["GENERAL"];
  const storyTags = useMemo(() => (Array.isArray(tags) ? tags : []), [tags]);
  const visibleGenres = areGenresExpanded
    ? storyGenres
    : storyGenres.slice(0, genreDisplayLimit);
  const hiddenGenreCount = Math.max(storyGenres.length - genreDisplayLimit, 0);
  const hiddenTagCount = areTagsWrapped
    ? Math.max(storyTags.length - firstRowTagCount, 0)
    : 0;
  const canExpandTags = hiddenTagCount > 0;
  const isTagsExpanded = canExpandTags && areTagsExpanded;
  const visibleTags =
    areTagsWrapped && !isTagsExpanded
      ? storyTags.slice(0, firstRowTagCount)
      : storyTags;

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

  useEffect(() => {
    const measurementElement = tagMeasurementRef.current;

    if (!measurementElement) {
      return undefined;
    }

    const updateTagWrapState = () => {
      const tagElements = Array.from(
        measurementElement.querySelectorAll('[data-tag-chip="true"]'),
      );

      if (tagElements.length === 0) {
        setAreTagsWrapped(false);
        setFirstRowTagCount(4);
        return;
      }

      const firstRowTop = tagElements[0].offsetTop;
      const calculatedFirstRowCount = tagElements.filter(
        (tagElement) => tagElement.offsetTop <= firstRowTop + 1,
      ).length;
      const safeFirstRowCount = Math.max(calculatedFirstRowCount, 1);

      setFirstRowTagCount(safeFirstRowCount);
      setAreTagsWrapped(safeFirstRowCount < tagElements.length);
    };

    const frameId = requestAnimationFrame(() => {
      updateTagWrapState();
    });

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => {
      updateTagWrapState();
    });

    observer.observe(measurementElement);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [storyTags]);

  return (
    <div
      onDoubleClick={() => onDoubleTapLike(id)}
      className={`relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md ${
        focused ? "ring-4 ring-rose-50 bg-rose-50/60" : ""
      }`}
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

      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to={authorId ? `/profile/${authorId}` : "/profile"}
            state={{ from: "/" }}
            className="w-10 h-10 shrink-0 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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
                state={{ from: "/" }}
                className="font-semibold text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {author}
              </Link>
              <span className="text-slate-400 text-xs">• {time}</span>
            </div>

            <div className="mt-1 flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
              {visibleGenres.map((genre, index) => (
                <span
                  key={`${id}-genre-${String(genre)}-${index}`}
                  className="inline-flex max-w-full items-center gap-2"
                >
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[10px] font-semibold text-rose-400"
                    >
                      •
                    </span>
                  )}
                  <span className="max-w-full truncate text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                    {genre}
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

        <div className="relative flex items-center gap-2" data-story-menu>
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

          {canManage ? (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleMenu(id);
                }}
                className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors duration-200"
                aria-label="Story actions"
              >
                <MoreHorizontal size={20} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditStory(id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteStory(id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 cursor-pointer hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : null}
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

      {storyTags.length > 0 && (
        <div className="relative mb-4">
          <div
            ref={tagMeasurementRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 -z-10 flex w-full flex-wrap items-center gap-x-3 gap-y-1 opacity-0"
          >
            {storyTags.map((tag, index) => (
              <span
                key={`${id}-measure-tag-${String(tag)}-${index}`}
                data-tag-chip="true"
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {visibleTags.map((tag, index) => (
              <span
                key={`${id}-tag-${String(tag)}-${index}`}
                className="text-xs font-semibold tracking-wide text-rose-600"
              >
                #
                {String(tag || "")
                  .trim()
                  .replace(/^#/, "")
                  .replaceAll(/\s+/g, "")}
              </span>
            ))}

            {canExpandTags && !isTagsExpanded && (
              <button
                type="button"
                onClick={() => setAreTagsExpanded(true)}
                className="text-xs font-semibold cursor-pointer tracking-wide text-rose-600 transition-colors hover:text-rose-700"
                aria-label={`Show ${hiddenTagCount} more tags`}
              >
                +{hiddenTagCount}
              </button>
            )}

            {canExpandTags && isTagsExpanded && (
              <button
                type="button"
                onClick={() => setAreTagsExpanded(false)}
                className="text-xs font-semibold cursor-pointer tracking-wide text-slate-500 transition-colors hover:text-slate-700"
                aria-label="Collapse tags"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onToggleLike(id)}
            className={`flex items-center gap-2 transition-all cursor-pointer duration-200 ${
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
            className={`flex items-center gap-2 transition-all cursor-pointer duration-200 ${
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
            className="text-rose-500 hover:text-rose-600 transition-colors duration-200 cursor-pointer"
            aria-label="Save story"
          >
            <Bookmark
              size={20}
              fill={savedByCurrentUser ? "currentColor" : "none"}
            />
          </button>
          {/* share button removed */}
        </div>
      </div>
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
        state={{ from: "/" }}
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
          state={{ from: "/" }}
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
  const location = useLocation();
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
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState({});
  const [commentLikePulseIds, setCommentLikePulseIds] = useState({});
  const [expandedStoryIds, setExpandedStoryIds] = useState({});
  const [isEndOfFeedVisible, setIsEndOfFeedVisible] = useState(false);
  const endOfFeedRef = useRef(null);
  const feedScrollRef = useRef(null);
  const commentInputRef = useRef(null);
  const commentListRef = useRef(null);
  const commentListSentinelRef = useRef(null);
  const hasShownEndToastRef = useRef(false);

  const {
    toast: feedToast,
    isVisible: isFeedToastVisible,
    isPaused: isFeedToastPaused,
    duration,
    showToast: showFeedToast,
    hideToast: hideFeedToast,
    pauseToast: pauseFeedToast,
    resumeToast: resumeFeedToast,
  } = useToast();

  const resizeCommentTextarea = useCallback((textarea) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

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
  }, [currentUserId, followingAccountsRefreshToken]);

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

  const [currentUserProfilePicture, setCurrentUserProfilePicture] = useState(
    () => {
      try {
        const currentUser = JSON.parse(
          localStorage.getItem("currentUser") || "null",
        );
        return currentUser?.profilePicture || "";
      } catch {
        return "";
      }
    },
  );

  useEffect(() => {
    let isMounted = true;
    if (!currentUserId) {
      if (isMounted) setCurrentUserProfilePicture("");
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

  useEffect(() => {
    if (!menuStoryId && !menuCommentId) {
      return undefined;
    }

    const handlePointerDownOutsideMenu = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-story-menu],[data-comment-menu]")) {
        return;
      }

      setMenuStoryId(null);
      setMenuCommentId(null);
    };

    document.addEventListener("mousedown", handlePointerDownOutsideMenu);
    document.addEventListener("touchstart", handlePointerDownOutsideMenu);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutsideMenu);
      document.removeEventListener("touchstart", handlePointerDownOutsideMenu);
    };
  }, [menuCommentId, menuStoryId]);

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

        // Fetch all author profiles and include username/displayName
        const authorProfiles = await Promise.all(
          uniqueAuthorIds.map(async (authorId) => {
            try {
              const profile = await getProfileByUserId(authorId);
              return [
                authorId,
                {
                  avatar: profile?.profilePicture || "",
                  name:
                    profile?.displayName ||
                    profile?.username ||
                    profile?.name ||
                    `Author ${String(authorId).slice(-4).toUpperCase()}`,
                },
              ];
            } catch {
              return [
                authorId,
                {
                  avatar: "",
                  name: `Author ${String(authorId).slice(-4).toUpperCase()}`,
                },
              ];
            }
          }),
        );

        const authorProfileMap = new Map(authorProfiles);

        const mappedStories = rawStories.map((story) => {
          const authorId = normalizeId(story.authorId);
          const authorProfile = authorProfileMap.get(authorId) || {};
          return {
            id: String(story._id),
            authorId,
            author: authorProfile.name,
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
            followingAuthor: Boolean(story.followedByCurrentUser),
            followBusy: false,
            avatar: authorProfile.avatar || "",
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
          const errorMessage =
            "Unable to load stories right now. Please try again.";

          if (isInitial) {
            setPostsError(errorMessage);
          }

          showFeedToast(errorMessage, "error");
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
    [currentUserId, showFeedToast],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadStories(controller.signal, null);

    return () => controller.abort();
  }, [loadStories]);

  useEffect(() => {
    const initialFocused = location?.state?.focusedPostId;
    if (!initialFocused) return;

    const tryScroll = () => {
      const el = document.getElementById(`post-${initialFocused}`);
      if (!el) {
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      navigate(location.pathname, { replace: true, state: {} });
    };

    requestAnimationFrame(tryScroll);
    const t = setTimeout(tryScroll, 500);

    return () => clearTimeout(t);
  }, [location, posts, navigate]);

  const handleRefreshFeed = useCallback(() => {
    hasShownEndToastRef.current = false;
    hideFeedToast();
    setIsEndOfFeedVisible(false);

    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    const controller = new AbortController();
    loadStories(controller.signal, null);
  }, [hideFeedToast, loadStories]);

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
          showFeedToast("You're all caught up. Scroll up to refresh.", "info", {
            action: {
              label: "Back to top & refresh",
              icon: RefreshCcw,
              onClick: handleRefreshFeed,
            },
          });
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
  }, [
    cursor,
    hasMore,
    handleRefreshFeed,
    loadStories,
    posts.length,
    showFeedToast,
  ]);

  const fetchComments = useCallback(
    async (storyId, cursor = null, append = false) => {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...prev[storyId],
          loading: !append,
          loadingMore: append,
          error: "",
        },
      }));

      try {
        const payload = await getStoryComments(storyId, {
          limit: 10,
          cursor,
        });
        const comments = Array.isArray(payload?.comments)
          ? payload.comments
          : [];

        setCommentsByStory((prev) => {
          const existingState = prev[storyId] || createEmptyCommentState();
          const mergedItems = append
            ? [...(existingState.items || []), ...comments]
            : comments;

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...existingState,
              loading: false,
              loadingMore: false,
              error: "",
              loaded: true,
              items: mergedItems.map((comment) => ({
                ...comment,
                replyCount: Number(comment?.replyCount || 0),
              })),
              nextCursor: payload?.nextCursor || null,
              hasMore: Boolean(payload?.hasMore),
            },
          };
        });
      } catch {
        setCommentsByStory((prev) => {
          const existingState = prev[storyId] || createEmptyCommentState();
          const shouldShowInlineError = Boolean(existingState.loaded);

          if (!shouldShowInlineError) {
            showFeedToast("Unable to load comments.", "error");
          }

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...existingState,
              loading: false,
              loadingMore: false,
              error: "Unable to load comments.",
            },
          };
        });
      }
    },
    [showFeedToast],
  );

  const handleToggleLike = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
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
        const errorMessage = "Failed to update reaction. Please try again.";
        setPostsError(errorMessage);
        showFeedToast(errorMessage, "error");
      }
    },
    [navigate, showFeedToast],
  );

  const handleToggleComments = useCallback(
    (storyId) => {
      const current = commentsByStory[storyId] || createEmptyCommentState();

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

  const handleLoadMoreComments = useCallback(
    (storyId) => {
      const current = commentsByStory[storyId] || createEmptyCommentState();
      if (!current.hasMore || !current.nextCursor) {
        return;
      }

      fetchComments(storyId, current.nextCursor, true);
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

  useEffect(() => {
    if (!activeCommentStoryId) {
      return undefined;
    }

    const activeCommentState =
      commentsByStory[activeCommentStoryId] || createEmptyCommentState();
    const sentinel = commentListSentinelRef.current;
    const root = commentListRef.current;

    if (
      !sentinel ||
      !root ||
      !activeCommentState.hasMore ||
      activeCommentState.loading ||
      activeCommentState.loadingMore
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMoreComments(activeCommentStoryId);
        }
      },
      {
        root,
        rootMargin: "0px 0px 120px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeCommentStoryId, commentsByStory, handleLoadMoreComments]);

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

  const fetchReplies = useCallback(
    async (storyId, commentId, cursor = null, append = false) => {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          repliesByComment: {
            ...(prev[storyId]?.repliesByComment || {}),
            [commentId]: {
              ...createEmptyRepliesState(),
              ...(prev[storyId]?.repliesByComment?.[commentId] || {}),
              loading: !append,
              loadingMore: append,
              error: "",
            },
          },
        },
      }));

      try {
        const payload = await getCommentReplies(commentId, {
          limit: 4,
          cursor,
        });
        const replies = Array.isArray(payload?.replies) ? payload.replies : [];

        setCommentsByStory((prev) => {
          const existingReplyState =
            prev[storyId]?.repliesByComment?.[commentId] ||
            createEmptyRepliesState();
          const mergedItems = append
            ? [...(existingReplyState.items || []), ...replies]
            : replies;

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...prev[storyId],
              repliesByComment: {
                ...(prev[storyId]?.repliesByComment || {}),
                [commentId]: {
                  ...createEmptyRepliesState(),
                  ...existingReplyState,
                  loading: false,
                  loaded: true,
                  open: true,
                  error: "",
                  items: mergedItems,
                  nextCursor: payload?.nextCursor || null,
                  hasMore: Boolean(payload?.hasMore),
                },
              },
            },
          };
        });
      } catch {
        showFeedToast("Unable to load replies.", "error");

        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...prev[storyId],
            repliesByComment: {
              ...(prev[storyId]?.repliesByComment || {}),
              [commentId]: {
                ...createEmptyRepliesState(),
                ...(prev[storyId]?.repliesByComment?.[commentId] || {}),
                loading: false,
                error: "Unable to load replies.",
              },
            },
          },
        }));
      }
    },
    [showFeedToast],
  );

  const handleToggleReplies = useCallback(
    (storyId, commentId) => {
      const currentReplyState =
        commentsByStory[storyId]?.repliesByComment?.[commentId] ||
        createEmptyRepliesState();
      const nextOpen = !currentReplyState.open;

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          repliesByComment: {
            ...(prev[storyId]?.repliesByComment || {}),
            [commentId]: {
              ...currentReplyState,
              open: nextOpen,
            },
          },
        },
      }));

      if (nextOpen && !currentReplyState.loaded && !currentReplyState.loading) {
        fetchReplies(storyId, commentId);
      }
    },
    [commentsByStory, fetchReplies],
  );

  const handleLoadMoreReplies = useCallback(
    (storyId, commentId) => {
      const currentReplyState =
        commentsByStory[storyId]?.repliesByComment?.[commentId] ||
        createEmptyRepliesState();

      if (!currentReplyState.hasMore || !currentReplyState.nextCursor) {
        return;
      }

      fetchReplies(storyId, commentId, currentReplyState.nextCursor, true);
    },
    [commentsByStory, fetchReplies],
  );

  const handleCommentInputChange = useCallback((storyId, input) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
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
        navigate("/login", { replace: true });
        return;
      }

      const current = commentsByStory[storyId];
      const content = current?.input?.trim();
      const editingCommentId = current?.editingCommentId || null;
      const replyingToCommentId = current?.replyingToCommentId || null;
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
              ...createEmptyCommentState(),
              ...prev[storyId],
              submitting: false,
              input: "",
              editingCommentId: null,
              replyingToCommentId: null,
              replyingToAuthor: "",
              loaded: true,
              items: (prev[storyId]?.items || []).map((item) =>
                String(item._id) === String(editingCommentId)
                  ? { ...item, content, isEdited: true }
                  : item,
              ),
              repliesByComment: Object.fromEntries(
                Object.entries(prev[storyId]?.repliesByComment || {}).map(
                  ([parentId, replyState]) => [
                    parentId,
                    {
                      ...replyState,
                      items: (replyState?.items || []).map((item) =>
                        String(item?._id || item?.id) ===
                        String(editingCommentId)
                          ? { ...item, content, isEdited: true }
                          : item,
                      ),
                    },
                  ],
                ),
              ),
            },
          }));

          showCommentActionFeedback(editingCommentId, "Comment updated");
          showFeedToast("Comment updated.", "success");
        } else {
          const payload = await addStoryComment(storyId, {
            content,
            parentId: replyingToCommentId,
          });
          const previousReplyState =
            current?.repliesByComment?.[replyingToCommentId] ||
            createEmptyRepliesState();
          const didLoadReplies = Boolean(previousReplyState.loaded);

          const newComment = {
            _id: payload.commentId || `${Date.now()}`,
            userId: currentUserId,
            authorDisplayName: currentUsername,
            authorProfilePicture: currentUserProfilePicture,
            content,
            createdAt: new Date().toISOString(),
            likesCount: 0,
            likedByCurrentUser: false,
            isEdited: false,
            parentId: replyingToCommentId,
            replyCount: 0,
          };

          setCommentsByStory((prev) => {
            const existingReplyState =
              prev[storyId]?.repliesByComment?.[replyingToCommentId] || {};
            const replyStateLoaded = existingReplyState.loaded === true;

            return {
              ...prev,
              [storyId]: {
                ...createEmptyCommentState(),
                ...prev[storyId],
                submitting: false,
                input: "",
                editingCommentId: null,
                replyingToCommentId: null,
                replyingToAuthor: "",
                loaded: true,
                items: replyingToCommentId
                  ? (prev[storyId]?.items || []).map((item) =>
                      String(item?._id || item?.id) ===
                      String(replyingToCommentId)
                        ? {
                            ...item,
                            replyCount: Number(item?.replyCount || 0) + 1,
                          }
                        : item,
                    )
                  : [newComment, ...(prev[storyId]?.items || [])],
                repliesByComment: replyingToCommentId
                  ? {
                      ...(prev[storyId]?.repliesByComment || {}),
                      [replyingToCommentId]: {
                        ...createEmptyRepliesState(),
                        ...existingReplyState,
                        open: true,
                        loaded: replyStateLoaded,
                        loading: false,
                        error: "",
                        items: [
                          ...(existingReplyState?.items || []),
                          newComment,
                        ],
                      },
                    }
                  : prev[storyId]?.repliesByComment || {},
              },
            };
          });

          if (replyingToCommentId && !didLoadReplies) {
            fetchReplies(storyId, replyingToCommentId);
          }

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

          showFeedToast("Comment posted.", "success");
        }
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...prev[storyId],
            submitting: false,
            error: editingCommentId
              ? "Failed to update comment."
              : replyingToCommentId
                ? "Failed to post reply."
                : "Failed to post comment.",
          },
        }));
      }
    },
    [
      commentsByStory,
      currentUserId,
      currentUsername,
      currentUserProfilePicture,
      navigate,
      showCommentActionFeedback,
      showFeedToast,
      fetchReplies,
    ],
  );

  const handleToggleSave = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

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

        showFeedToast(
          isAlreadySaved
            ? "Removed story from saved items."
            : "Story saved successfully.",
          "success",
        );
      } catch (error) {
        console.error("Failed to toggle bookmark:", error);
        showFeedToast("Failed to update bookmark. Please try again.", "error");
      }
    },
    [savedStoryIds, navigate, showFeedToast],
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

  const handleToggleFollowAuthor = useCallback(
    async (authorId) => {
      const normalizedTargetUserId = normalizeId(authorId);

      if (!normalizedTargetUserId) {
        return;
      }

      if (!currentUserId) {
        navigate("/login", { replace: true });
        return;
      }

      if (normalizedTargetUserId === currentUserId) {
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

        showFeedToast(
          confirmedFollowing
            ? "You are now following this author."
            : "You have unfollowed this author.",
          "success",
        );
      } catch {
        showFeedToast(
          "Unable to update follow status. Please try again.",
          "error",
        );
      } finally {
        setBusyFollowIds((previous) => ({
          ...previous,
          [normalizedTargetUserId]: false,
        }));
      }
    },
    [currentUserId, followStateByUserId, navigate, showFeedToast],
  );

  const handleReportStory = useCallback(
    (storyId) => {
      setMenuStoryId(null);
      showFeedToast(`Report submitted for ${storyId}`, "success");
    },
    [showFeedToast],
  );

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
      navigate("/login", { replace: true });
      return;
    }

    try {
      await deleteStory(storyId);

      setPosts((prev) => prev.filter((post) => post.id !== storyId));
      if (activeCommentStoryId === storyId) {
        setActiveCommentStoryId(null);
      }
    } catch (error) {
      const errorMessage = error.message || "Failed to delete story.";
      setPostsError(errorMessage);
      showFeedToast(errorMessage, "error");
    }
  }, [activeCommentStoryId, deleteTargetStoryId, navigate, showFeedToast]);

  const handleToggleCommentMenu = useCallback((commentId) => {
    setMenuCommentId((currentId) =>
      currentId === commentId ? null : commentId,
    );
  }, []);

  const handleToggleCommentLike = useCallback(
    async (storyId, commentId) => {
      if (!storyId || !commentId || pendingCommentLikeIds[commentId]) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      setCommentLikePulseIds((prev) => ({ ...prev, [commentId]: true }));
      setPendingCommentLikeIds((prev) => ({ ...prev, [commentId]: true }));

      try {
        const payload = await toggleCommentLike(commentId);

        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...(prev[storyId] || {}),
            items: (prev[storyId]?.items || []).map((item) =>
              String(item?._id || item?.id) === String(commentId)
                ? {
                    ...item,
                    likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                    likesCount: Number(payload?.likesCount || 0),
                  }
                : item,
            ),
            repliesByComment: Object.fromEntries(
              Object.entries(prev[storyId]?.repliesByComment || {}).map(
                ([parentId, replyState]) => [
                  parentId,
                  {
                    ...replyState,
                    items: (replyState?.items || []).map((item) =>
                      String(item?._id || item?.id) === String(commentId)
                        ? {
                            ...item,
                            likedByCurrentUser: Boolean(
                              payload?.likedByCurrentUser,
                            ),
                            likesCount: Number(payload?.likesCount || 0),
                          }
                        : item,
                    ),
                  },
                ],
              ),
            ),
          },
        }));
      } catch (error) {
        showCommentActionFeedback(
          commentId,
          error.message || "Failed to update comment like.",
        );
      } finally {
        setPendingCommentLikeIds((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });

        setTimeout(() => {
          setCommentLikePulseIds((prev) => {
            const next = { ...prev };
            delete next[commentId];
            return next;
          });
        }, 220);
      }
    },
    [pendingCommentLikeIds, navigate, showCommentActionFeedback],
  );

  const handleStartReply = useCallback((storyId, comment) => {
    setMenuCommentId(null);

    const replyCommentId = String(comment?._id || comment?.id || "");
    const replyAuthor = comment?.authorDisplayName || "Anonymous";

    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: "",
        editingCommentId: null,
        replyingToCommentId: replyCommentId,
        replyingToAuthor: replyAuthor,
      },
    }));

    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, 0);
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
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: comment.content || "",
        originalInput: comment.content || "",
        editingCommentId: commentId,
        replyingToCommentId: null,
        replyingToAuthor: "",
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

  const handleDeleteComment = useCallback(
    (storyId, commentId) => {
      setMenuCommentId(null);
      const storyState = commentsByStory[storyId] || createEmptyCommentState();
      const topLevelComment = (storyState.items || []).find(
        (item) => String(item?._id || item?.id) === String(commentId),
      );
      const replyParentEntry = Object.entries(
        storyState.repliesByComment || {},
      ).find(([, replyState]) =>
        (replyState?.items || []).some(
          (item) => String(item?._id || item?.id) === String(commentId),
        ),
      );

      setDeleteTargetComment({
        storyId,
        commentId,
        replyCount: Number(topLevelComment?.replyCount || 0),
        parentId:
          normalizeId(topLevelComment?.parentId) ||
          String(replyParentEntry?.[0] || ""),
      });
    },
    [commentsByStory],
  );

  const handleCancelCommentComposer = useCallback((storyId) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: "",
        editingCommentId: null,
        replyingToCommentId: null,
        replyingToAuthor: "",
      },
    }));
  }, []);

  const handleConfirmDeleteComment = useCallback(async () => {
    if (!deleteTargetComment) {
      return;
    }

    const {
      storyId,
      commentId,
      parentId,
      replyCount = 0,
    } = deleteTargetComment;
    setDeleteTargetComment(null);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      await deleteStoryComment(commentId);

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          editingCommentId:
            String(prev[storyId]?.editingCommentId || "") === String(commentId)
              ? null
              : prev[storyId]?.editingCommentId || null,
          input:
            String(prev[storyId]?.editingCommentId || "") ===
              String(commentId) ||
            String(prev[storyId]?.replyingToCommentId || "") ===
              String(commentId)
              ? ""
              : prev[storyId]?.input || "",
          replyingToCommentId:
            String(prev[storyId]?.replyingToCommentId || "") ===
            String(commentId)
              ? null
              : prev[storyId]?.replyingToCommentId || null,
          replyingToAuthor:
            String(prev[storyId]?.replyingToCommentId || "") ===
            String(commentId)
              ? ""
              : prev[storyId]?.replyingToAuthor || "",
          items: (prev[storyId]?.items || []).filter(
            (item) => String(item?._id || item?.id) !== String(commentId),
          ),
          repliesByComment: Object.fromEntries(
            Object.entries(prev[storyId]?.repliesByComment || {})
              .map(([replyParentId, replyState]) => [
                replyParentId,
                {
                  ...replyState,
                  items: (replyState?.items || []).filter(
                    (item) =>
                      String(item?._id || item?.id) !== String(commentId),
                  ),
                },
              ])
              .filter(
                ([replyParentId]) =>
                  String(replyParentId) !== String(commentId),
              ),
          ),
        },
      }));

      if (parentId) {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...(prev[storyId] || {}),
            items: (prev[storyId]?.items || []).map((item) =>
              String(item?._id || item?.id) === String(parentId)
                ? {
                    ...item,
                    replyCount: Math.max(0, Number(item?.replyCount || 0) - 1),
                  }
                : item,
            ),
          },
        }));
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === storyId
            ? {
                ...post,
                commentCount: Math.max(
                  0,
                  Number(post.commentCount || 0) -
                    (parentId ? 1 : 1 + Number(replyCount || 0)),
                ),
              }
            : post,
        ),
      );

      showFeedToast("Comment deleted.", "success");
    } catch (error) {
      showCommentActionFeedback(
        commentId,
        error.message || "Failed to delete comment.",
      );
    }
  }, [deleteTargetComment, navigate, showCommentActionFeedback, showFeedToast]);

  const accountCircles = useMemo(() => followingAccounts, [followingAccounts]);

  const activeCommentStory = posts.find(
    (post) => post.id === activeCommentStoryId,
  );
  const activeCommentState = activeCommentStoryId
    ? commentsByStory[activeCommentStoryId] || {
        ...createEmptyCommentState(),
        open: true,
      }
    : null;

  useEffect(() => {
    if (!activeCommentStoryId || !commentInputRef.current) {
      return;
    }

    resizeCommentTextarea(commentInputRef.current);
  }, [activeCommentStoryId, activeCommentState?.input, resizeCommentTextarea]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <Navbar title="Home Feed" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-4 lg:gap-6 px-3 sm:px-5 lg:px-6 py-5 sm:py-6">
            <div
              ref={feedScrollRef}
              className="min-h-0 flex flex-col overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <section className="bg-white/95 border border-slate-200 rounded-xl lg:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 px-1 sm:px-2 text-slate-900">
                  Following accounts
                </h2>

                <div className="flex md:gap-2 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {followingAccountsLoading ? (
                    <div className="flex gap-4 sm:gap-5">
                      {[...Array(3)].map((_, index) => (
                        <div
                          key={index}
                          className="snap-start flex flex-col items-center gap-2 shrink-0 animate-pulse"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200" />
                          <div className="h-3 w-12 rounded-full bg-slate-200" />
                        </div>
                      ))}
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
                      className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group transition duration-300 ease-out hover:scale-[1.04]"
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
                      const isFocused =
                        location &&
                        location.state &&
                        location.state.focusedPostId === post.id;
                      return (
                        <div
                          id={`post-${post.id}`}
                          key={post.id}
                          className={`w-full max-w-full ${
                            location &&
                            location.state &&
                            location.state.focusedPostId
                              ? isFocused
                                ? ""
                                : "opacity-70"
                              : ""
                          }`}
                        >
                          <PostCard
                            {...post}
                            focused={isFocused}
                            savedByCurrentUser={savedStoryIds.has(post.id)}
                            isExpanded={Boolean(expandedStoryIds[post.id])}
                            commentsActive={activeCommentStoryId === post.id}
                            onToggleLike={handleToggleLike}
                            onOpenComments={handleOpenCommentsModal}
                            onToggleSave={handleToggleSave}
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
          <Toast
            toast={feedToast}
            isVisible={isFeedToastVisible}
            isPaused={isFeedToastPaused}
            durationMs={duration}
            onClose={hideFeedToast}
            onPause={pauseFeedToast}
            onResume={resumeFeedToast}
          />
        )}
        <CommentSection
          story={activeCommentStory}
          commentState={activeCommentState}
          activeMenuCommentId={menuCommentId}
          currentUserId={currentUserId}
          commentActionFeedback={commentActionFeedback}
          pendingCommentLikeIds={pendingCommentLikeIds}
          commentLikePulseIds={commentLikePulseIds}
          commentListRef={commentListRef}
          commentListSentinelRef={commentListSentinelRef}
          commentInputRef={commentInputRef}
          onClose={() => setActiveCommentStoryId(null)}
          onToggleCommentLike={handleToggleCommentLike}
          onToggleCommentMenu={handleToggleCommentMenu}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onReportComment={handleReportComment}
          onStartReply={handleStartReply}
          onToggleReplies={handleToggleReplies}
          onLoadMoreReplies={handleLoadMoreReplies}
          onCancelCommentComposer={handleCancelCommentComposer}
          onCommentInputChange={handleCommentInputChange}
          onSubmitComment={handleSubmitComment}
        />

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
                  className="px-4 py-2 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStory}
                  className="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-rose-500 text-white hover:bg-rose-600"
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
                  className="px-4 py-2 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteComment}
                  className="px-4 py-2 text-sm font-semibold rounded-lg cursor-pointer bg-rose-500 text-white hover:bg-rose-600"
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
