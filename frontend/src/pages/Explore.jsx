import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Bookmark,
  Heart,
  Eye,
  ChevronRight,
  User,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";
import { followUser, unfollowUser, getFollowStatus } from "../api/profile";
import {
  getExploreRecommendedStories,
  getExplorePopularStories,
  getExplorePublishedGenres,
  getExploreAuthors,
} from "../api/explore";
import {
  toggleStoryBookmark,
  removeStoryBookmark,
  toggleStoryLike,
  getMyBookmarkedStories,
} from "../api/story/storyInteractionsApi";
import { deleteStory } from "../api/story/storyApi";
import { useNavigate } from "react-router-dom";

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid.trim();
    if (typeof value.toString === "function") return value.toString().trim();
  }
  return String(value).trim();
};

const mapStoryCard = (story) => ({
  id: story?._id || story?.storyId || story?.id || story?.title,
  authorId: normalizeId(
    story?.authorId || story?.author?._id || story?.author?.userId || null,
  ),
  title: story?.title || "Untitled story",
  tags:
    Array.isArray(story?.genres) && story.genres.length > 0
      ? story.genres
      : Array.isArray(story?.tags) && story.tags.length > 0
        ? story.tags
        : ["Story"],
  excerpt:
    story?.summary || story?.content?.slice(0, 140) || "No summary available.",
  likes: Number(story?.likesCount) || 0,
  likedByCurrentUser: !!story?.likedByCurrentUser,
  views: formatCompactNumber(story?.views),
  author: story?.authorDisplayName || story?.author?.displayName || "Unknown",
});

const AuthorRow = ({
  userId,
  name,
  role,
  avatar,
  isFollowing,
  isBusy,
  onToggleFollow,
}) => (
  <div className="flex items-center justify-between gap-3 py-3">
    <div className="flex items-center gap-3 min-w-0">
      <Link
        to={userId ? `/profile/${userId}` : "/profile"}
        className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        aria-label={`View ${name} profile`}
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-slate-400" />
        )}
      </Link>

      <div className="min-w-0">
        <Link
          to={userId ? `/profile/${userId}` : "/profile"}
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

export default function Explore() {
  const navigate = useNavigate();
  const [menuStoryId, setMenuStoryId] = useState(null);
  const [deletingStoryId, setDeletingStoryId] = useState(null);

  const handleEditStory = (storyId) => {
    setMenuStoryId(null);
    navigate(`/write?storyId=${storyId}&returnTo=/explore`);
  };

  const handleDeleteStory = async (storyId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this story? This action cannot be undone.",
      )
    )
      return;
    setDeletingStoryId(storyId);
    try {
      await deleteStory(storyId);
      setRecommendedStories((prev) => prev.filter((s) => s.id !== storyId));
      setPopularStories((prev) => prev.filter((s) => s.id !== storyId));
      setMenuStoryId(null);
    } catch {
      alert("Failed to delete story. Please try again.");
    } finally {
      setDeletingStoryId(null);
    }
  };
  const TOP_AUTHORS_COUNT = 6;
  const [activeCategory, setActiveCategory] = useState("All");
  const [genreFilters, setGenreFilters] = useState(["All"]);
  const _genresRef = React.useRef(null);
  const [recommendedStories, setRecommendedStories] = useState([]);
  const [popularStories, setPopularStories] = useState([]);
  const [resolvedAuthors, setResolvedAuthors] = useState([]);
  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [busyFollowIds, setBusyFollowIds] = useState({});
  const [genresLoading, setGenresLoading] = useState(false);
  const [savedStoryIds, setSavedStoryIds] = useState(new Set());
  const handleToggleSave = async (storyId) => {
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
  };
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [genresError, setGenresError] = useState("");
  const [recommendedError, setRecommendedError] = useState("");
  const [popularError, setPopularError] = useState("");
  const [authorsError, setAuthorsError] = useState("");

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

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadGenres = async () => {
      setGenresLoading(true);
      setGenresError("");

      try {
        const publishedGenres = await getExplorePublishedGenres({
          limit: 50,
          maxPages: 3,
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const nextGenres = ["All", ...publishedGenres];
        setGenreFilters(nextGenres);

        if (!nextGenres.includes(activeCategory)) {
          setActiveCategory("All");
        }
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        setGenreFilters(["All"]);
        setGenresError(error?.message || "Failed to load genres.");
      } finally {
        if (isMounted) {
          setGenresLoading(false);
        }
      }
    };

    const loadExploreContent = async () => {
      setStoriesLoading(true);
      setAuthorsLoading(true);
      setRecommendedError("");
      setPopularError("");
      setAuthorsError("");

      const [recommendedResult, popularResult, authorsResult] =
        await Promise.allSettled([
          getExploreRecommendedStories({
            category: activeCategory,
            limit: 4,
            signal: abortController.signal,
          }),
          getExplorePopularStories({
            limit: 4,
            signal: abortController.signal,
          }),
          getExploreAuthors({
            limit: TOP_AUTHORS_COUNT,
            minLikes: 10,
            signal: abortController.signal,
          }),
        ]);

      if (!isMounted) {
        return;
      }

      if (recommendedResult.status === "fulfilled") {
        const allRecommended = (recommendedResult.value?.data || []).map(
          mapStoryCard,
        );
        // Filter out stories authored by the current user
        setRecommendedStories(
          allRecommended.filter((story) => story.authorId !== currentUserId),
        );
      } else {
        setRecommendedStories([]);
        setRecommendedError(
          recommendedResult.reason?.message ||
            "Failed to load recommended stories.",
        );
      }

      if (popularResult.status === "fulfilled") {
        setPopularStories((popularResult.value?.data || []).map(mapStoryCard));
      } else {
        setPopularStories([]);
        setPopularError(
          popularResult.reason?.message || "Failed to load popular stories.",
        );
      }

      if (authorsResult.status === "fulfilled") {
        const resolved = (authorsResult.value?.data || []).map((author) => ({
          userId: normalizeId(author?.authorId || null),
          avatar: author?.profilePicture || "",
          displayName: author?.displayName || author?.username || "Unknown",
          role: `Top ${String(
            authorsResult.value?.category ||
              author?.primaryCategory ||
              "recommended",
          ).toLowerCase()} author`,
          popularStoriesInCategory: Number(
            author?.popularStoriesInCategory || 0,
          ),
          totalCategoryLikes: Number(author?.totalCategoryLikes || 0),
        }));

        setResolvedAuthors(resolved);
      } else {
        setResolvedAuthors([]);
        setAuthorsError(
          authorsResult.reason?.message ||
            "Failed to load recommended authors.",
        );
      }

      const recommendedAuthorIds =
        authorsResult.status === "fulfilled"
          ? (authorsResult.value?.data || [])
              .map((author) => normalizeId(author?.authorId || null))
              .filter((authorId) => Boolean(authorId))
          : [];

      const storyAuthorIds = [
        ...new Set(
          [
            ...(recommendedResult.status === "fulfilled"
              ? (recommendedResult.value?.data || []).map(
                  (story) => mapStoryCard(story).authorId,
                )
              : []),
            ...(popularResult.status === "fulfilled"
              ? (popularResult.value?.data || []).map(
                  (story) => mapStoryCard(story).authorId,
                )
              : []),
          ].filter(
            (authorId) => Boolean(authorId) && authorId !== currentUserId,
          ),
        ),
      ];

      const authorIdsForFollowStatus = [
        ...new Set([...recommendedAuthorIds, ...storyAuthorIds]),
      ].filter((authorId) => authorId !== currentUserId);

      if (authorIdsForFollowStatus.length > 0) {
        const followEntries = await Promise.all(
          authorIdsForFollowStatus.map(async (authorId) => {
            try {
              const statusPayload = await getFollowStatus(authorId);
              return [authorId, Boolean(statusPayload?.following)];
            } catch {
              return [authorId, false];
            }
          }),
        );

        if (isMounted) {
          setFollowStateByUserId((previous) => ({
            ...previous,
            ...Object.fromEntries(followEntries),
          }));
        }
      }

      setStoriesLoading(false);
      setAuthorsLoading(false);
    };

    loadGenres();
    loadExploreContent();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [TOP_AUTHORS_COUNT, activeCategory, currentUserId]);

  const handleToggleFollow = async (author) => {
    const normalizedTargetUserId = normalizeId(author?.userId);

    if (!normalizedTargetUserId || normalizedTargetUserId === currentUserId) {
      return;
    }

    setBusyFollowIds((prev) => ({ ...prev, [normalizedTargetUserId]: true }));

    try {
      const isFollowing = Boolean(followStateByUserId[normalizedTargetUserId]);
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

      setFollowStateByUserId((prev) => ({
        ...prev,
        [normalizedTargetUserId]: confirmedFollowing,
      }));
    } catch (error) {
      console.error("Failed to toggle follow state:", error);
    } finally {
      setBusyFollowIds((prev) => ({
        ...prev,
        [normalizedTargetUserId]: false,
      }));
    }
  };

  // Like state for instant UI feedback
  const [likedStoryIds, setLikedStoryIds] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});

  useEffect(() => {
    setLikedStoryIds(
      new Set([
        ...recommendedStories
          .filter((s) => s.likedByCurrentUser)
          .map((s) => s.id),
        ...popularStories.filter((s) => s.likedByCurrentUser).map((s) => s.id),
      ]),
    );
    setLikeCounts((prev) => {
      const counts = { ...prev };
      recommendedStories.forEach((s) => {
        counts[s.id] = s.likes;
      });
      popularStories.forEach((s) => {
        counts[s.id] = s.likes;
      });
      return counts;
    });
  }, [recommendedStories, popularStories]);

  const handleToggleLike = async (storyId) => {
    setLikedStoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
    setLikeCounts((prev) => {
      const next = { ...prev };
      next[storyId] =
        (next[storyId] || 0) + (likedStoryIds.has(storyId) ? -1 : 1);
      return next;
    });
    try {
      await toggleStoryLike(storyId);
    } catch {
      // Revert on error
      setLikedStoryIds((prev) => {
        const next = new Set(prev);
        if (next.has(storyId)) {
          next.delete(storyId);
        } else {
          next.add(storyId);
        }
        return next;
      });
      setLikeCounts((prev) => {
        const next = { ...prev };
        next[storyId] =
          (next[storyId] || 0) + (likedStoryIds.has(storyId) ? 1 : -1);
        return next;
      });
      alert("Failed to like story. Please try again.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <Navbar title="Explore Communities" />

        <main className="h-[calc(100vh-64px)] overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-4 lg:gap-6 px-3 sm:px-5 lg:px-6 py-4 sm:py-5">
            <div className="min-h-0 flex flex-col overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="mb-8 sm:mb-10">
                <div className="flex items-center gap-2 sm:gap-3 px-1 py-1">
                  <button
                    type="button"
                    aria-label="Scroll genres left"
                    onClick={() => {
                      if (!_genresRef.current) return;
                      const w = _genresRef.current.clientWidth || 240;
                      _genresRef.current.scrollBy({
                        left: -Math.round(w * 0.7),
                        behavior: "smooth",
                      });
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center text-slate-600 hover:text-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div
                    ref={_genresRef}
                    className="flex-1 flex items-center gap-2 sm:gap-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-1"
                  >
                    {genresLoading ? (
                      <span className="h-10 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center border border-slate-200 text-slate-400">
                        Loading genres...
                      </span>
                    ) : null}

                    {!genresLoading && genresError ? (
                      <span className="h-10 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center border border-rose-200 text-rose-500">
                        {genresError}
                      </span>
                    ) : null}

                    {!genresLoading &&
                      !genresError &&
                      genreFilters.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(category)}
                          className={`h-10 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap inline-flex items-center ${
                            activeCategory === category
                              ? "bg-rose-500 text-white"
                              : "border border-slate-300 text-slate-600"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                  </div>

                  <button
                    type="button"
                    aria-label="Scroll genres right"
                    onClick={() => {
                      if (!_genresRef.current) return;
                      const w = _genresRef.current.clientWidth || 240;
                      _genresRef.current.scrollBy({
                        left: Math.round(w * 0.7),
                        behavior: "smooth",
                      });
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center text-slate-600 hover:text-slate-800"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-12">
                <h3 className="font-semibold text-lg mb-6 text-slate-900">
                  Recommended for you
                </h3>

                {storiesLoading ? (
                  <p className="mb-4 text-sm text-slate-500">
                    Loading recommended stories...
                  </p>
                ) : null}

                {!storiesLoading && recommendedError ? (
                  <p className="mb-4 text-sm text-rose-500">
                    {recommendedError}
                  </p>
                ) : null}

                {!storiesLoading &&
                !recommendedError &&
                recommendedStories.length === 0 ? (
                  <p className="mb-4 text-sm text-slate-500">
                    No recommended stories found.
                  </p>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {recommendedStories.map((story, i) => (
                    <div
                      key={story.id || i}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          navigate("/", { state: { focusedPostId: story.id } });
                        }
                      }}
                      onClick={() =>
                        navigate("/", { state: { focusedPostId: story.id } })
                      }
                      className="cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {story.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-rose-50 text-rose-500 text-[10px] font-semibold px-3 py-1 rounded-md uppercase"
                            >
                              {String(tag)}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 shrink-0">
                          {story.authorId &&
                          story.authorId !== currentUserId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFollow({ userId: story.authorId });
                              }}
                              disabled={Boolean(busyFollowIds[story.authorId])}
                              className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
                                followStateByUserId[story.authorId]
                                  ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                                  : "bg-rose-500 hover:bg-rose-600 text-white"
                              } ${
                                busyFollowIds[story.authorId]
                                  ? "opacity-60 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {followStateByUserId[story.authorId]
                                ? "Following"
                                : "Follow"}
                            </button>
                          ) : null}
                          {story.authorId === currentUserId && (
                            <div className="relative">
                              <button
                                type="button"
                                aria-label="Story actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuStoryId(
                                    menuStoryId === story.id ? null : story.id,
                                  );
                                }}
                                className={
                                  menuStoryId === story.id
                                    ? "text-rose-500"
                                    : "text-slate-400 hover:text-slate-600"
                                }
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                              {menuStoryId === story.id && (
                                <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditStory(story.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStory(story.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                    disabled={deletingStoryId === story.id}
                                  >
                                    {deletingStoryId === story.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSave(story.id);
                            }}
                            className={
                              savedStoryIds.has(story.id)
                                ? "text-rose-500"
                                : "text-slate-500 hover:text-rose-500"
                            }
                            aria-label={
                              savedStoryIds.has(story.id)
                                ? "Unsave story"
                                : "Save story"
                            }
                          >
                            <Bookmark
                              className="w-5 h-5"
                              fill={
                                savedStoryIds.has(story.id)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-semibold text-lg sm:text-xl mb-2 text-slate-900">
                        {story.title}
                      </h4>

                      <p className="text-[11px] font-medium text-slate-400 mb-3">
                        By{" "}
                        <Link
                          to={
                            story.authorId
                              ? `/profile/${story.authorId}`
                              : "/profile"
                          }
                          className="text-slate-500 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        >
                          {story.author}
                        </Link>
                      </p>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                        {story.excerpt}
                      </p>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-end gap-1">
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-slate-500 text-[10px] font-medium">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(story.id);
                            }}
                            className={
                              likedStoryIds.has(story.id)
                                ? "flex items-center gap-1 text-rose-500"
                                : "flex items-center gap-1 text-slate-500 hover:text-rose-500"
                            }
                            aria-label={
                              likedStoryIds.has(story.id)
                                ? "Unlike story"
                                : "Like story"
                            }
                          >
                            <Heart
                              className="w-3 h-3"
                              fill={
                                likedStoryIds.has(story.id)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                            <span>{likeCounts[story.id] ?? story.likes}</span>
                          </button>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {story.views} views
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-12">
                <h3 className="font-semibold text-lg mb-6 text-slate-900">
                  Most Popular
                </h3>

                {storiesLoading ? (
                  <p className="mb-4 text-sm text-slate-500">
                    Loading popular stories...
                  </p>
                ) : null}

                {!storiesLoading && popularError ? (
                  <p className="mb-4 text-sm text-rose-500">{popularError}</p>
                ) : null}

                {!storiesLoading &&
                !popularError &&
                popularStories.length === 0 ? (
                  <p className="mb-4 text-sm text-slate-500">
                    No popular stories found.
                  </p>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {popularStories.map((story, i) => (
                    <div
                      key={story.id || i}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          navigate("/", { state: { focusedPostId: story.id } });
                        }
                      }}
                      onClick={() =>
                        navigate("/", { state: { focusedPostId: story.id } })
                      }
                      className="cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {story.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-rose-50 text-rose-500 text-[10px] font-semibold px-3 py-1 rounded-md uppercase"
                            >
                              {String(tag)}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 shrink-0">
                          {story.authorId &&
                          story.authorId !== currentUserId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFollow({ userId: story.authorId });
                              }}
                              disabled={Boolean(busyFollowIds[story.authorId])}
                              className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
                                followStateByUserId[story.authorId]
                                  ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                                  : "bg-rose-500 hover:bg-rose-600 text-white"
                              } ${
                                busyFollowIds[story.authorId]
                                  ? "opacity-60 cursor-not-allowed"
                                  : ""
                              }`}
                            >
                              {followStateByUserId[story.authorId]
                                ? "Following"
                                : "Follow"}
                            </button>
                          ) : null}
                          {story.authorId === currentUserId && (
                            <div className="relative">
                              <button
                                type="button"
                                aria-label="Story actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuStoryId(
                                    menuStoryId === story.id ? null : story.id,
                                  );
                                }}
                                className={
                                  menuStoryId === story.id
                                    ? "text-rose-500"
                                    : "text-slate-400 hover:text-slate-600"
                                }
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                              {menuStoryId === story.id && (
                                <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditStory(story.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStory(story.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                    disabled={deletingStoryId === story.id}
                                  >
                                    {deletingStoryId === story.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSave(story.id);
                            }}
                            className={
                              savedStoryIds.has(story.id)
                                ? "text-rose-500"
                                : "text-slate-500 hover:text-rose-500"
                            }
                            aria-label={
                              savedStoryIds.has(story.id)
                                ? "Unsave story"
                                : "Save story"
                            }
                          >
                            <Bookmark
                              className="w-5 h-5"
                              fill={
                                savedStoryIds.has(story.id)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-semibold text-lg sm:text-xl mb-2 text-slate-900">
                        {story.title}
                      </h4>

                      <p className="text-[11px] font-medium text-slate-400 mb-3">
                        By{" "}
                        <Link
                          to={
                            story.authorId
                              ? `/profile/${story.authorId}`
                              : "/profile"
                          }
                          className="text-slate-500 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        >
                          {story.author}
                        </Link>
                      </p>

                      <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                        {story.excerpt}
                      </p>

                      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-end gap-1">
                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-slate-500 text-[10px] font-medium">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(story.id);
                            }}
                            className={
                              likedStoryIds.has(story.id)
                                ? "flex items-center gap-1 text-rose-500"
                                : "flex items-center gap-1 text-slate-500 hover:text-rose-500"
                            }
                            aria-label={
                              likedStoryIds.has(story.id)
                                ? "Unlike story"
                                : "Like story"
                            }
                          >
                            <Heart
                              className="w-3 h-3"
                              fill={
                                likedStoryIds.has(story.id)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                            <span>{likeCounts[story.id] ?? story.likes}</span>
                          </button>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {story.views} views
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="hidden lg:block w-64 shrink-0 h-full">
              <div className="sticky top-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-900">
                  Top Authors
                </h2>

                <div className="space-y-2">
                  {authorsLoading ? (
                    <p className="text-xs text-slate-500">Loading authors...</p>
                  ) : null}

                  {!authorsLoading && authorsError ? (
                    <p className="text-xs text-rose-500">{authorsError}</p>
                  ) : null}

                  {!authorsLoading &&
                  !authorsError &&
                  resolvedAuthors.length === 0 ? (
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
                  ) : null}

                  {!authorsLoading &&
                    !authorsError &&
                    resolvedAuthors
                      .slice(0, TOP_AUTHORS_COUNT)
                      .map((author) => (
                        <AuthorRow
                          key={author.userId || author.displayName}
                          userId={author.userId}
                          name={author.displayName}
                          role={author.role}
                          avatar={author.avatar}
                          isFollowing={Boolean(
                            followStateByUserId[author.userId],
                          )}
                          isBusy={Boolean(busyFollowIds[author.userId])}
                          onToggleFollow={() => handleToggleFollow(author)}
                        />
                      ))}
                </div>
              </div>
            </aside>
          </div>
        </main>

        <SiteFooter className="text-left lg:text-right" />
      </div>
    </div>
  );
}
