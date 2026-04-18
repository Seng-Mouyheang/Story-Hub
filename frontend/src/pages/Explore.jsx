import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Bookmark,
  Share2,
  ArrowRightCircle,
  Heart,
  Eye,
  ChevronRight,
  User,
} from "lucide-react";
import { followUser, unfollowUser } from "../api/profile";
import {
  getExploreRecommendedStories,
  getExplorePopularStories,
  getExploreAuthors,
  getExplorePublishedGenres,
} from "../api/explore";

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const mapStoryCard = (story) => ({
  id: story?._id || story?.storyId || story?.id || story?.title,
  authorId:
    story?.authorId || story?.author?._id || story?.author?.userId || null,
  title: story?.title || "Untitled story",
  tags:
    Array.isArray(story?.genres) && story.genres.length > 0
      ? story.genres
      : Array.isArray(story?.tags) && story.tags.length > 0
        ? story.tags
        : ["Story"],
  excerpt:
    story?.summary || story?.content?.slice(0, 140) || "No summary available.",
  likes: formatCompactNumber(story?.likesCount),
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [genreFilters, setGenreFilters] = useState(["All"]);
  const [recommendedStories, setRecommendedStories] = useState([]);
  const [popularStories, setPopularStories] = useState([]);
  const [resolvedAuthors, setResolvedAuthors] = useState([]);
  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [busyFollowIds, setBusyFollowIds] = useState({});
  const [genresLoading, setGenresLoading] = useState(false);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [genresError, setGenresError] = useState("");
  const [recommendedError, setRecommendedError] = useState("");
  const [popularError, setPopularError] = useState("");
  const [authorsError, setAuthorsError] = useState("");

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
            category: activeCategory === "All" ? undefined : activeCategory,
            limit: 10,
            minLikes: 10,
            signal: abortController.signal,
          }),
        ]);

      if (!isMounted) {
        return;
      }

      if (recommendedResult.status === "fulfilled") {
        setRecommendedStories(
          (recommendedResult.value?.data || []).map(mapStoryCard),
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
          userId: author?.authorId || null,
          avatar: author?.profilePicture || "",
          displayName: author?.displayName || author?.username || "Unknown",
          role: `Top ${
            authorsResult.value?.category ||
            (activeCategory === "All" ? "Recommended" : activeCategory)
          } Author`,
          popularStoriesInCategory: Number(
            author?.popularStoriesInCategory || 0,
          ),
          totalCategoryLikes: Number(author?.totalCategoryLikes || 0),
        }));

        setResolvedAuthors(resolved);
        setFollowStateByUserId(
          Object.fromEntries(resolved.map((author) => [author.userId, false])),
        );
      } else {
        setResolvedAuthors([]);
        setFollowStateByUserId({});
        setAuthorsError(
          authorsResult.reason?.message ||
            "Failed to load recommended authors.",
        );
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
  }, [activeCategory]);

  const handleToggleFollow = async (author) => {
    if (!author.userId) {
      return;
    }

    setBusyFollowIds((prev) => ({ ...prev, [author.userId]: true }));

    try {
      const isFollowing = Boolean(followStateByUserId[author.userId]);

      if (isFollowing) {
        await unfollowUser(author.userId);
      } else {
        await followUser(author.userId);
      }

      setFollowStateByUserId((prev) => ({
        ...prev,
        [author.userId]: !isFollowing,
      }));

      if (!isFollowing) {
        setResolvedAuthors((prev) =>
          prev.filter(
            (currentAuthor) => currentAuthor.userId !== author.userId,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to toggle follow state:", error);
    } finally {
      setBusyFollowIds((prev) => ({ ...prev, [author.userId]: false }));
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
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  <button className="hidden sm:inline-flex h-10 items-center text-slate-400 ml-2">
                    <ChevronRight className="w-6 h-6" />
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
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col"
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

                        <div className="flex items-center gap-3 text-slate-500 shrink-0">
                          <button type="button">
                            <Bookmark className="w-5 h-5" />
                          </button>
                          <button type="button">
                            <Share2 className="w-5 h-5" />
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
                        <a
                          href="#"
                          className="text-rose-500 text-xs font-semibold flex items-center gap-1"
                        >
                          Read More <ArrowRightCircle className="w-4 h-4" />
                        </a>

                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-slate-500 text-[10px] font-medium">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {story.likes}
                          </span>
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
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col"
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

                        <div className="flex items-center gap-3 text-slate-500 shrink-0">
                          <button type="button">
                            <Bookmark className="w-5 h-5" />
                          </button>
                          <button type="button">
                            <Share2 className="w-5 h-5" />
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
                        <a
                          href="#"
                          className="text-rose-500 text-xs font-semibold flex items-center gap-1"
                        >
                          Read More <ArrowRightCircle className="w-4 h-4" />
                        </a>

                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-slate-500 text-[10px] font-medium">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {story.likes}
                          </span>
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
                <h2 className="text-lg sm:text-xl font-semibold mb-5 sm:mb-6 text-slate-900">
                  Top Authors
                </h2>

                <div className="space-y-4 mb-8">
                  {authorsLoading ? (
                    <p className="text-xs text-slate-500">Loading authors...</p>
                  ) : null}

                  {!authorsLoading && authorsError ? (
                    <p className="text-xs text-rose-500">{authorsError}</p>
                  ) : null}

                  {!authorsLoading &&
                  !authorsError &&
                  resolvedAuthors.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No author recommendations available.
                    </p>
                  ) : null}

                  {!authorsLoading &&
                    !authorsError &&
                    resolvedAuthors.map((author) => (
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

                <button className="w-full text-rose-500 text-xs font-semibold hover:underline py-2">
                  Show more
                </button>
              </div>
            </aside>
          </div>
        </main>

        <SiteFooter className="text-left lg:text-right" />
      </div>
    </div>
  );
}
