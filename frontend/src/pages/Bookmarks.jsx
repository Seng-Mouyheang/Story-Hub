import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bookmark,
  FileText,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  User,
  X,
} from "lucide-react";
import PropTypes from "prop-types";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import CommentSection from "../components/CommentSection";
import Toast from "../components/Toast";
import { useToast } from "../lib/useToast";
import {
  addStoryComment,
  deleteStoryComment,
  getCommentReplies,
  getStoryComments,
  updateStoryComment,
} from "../api/story/storyCommentsApi";
import {
  getMyBookmarkedStories,
  removeStoryBookmark,
  toggleCommentLike,
  toggleStoryLike,
} from "../api/story/storyInteractionsApi";
import { deleteStory } from "../api/story/storyApi";
import {
  getBookmarkedConfessions,
  removeConfessionBookmark,
} from "../api/confession/confessionBookmarkApi";
import {
  followUser,
  getFollowStatus,
  getProfileByUserId,
  unfollowUser,
} from "../api/profile";
import ConfessionFeedCard from "./confession/ConfessionFeedCard";
import { useOutsideClickCloser } from "./confession/useOutsideClickCloser";
import {
  getRelativeTime as getSharedRelativeTime,
  parseResponse,
} from "./confession/confessionUtils";
import { useConfessionComments } from "./confession/useConfessionComments";

const formatCount = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
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

const getContentPreview = (content, isExpanded, maxLength = 260) => {
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

function StoryBookmarkCardSkeleton() {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-100 p-5 sm:p-6 animate-pulse shadow-sm border border-slate-200">
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="h-4 w-32 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded-full bg-slate-200" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="h-3 w-16 rounded-full bg-slate-200" />
              <div className="h-3 w-20 rounded-full bg-slate-200" />
              <div className="h-3 w-12 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="h-8 w-20 rounded-full bg-slate-200" />
      </div>

      <div className="space-y-3">
        <div className="h-6 w-3/4 rounded-full bg-slate-200" />
        <div className="h-5 w-full rounded-full bg-slate-200" />
        <div className="h-5 w-2/3 rounded-full bg-slate-200" />
      </div>

      <div className="flex items-center gap-4 pt-4 mt-4 border-t border-slate-200">
        <div className="h-8 w-16 rounded-full bg-slate-200" />
        <div className="h-8 w-14 rounded-full bg-slate-200" />
        <div className="ml-auto h-8 w-8 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function ConfessionBookmarkCardSkeleton() {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-100 p-5 sm:p-6 animate-pulse shadow-sm border border-slate-200">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-1/3 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-1/4 rounded-full bg-slate-200" />
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
  );
}

// NOSONAR
const StoryBookmarkCard = ({
  story,
  currentUserId,
  menuStoryId,
  isExpanded,
  commentsActive,
  followingAuthor,
  followBusy,
  onToggleStoryMenu,
  onEditStory,
  onDeleteStory,
  onToggleLike,
  onOpenComments,
  onUnsave,
  onToggleExpanded,
  onToggleFollowAuthor,
}) => {
  const [areGenresExpanded, setAreGenresExpanded] = useState(false);
  const [areTagsExpanded, setAreTagsExpanded] = useState(false);
  const [areTagsWrapped, setAreTagsWrapped] = useState(false);
  const [firstRowTagCount, setFirstRowTagCount] = useState(4);
  const tagMeasurementRef = useRef(null);
  const storyGenres = useMemo(
    () =>
      Array.isArray(story.genres) && story.genres.length > 0
        ? story.genres
        : ["GENERAL"],
    [story.genres],
  );
  const visibleGenres = areGenresExpanded
    ? storyGenres
    : storyGenres.slice(0, 5);
  const hiddenGenreCount = Math.max(storyGenres.length - 5, 0);
  const tags = useMemo(
    () => (Array.isArray(story.tags) ? story.tags : []),
    [story.tags],
  );
  const hiddenTagCount = areTagsWrapped
    ? Math.max(tags.length - firstRowTagCount, 0)
    : 0;
  const canExpandTags = hiddenTagCount > 0;
  const visibleTags =
    areTagsWrapped && !areTagsExpanded ? tags.slice(0, firstRowTagCount) : tags;
  const canManageStory =
    Boolean(currentUserId) && story.authorId === currentUserId;
  const { visibleContent, isLongContent } = getContentPreview(
    story.content,
    isExpanded,
  );
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate("/", { state: { focusedPostId: story.id } });
  };

  const handleCardKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCardClick();
    }
  };

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

    const frameId = requestAnimationFrame(updateTagWrapState);

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
  }, [tags]);

  return (
    <div
      className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View story: ${story.title}`}
    >
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to={story.authorId ? `/profile/${story.authorId}` : "/profile"}
            state={{ from: "/bookmarks" }}
            className="w-10 h-10 shrink-0 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label={`View ${story.author} profile`}
          >
            {story.avatar ? (
              <img
                src={story.avatar}
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
                to={story.authorId ? `/profile/${story.authorId}` : "/profile"}
                state={{ from: "/bookmarks" }}
                className="font-semibold text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {story.author}
              </Link>
              <span className="text-slate-400 text-xs">• {story.time}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {visibleGenres.map((genre, index) => (
                <span
                  key={`${story.id}-genre-${String(genre)}-${index}`}
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
                    {genre}
                  </span>
                </span>
              ))}

              {hiddenGenreCount > 0 && !areGenresExpanded ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAreGenresExpanded(true);
                  }}
                  className="text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-rose-600 transition-colors hover:text-rose-700"
                  aria-label={`Show ${hiddenGenreCount} more genres`}
                >
                  +{hiddenGenreCount}
                </button>
              ) : null}

              {hiddenGenreCount > 0 && areGenresExpanded ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAreGenresExpanded(false);
                  }}
                  className="text-[10px] font-semibold uppercase cursor-pointer tracking-wider text-slate-500 transition-colors hover:text-slate-700"
                  aria-label="Collapse genres"
                >
                  Show less
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2" data-story-menu>
          {story.authorId && story.authorId !== currentUserId ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFollowAuthor(story.authorId);
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

          {canManageStory ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleStoryMenu(story.id);
                }}
                className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors duration-200"
                aria-label="Story actions"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuStoryId === story.id ? (
                <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1 overflow-hidden">
                  <Link
                    to={`/write?storyId=${story.id}&returnTo=/bookmarks`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditStory(story.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileText size={14} />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteStory(story.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
        {story.title}
      </h2>
      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-2">
        {visibleContent}
      </p>

      {isLongContent ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpanded(story.id);
          }}
          className="mb-4 text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      ) : (
        <div className="mb-4" />
      )}

      {Array.isArray(story.tags) && story.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div
            ref={tagMeasurementRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 -z-10 flex w-full flex-wrap items-center gap-x-3 gap-y-1 opacity-0"
          >
            {tags.map((tag, index) => (
              <span
                key={`${story.id}-measure-tag-${String(tag)}-${index}`}
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

          {visibleTags.map((tag, index) => (
            <span
              key={`${story.id}-tag-${String(tag)}-${index}`}
              className="text-xs font-semibold tracking-wide text-rose-600"
            >
              #
              {String(tag || "")
                .trim()
                .replace(/^#/, "")
                .replaceAll(/\s+/g, "")}
            </span>
          ))}

          {!areTagsExpanded && canExpandTags ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setAreTagsExpanded(true);
              }}
              className="text-xs font-semibold cursor-pointer tracking-wide text-rose-600 transition-colors hover:text-rose-700"
            >
              +{hiddenTagCount}
            </button>
          ) : null}

          {areTagsExpanded && canExpandTags ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setAreTagsExpanded(false);
              }}
              className="text-xs font-semibold cursor-pointer tracking-wide text-slate-500 transition-colors hover:text-slate-700"
            >
              Show less
            </button>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleLike(story.id);
            }}
            className={`flex items-center gap-2 transition-all cursor-pointer duration-200 ${
              story.likedByCurrentUser
                ? "text-rose-500"
                : "text-slate-500 hover:text-rose-500"
            }`}
          >
            <Heart
              size={20}
              fill={story.likedByCurrentUser ? "currentColor" : "none"}
            />
            <span className="text-xs sm:text-sm font-medium">
              {formatCount(Number(story.likesCount || 0))}
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenComments(story.id);
            }}
            className={`flex items-center gap-2 transition-all cursor-pointer duration-200 ${
              commentsActive
                ? "text-sky-500"
                : "text-slate-500 hover:text-sky-500"
            }`}
          >
            <MessageCircle size={20} />
            <span className="text-xs sm:text-sm font-medium">
              {formatCount(Number(story.commentCount || 0))}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onUnsave(story.id);
            }}
            className="text-rose-500 hover:text-rose-600 transition-colors duration-200 cursor-pointer"
            aria-label="Remove bookmark"
          >
            <Bookmark size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

StoryBookmarkCard.propTypes = {
  story: PropTypes.shape({
    id: PropTypes.string.isRequired,
    author: PropTypes.string,
    authorId: PropTypes.string,
    avatar: PropTypes.string,
    genres: PropTypes.arrayOf(PropTypes.string),
    time: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    likesCount: PropTypes.number,
    commentCount: PropTypes.number,
    likedByCurrentUser: PropTypes.bool,
  }).isRequired,
  currentUserId: PropTypes.string,
  menuStoryId: PropTypes.string,
  isExpanded: PropTypes.bool,
  commentsActive: PropTypes.bool,
  followingAuthor: PropTypes.bool,
  followBusy: PropTypes.bool,
  onToggleStoryMenu: PropTypes.func.isRequired,
  onEditStory: PropTypes.func.isRequired,
  onDeleteStory: PropTypes.func.isRequired,
  onToggleLike: PropTypes.func.isRequired,
  onOpenComments: PropTypes.func.isRequired,
  onUnsave: PropTypes.func.isRequired,
  onToggleExpanded: PropTypes.func.isRequired,
  onToggleFollowAuthor: PropTypes.func.isRequired,
};

export default function Bookmarks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stories");

  const [stories, setStories] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [storyError, setStoryError] = useState("");
  const [expandedStoryIds, setExpandedStoryIds] = useState({});

  const [confessions, setConfessions] = useState([]);
  const [isLoadingConfessions, setIsLoadingConfessions] = useState(true);
  const [confessionError, setConfessionError] = useState("");
  const [expandedConfessionIds, setExpandedConfessionIds] = useState({});

  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [busyFollowIds, setBusyFollowIds] = useState({});
  const [menuStoryId, setMenuStoryId] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUsername, setCurrentUsername] = useState("You");
  const [currentUserProfilePicture, setCurrentUserProfilePicture] =
    useState("");

  const [commentsByStory, setCommentsByStory] = useState({});
  const [activeCommentStoryId, setActiveCommentStoryId] = useState(null);
  const [activeMenuCommentId, setActiveMenuCommentId] = useState(null);
  const [commentActionFeedback, setCommentActionFeedback] = useState({});
  const [pendingCommentLikeIds, setPendingCommentLikeIds] = useState({});
  const [commentLikePulseIds, setCommentLikePulseIds] = useState({});
  const [deleteTargetComment, setDeleteTargetComment] = useState(null);
  const [deleteTargetStoryId, setDeleteTargetStoryId] = useState("");
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const [deleteTargetConfessionId, setDeleteTargetConfessionId] = useState("");
  const [isDeletingConfession, setIsDeletingConfession] = useState(false);

  const storyCommentListRef = useRef(null);
  const storyCommentListSentinelRef = useRef(null);
  const storyCommentInputRef = useRef(null);

  const [menuConfessionId, setMenuConfessionId] = useState("");
  const [pressedLikeId, setPressedLikeId] = useState(null);
  const [pressedBookmarkId, setPressedBookmarkId] = useState(null);
  const [gestureLikeBurstId] = useState(null);
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState(() => new Set());
  const pendingLikeIdsRef = useRef(new Set());
  const pendingBookmarkIdsRef = useRef(new Set());
  const pressedLikeTimerRef = useRef(null);
  const pressedBookmarkTimerRef = useRef(null);

  const confessionCommentListRef = useRef(null);
  const confessionCommentListSentinelRef = useRef(null);
  const confessionCommentInputRef = useRef(null);
  const [commentOriginalInput, setCommentOriginalInput] = useState("");

  const {
    toast,
    isVisible: isToastVisible,
    isPaused: isToastPaused,
    duration,
    showToast,
    hideToast,
    pauseToast,
    resumeToast,
  } = useToast();

  const showError = useCallback(
    (message) => {
      showToast(message, "error");
    },
    [showToast],
  );

  const showSuccess = useCallback(
    (message) => {
      showToast(message, "success");
    },
    [showToast],
  );

  const dismissToast = useCallback(() => {
    hideToast();
  }, [hideToast]);

  const activeCommentStory = useMemo(
    () => stories.find((story) => story.id === activeCommentStoryId) || null,
    [stories, activeCommentStoryId],
  );

  const activeStoryCommentState = activeCommentStoryId
    ? commentsByStory[activeCommentStoryId] || {
        ...createEmptyCommentState(),
        open: true,
      }
    : null;

  useEffect(() => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "null",
      );
      const normalizedUserId = normalizeId(
        currentUser?.id || currentUser?._id || "",
      );

      setCurrentUserId(normalizedUserId);
      setCurrentUsername(
        currentUser?.displayName ||
          currentUser?.username ||
          currentUser?.name ||
          "You",
      );
      setCurrentUserProfilePicture(currentUser?.profilePicture || "");

      if (!normalizedUserId) {
        return;
      }

      getProfileByUserId(normalizedUserId)
        .then((profile) => {
          setCurrentUserProfilePicture(profile?.profilePicture || "");
        })
        .catch(() => {});
    } catch {
      setCurrentUserId("");
      setCurrentUsername("You");
      setCurrentUserProfilePicture("");
    }
  }, []);

  const loadBookmarkedStories = useCallback(async () => {
    setStoryError("");
    setIsLoadingStories(true);

    try {
      const backendResult = await getMyBookmarkedStories({ limit: 20 });
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

      const mappedStories = backendStories.map((story) => {
        const authorId = normalizeId(story.authorId);
        const profile = profiles[authorId];

        return {
          id: String(story._id),
          authorId,
          author:
            profile?.displayName ||
            story.authorDisplayName ||
            story.author ||
            "Anonymous Author",
          avatar: profile?.profilePicture || null,
          genres:
            Array.isArray(story.genres) && story.genres.length > 0
              ? story.genres.map((genre) => String(genre).toUpperCase())
              : ["GENERAL"],
          tags: Array.isArray(story.tags) ? story.tags : [],
          time: getSharedRelativeTime(story.publishedAt || story.createdAt),
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

      setStories(mappedStories);
    } catch {
      setStoryError("Unable to load bookmarked stories right now.");
    } finally {
      setIsLoadingStories(false);
    }
  }, []);

  const loadBookmarkedConfessions = useCallback(async () => {
    setConfessionError("");
    setIsLoadingConfessions(true);

    try {
      const payload = await getBookmarkedConfessions({ limit: 20 });
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setConfessions(
        data.map((item) => ({
          ...item,
          _id: String(item?._id || item?.id || ""),
          id: String(item?._id || item?.id || ""),
          authorId: normalizeId(item?.authorId),
          authorDisplayName:
            item?.authorDisplayName || item?.author || "Unknown Author",
          authorProfilePicture: item?.authorProfilePicture || null,
          createdAt: item?.publishedAt || item?.createdAt,
          likesCount: Number(item?.likesCount || 0),
          commentCount: Number(item?.commentCount || 0),
          likedByCurrentUser: Boolean(item?.likedByCurrentUser),
          savedByCurrentUser: true,
          isAnonymous: Boolean(item?.isAnonymous),
          visibility: item?.visibility || "public",
          tags: Array.isArray(item?.tags) ? item.tags : [],
        })),
      );
    } catch (error) {
      setConfessionError(
        error?.message || "Unable to load bookmarked confessions right now.",
      );
    } finally {
      setIsLoadingConfessions(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarkedStories();
    loadBookmarkedConfessions();
  }, [loadBookmarkedStories, loadBookmarkedConfessions]);

  const followableAuthorIds = useMemo(() => {
    const storyAuthorIds = stories
      .map((story) => normalizeId(story.authorId))
      .filter((authorId) => Boolean(authorId) && authorId !== currentUserId);

    const confessionAuthorIds = confessions
      .filter((item) => !item?.isAnonymous)
      .map((item) => normalizeId(item?.authorId))
      .filter((authorId) => Boolean(authorId) && authorId !== currentUserId);

    return [...new Set([...storyAuthorIds, ...confessionAuthorIds])];
  }, [stories, confessions, currentUserId]);

  useEffect(() => {
    let isMounted = true;

    const unresolvedAuthorIds = followableAuthorIds.filter(
      (authorId) => typeof followStateByUserId[authorId] !== "boolean",
    );

    if (unresolvedAuthorIds.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    const resolveFollowStatuses = async () => {
      const statusEntries = await Promise.all(
        unresolvedAuthorIds.map(async (authorId) => {
          try {
            const payload = await getFollowStatus(authorId);
            return [authorId, Boolean(payload?.following)];
          } catch {
            return [authorId, false];
          }
        }),
      );

      if (!isMounted) {
        return;
      }

      setFollowStateByUserId((previous) => ({
        ...previous,
        ...Object.fromEntries(statusEntries),
      }));
    };

    resolveFollowStatuses().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [followStateByUserId, followableAuthorIds]);

  const handleToggleFollowAuthor = useCallback(
    async (authorId) => {
      const normalizedTargetAuthorId = normalizeId(authorId);

      if (
        !normalizedTargetAuthorId ||
        normalizedTargetAuthorId === currentUserId ||
        busyFollowIds[normalizedTargetAuthorId]
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to follow authors.");
        return;
      }

      const currentlyFollowing = Boolean(
        followStateByUserId[normalizedTargetAuthorId],
      );

      setBusyFollowIds((previous) => ({
        ...previous,
        [normalizedTargetAuthorId]: true,
      }));
      setFollowStateByUserId((previous) => ({
        ...previous,
        [normalizedTargetAuthorId]: !currentlyFollowing,
      }));

      try {
        const payload = currentlyFollowing
          ? await unfollowUser(normalizedTargetAuthorId)
          : await followUser(normalizedTargetAuthorId);

        const nextFollowState =
          typeof payload?.following === "boolean"
            ? payload.following
            : !currentlyFollowing;

        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetAuthorId]: nextFollowState,
        }));

        showSuccess(
          nextFollowState
            ? "You are now following this author."
            : "You have unfollowed this author.",
        );
      } catch {
        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetAuthorId]: currentlyFollowing,
        }));
        showError("Unable to update follow status. Please try again.");
      } finally {
        setBusyFollowIds((previous) => {
          const next = { ...previous };
          delete next[normalizedTargetAuthorId];
          return next;
        });
      }
    },
    [busyFollowIds, currentUserId, followStateByUserId, showError, showSuccess],
  );

  const handleToggleStoryMenu = useCallback((storyId) => {
    setMenuStoryId((currentId) => (currentId === storyId ? "" : storyId));
  }, []);

  const handleEditStory = useCallback(
    (storyId) => {
      setMenuStoryId("");
      navigate(`/write?storyId=${storyId}&returnTo=/bookmarks`);
    },
    [navigate],
  );

  const handleDeleteStory = useCallback(
    (storyId) => {
      const story = stories.find((item) => item.id === storyId);
      if (!story || story?.authorId !== currentUserId) {
        showError("Only the owner can delete this story.");
        return;
      }
      setMenuStoryId("");
      setDeleteTargetStoryId(storyId);
    },
    [currentUserId, showError, stories],
  );

  const handleConfirmDeleteStory = useCallback(async () => {
    if (!deleteTargetStoryId || isDeletingStory) {
      return;
    }

    setIsDeletingStory(true);
    try {
      await deleteStory(deleteTargetStoryId);
      setStories((prev) =>
        prev.filter((item) => item.id !== deleteTargetStoryId),
      );
      showSuccess("Story deleted.");
    } catch {
      showError("Failed to delete story.");
    } finally {
      setIsDeletingStory(false);
      setDeleteTargetStoryId("");
    }
  }, [deleteTargetStoryId, isDeletingStory, showError, showSuccess]);

  const handleEditConfession = useCallback(
    (confession) => {
      const confessionId = String(confession?._id || confession?.id || "");
      setMenuConfessionId("");
      navigate(`/confession?editId=${confessionId}&returnTo=/bookmarks`);
    },
    [navigate],
  );

  const handleDeleteConfession = useCallback(
    (confessionId) => {
      const normalizedConfessionId = String(confessionId || "");
      const currentConfession = confessions.find(
        (item) =>
          String(item?._id || item?.id || "") === normalizedConfessionId,
      );

      if (
        !currentConfession ||
        normalizeId(currentConfession.authorId) !== currentUserId
      ) {
        showError("Only the owner can delete this confession.");
        return;
      }

      setMenuConfessionId("");
      setDeleteTargetConfessionId(normalizedConfessionId);
    },
    [confessions, currentUserId, showError],
  );

  const handleConfirmDeleteConfession = useCallback(async () => {
    if (!deleteTargetConfessionId || isDeletingConfession) {
      return;
    }

    setIsDeletingConfession(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/confessions/${deleteTargetConfessionId}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete confession.");
      }

      setConfessions((prev) =>
        prev.filter(
          (item) =>
            String(item?._id || item?.id || "") !== deleteTargetConfessionId,
        ),
      );
      showSuccess("Confession deleted.");
    } catch (error) {
      showError(error.message || "Failed to delete confession.");
    } finally {
      setIsDeletingConfession(false);
      setDeleteTargetConfessionId("");
    }
  }, [deleteTargetConfessionId, isDeletingConfession, showError, showSuccess]);

  const fetchStoryComments = useCallback(
    async (storyId, cursor = null, append = false) => {
      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
          open: true,
          loading: !append,
          loadingMore: append,
          error: "",
        },
      }));

      try {
        const payload = await getStoryComments(storyId, { limit: 10, cursor });
        const comments = Array.isArray(payload?.comments)
          ? payload.comments
          : [];

        setCommentsByStory((prev) => {
          const existingState = prev[storyId] || createEmptyCommentState();

          return {
            ...prev,
            [storyId]: {
              ...createEmptyCommentState(),
              ...existingState,
              open: true,
              loading: false,
              loadingMore: false,
              loaded: true,
              error: "",
              items: append ? [...existingState.items, ...comments] : comments,
              nextCursor: payload?.nextCursor || null,
              hasMore: Boolean(payload?.hasMore),
            },
          };
        });
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...(prev[storyId] || {}),
            open: true,
            loading: false,
            loadingMore: false,
            error: "Unable to load comments.",
          },
        }));

        showError("Unable to load comments.");
      }
    },
    [showError],
  );

  const handleOpenStoryComments = useCallback(
    (storyId) => {
      setActiveCommentStoryId(storyId);

      const current = commentsByStory[storyId] || createEmptyCommentState();
      if (!current.loaded && !current.loading) {
        fetchStoryComments(storyId);
      }
    },
    [commentsByStory, fetchStoryComments],
  );

  const handleCloseStoryComments = useCallback(() => {
    setActiveCommentStoryId(null);
    setActiveMenuCommentId(null);
  }, []);

  useEffect(() => {
    if (!activeCommentStoryId) {
      return undefined;
    }

    const activeState =
      commentsByStory[activeCommentStoryId] || createEmptyCommentState();
    const sentinel = storyCommentListSentinelRef.current;
    const root = storyCommentListRef.current;

    if (
      !sentinel ||
      !root ||
      !activeState.hasMore ||
      activeState.loading ||
      activeState.loadingMore
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchStoryComments(
            activeCommentStoryId,
            activeState.nextCursor,
            true,
          );
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
  }, [activeCommentStoryId, commentsByStory, fetchStoryComments]);

  const fetchStoryReplies = useCallback(
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
                  loadingMore: false,
                  loaded: true,
                  open: true,
                  error: "",
                  items: append
                    ? [...(existingReplyState.items || []), ...replies]
                    : replies,
                  nextCursor: payload?.nextCursor || null,
                  hasMore: Boolean(payload?.hasMore),
                },
              },
            },
          };
        });
      } catch {
        showError("Unable to load replies.");
      }
    },
    [showError],
  );

  const showCommentFeedback = useCallback((commentId, message) => {
    setCommentActionFeedback((prev) => ({ ...prev, [commentId]: message }));

    setTimeout(() => {
      setCommentActionFeedback((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }, 2200);
  }, []);

  const handleToggleStoryLike = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to react to stories.");
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
        showError("Failed to update reaction. Please try again.");
      }
    },
    [showError],
  );

  const handleUnsaveStory = useCallback(
    async (storyId) => {
      try {
        await removeStoryBookmark(storyId);
        setStories((prev) => prev.filter((story) => story.id !== storyId));
        setExpandedStoryIds((prev) => {
          const next = { ...prev };
          delete next[storyId];
          return next;
        });
        setCommentsByStory((prev) => {
          const next = { ...prev };
          delete next[storyId];
          return next;
        });
        setActiveCommentStoryId((currentId) =>
          currentId === storyId ? null : currentId,
        );
        showSuccess("Story removed from bookmarks.");
      } catch {
        showError("Failed to remove bookmark.");
      }
    },
    [showError, showSuccess],
  );

  const handleToggleStoryReplies = useCallback(
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
        fetchStoryReplies(storyId, commentId);
      }
    },
    [commentsByStory, fetchStoryReplies],
  );

  const handleLoadMoreStoryReplies = useCallback(
    (storyId, commentId) => {
      const currentReplyState =
        commentsByStory[storyId]?.repliesByComment?.[commentId] ||
        createEmptyRepliesState();

      if (!currentReplyState.hasMore || !currentReplyState.nextCursor) {
        return;
      }

      fetchStoryReplies(storyId, commentId, currentReplyState.nextCursor, true);
    },
    [commentsByStory, fetchStoryReplies],
  );

  const handleStoryCommentInputChange = useCallback((storyId, input) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input,
      },
    }));
  }, []);

  const handleToggleStoryCommentMenu = useCallback((commentId) => {
    setActiveMenuCommentId((currentId) =>
      currentId === commentId ? null : commentId,
    );
  }, []);

  const handleStartStoryReply = useCallback((storyId, comment) => {
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
      storyCommentInputRef.current?.focus();
    }, 0);
  }, []);

  const handleEditStoryComment = useCallback((storyId, comment) => {
    const commentId = String(comment?._id || comment?.id || "");

    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: comment?.content || "",
        originalInput: comment?.content || "",
        editingCommentId: commentId,
        replyingToCommentId: null,
        replyingToAuthor: "",
      },
    }));

    setTimeout(() => {
      if (storyCommentInputRef.current) {
        storyCommentInputRef.current.focus();
      }
    }, 0);
  }, []);

  const handleDeleteStoryComment = useCallback(
    (storyId, commentId) => {
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
      setActiveMenuCommentId(null);
    },
    [commentsByStory],
  );

  const handleCancelStoryComposer = useCallback((storyId) => {
    setCommentsByStory((prev) => ({
      ...prev,
      [storyId]: {
        ...createEmptyCommentState(),
        ...(prev[storyId] || {}),
        input: "",
        originalInput: "",
        editingCommentId: null,
        replyingToCommentId: null,
        replyingToAuthor: "",
      },
    }));
  }, []);

  const handleSubmitStoryComment = useCallback(
    async (storyId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to comment.");
        return;
      }

      const current = commentsByStory[storyId] || createEmptyCommentState();
      const content = current?.input?.trim();
      const editingCommentId = current?.editingCommentId || null;
      const replyingToCommentId = current?.replyingToCommentId || null;

      if (!content) {
        return;
      }

      setCommentsByStory((prev) => ({
        ...prev,
        [storyId]: {
          ...createEmptyCommentState(),
          ...(prev[storyId] || {}),
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
              ...(prev[storyId] || {}),
              submitting: false,
              input: "",
              originalInput: "",
              editingCommentId: null,
              replyingToCommentId: null,
              replyingToAuthor: "",
              items: (prev[storyId]?.items || []).map((item) =>
                String(item?._id || item?.id) === String(editingCommentId)
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

          showCommentFeedback(editingCommentId, "Comment updated");
          showSuccess("Comment updated.");
          return;
        }

        const payload = await addStoryComment(storyId, {
          content,
          parentId: replyingToCommentId,
        });

        const newComment = {
          _id: payload?.commentId || `${Date.now()}`,
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
              ...(prev[storyId] || {}),
              submitting: false,
              input: "",
              originalInput: "",
              editingCommentId: null,
              replyingToCommentId: null,
              replyingToAuthor: "",
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
                      items: [...(existingReplyState?.items || []), newComment],
                    },
                  }
                : prev[storyId]?.repliesByComment || {},
            },
          };
        });

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

        showSuccess("Comment posted.");
      } catch {
        setCommentsByStory((prev) => ({
          ...prev,
          [storyId]: {
            ...createEmptyCommentState(),
            ...(prev[storyId] || {}),
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
      showCommentFeedback,
      showError,
      showSuccess,
    ],
  );

  const handleToggleStoryCommentLike = useCallback(
    async (storyId, commentId) => {
      if (!storyId || !commentId || pendingCommentLikeIds[commentId]) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to react to comments.");
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
      } catch {
        showCommentFeedback(commentId, "Failed to update comment like.");
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
    [pendingCommentLikeIds, showCommentFeedback, showError],
  );

  const handleConfirmDeleteStoryComment = useCallback(async () => {
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
      showError("Please log in to delete comments.");
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

      setStories((prev) =>
        prev.map((story) =>
          story.id === storyId
            ? {
                ...story,
                commentCount: Math.max(
                  0,
                  Number(story.commentCount || 0) -
                    (parentId ? 1 : 1 + Number(replyCount || 0)),
                ),
              }
            : story,
        ),
      );

      showSuccess("Comment deleted.");
    } catch {
      showCommentFeedback(commentId, "Failed to delete comment.");
    }
  }, [deleteTargetComment, showCommentFeedback, showError, showSuccess]);

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
    isDeletingComment,
    isLoadingModalComments,
    modalCommentsError,
    modalCommentsHasMore,
    modalCommentsNextCursor,
    replyingToCommentId,
    replyingToAuthor,
    repliesByComment,
    pendingCommentLikeIds: pendingConfessionCommentLikeIds,
    commentLikePulseIds: confessionCommentLikePulseIds,
    commentActionFeedback: confessionCommentActionFeedback,
    closeCommentModal: closeConfessionModalState,
    openCommentModal: openConfessionModalState,
    handleAddComment,
    handleToggleCommentMenu,
    handleStartReply,
    handleToggleReplies,
    loadMoreModalComments,
    handleLoadMoreReplies,
    handleStartEditComment,
    handleSaveEditedComment,
    handleCancelCommentComposer,
    handleToggleCommentLike,
    handleDeleteComment: handleDeleteCommentHook,
    deleteTargetCommentId,
    setDeleteTargetCommentId,
    handleConfirmDeleteComment,
  } = useConfessionComments({
    setConfessionFeed: setConfessions,
    showError,
    showSuccess,
    currentUserId,
    currentUsername,
    currentUserProfilePicture,
  });

  const handleStartEditCommentWithOriginal = useCallback(
    (comment) => {
      setCommentOriginalInput(comment?.content || "");
      handleStartEditComment(comment);
    },
    [handleStartEditComment],
  );

  const handleConfessionCommentInputChange = useCallback(
    (...args) => {
      const value = args[1];

      if (editingCommentId) {
        setEditCommentContent(value);
      } else {
        setNewCommentContent(value);
      }
    },
    [editingCommentId, setEditCommentContent, setNewCommentContent],
  );

  const handleSubmitConfessionComment = useCallback(() => {
    if (editingCommentId) {
      handleSaveEditedComment();
    } else {
      handleAddComment();
    }
  }, [editingCommentId, handleAddComment, handleSaveEditedComment]);

  const handleDeleteConfessionComment = useCallback(
    (_storyId, commentId) => {
      handleDeleteCommentHook(commentId);
    },
    [handleDeleteCommentHook],
  );

  const handleToggleConfessionCommentLike = useCallback(
    (_storyId, commentId) => {
      handleToggleCommentLike(commentId);
    },
    [handleToggleCommentLike],
  );

  const handleStartConfessionReply = useCallback(
    (_storyId, comment) => {
      handleStartReply(comment);
    },
    [handleStartReply],
  );

  const handleToggleConfessionReplies = useCallback(
    (_storyId, commentId) => {
      handleToggleReplies(commentId);
    },
    [handleToggleReplies],
  );

  const handleLoadMoreConfessionReplies = useCallback(
    (_storyId, commentId) => {
      handleLoadMoreReplies(commentId);
    },
    [handleLoadMoreReplies],
  );

  const closeDeleteConfessionCommentDialog = useCallback(() => {
    setDeleteTargetCommentId("");
  }, [setDeleteTargetCommentId]);

  useEffect(() => {
    const sentinel = confessionCommentListSentinelRef.current;
    const root = confessionCommentListRef.current;

    if (
      !activeCommentConfessionId ||
      !sentinel ||
      !root ||
      !modalCommentsHasMore ||
      isLoadingModalComments
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreModalComments().catch(() => {});
        }
      },
      {
        root,
        rootMargin: "0px 0px 120px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    activeCommentConfessionId,
    isLoadingModalComments,
    loadMoreModalComments,
    modalCommentsHasMore,
  ]);

  const activeConfessionCommentState = {
    open: Boolean(activeCommentConfessionId),
    loaded:
      !isLoadingModalComments &&
      (modalComments.length > 0 || Boolean(modalCommentsError)),
    loading: isLoadingModalComments,
    loadingMore: isLoadingModalComments && modalComments.length > 0,
    error: modalCommentsError,
    items: modalComments,
    nextCursor: modalCommentsNextCursor,
    hasMore: modalCommentsHasMore,
    input: editingCommentId
      ? editCommentContent || ""
      : newCommentContent || "",
    originalInput: commentOriginalInput,
    editingCommentId,
    replyingToCommentId,
    replyingToAuthor,
    submitting:
      isSubmittingComment || isSavingEditedComment || isDeletingComment,
    repliesByComment,
  };

  const activeConfessionCommentStory = activeCommentConfessionId
    ? {
        id: activeCommentConfessionId,
        title: commentModalTitle,
      }
    : null;

  const closeConfessionModal = useCallback(() => {
    closeConfessionModalState();
    setCommentOriginalInput("");
  }, [closeConfessionModalState]);

  const openConfessionModal = useCallback(
    async (...args) => {
      await openConfessionModalState(...args);
    },
    [openConfessionModalState],
  );

  const handleToggleConfessionLike = useCallback(
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
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      pressedLikeTimerRef.current = setTimeout(() => {
        setPressedLikeId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        pressedLikeTimerRef.current = null;
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

        setConfessions((prev) =>
          prev.map((item) =>
            String(item?._id || item?.id || "") === String(confessionId)
              ? {
                  ...item,
                  likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                  likesCount: Number(payload?.likesCount || 0),
                }
              : item,
          ),
        );
      } catch {
        showError("Failed to toggle like.");
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

  const handleUnsaveConfession = useCallback(
    async (confessionId) => {
      if (
        pendingBookmarkIdsRef.current.has(confessionId) ||
        pendingBookmarkIds.has(confessionId)
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to manage confession bookmarks.");
        return;
      }

      pendingBookmarkIdsRef.current.add(confessionId);
      setPendingBookmarkIds((prev) => {
        const next = new Set(prev);
        next.add(confessionId);
        return next;
      });

      setPressedBookmarkId(confessionId);
      if (pressedBookmarkTimerRef.current) {
        clearTimeout(pressedBookmarkTimerRef.current);
      }

      pressedBookmarkTimerRef.current = setTimeout(() => {
        setPressedBookmarkId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        pressedBookmarkTimerRef.current = null;
      }, 150);

      try {
        await removeConfessionBookmark(confessionId);
        setConfessions((prev) =>
          prev.filter(
            (item) =>
              String(item?._id || item?.id || "") !== String(confessionId),
          ),
        );
        showSuccess("Confession removed from bookmarks.");
      } catch {
        showError("Failed to remove confession bookmark.");
      } finally {
        pendingBookmarkIdsRef.current.delete(confessionId);
        setPendingBookmarkIds((prev) => {
          const next = new Set(prev);
          next.delete(confessionId);
          return next;
        });
      }
    },
    [pendingBookmarkIds, showError, showSuccess],
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

  const handleToggleConfessionMenu = useCallback((confessionId) => {
    setMenuConfessionId((currentId) =>
      currentId === confessionId ? "" : confessionId,
    );
  }, []);

  useOutsideClickCloser(
    Boolean(activeMenuCommentId),
    () => setActiveMenuCommentId(null),
    "[data-comment-menu]",
  );

  useOutsideClickCloser(
    Boolean(menuConfessionId),
    () => setMenuConfessionId(""),
    "[data-confession-menu]",
  );

  useOutsideClickCloser(
    Boolean(menuStoryId),
    () => setMenuStoryId(""),
    "[data-story-menu]",
  );

  useEffect(
    () => () => {
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      if (pressedBookmarkTimerRef.current) {
        clearTimeout(pressedBookmarkTimerRef.current);
      }
    },
    [],
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Bookmarks" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              <div className="flex gap-2 mb-8 sm:mb-10">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                    activeTab === "stories"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-white text-rose-500 border border-rose-200 hover:bg-rose-50"
                  }`}
                  onClick={() => setActiveTab("stories")}
                  aria-pressed={activeTab === "stories"}
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
                  aria-pressed={activeTab === "confessions"}
                >
                  Confessions
                </button>
              </div>

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

                  {storyError ? (
                    <div className="mb-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm text-sm text-rose-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{storyError}</span>
                      </div>
                    </div>
                  ) : null}

                  {isLoadingStories ? (
                    <div className="space-y-5">
                      {[...Array(3)].map((_, index) => (
                        <StoryBookmarkCardSkeleton
                          key={`story-bookmark-skeleton-${index}`}
                        />
                      ))}
                    </div>
                  ) : null}

                  {!isLoadingStories && !storyError && stories.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm text-sm text-slate-500">
                      No bookmarked stories yet.
                    </div>
                  ) : null}

                  {!isLoadingStories &&
                    !storyError &&
                    stories.map((story) => (
                      <StoryBookmarkCard
                        key={story.id}
                        story={story}
                        currentUserId={currentUserId}
                        menuStoryId={menuStoryId}
                        isExpanded={Boolean(expandedStoryIds[story.id])}
                        commentsActive={activeCommentStoryId === story.id}
                        followingAuthor={Boolean(
                          followStateByUserId[normalizeId(story.authorId)],
                        )}
                        followBusy={Boolean(
                          busyFollowIds[normalizeId(story.authorId)],
                        )}
                        onToggleStoryMenu={handleToggleStoryMenu}
                        onEditStory={handleEditStory}
                        onDeleteStory={handleDeleteStory}
                        onToggleLike={handleToggleStoryLike}
                        onOpenComments={handleOpenStoryComments}
                        onUnsave={handleUnsaveStory}
                        onToggleExpanded={handleToggleExpandedStory}
                        onToggleFollowAuthor={handleToggleFollowAuthor}
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
                    <div className="mb-4 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm text-sm text-rose-700">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{confessionError}</span>
                      </div>
                    </div>
                  ) : null}

                  {isLoadingConfessions ? (
                    <div className="space-y-5">
                      {[...Array(3)].map((_, index) => (
                        <ConfessionBookmarkCardSkeleton
                          key={`confession-bookmark-skeleton-${index}`}
                        />
                      ))}
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
                    confessions.map((item, index) => (
                      <ConfessionFeedCard
                        key={String(
                          item?._id || item?.id || `bookmarked-conf-${index}`,
                        )}
                        item={item}
                        index={index}
                        currentUserId={currentUserId}
                        expandedConfessionIds={expandedConfessionIds}
                        menuConfessionId={menuConfessionId}
                        gestureLikeBurstId={gestureLikeBurstId}
                        pressedLikeId={pressedLikeId}
                        pressedBookmarkId={pressedBookmarkId}
                        onToggleConfessionMenu={handleToggleConfessionMenu}
                        onEditConfession={handleEditConfession}
                        onDeleteConfession={handleDeleteConfession}
                        onToggleExpandedConfession={
                          handleToggleExpandedConfession
                        }
                        onToggleLike={handleToggleConfessionLike}
                        onOpenCommentModal={openConfessionModal}
                        onToggleBookmark={handleUnsaveConfession}
                        onToggleFollowAuthor={handleToggleFollowAuthor}
                        followingAuthor={Boolean(
                          followStateByUserId[normalizeId(item?.authorId)],
                        )}
                        followBusy={Boolean(
                          busyFollowIds[normalizeId(item?.authorId)],
                        )}
                      />
                    ))}
                </>
              )}

              <SiteFooter />
            </div>
          </div>
        </main>
      </div>

      <CommentSection
        story={activeCommentStory}
        commentState={activeStoryCommentState}
        activeMenuCommentId={activeMenuCommentId}
        currentUserId={currentUserId}
        commentActionFeedback={commentActionFeedback}
        pendingCommentLikeIds={pendingCommentLikeIds}
        commentLikePulseIds={commentLikePulseIds}
        commentListRef={storyCommentListRef}
        commentListSentinelRef={storyCommentListSentinelRef}
        commentInputRef={storyCommentInputRef}
        onClose={handleCloseStoryComments}
        onToggleCommentLike={handleToggleStoryCommentLike}
        onToggleCommentMenu={handleToggleStoryCommentMenu}
        onEditComment={handleEditStoryComment}
        onDeleteComment={handleDeleteStoryComment}
        onStartReply={handleStartStoryReply}
        onToggleReplies={handleToggleStoryReplies}
        onLoadMoreReplies={handleLoadMoreStoryReplies}
        onCancelCommentComposer={handleCancelStoryComposer}
        onCommentInputChange={handleStoryCommentInputChange}
        onSubmitComment={handleSubmitStoryComment}
      />

      <CommentSection
        story={activeConfessionCommentStory}
        commentState={activeConfessionCommentState}
        activeMenuCommentId={activeCommentMenuId}
        currentUserId={currentUserId}
        commentActionFeedback={confessionCommentActionFeedback}
        pendingCommentLikeIds={pendingConfessionCommentLikeIds}
        commentLikePulseIds={confessionCommentLikePulseIds}
        commentListRef={confessionCommentListRef}
        commentListSentinelRef={confessionCommentListSentinelRef}
        commentInputRef={confessionCommentInputRef}
        onClose={closeConfessionModal}
        onToggleCommentLike={handleToggleConfessionCommentLike}
        onToggleCommentMenu={handleToggleCommentMenu}
        onEditComment={(_, comment) =>
          handleStartEditCommentWithOriginal(comment)
        }
        onDeleteComment={handleDeleteConfessionComment}
        onStartReply={handleStartConfessionReply}
        onToggleReplies={handleToggleConfessionReplies}
        onLoadMoreReplies={handleLoadMoreConfessionReplies}
        onCancelCommentComposer={handleCancelCommentComposer}
        onCommentInputChange={handleConfessionCommentInputChange}
        onSubmitComment={handleSubmitConfessionComment}
      />

      <ModalDialog
        isOpen={Boolean(deleteTargetStoryId)}
        onClose={() => {
          if (isDeletingStory) {
            return;
          }
          setDeleteTargetStoryId("");
        }}
        title="Delete this story?"
        titleId="story-delete-dialog-title"
        closeLabel="Close delete story modal"
        widthClassName="max-w-sm"
      >
        <div className="p-5">
          <p className="text-sm text-slate-500 mb-5">
            This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTargetStoryId("")}
              disabled={isDeletingStory}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteStory}
              disabled={isDeletingStory}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
            >
              {isDeletingStory ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </ModalDialog>

      <ModalDialog
        isOpen={Boolean(deleteTargetConfessionId)}
        onClose={() => {
          if (isDeletingConfession) {
            return;
          }
          setDeleteTargetConfessionId("");
        }}
        title="Delete this confession?"
        titleId="confession-delete-dialog-title"
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
              disabled={isDeletingConfession}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteConfession}
              disabled={isDeletingConfession}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
            >
              {isDeletingConfession ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </ModalDialog>

      {deleteTargetComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Close delete comment modal"
            onClick={() => setDeleteTargetComment(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden p-5">
            <h4 className="text-sm sm:text-base font-semibold text-slate-900">
              Delete this comment?
            </h4>
            <p className="text-sm text-slate-500 mt-2 mb-5">
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetComment(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStoryComment}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetCommentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Close delete comment modal"
            onClick={closeDeleteConfessionCommentDialog}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden p-5">
            <h4 className="text-sm sm:text-base font-semibold text-slate-900">
              Delete this comment?
            </h4>
            <p className="text-sm text-slate-500 mt-2 mb-5">
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfessionCommentDialog}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteComment}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          toast={toast}
          isVisible={isToastVisible}
          isPaused={isToastPaused}
          durationMs={duration}
          onClose={dismissToast}
          onPause={pauseToast}
          onResume={resumeToast}
        />
      )}
    </div>
  );
}
